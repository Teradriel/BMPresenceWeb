/** Date e ricorrenze delle presenze (stesse regole dell'app MAUI e del server). */

export const DOW = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const DOW3 = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven'];
export const MON = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const CODES = ['MO', 'TU', 'WE', 'TH', 'FR'];

const pad = (n: number): string => String(n).padStart(2, '0');

/** aaaa-mm-gg in ora locale */
export const iso = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromIso = (s: string): Date => new Date(`${s}T00:00:00`);
export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const addMonths = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};
/** 0 = lunedì … 6 = domenica */
export const weekday = (d: Date): number => (d.getDay() + 6) % 7;
export const monday = (d: Date): Date => addDays(new Date(d.getFullYear(), d.getMonth(), d.getDate()), -weekday(d));
export const ddmm = (d: Date): string => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
export const ddmmyyyy = (d: Date): string => `${ddmm(d)}/${d.getFullYear()}`;
export const isWeekend = (d: Date): boolean => d.getDay() === 0 || d.getDay() === 6;

export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 864e5 + 1) / 7);
}

/** Ultimo giorno ammesso per una serie che parte da `start`: 2 mesi, mai sabato o domenica. */
export function maxUntil(start: Date): Date {
  let d = addMonths(start, 2);
  while (isWeekend(d)) d = addDays(d, -1);
  return d;
}

/** FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=aaaammgg */
export function buildRule(weekdays: number[], until: Date): string {
  const days = [...weekdays].sort((a, b) => a - b).map((i) => CODES[i]);
  return `FREQ=WEEKLY;BYDAY=${days.join(',')};UNTIL=${iso(until).replaceAll('-', '')}`;
}

export function ruleDays(rule: string | null | undefined): number[] {
  const by = /BYDAY=([A-Z,]+)/.exec(rule ?? '')?.[1];
  return by ? by.split(',').map((c) => CODES.indexOf(c)).filter((i) => i >= 0) : [];
}

/** "Ogni lun, mer · fino al 04/12" oppure l'orario per una presenza singola */
export function describe(rule: string | null | undefined, day: Date): string {
  if (!rule) return '08:30 – 09:30';
  const days = ruleDays(rule);
  const list = (days.length ? days : [Math.min(weekday(day), 4)]).map((i) => DOW3[i].toLowerCase()).join(', ');
  const until = /UNTIL=(\d{4})(\d{2})(\d{2})/.exec(rule);
  return `Ogni ${list}${until ? ` · fino al ${until[3]}/${until[2]}` : ''}`;
}
