import type { User } from './auth'
import type { ISODate, MoneyAmount, PageParams } from './common'

/** Row in GET /admin/users. */
export interface AdminUser extends User {
  invoice_count: number
  client_count: number
}

/** PUT /admin/users/{id} */
export interface AdminUserUpdate {
  is_active?: boolean
  is_admin?: boolean
}

/** GET /admin/users query params. */
export interface AdminUserListParams extends PageParams {
  q?: string
}

export interface SignupsPoint {
  /** Monday of the ISO week. */
  week_start: ISODate
  count: number
}

/** GET /admin/stats */
export interface AdminStats {
  total_users: number
  active_users: number
  signups_this_week: number
  signups_per_week: SignupsPoint[]
  invoices_created: number
  invoiced_volume: MoneyAmount[]
}
