/**
 * T016 — lib/domain/sitecore-date.ts
 *
 * Parser for the Sitecore compact date format used in Authoring GraphQL responses.
 * Format: yyyyMMddTHHmmssZ (e.g. "20260509T183802Z")
 *
 * The captured fixture value is: __Updated: "20260509T183802Z"
 * Standard ISO-8601 would be "2026-05-09T18:38:02Z"; Sitecore omits the dashes and colons.
 *
 * Returns null on any malformed input — never throws.
 *
 * Pure module. Zero SDK dependency.
 */

/** Expected length of a valid Sitecore compact date string: 16 chars (yyyyMMddTHHmmssZ) */
const SITECORE_DATE_LENGTH = 16;

/**
 * Parse a Sitecore compact date string into a Date.
 *
 * @param value - Sitecore compact date string in "yyyyMMddTHHmmssZ" format
 * @returns A Date (UTC) or null if the input is malformed
 */
export function parseSitecoreCompactDate(value: string): Date | null {
  if (!value || value.length !== SITECORE_DATE_LENGTH) return null;

  // Must have T separator at position 8 and Z suffix at position 15
  if (value[8] !== 'T') return null;
  if (value[15] !== 'Z') return null;

  const year = parseInt(value.slice(0, 4), 10);
  const month = parseInt(value.slice(4, 6), 10); // 1-12
  const day = parseInt(value.slice(6, 8), 10);
  const hours = parseInt(value.slice(9, 11), 10);
  const minutes = parseInt(value.slice(11, 13), 10);
  const seconds = parseInt(value.slice(13, 15), 10);

  // Verify all parts parsed as numbers
  if (
    isNaN(year) || isNaN(month) || isNaN(day) ||
    isNaN(hours) || isNaN(minutes) || isNaN(seconds)
  ) {
    return null;
  }

  // month is 1-indexed in the input, 0-indexed in Date.UTC
  const d = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));

  // Validate that Date.UTC round-trips (e.g. month 13 would roll over to next year)
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day ||
    d.getUTCHours() !== hours ||
    d.getUTCMinutes() !== minutes ||
    d.getUTCSeconds() !== seconds
  ) {
    return null;
  }

  return d;
}
