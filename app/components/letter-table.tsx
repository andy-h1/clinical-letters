import { Fragment, useState } from "react";

interface Letter {
	id: string;
	file_name: string;
	status: string;
	summary: string | null;
	created_at: string;
	viewUrl: string;
	patients: { nhs_number: string } | { nhs_number: string }[] | null;
}

interface LetterTableProps {
	letters: Letter[];
	onUploadClick: () => void;
}

export function LetterTable({ letters, onUploadClick }: LetterTableProps) {
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

	const getNhsNumber = (letter: Letter) => {
		const patient = letter.patients;
		if (!patient) return "-";
		if (Array.isArray(patient)) return patient[0]?.nhs_number || "-";
		return patient.nhs_number || "-";
	};

	if (letters.length === 0) {
		return (
			<div className="bg-white p-6 lg:p-8 rounded-lg shadow text-center text-gray-500">
				No letters uploaded yet.{" "}
				<button
					type="button"
					onClick={onUploadClick}
					className="text-blue-600 hover:underline"
				>
					Upload your first letter
				</button>
			</div>
		);
	}

	return (
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
									className="inline-block mt-5 text-sm text-blue-600 hover:text-blue-800 font-medium"
								>
									View Original Letter
								</a>
							</div>
						)}
					</div>
				))}
			</div>

			<div className="hidden lg:block bg-[#edf1ef] rounded-lg shadow overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-[#a8b3be]">
						<tr>
							<th className="w-10 px-4 py-3"></th>
							<th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
								File Name
							</th>
							<th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
								NHS Number
							</th>
							<th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
								Status
							</th>
							<th className="px-6 py-3 text-left text-xs font-bold text-black uppercase tracking-wider">
								Uploaded
							</th>
						</tr>
					</thead>
					<tbody className="bg-[#edf1ef] divide-y divide-gray-200">
						{letters.map((letter) => (
							<Fragment key={letter.id}>
								<tr
									className="hover:bg-[#dfe7e3] cursor-pointer"
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
									<tr>
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
													className="inline-block mt-5 text-blue-600 hover:text-blue-800 font-medium"
												>
													View Original Letter
												</a>
											</div>
										</td>
									</tr>
								)}
							</Fragment>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
}
