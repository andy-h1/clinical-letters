import { useEffect, useState } from "react";
import { useFetcher, useRevalidator } from "react-router";
import { z } from "zod/v4-mini";
import type { action } from "../routes/home";

const fileSchema = z
	.file()
	.check(
		z.maxSize(10_000_000, "File size must be less than 10MB"),
		z.mime(["application/pdf"], "Only PDF files are allowed"),
	);

interface UploadDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	uploadUrl: string;
	uploadKey: string;
}

export function UploadDrawer({
	isOpen,
	onClose,
	uploadUrl,
	uploadKey,
}: UploadDrawerProps) {
	const [validationError, setValidationError] = useState<string | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const revalidator = useRevalidator();
	const fetcher = useFetcher<typeof action>();

	const isUploading = fetcher.state !== "idle";
	const isSuccess = fetcher.data?.success === true;
	const isError = fetcher.data?.success === false;

	useEffect(() => {
		if (isSuccess) {
			onClose();
			revalidator.revalidate();
		}
	}, [isSuccess, onClose, revalidator]);

	return (
		<>
			{isOpen && (
				<button
					type="button"
					className="fixed inset-0 bg-black/50 z-40 cursor-default"
					onClick={onClose}
					aria-label="Close drawer"
				/>
			)}

			<div
				className={`fixed z-50 bg-white shadow-xl transition-transform duration-300 ease-in-out
					lg:left-0 lg:right-auto lg:top-0 lg:h-full lg:w-96
					bottom-0 left-0 right-0 h-[80vh] rounded-t-2xl lg:rounded-none
					${isOpen ? "translate-y-0 lg:translate-x-0 visible" : "invisible translate-y-full lg:translate-y-0 lg:-translate-x-full"}`}
			>
				<div className="p-6 h-full flex flex-col">
					<div className="lg:hidden absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 rounded-full" />

					<div className="flex justify-between items-center mb-6">
						<h2 className="text-lg font-semibold">Upload Letter</h2>
						<button
							type="button"
							onClick={onClose}
							className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
						>
							&times;
						</button>
					</div>

					{isSuccess && (
						<div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md text-sm">
							Upload successful! The letter is being processed.
						</div>
					)}

					{isError && (
						<div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
							Upload failed: {fetcher.data?.error}
						</div>
					)}

					{validationError && (
						<div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
							{validationError}
						</div>
					)}

					<form
						className="flex-1 flex flex-col"
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

							await fetch(uploadUrl, {
								method: "PUT",
								body: file,
								headers: { "Content-Type": "application/pdf" },
							});

							const formData = new FormData();
							formData.append("key", uploadKey);
							formData.append("fileName", file.name);

							fetcher.submit(formData, { method: "POST" });
							form.reset();
							setSelectedFile(null);
						}}
					>
						<div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg mb-4">
							<div className="text-center p-6">
								<input
									type="file"
									name="file"
									id="file-upload"
									accept="application/pdf"
									disabled={isUploading}
									className="hidden"
									onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
								/>
								{selectedFile ? (
									<>
										<p className="font-medium text-gray-900">{selectedFile.name}</p>
										<label
											htmlFor="file-upload"
											className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
										>
											Change file
										</label>
									</>
								) : (
									<>
										<label
											htmlFor="file-upload"
											className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium"
										>
											Choose a PDF file
										</label>
										<p className="text-xs text-gray-400 mt-2">Max 10MB</p>
									</>
								)}
							</div>
						</div>
						<button
							type="submit"
							disabled={isUploading || !selectedFile}
							className="w-full bg-[#a8b3be] text-black py-3 px-4 rounded-md hover:bg-[#919ca6] disabled:opacity-50 disabled:cursor-not-allowed font-medium"
						>
							{isUploading ? "Uploading..." : "Upload Letter"}
						</button>
					</form>
				</div>
			</div>
		</>
	);
}
