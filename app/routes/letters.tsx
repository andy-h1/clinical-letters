import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Link, useRevalidator } from "react-router";
import { Resource } from "sst";
import type { Route } from "./+types/letters";

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

	return { letters: lettersWithUrls };
}

export default function Letters({ loaderData }: Route.ComponentProps) {
	const { letters } = loaderData;
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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

	const toggleExpand = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case "COMPLETE":
				return "bg-green-100 text-green-800";
			case "PROCESSING":
				return "bg-yellow-100 text-yellow-800";
			case "ERROR":
				return "bg-red-100 text-red-800";
			default:
				return "bg-gray-100 text-gray-800";
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-GB", {
			day: "numeric",
			month: "short",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const getNhsNumber = (letter: (typeof letters)[number]) => {
		const patient = letter.patients;
		if (!patient) return "-";
		if (Array.isArray(patient)) return patient[0]?.nhs_number || "-";
		return (patient as { nhs_number: string }).nhs_number || "-";
	};

	return (
		<div className="min-h-screen bg-gray-50 py-6 lg:py-12">
			<div className="max-w-5xl mx-auto px-4">
				<div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 lg:mb-8">
					<h1 className="text-xl lg:text-2xl font-bold text-gray-900">
						Clinical Letters
					</h1>
					<Link
						to="/"
						className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-center text-sm md:text-base"
					>
						Upload New Letter
					</Link>
				</div>

				{letters.length === 0 ? (
					<div className="bg-white p-6 lg:p-8 rounded-lg shadow text-center text-gray-500">
						No letters uploaded yet.{" "}
						<Link to="/" className="text-blue-600 hover:underline">
							Upload your first letter
						</Link>
					</div>
				) : (
					<>
						<div className="lg:hidden space-y-4">
							{letters.map((letter) => (
								<div
									key={letter.id}
									className="bg-white rounded-lg shadow overflow-hidden"
								>
									<button
										type="button"
										className="p-4 cursor-pointer w-full text-left"
										onClick={() => toggleExpand(letter.id)}
									>
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1 min-w-0">
												<p className="font-medium text-gray-900 truncate">
													{letter.file_name}
												</p>
												<p className="text-sm text-gray-500 mt-1">
													NHS: {getNhsNumber(letter)}
												</p>
											</div>
											<div className="flex items-center gap-2">
												<span
													className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(letter.status)}`}
												>
													{letter.status}
												</span>
												<span
													className={`transform transition-transform text-gray-400 ${expandedIds.has(letter.id) ? "rotate-90" : ""}`}
												>
													&#9654;
												</span>
											</div>
										</div>
										<p className="text-xs text-gray-400 mt-2">
											{formatDate(letter.created_at)}
										</p>
									</button>
									{expandedIds.has(letter.id) && (
										<div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50">
											<h4 className="font-medium text-gray-900 mb-2 text-sm">
												Summary
											</h4>
											{letter.summary ? (
												<p className="text-sm text-gray-700 whitespace-pre-wrap">
													{letter.summary}
												</p>
											) : (
												<p className="text-sm text-gray-400 italic">
													{letter.status === "PROCESSING"
														? "Processing..."
														: letter.status === "ERROR"
															? "Failed to generate summary"
															: "No summary available"}
												</p>
											)}
											<a
												href={letter.viewUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-block mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
											>
												View Original Letter
											</a>
										</div>
									)}
								</div>
							))}
						</div>

						<div className="hidden lg:block bg-white rounded-lg shadow overflow-hidden">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
									<tr>
										<th className="w-10 px-4 py-3"></th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											File Name
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											NHS Number
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Status
										</th>
										<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
											Uploaded
										</th>
									</tr>
								</thead>
								<tbody className="bg-white divide-y divide-gray-200">
									{letters.map((letter) => (
										<>
											<tr
												key={letter.id}
												className="hover:bg-gray-50 cursor-pointer"
												tabIndex={0}
												onClick={() => toggleExpand(letter.id)}
												onKeyDown={(e) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														toggleExpand(letter.id);
													}
												}}
											>
												<td className="px-4 py-4 text-gray-400">
													<span
														className={`transform transition-transform ${expandedIds.has(letter.id) ? "rotate-90" : ""} inline-block`}
													>
														&#9654;
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{letter.file_name}
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
													{getNhsNumber(letter)}
												</td>
												<td className="px-6 py-4 whitespace-nowrap">
													<span
														className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(letter.status)}`}
													>
														{letter.status}
													</span>
												</td>
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
													{formatDate(letter.created_at)}
												</td>
											</tr>
											{expandedIds.has(letter.id) && (
												<tr key={`${letter.id}-expanded`}>
													<td colSpan={5} className="px-6 py-4 bg-gray-50">
														<div className="text-sm">
															<h4 className="font-medium text-gray-900 mb-2">
																Summary
															</h4>
															{letter.summary ? (
																<p className="text-gray-700 whitespace-pre-wrap">
																	{letter.summary}
																</p>
															) : (
																<p className="text-gray-400 italic">
																	{letter.status === "PROCESSING"
																		? "Processing..."
																		: letter.status === "ERROR"
																			? "Failed to generate summary"
																			: "No summary available"}
																</p>
															)}
															<a
																href={letter.viewUrl}
																target="_blank"
																rel="noopener noreferrer"
																className="inline-block mt-3 text-blue-600 hover:text-blue-800 font-medium"
															>
																View Original Letter
															</a>
														</div>
													</td>
												</tr>
											)}
										</>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
