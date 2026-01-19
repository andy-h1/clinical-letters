import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { useState } from "react";
import { Link, useFetcher } from "react-router";
import { Resource } from "sst";
import { z } from "zod/v4-mini";
import type { Route } from "./+types/home";

const fileSchema = z
	.file()
	.max(10_000_000, "File size must be less than 10MB")
	.mime(["application/pdf"], "Only PDF files are allowed");

export async function loader() {
	const key = `uploads/${crypto.randomUUID()}.pdf`;
	const command = new PutObjectCommand({
		Key: key,
		Bucket: Resource.LettersBucket.name,
		ContentType: "application/pdf",
	});
	const url = await getSignedUrl(new S3Client({}), command);
	return { url, key };
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
	const { url, key } = loaderData;
	const fetcher = useFetcher<typeof action>();
	const [validationError, setValidationError] = useState<string | null>(null);

	const isUploading = fetcher.state !== "idle";
	const isSuccess = fetcher.data?.success === true;
	const isError = fetcher.data?.success === false;

	return (
		<div className="min-h-screen bg-gray-50 py-6 lg:py-12">
			<div className="max-w-xl mx-auto px-4">
				<div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-6 lg:mb-8">
					<h1 className="text-xl lg:text-2xl font-bold text-gray-900">
						Clinical Letters
					</h1>
					<Link
						to="/letters"
						className="text-blue-600 hover:text-blue-800 font-medium text-sm md:text-base"
					>
						View All Letters
					</Link>
				</div>

				<div className="bg-white p-4 md:p-6 rounded-lg shadow">
					<h2 className="text-base lg:text-lg font-semibold mb-4">
						Upload Letter
					</h2>

					{isSuccess && (
						<div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md">
							Upload successful! The letter is being processed.{" "}
							<Link to="/letters" className="underline font-medium">
								View all letters
							</Link>
						</div>
					)}

					{isError && (
						<div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md">
							Upload failed: {fetcher.data?.error}
						</div>
					)}

					{validationError && (
						<div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md">
							{validationError}
						</div>
					)}

					<form
						onSubmit={async (e) => {
							e.preventDefault();
							setValidationError(null);

							const form = e.target as HTMLFormElement;
							const file = form.file.files?.[0];

							const result = fileSchema.safeParse(file);
							if (!result.success) {
								setValidationError(result.error.issues[0].message);
								return;
							}

							await fetch(url, {
								method: "PUT",
								body: file,
								headers: { "Content-Type": "application/pdf" },
							});

							const formData = new FormData();
							formData.append("key", key);
							formData.append("fileName", file.name);

							fetcher.submit(formData, { method: "POST" });
							form.reset();
						}}
					>
						<input
							type="file"
							name="file"
							accept="application/pdf"
							disabled={isUploading}
							className="mb-4 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                disabled:opacity-50"
						/>
						<button
							type="submit"
							disabled={isUploading}
							className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isUploading ? "Uploading..." : "Upload Letter"}
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
