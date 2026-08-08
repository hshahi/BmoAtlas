import type { MatDateFormats } from '@angular/material/core';
import { DateTime } from 'luxon';

/** Default display/parse format for the Material date components (Luxon tokens). */
export const DEFAULT_DATE_FORMAT = 'dd-MMM-yyyy';

/** Fallback parse formats accepted in addition to the primary format. */
const FALLBACK_PARSE = ['yyyy-MM-dd', 'D', 'DD'];

/**
 * Build a `MatDateFormats` for the Luxon adapter from a single Luxon format
 * string. Drives BOTH display (`format`) and typed parsing (`parse`, which the
 * Luxon adapter accepts as an array of accepted formats).
 */
export function buildLuxonFormats(fmt: string = DEFAULT_DATE_FORMAT): MatDateFormats {
  return {
    parse: { dateInput: [fmt, ...FALLBACK_PARSE] },
    display: {
      dateInput: fmt,
      monthYearLabel: 'LLL yyyy',
      dateA11yLabel: 'DD',
      monthYearA11yLabel: 'LLLL yyyy',
    },
  };
}

/**
 * Mutate an existing (per-component) `MatDateFormats` in place to a new format.
 * Used so each date component can honour a per-column `dateFormat` param while
 * still sharing the globally-provided Luxon adapter.
 */
export function applyDateFormat(formats: MatDateFormats, fmt: string): void {
  formats.display.dateInput = fmt;
  formats.parse.dateInput = [fmt, ...FALLBACK_PARSE];
}

/** Coerce a JS Date / Luxon DateTime / ISO string into a (valid) Luxon DateTime or null. */
export function toDateTime(value: unknown): DateTime | null {
  if (value == null) return null;
  if (value instanceof DateTime) return value.isValid ? value : null;
  if (value instanceof Date) {
    const dt = DateTime.fromJSDate(value);
    return dt.isValid ? dt : null;
  }
  if (typeof value === 'string') {
    const dt = DateTime.fromISO(value);
    return dt.isValid ? dt : null;
  }
  return null;
}

/** Convert a Luxon DateTime (or Date) to a JS Date, or null. */
export function toJsDate(value: DateTime | Date | null | undefined): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  return value.isValid ? value.toJSDate() : null;
}

/** Format a date value with a Luxon format (default dd-MMM-yyyy). Empty string if invalid. */
export function formatDate(value: unknown, fmt: string = DEFAULT_DATE_FORMAT): string {
  const dt = toDateTime(value);
  return dt ? dt.toFormat(fmt) : '';
}

/**
 * Day-granularity comparator (ignores time): -1 if a<b, 1 if a>b, 0 if equal.
 * Nulls sort first. Suitable for AG Grid `colDef.comparator`.
 */
export function compareDatesByDay(a: unknown, b: unknown): number {
  const da = toDateTime(a)?.startOf('day') ?? null;
  const db = toDateTime(b)?.startOf('day') ?? null;
  if (!da && !db) return 0;
  if (!da) return -1;
  if (!db) return 1;
  return da < db ? -1 : da > db ? 1 : 0;
}

/** AG Grid date filter model — matches the built-in date filter shape for interop. */
export interface DateFilterModel {
  filterType: 'date';
  type: 'equals' | 'before' | 'after' | 'inRange';
  /** 'yyyy-MM-dd HH:mm:ss' (AG Grid's canonical date-model string) or null. */
  dateFrom: string | null;
  dateTo: string | null;
}

/** Combined (two-condition) model — matches AG Grid's combined-filter shape. */
export interface CombinedDateFilterModel {
  filterType: 'date';
  operator: 'AND' | 'OR';
  conditions: DateFilterModel[];
}

/** Either a single- or two-condition date model. */
export type AnyDateFilterModel = DateFilterModel | CombinedDateFilterModel;

/** Type guard for the combined model. */
export function isCombinedModel(m: AnyDateFilterModel): m is CombinedDateFilterModel {
  return (m as CombinedDateFilterModel).operator !== undefined;
}

const MODEL_FORMAT = 'yyyy-MM-dd HH:mm:ss';

/** Serialize a JS Date to AG Grid's date-model string. */
export function toModelString(value: Date | null): string | null {
  const dt = toDateTime(value);
  return dt ? dt.toFormat(MODEL_FORMAT) : null;
}

/** Parse AG Grid's date-model string back to a JS Date. */
export function fromModelString(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dt = DateTime.fromFormat(value, MODEL_FORMAT);
  return dt.isValid ? dt.toJSDate() : DateTime.fromISO(value).toJSDate();
}
