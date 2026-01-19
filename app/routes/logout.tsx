import {
	createServerClient,
	parseCookieHeader,
	serializeCookieHeader,
} from "@supabase/ssr";
import { redirect } from "react-router";
import { Resource } from "sst";
import type { Route } from "./+types/logout";

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

	await supabase.auth.signOut();

	return redirect("/login", { headers });
}
