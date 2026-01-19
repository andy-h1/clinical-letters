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
			status,
			summary,
			created_at,
			patient:patients(nhs_number)
		`)
		.order("created_at", { ascending: false });

	if (error) {
		throw new Error(`Failed to fetch letters: ${error.message}`);
	}

	return { letters };
}

export default function Letters({ loaderData }: Route.ComponentProps) {
	const { letters } = loaderData;
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const revalidator = useRevalidator();

	const hasProcessingLetters = letters.some(
		(letter) => letter.status === "PROCESSING" || letter.status === "PENDING"
	);

	useEffect(() => {
		if (!hasProcessingLetters) return;

		const interval = setInterval(() => {
			revalidator.revalidate();
		}, 5000);

		return () => clearInterval(interval);
	}, [hasProcessingLetters, revalidator]);

	const toggleExpand = (id: string) => {
		setExpandedId(expandedId === id ? null : id);
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

	return (
		<div className="min-h-screen bg-gray-50 py-12">
			<div className="max-w-5xl mx-auto px-4">
				<div className="flex justify-between items-center mb-8">
					<h1 className="text-2xl font-bold text-gray-900">Clinical Letters</h1>
					<Link
						to="/"
						className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
					>
						Upload New Letter
					</Link>
				</div>

				{letters.length === 0 ? (
					<div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
						No letters uploaded yet.{" "}
						<Link to="/" className="text-blue-600 hover:underline">
							Upload your first letter
						</Link>
					</div>
				) : (
					<div className="bg-white rounded-lg shadow overflow-hidden">
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
											onClick={() => toggleExpand(letter.id)}
										>
											<td className="px-4 py-4 text-gray-400">
												<span
													className={`transform transition-transform ${expandedId === letter.id ? "rotate-90" : ""} inline-block`}
												>
													&#9654;
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{letter.file_name}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
												{letter.patient?.nhs_number || "-"}
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
										{expandedId === letter.id && (
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
													</div>
												</td>
											</tr>
										)}
									</>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
