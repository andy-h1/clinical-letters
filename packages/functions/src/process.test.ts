import { describe, expect, it } from "vitest";
import { extractNhsNumber } from "./utils";

describe("extractNhsNumber", () => {
	it("extracts NHS number with spaces", () => {
		const text = "Patient NHS Number: 123 456 7890";
		expect(extractNhsNumber(text)).toBe("1234567890");
	});

	it("extracts NHS number without spaces", () => {
		const text = "NHS: 1234567890";
		expect(extractNhsNumber(text)).toBe("1234567890");
	});

	it("returns null when no NHS number present", () => {
		const text = "No patient identifier here";
		expect(extractNhsNumber(text)).toBeNull();
	});

	it("finds NHS number in clinical letter text", () => {
		const text = `
			Dear Dr. Smith,
			Re: John Doe (NHS Number: 943 476 5919)
			I am writing regarding the above patient...
		`;
		expect(extractNhsNumber(text)).toBe("9434765919");
	});
});
