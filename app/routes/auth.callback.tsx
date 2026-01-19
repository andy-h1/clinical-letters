import {
	createServerClient,
	parseCookieHeader,
	serializeCookieHeader,
} from "@supabase/ssr";
import { redirect } from "react-router";
import { Resource } from "sst";
import type { Route } from "./+types/auth.callback";

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const errorParam = url.searchParams.get("error_description");

	if (errorParam) {
		return { error: errorParam };
	}

	if (!code) {
		return { error: "No authorization code provided" };
	}

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

	const { error } = await supabase.auth.exchangeCodeForSession(code);

	if (error) {
		return { error: error.message };
	}

	return redirect("/", { headers });
}

export default function AuthCallback({ loaderData }: Route.ComponentProps) {
	const error = loaderData?.error;

	if (error) {
		return (
			<div className="min-h-screen bg-[#a9bbb1] flex items-center justify-center font-serif">
				<div className="bg-white p-8 rounded-lg shadow-md text-center">
					<p className="text-red-600 mb-4">{error}</p>
					<a href="/login" className="text-blue-600 hover:underline">
						Return to login
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#a9bbb1] flex items-center justify-center font-serif">
			<p className="text-gray-700">Authenticating...</p>
		</div>
	);
}
