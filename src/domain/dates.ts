import type { ISODate } from '../db/types';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(now = new Date()): ISODate {
  return toISODate(now);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Whole days from a to b (b later = positive). DST-safe. */
export function daysBetween(a: ISODate, b: ISODate): number {
  const ua = Date.UTC(...ymd(a));
  const ub = Date.UTC(...ymd(b));
  return Math.round((ub - ua) / 86_400_000);
}

function ymd(s: ISODate): [number, number, number] {
  const [y, m, d] = s.split('-').map(Number);
  return [y, m - 1, d];
}

/** 0 = Monday. */
export function weekdayMon0(s: ISODate): number {
  return (parseISODate(s).getDay() + 6) % 7;
}

export function isoWeek(s: ISODate): number {
  const d = new Date(Date.UTC(...ymd(s)));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

export function weekdayName(s: ISODate): string {
  return WEEKDAYS[weekdayMon0(s)];
}
export function weekdayShort(s: ISODate): string {
  return WEEKDAYS[weekdayMon0(s)].slice(0, 3);
}
export function dayMonth(s: ISODate): string {
  const d = parseISODate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export function dayMonthTitle(s: ISODate): string {
  const d = parseISODate(s);
  const m = MONTHS[d.getMonth()];
  return `${d.getDate()} ${m[0]}${m.slice(1).toLowerCase()}`;
}

/** `HH:MM` → minutes since midnight. */
export function clockToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
