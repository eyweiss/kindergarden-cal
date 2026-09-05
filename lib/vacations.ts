// Kindergarten vacation calendar — ה'תשפ"ז / 2026–27.
// Source: לוח_חופשות_גן_תשפז.ics. Date ranges follow the iCal convention where
// `end` is exclusive (the first day the kindergarten is open again).
//
//  - "break"  → kindergarten closed
//  - "camp"   → optional paid day camp (קייטנה) running during a break
//  - "note"   → kindergarten open, but with a schedule change

export type VacationKind = "break" | "camp" | "note";

export type Vacation = {
  start: string; // inclusive, YYYY-MM-DD
  end: string;   // exclusive, YYYY-MM-DD
  kind: VacationKind;
  he: string;
  en: string;
  ru: string;
};

export const VACATIONS: Vacation[] = [
  { start: "2026-09-11", end: "2026-09-14", kind: "break",
    he: "חופשת ראש השנה", en: "Rosh Hashanah break", ru: "Каникулы Рош ха-Шана" },
  { start: "2026-09-20", end: "2026-10-04", kind: "break",
    he: "חופשת סוכות", en: "Sukkot break", ru: "Каникулы Суккот" },
  { start: "2026-09-22", end: "2026-09-25", kind: "camp",
    he: "קייטנה (גשר כיפור–סוכות)", en: "Day camp (Yom Kippur–Sukkot bridge)", ru: "Лагерь (Йом-Кипур–Суккот)" },
  { start: "2026-12-06", end: "2026-12-13", kind: "break",
    he: "חופשת חנוכה", en: "Hanukkah break", ru: "Каникулы Ханука" },
  { start: "2026-12-06", end: "2026-12-11", kind: "camp",
    he: "קייטנה (חנוכה)", en: "Day camp (Hanukkah)", ru: "Лагерь (Ханука)" },
  { start: "2027-03-23", end: "2027-03-25", kind: "break",
    he: "חופשת פורים", en: "Purim break", ru: "Каникулы Пурим" },
  { start: "2027-04-13", end: "2027-04-29", kind: "break",
    he: "חופשת פסח", en: "Passover break", ru: "Каникулы Песах" },
  { start: "2027-04-13", end: "2027-04-16", kind: "camp",
    he: "קייטנה (לפני ערב פסח)", en: "Day camp (before Passover eve)", ru: "Лагерь (перед кануном Песаха)" },
  { start: "2027-04-18", end: "2027-04-20", kind: "camp",
    he: "קייטנה (לפני ערב פסח – המשך)", en: "Day camp (before Passover eve, cont.)", ru: "Лагерь (перед кануном Песаха, продолж.)" },
  { start: "2027-05-11", end: "2027-05-12", kind: "note",
    he: "יום הזיכרון — הגן מסיים ב-12:00 (אין חופש)", en: "Memorial Day — kindergarten ends at 12:00 (no day off)", ru: "День памяти — сад закрывается в 12:00 (без выходного)" },
  { start: "2027-05-12", end: "2027-05-13", kind: "break",
    he: "חופשת יום העצמאות", en: "Independence Day break", ru: "Каникулы День независимости" },
  { start: "2027-06-10", end: "2027-06-12", kind: "break",
    he: "חופשת שבועות", en: "Shavuot break", ru: "Каникулы Шавуот" },
];

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Every vacation entry covering the given date (a break and its day camp can
// overlap), breaks first.
export function getVacationsForDate(date: Date): Vacation[] {
  const iso = toISO(date);
  return VACATIONS
    .filter(v => iso >= v.start && iso < v.end)
    .sort((a, b) => (a.kind === "break" ? -1 : 1) - (b.kind === "break" ? -1 : 1));
}
