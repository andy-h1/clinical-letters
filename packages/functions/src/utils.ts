export const NHS_NUMBER_REGEX = /\b\d{3}\s?\d{3}\s?\d{4}\b/g;

export function extractNhsNumber(text: string): string | null {
	const matches = text.match(NHS_NUMBER_REGEX);
	if (matches && matches.length > 0) {
		return matches[0].replace(/\s/g, "");
	}
	return null;
}
