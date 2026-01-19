import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
	createServerClient,
	parseCookieHeader,
	serializeCookieHeader,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Link, redirect, useRevalidator } from "react-router";
import { Resource } from "sst";
import { LetterTable } from "../components/letter-table";
import { UploadDrawer } from "../components/upload-drawer";
import type { Route } from "./+types/home";

export async function loader({ request }: Route.LoaderArgs) {
	const headers = new Headers();
	const supabase = createServerClient(
		Resource.SupabaseUrl.value,
		Resource.SupabasePublishableKey.value,
		{
			cookies: {
				getAll() {
					return parseCookieHeader(request.headers.get("Cookie") ?? "") as {
						name: string;
						value: string;
					}[];
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						headers.append(
							"Set-Cookie",
							serializeCookieHeader(name, value, options),
						);
					});
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		return redirect("/login", { headers });
	}

	const supabaseAdmin = createClient(
		Resource.SupabaseUrl.value,
		Resource.SupabaseServiceKey.value,
	);

	const { data: letters, error } = await supabaseAdmin
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

	return {
		letters: lettersWithUrls,
		uploadUrl,
		uploadKey,
		userEmail: user.email,
	};
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
	const { letters, uploadUrl, uploadKey, userEmail } = loaderData;
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
		<div className="min-h-screen bg-[#a9bbb1] font-serif">
			<header className="bg-[#a9bbb1]">
				<div className="max-w-5xl mx-auto px-4 py-4 flex justify-end items-center gap-4">
					<span className="text-sm text-gray-700">{userEmail}</span>
					<Link
						to="/logout"
						className="bg-white text-black py-2 px-4 rounded-md hover:bg-gray-100 text-sm"
					>
						Sign out
					</Link>
				</div>
			</header>

			<div className="max-w-5xl mx-auto px-4 py-6 lg:py-12">
				<div className="flex justify-between items-center mb-6">
					<h1 className="text-xl lg:text-2xl font-bold text-black">
						Clinical Letters
					</h1>
					<button
						type="button"
						onClick={() => setIsDrawerOpen(true)}
						className="bg-[#a8b3be] text-black py-2 px-4 rounded-md hover:bg-[#919ca6] text-center text-sm md:text-base"
					>
						Upload New Letter
					</button>
				</div>

				<LetterTable
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
