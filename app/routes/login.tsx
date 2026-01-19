import {
	createServerClient,
	parseCookieHeader,
	serializeCookieHeader,
} from "@supabase/ssr";
import { useState } from "react";
import { data, redirect, useFetcher } from "react-router";
import { Resource } from "sst";
import type { Route } from "./+types/login";

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
						headers.append("Set-Cookie", serializeCookieHeader(name, value, options));
					});
				},
			},
		},
	);

	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (user) {
		return redirect("/", { headers });
	}

	return null;
}

export async function action({ request }: Route.ActionArgs) {
	const formData = await request.formData();
	const email = formData.get("email") as string;

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
						headers.append("Set-Cookie", serializeCookieHeader(name, value, options));
					});
				},
			},
		},
	);

	const { error } = await supabase.auth.signInWithOtp({
		email,
		options: {
			emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
		},
	});

	if (error) {
		return data({ success: false, error: error.message }, { headers });
	}

	return data({ success: true }, { headers });
}

export default function Login() {
	const fetcher = useFetcher<typeof action>();
	const [email, setEmail] = useState("");

	const isLoading = fetcher.state !== "idle";
	const isSuccess = fetcher.data?.success === true;
	const error = fetcher.data?.success === false ? fetcher.data.error : null;

	return (
		<div className="min-h-screen bg-[#a9bbb1] flex items-center justify-center px-4 font-serif">
			<div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
				<h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
					Clinical Letters
				</h1>
				<p className="text-gray-600 text-center mb-6">
					Sign in with your email to continue
				</p>

				{isSuccess && (
					<div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md text-sm">
						Check your email for the login link!
					</div>
				)}

				{error && (
					<div className="mb-4 p-3 bg-red-50 text-red-800 rounded-md text-sm">
						{error}
					</div>
				)}

				<fetcher.Form method="post">
					<div className="mb-4">
						<label
							htmlFor="email"
							className="block text-sm font-medium text-gray-700 mb-2"
						>
							Email address
						</label>
						<input
							id="email"
							name="email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="you@example.com"
							required
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#a8b3be] text-black"
						/>
					</div>
					<button
						type="submit"
						disabled={isLoading}
						className="w-full bg-[#a8b3be] text-black py-2 px-4 rounded-md hover:bg-[#919ca6] disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? "Sending link..." : "Send magic link"}
					</button>
				</fetcher.Form>
			</div>
		</div>
	);
}
