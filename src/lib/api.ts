export type AssignedStudent = {
  studentId: number
  studentNumber: string | null
  name: string
}

export type CleaningArea = {
  areaId: number
  zoneCode: string
  name: string
  description: string | null
  cleanTime: string | null
  semester: 'COMMON' | 'FIRST' | 'SECOND' | string
  isActive: boolean
  assignedStudents: AssignedStudent[]
}

export type StudentResult = {
  studentId: number
  studentNumber: string | null
  name: string
  area: string | null
  photoUrl: string | null
  attendanceDays: number
  totalMinutes: number
}

export type UserSummary = { userId: number; name: string; role: 'STUDENT' | 'TEACHER' }
export type Session = { accessToken: string; refreshToken: string; user: UserSummary }

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'
const SESSION_KEY = 'ecoguard.session'

export function loadSession(): Session | null {
  try {
    const value = localStorage.getItem(SESSION_KEY)
    return value ? JSON.parse(value) as Session : null
  } catch {
    return null
  }
}

function storeSession(session: Session | null) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

async function request<T>(path: string, init: RequestInit = {}, allowRefresh = true): Promise<T> {
  const session = loadSession()
  const headers = new Headers(init.headers)
  if (session?.accessToken) headers.set('Authorization', `Bearer ${session.accessToken}`)
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (response.status === 401 && allowRefresh && session?.refreshToken && path !== '/auth/refresh') {
    const refreshed = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
    if (refreshed.ok) {
      const tokens = await refreshed.json() as Pick<Session, 'accessToken' | 'refreshToken'>
      const nextSession = { ...session, ...tokens }
      storeSession(nextSession)
      return request<T>(path, init, false)
    }
    storeSession(null)
    window.dispatchEvent(new Event('ecoguard:session-expired'))
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string; code?: string } | null
    if (response.status === 401) throw new Error('인증이 만료되었어요. 다시 로그인해 주세요.')
    if (response.status === 403) throw new Error('이 기능을 사용할 권한이 없습니다.')
    throw new Error(payload?.message || payload?.code || `서버 요청에 실패했어요. (${response.status})`)
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') return undefined as T
  const text = await response.text()
  return text ? JSON.parse(text) as T : undefined as T
}

export const api = {
  async login(authCode: string) {
    const session = await request<Session>('/auth/login', { method: 'POST', body: JSON.stringify({ authCode }) }, false)
    storeSession(session)
    return session
  },
  async logout() {
    try { await request<void>('/auth/logout', { method: 'POST' }) } finally { storeSession(null) }
  },
  getCleaningAreas: () => request<CleaningArea[]>('/cleaning-areas'),
  setAreaActive: (areaId: number, isActive: boolean) => request<void>(`/cleaning-areas/${areaId}`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  searchStudents: (keyword: string) => request<StudentResult[]>(`/students/activities?keyword=${encodeURIComponent(keyword)}`),
  assignStudents: (areaId: number, studentIds: number[]) => request<{ assignmentId: number; studentId: number }[]>(`/cleaning-areas/${areaId}/assignments`, { method: 'POST', body: JSON.stringify({ studentIds }) }),
}
