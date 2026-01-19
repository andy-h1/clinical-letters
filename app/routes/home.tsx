import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { useRevalidator } from "react-router";
import { Resource } from "sst";
import { LettersList } from "../components/letters-list";
import { UploadDrawer } from "../components/upload-drawer";
import type { Route } from "./+types/home";

export async function loader() {
	const supabase = createClient(
		Resource.SupabaseUrl.value,
		Resource.SupabaseServiceKey.value,
	);

	const { data: letters, error } = await supabase
		.from("letters")
		.select(`
			id,
			file_name,
			s3_key,
			status,
			summary,
			created_at,
			patients(nhs_number)
		`)
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(`Failed to fetch letters: ${error.message}`);
	}

	const s3 = new S3Client({});

	const lettersWithUrls = await Promise.all(
		letters.map(async (letter) => {
			const command = new GetObjectCommand({
				Bucket: Resource.LettersBucket.name,
				Key: letter.s3_key,
			});
			const viewUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
			return { ...letter, viewUrl };
		}),
	);

	const uploadKey = `uploads/${crypto.randomUUID()}.pdf`;
	const uploadCommand = new PutObjectCommand({
		Key: uploadKey,
		Bucket: Resource.LettersBucket.name,
		ContentType: "application/pdf",
	});
	const uploadUrl = await getSignedUrl(s3, uploadCommand);

	return { letters: lettersWithUrls, uploadUrl, uploadKey };
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const key = formData.get("key") as string;
	const fileName = formData.get("fileName") as string;

	const supabase = createClient(
		Resource.SupabaseUrl.value,
		Resource.SupabaseServiceKey.value,
	);

	const { error } = await supabase.from("letters").insert({
		file_name: fileName,
		s3_key: key,
		status: "PENDING",
	});

	if (error) {
		return { success: false, error: error.message };
	}

	return { success: true };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { letters, uploadUrl, uploadKey } = loaderData;
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const revalidator = useRevalidator();

	const isProcessingLetters = letters.some(
		(letter) => letter.status === "PROCESSING" || letter.status === "PENDING",
	);

	useEffect(() => {
		if (!isProcessingLetters) return;

		const interval = setInterval(() => {
			revalidator.revalidate();
		}, 5000);

		return () => clearInterval(interval);
	}, [isProcessingLetters, revalidator]);

	return (
		<div className="min-h-screen bg-gray-50 py-6 lg:py-12">
			<div className="max-w-5xl mx-auto px-4">
				<div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 lg:mb-8">
					<h1 className="text-xl lg:text-2xl font-bold text-gray-900">
						Clinical Letters
					</h1>
					<button
						type="button"
						onClick={() => setIsDrawerOpen(true)}
						className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-center text-sm md:text-base"
					>
						Upload New Letter
					</button>
				</div>

				<LettersList
					letters={letters}
					onUploadClick={() => setIsDrawerOpen(true)}
				/>
			</div>

			<UploadDrawer
				isOpen={isDrawerOpen}
				onClose={() => setIsDrawerOpen(false)}
				uploadUrl={uploadUrl}
				uploadKey={uploadKey}
			/>
		</div>
	);
}
