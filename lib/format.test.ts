import { describe, expect, it } from "vitest";
import { toPersianDigits, formatPercent, formatCompactNumber } from "./format";

describe("toPersianDigits", () => {
  it("converts every Latin digit to its Persian equivalent", () => {
    expect(toPersianDigits("2026")).toBe("۲۰۲۶");
    expect(toPersianDigits(42)).toBe("۴۲");
  });

  it("leaves non-digit characters untouched", () => {
    expect(toPersianDigits("۲۰%")).toBe("۲۰%");
  });
});

describe("formatPercent", () => {
  it("renders a 0..1 ratio as a Persian-digit percentage", () => {
    expect(formatPercent(0.125)).toBe("۱۲.۵٪");
  });
});

describe("formatCompactNumber", () => {
  it("never leaves a Latin digit in the output", () => {
    const result = formatCompactNumber(15000);
    expect(result).not.toMatch(/[0-9]/);
  });
});
