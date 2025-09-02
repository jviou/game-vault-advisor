// Robust, centralized slug + saga normalization
// - Treats hyphens and other separators as spaces (so "HALF-LIFE" == "HALF LIFE")
// - Removes accents/diacritics
// - Deduplicates whitespace
// - Uppercases for display-normalized saga names
// - Lowercases + hyphen-joins for URL slugs

function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalize a saga name for grouping/uniqueness (DISPLAY KEY).
 * Examples:
 *  - "Half-Life", "Half Life", "HALF-LIFE" -> "HALF LIFE"
 *  - "Crash: Bandicoot" -> "CRASH BANDICOOT"
 */
export function normalizeSaga(raw?: string | null): string {
  if (!raw) return "";
  let s = stripDiacritics(String(raw));

  // Unify separators as spaces (hyphen, underscore, dot, slash, colon, pipe…)
  s = s.replace(/[-_.:/\\|]+/g, " ");

  // Remove remaining non-alphanumeric except spaces
  s = s.replace(/[^a-zA-Z0-9 ]+/g, " ");

  // Collapse repeated spaces and trim
  s = s.replace(/\s+/g, " ").trim();

  // Uppercase for canonical display/group key
  return s.toUpperCase();
}

/**
 * Create a URL-safe slug from any label.
 * Examples:
 *  - "HALF LIFE" -> "half-life"
 *  - "Crash Bandicoot" -> "crash-bandicoot"
 */
export function slugify(raw?: string | null): string {
  if (!raw) return "";
  let s = stripDiacritics(String(raw));

  // Same separator policy, but final form is hyphen-joined lowercase
  s = s.replace(/[-_.:/\\|]+/g, " ");
  s = s.replace(/[^a-zA-Z0-9 ]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  return s.toLowerCase().replace(/ /g, "-");
}
