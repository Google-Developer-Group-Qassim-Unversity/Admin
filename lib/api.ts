export const API_BASE_URL = process.env.NEXT_PUBLIC_DEV_HOST || process.env.NEXT_PUBLIC_HOST || "http://178.128.205.239:7001"

// API Endpoints
export const API_ENDPOINTS = {
  // Department endpoints
  departments: {
    list: "/departments",
    create: "/departments",
    update: (id: number) => `/departments/${id}`,
    delete: (id: number) => `/departments/${id}`,
  },
  // Member endpoints
  members: {
    list: "/members",
    create: "/members",
    update: (id: number) => `/members/${id}`,
    delete: (id: number) => `/members/${id}`,
  },
  // Event endpoints
  events: {
    list: "/events",
    create: "/events",
    update: (id: number) => `/events/${id}`,
    delete: (id: number) => `/events/${id}`,
  },
  // Action endpoints
  actions: {
    list: "/actions",
    create: "/actions",
    update: (id: number) => `/actions/${id}`,
    delete: (id: number) => `/actions/${id}`,
  },
  // Log endpoints
  logs: {
    list: "/logs",
    create: "/logs",
    update: (id: number) => `/logs/${id}`,
    delete: (id: number) => `/logs/${id}`,
  },
  // Department logs endpoints
  departmentLogs: {
    list: "/department-logs",
    create: "/department-logs",
    update: (id: number) => `/department-logs/${id}`,
    delete: (id: number) => `/department-logs/${id}`,
  },
  // Member logs endpoints
  memberLogs: {
    list: "/member-logs",
    create: "/member-logs",
    update: (id: number) => `/member-logs/${id}`,
    delete: (id: number) => `/member-logs/${id}`,
    bulkImport: "/member-logs/bulk-import",
  },
}

// Type definitions based on database schema
export interface Department {
  id: number
  name: string
}

export interface Member {
  id: number
  name: string
  email: string
  phone_number: string
  uni_id: string
  gender: "Male" | "Female"
}

export interface Event {
  id: number
  name: string
}

export interface Action {
  id: number
  name: string
  points: number
  requires_attendance?: boolean
  participation_types?: string[]
}

export interface Log {
  id: number
  action_id: number
  start_date: string
  end_date: string
  event_id: number
  action?: Action
  event?: Event
}

export interface DepartmentLog {
  id: number
  department_id: number
  log_id: number
  mf: string
  attendants_number: number
  department?: Department
  log?: Log
}

export interface MemberLog {
  id: number
  member_id: number
  log_id: number
  member?: Member
  log?: Log
}

// Mock data for development
export const MOCK_DATA = {
  departments: [
    { id: 1, name: "Engineering" },
    { id: 2, name: "Marketing" },
    { id: 3, name: "Sales" },
    { id: 4, name: "HR" },
  ] as Department[],

  members: [
    { id: 1, name: "John Doe", email: "john@example.com", phone_number: "123-456-7890", uni_id: "UNI001", gender: "Male" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", phone_number: "123-456-7891", uni_id: "UNI002", gender: "Female" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", phone_number: "123-456-7892", uni_id: "UNI003", gender: "Male" },
    { id: 4, name: "Alice Brown", email: "alice@example.com", phone_number: "123-456-7893", uni_id: "UNI004", gender: "Female" },
  ] as Member[],

  events: [
    { id: 1, name: "Annual Conference 2024" },
    { id: 2, name: "Team Building Workshop" },
    { id: 3, name: "Technical Training Session" },
    { id: 4, name: "Leadership Seminar" },
  ] as Event[],

  actions: [
    { id: 1, name: "Attend Event", points: 10, requires_attendance: true, participation_types: ["individual"] },
    { id: 2, name: "Create Event", points: 25, requires_attendance: false, participation_types: ["team"] },
    { id: 3, name: "Lead Workshop", points: 50, requires_attendance: true, participation_types: ["team"] },
    { id: 4, name: "Complete Training", points: 15, requires_attendance: false, participation_types: ["individual"] },
  ] as Action[],

  logs: [
    {
      id: 1,
      action_id: 1,
      start_date: "2024-01-15T09:00:00Z",
      end_date: "2024-01-15T17:00:00Z",
      event_id: 1,
    },
    {
      id: 2,
      action_id: 2,
      start_date: "2024-01-20T10:00:00Z",
      end_date: "2024-01-20T16:00:00Z",
      event_id: 2,
    },
  ] as Log[],

  departmentLogs: [
    {
      id: 1,
      department_id: 1,
      log_id: 1,
      mf: "M",
      attendants_number: 25,
    },
  ] as DepartmentLog[],

  memberLogs: [
    {
      id: 1,
      member_id: 1,
      log_id: 1,
    },
    {
      id: 2,
      member_id: 2,
      log_id: 1,
    },
  ] as MemberLog[],
}

// API helper functions (using mock data for now)
export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Return mock data based on endpoint
    if (endpoint.includes("/departments")) return MOCK_DATA.departments as T
    if (endpoint.includes("/members")) return MOCK_DATA.members as T
    if (endpoint.includes("/events")) return MOCK_DATA.events as T
    if (endpoint.includes("/actions")) return MOCK_DATA.actions as T
    if (endpoint.includes("/logs")) return MOCK_DATA.logs as T
    if (endpoint.includes("/department-logs")) return MOCK_DATA.departmentLogs as T
    if (endpoint.includes("/member-logs")) return MOCK_DATA.memberLogs as T

    throw new Error(`Mock data not found for endpoint: ${endpoint}`)
  },

  async post<T>(endpoint: string, data: any): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log("POST request to:", endpoint, "with data:", data)
    return { success: true, data } as T
  },

  async put<T>(endpoint: string, data: any): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log("PUT request to:", endpoint, "with data:", data)
    return { success: true, data } as T
  },

  async delete<T>(endpoint: string): Promise<T> {
    await new Promise((resolve) => setTimeout(resolve, 500))
    console.log("DELETE request to:", endpoint)
    return { success: true } as T
  },
}
