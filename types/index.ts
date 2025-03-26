export type UserRole = "employee" | "manager" | "admin"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  department?: string
  location?: string
  joinDate?: string
  status: "active" | "inactive"
}

export interface Employee extends User {
  managerId: string
  checkInStatus: "checked-in" | "checked-out"
  lastCheckIn?: Date
  totalKilometers: number
  farmerDataCount: number
}

export interface Manager extends User {
  employeeCount: number
  region: string
}

export interface FarmerData {
  id: string
  name: string
  phone: string
  email?: string
  crop: string
  location: string
  collectedBy: string
  collectedAt: Date
  products: string[]
}

export interface ActivityLog {
  id: string
  userId: string
  action: string
  timestamp: Date
  details?: Record<string, any>
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  status: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

