/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
	app(input) {
		return {
			name: "clinical-letters",
			removal: input?.stage === "production" ? "retain" : "remove",
			protect: ["production"].includes(input?.stage),
			home: "aws",
			providers: {
				aws: {
					profile:
						input.stage === "production"
							? "clinical-letters-production"
							: "clinical-letters-dev",
				},
			},
		};
	},
	async run() {
		const supabaseUrl = new sst.Secret("SupabaseUrl");
		const supabaseServiceKey = new sst.Secret("SupabaseServiceKey");
		const claudeApiKey = new sst.Secret("ClaudeApiKey");

		const bucket = new sst.aws.Bucket("LettersBucket", {
			transform: {
				bucket: {
					forceDestroy: true,
				},
			},
		});

		bucket.notify({
			notifications: [
				{
					name: "ProcessLetter",
					function: {
						handler: "packages/functions/src/process.handler",
						timeout: "60 seconds",
						link: [bucket, supabaseUrl, supabaseServiceKey, claudeApiKey],
					},
					filterPrefix: "uploads/",
					events: ["s3:ObjectCreated:*"],
				},
			],
		});

		const web = new sst.aws.React("Web", {
			link: [bucket, supabaseUrl, supabaseServiceKey],
		});

		return {
			web: web.url,
		};
	},
});
