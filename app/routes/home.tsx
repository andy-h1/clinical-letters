import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Resource } from "sst";
import type { Route } from "./+types/home";

export async function loader() {
	const command = new PutObjectCommand({
		Key: `uploads/${crypto.randomUUID()}.pdf`,
		Bucket: Resource.LettersBucket.name,
		ContentType: "application/pdf",
	});
	const url = await getSignedUrl(new S3Client({}), command);
	return { url };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	const { url } = loaderData;

	return (
		<div className="min-h-screen bg-gray-50 py-12">
			<div className="max-w-xl mx-auto px-4">
				<h1 className="text-2xl font-bold text-gray-900 mb-8">
					Clinical Letters
				</h1>

				<div className="bg-white p-6 rounded-lg shadow">
					<h2 className="text-lg font-semibold mb-4">Upload Letter</h2>

					<form
						onSubmit={async (e) => {
							e.preventDefault();
							const file = (e.target as HTMLFormElement).file.files?.[0];
							if (!file) return;

							const res = await fetch(url, {
								method: "PUT",
								body: file,
								headers: {
									"Content-Type": "application/pdf",
								},
							});

							if (res.ok) {
								alert("Upload successful!");
							} else {
								alert("Upload failed");
							}
						}}
					>
						<input
							name="file"
							type="file"
							accept="application/pdf"
							className="mb-4 block w-full text-sm text-gray-500
								file:mr-4 file:py-2 file:px-4
								file:rounded file:border-0
								file:text-sm file:font-semibold
								file:bg-blue-50 file:text-blue-700
								hover:file:bg-blue-100"
						/>
						<button
							type="submit"
							className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
						>
							Upload
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
