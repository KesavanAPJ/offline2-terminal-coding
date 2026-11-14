/**
 * Shared API primitives.
 *
 * Contract conventions (mirror backend Pydantic schemas):
 * - JSON keys are snake_case.
 * - Money / decimal values are serialized as strings (e.g. "1234.50", rate "0.2000").
 * - Dates are ISO strings "YYYY-MM-DD"; datetimes are ISO 8601 strings with timezone.
 */

/** Decimal value serialized as a string, e.g. "1234.50". Never parse with Number for math; use decimal.js. */
export type DecimalString = string

/** Calendar date, "YYYY-MM-DD". */
export type ISODate = string

/** Timestamp, ISO 8601 with timezone, e.g. "2026-11-14T10:00:00Z". */
export type ISODateTime = string

/** ISO-4217 currency code, e.g. "USD". */
export type CurrencyCode = string

/** Paginated list response. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

/** Common pagination query parameters. */
export interface PageParams {
  page?: number
  size?: number
}

/** An amount in a specific currency (totals are grouped per currency). */
export interface MoneyAmount {
  currency: CurrencyCode
  amount: DecimalString
}

/** A single FastAPI validation error entry (422). */
export interface ValidationErrorItem {
  loc: (string | number)[]
  msg: string
  type: string
}

/** Error body returned by the API. `detail` is a string for HTTPException, a list for 422s. */
export interface ApiError {
  detail: string | ValidationErrorItem[]
}

/** Generic `{ message }` acknowledgement body. */
export interface MessageResponse {
  message: string
}
