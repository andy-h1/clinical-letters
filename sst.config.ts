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
		const bucket = new sst.aws.Bucket("LettersBucket");

		const web = new sst.aws.React("Web", {
			link: [bucket],
		});

		return {
			web: web.url,
		};
	},
});
