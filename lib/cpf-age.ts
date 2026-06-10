/**
 * The single source of truth for "what age does CPF use for this member."
 *
 * Age is derived ONLY from the member's date of birth — never from a
 * client-supplied number (which could be tampered to shrink CPF). Returns null
 * when the DOB is absent or unparseable; per the member+DOB policy, null means
 * "CPF disabled" everywhere downstream — there is NO age-30 fallback.
 *
 * "Today" is pinned to Asia/Singapore so age doesn't tick a day early on a UTC
 * server at the date boundary, and YYYY-MM-DD strings are read by their calendar
 * parts (not new Date(), which would UTC-shift the day in negative offsets).
 */
export function resolveCpfAge(
  dateOfBirth: string | Date | null | undefined
): number | null {
  if (dateOfBirth == null) return null;

  // DOB calendar parts — prefer the literal YYYY-MM-DD parts to avoid UTC shift.
  let dobYear: number;
  let dobMonth: number; // 1-12
  let dobDay: number;
  if (typeof dateOfBirth === "string" && /^\d{4}-\d{2}-\d{2}/.test(dateOfBirth)) {
    dobYear = Number(dateOfBirth.slice(0, 4));
    dobMonth = Number(dateOfBirth.slice(5, 7));
    dobDay = Number(dateOfBirth.slice(8, 10));
  } else {
    const d = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
    if (Number.isNaN(d.getTime())) return null;
    dobYear = d.getFullYear();
    dobMonth = d.getMonth() + 1;
    dobDay = d.getDate();
  }

  // Today, in Asia/Singapore.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const todayYear = Number(parts.find((p) => p.type === "year")?.value);
  const todayMonth = Number(parts.find((p) => p.type === "month")?.value);
  const todayDay = Number(parts.find((p) => p.type === "day")?.value);

  let age = todayYear - dobYear;
  if (todayMonth < dobMonth || (todayMonth === dobMonth && todayDay < dobDay)) {
    age--;
  }
  return age >= 0 && age < 130 ? age : null;
}
