// src/lib/slug.ts

/**
 * Slug cohérent + robuste : supprime accents, ponctuation, met en minuscules,
 * remplace par des tirets et condense.
 */
export function slugify(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** conversion très simple de chiffres romains courants => nombre */
function romanToInt(s: string): number {
  const map: Record<string, number> = {
    m: 1000, d: 500, c: 100, l: 50, x: 10, v: 5, i: 1,
  };
  let res = 0;
  const r = (s || "").toLowerCase();
  for (let i = 0; i < r.length; i++) {
    const v = map[r[i]] || 0;
    const next = map[r[i + 1]] || 0;
    res += next > v ? next - v && (i++, next - v) : v;
  }
  return res || Number.POSITIVE_INFINITY;
}

/**
 * Retourne une "clé de tri" numérique si on trouve un numéro (chiffre ou romain)
 * dans le titre. Permet de choisir "le 1" d'abord quand on n'a pas d'ordre enregistré.
 */
export function numberKeyFromTitle(title?: string): number {
  if (!title) return Number.POSITIVE_INFINITY;

  // ex: "Dragon Quest XI" / "Final Fantasy 7" / "Resident Evil 2 Remake"
  const arabic = title.match(/(?<![a-z])(\d{1,3})(?![a-z])/i);
  if (arabic) return parseInt(arabic[1], 10);

  const roman = title.match(/\b([MDCLXVI]{1,6})\b/i);
  if (roman) return romanToInt(roman[1]);

  return Number.POSITIVE_INFINITY;
}

/* ------------------------------------------------------------------ */
/*                Helpers dédiés aux SLUGS DE SAGAS                   */
/* ------------------------------------------------------------------ */

/** saga -> slug : "" (jeux sans saga) => "jeux", sinon slugify */
export function toSlugSaga(saga?: string): string {
  const s = (saga ?? "").trim();
  if (s === "") return "jeux";
  return slugify(s);
}

/** slug -> saga : "jeux" => "" (clé logique), sinon "dragon-quest" => "dragon quest" */
export function fromSlugSaga(slug?: string): string {
  const s = (slug ?? "").trim().toLowerCase();
  if (s === "" || s === "jeux") return "";
  return s.replace(/-/g, " ").trim();
}
