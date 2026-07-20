const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

/** UI is 100% Persian (Master Prompt "Language") — numbers render with Persian digits, not Latin. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function formatCompactNumber(value: number): string {
  const formatted = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(
    value
  );
  return toPersianDigits(formatted).replace("K", " هزار").replace("M", " میلیون").replace("B", " میلیارد");
}

export function formatPercent(value: number): string {
  return `${toPersianDigits((value * 100).toFixed(1))}٪`;
}

export function formatDate(iso: string): string {
  return toPersianDigits(
    new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(
      new Date(iso)
    )
  );
}
