import Anthropic from "@anthropic-ai/sdk";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createClient } from "@supabase/supabase-js";
import type { S3Event } from "aws-lambda";
import { Resource } from "sst";
import { extractText, getDocumentProxy } from "unpdf";

const s3 = new S3Client({});
const supabase = createClient(
	Resource.SupabaseUrl.value,
	Resource.SupabaseServiceKey.value,
);
const anthropic = new Anthropic({ apiKey: Resource.ClaudeApiKey.value });

const NHS_NUMBER_REGEX = /\b\d{3}\s?\d{3}\s?\d{4}\b/g;

async function downloadFromS3(bucket: string, key: string): Promise<Buffer> {
	const command = new GetObjectCommand({ Bucket: bucket, Key: key });
	const response = await s3.send(command);

	if (!response.Body) {
		throw new Error("Empty response from S3");
	}

	const chunks: Uint8Array[] = [];
	for await (const chunk of response.Body as any) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

async function extractTextFromPdf(pdfBuffer: Buffer): Promise<string> {
	const pdf = await getDocumentProxy(new Uint8Array(pdfBuffer));
	const { text } = await extractText(pdf, { mergePages: true });
	return text;
}

function extractNhsNumber(text: string): string | null {
	const matches = text.match(NHS_NUMBER_REGEX);
	if (matches && matches.length > 0) {
		return matches[0].replace(/\s/g, "");
	}
	return null;
}

async function findPatientByNhsNumber(nhsNumber: string): Promise<string> {
	const { data, error } = await supabase
		.from("patients")
		.select("id")
		.eq("nhs_number", nhsNumber)
		.maybeSingle();

	if (error) {
		throw new Error(`Failed to query patients table: ${error.message}`);
	}

	if (!data) {
		throw new Error(
			`Patient not found for NHS number: ${nhsNumber}. Patient must be registered before uploading letters.`,
		);
	}

	return data.id;
}

async function generateSummary(text: string): Promise<string> {
	const message = await anthropic.messages.create({
		model: "claude-sonnet-4-20250514",
		max_tokens: 1024,
		messages: [
			{
				role: "user",
				content: `You are a medical assistant helping doctors quickly understand clinical letters. 
        
Please summarize the following clinical letter concisely, highlighting:
- Key diagnoses or conditions
- Important findings or test results
- Recommended actions or follow-ups
- Any urgent concerns
- Date, time, and location of past appointments

Keep the summary under 300 words.

Clinical Letter:
${text.substring(0, 10000)}`,
			},
		],
	});

	const content = message.content[0];
	if (content.type === "text") {
		return content.text;
	}
	throw new Error("Unexpected response format from Claude");
}

async function updateLetterStatus(
	s3Key: string,
	status: "PROCESSING" | "COMPLETE" | "ERROR",
): Promise<void> {
	const { error } = await supabase
		.from("letters")
		.update({
			status,
			updated_at: new Date().toISOString(),
		})
		.eq("s3_key", s3Key);

	if (error) {
		throw new Error(`Failed to update letter status: ${error.message}`);
	}
}

async function updateLetterWithResults(
	s3Key: string,
	summary: string,
	patientId: string,
): Promise<void> {
	const { error } = await supabase
		.from("letters")
		.update({
			summary,
			status: "COMPLETE",
			patient_id: patientId,
			updated_at: new Date().toISOString(),
		})
		.eq("s3_key", s3Key);

	if (error) {
		throw new Error(`Failed to update letter with results: ${error.message}`);
	}
}

export async function handler(event: S3Event) {
	console.log("Processing S3 event:", JSON.stringify(event, null, 2));

	for (const record of event.Records) {
		const bucketName = record.s3.bucket.name;
		const s3Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));

		console.log(`Processing file: ${s3Key} from bucket: ${bucketName}`);

		try {
			await updateLetterStatus(s3Key, "PROCESSING");

			const pdfBuffer = await downloadFromS3(bucketName, s3Key);
			const extractedText = await extractTextFromPdf(pdfBuffer);
			console.log(`Extracted ${extractedText.length} characters`);

			const nhsNumber = extractNhsNumber(extractedText);
			if (!nhsNumber) {
				throw new Error("No NHS number found in document");
			}
			console.log(`NHS Number: ${nhsNumber}`);

			const patientId = await findPatientByNhsNumber(nhsNumber);

			const summary = await generateSummary(extractedText);
			console.log(`Summary: ${summary.substring(0, 100)}...`);

			await updateLetterWithResults(s3Key, summary, patientId);

			console.log(`Successfully processed: ${s3Key}`);
		} catch (error) {
			console.error(`Error processing ${s3Key}:`, error);
			await updateLetterStatus(s3Key, "ERROR");
		}
	}
}
