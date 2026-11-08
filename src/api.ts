import type {
  Appeal,
  Applicant,
  Area,
  Notice,
  NoticeDetail,
  Profile,
  Recruitment,
  ReviewItem,
  StudentActivity,
  StudentMonth,
  WeeklyService,
} from './types'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.DEV ? '/api/v1' : 'https://ecoguard.https.gsmsv.site/api/v1')
).replace(/\/$/, '')

type TokenPair = { accessToken: string; refreshToken: string }
type ApiErrorBody = { code?: string; message?: string }

export class ApiError extends Error {
  readonly status: number
  readonly code?: string
  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

let tokens: TokenPair | null = readTokens()
let refreshPromise: Promise<boolean> | null = null
const unauthorizedListeners = new Set<() => void>()

function readTokens(): TokenPair | null {
  try {
    const value = sessionStorage.getItem('ecoguard.tokens')
    return value ? (JSON.parse(value) as TokenPair) : null
  } catch {
    return null
  }
}

function saveTokens(value: TokenPair | null) {
  tokens = value
  if (value) sessionStorage.setItem('ecoguard.tokens', JSON.stringify(value))
  else sessionStorage.removeItem('ecoguard.tokens')
}

export function hasSession() {
  return Boolean(tokens?.accessToken)
}
export function onUnauthorized(listener: () => void) {
  unauthorizedListeners.add(listener)
  return () => {
    unauthorizedListeners.delete(listener)
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers)
  if (!(init.body instanceof FormData) && init.body !== undefined)
    headers.set('Content-Type', 'application/json')
  if (tokens?.accessToken) headers.set('Authorization', `Bearer ${tokens.accessToken}`)
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  if (
    response.status === 401 &&
    retry &&
    tokens?.refreshToken &&
    path !== '/auth/refresh' &&
    path !== '/auth/login'
  ) {
    if (!refreshPromise)
      refreshPromise = refreshTokens().finally(() => {
        refreshPromise = null
      })
    if (await refreshPromise) return request<T>(path, init, false)
    saveTokens(null)
    unauthorizedListeners.forEach((listener) => listener())
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody
    throw new ApiError(
      body.message ?? `서버 요청에 실패했어요. (${response.status})`,
      response.status,
      body.code,
    )
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

async function refreshTokens() {
  if (!tokens?.refreshToken) return false
  try {
    const next = await request<TokenPair>(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      },
      false,
    )
    saveTokens(next)
    return true
  } catch {
    return false
  }
}

export async function login(authCode: string, redirectUri: string) {
  const result = await request<
    TokenPair & { user: { userId: number; name: string; role: string } }
  >(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ authCode, redirectUri }),
    },
    false,
  )
  saveTokens(result)
  return result.user
}

export async function logout() {
  try {
    await request<void>('/auth/logout', { method: 'POST' })
  } finally {
    saveTokens(null)
  }
}

type RecruitmentResponse = Omit<Recruitment, 'isFull'> & { full: boolean }
type NoticeResponse = Omit<Notice, 'isRead'> & { read: boolean }

export const api = {
  me: () => request<Profile>('/users/me'),
  reviews: () => request<ReviewItem[]>('/verifications'),
  decideReview: (id: number, decision: 'APPROVED' | 'REJECTED', reason?: string) =>
    request<void>(`/verifications/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({
        decision,
        ...(reason?.trim() ? { reason: reason.trim() } : {}),
      }),
    }),
  appeals: (status = 'PENDING') =>
    request<Appeal[]>(`/appeals?status=${encodeURIComponent(status)}`),
  decideAppeal: (
    id: number,
    decision: 'APPROVED' | 'REJECTED',
    reply: string,
    replyTitle: string,
  ) =>
    request<void>(`/appeals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ decision, reply, replyTitle }),
    }),
  recruitments: async () => {
    const items = await request<RecruitmentResponse[]>('/recruitments')
    return items.map(({ full, ...item }) => ({ ...item, isFull: full }))
  },
  applicants: (id: number) => request<Applicant[]>(`/recruitments/${id}/applications`),
  createRecruitment: (body: unknown) =>
    request<{ recruitmentId: number }>('/recruitments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateRecruitment: (id: number, body: unknown) =>
    request<void>(`/recruitments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteRecruitment: (id: number) => request<void>(`/recruitments/${id}`, { method: 'DELETE' }),
  areas: async () => {
    return request<Area[]>('/cleaning-areas')
  },
  updateArea: (id: number, isActive: boolean) =>
    request<void>(`/cleaning-areas/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
    }),
  assignStudents: (id: number, studentIds: number[]) =>
    request<unknown>(`/cleaning-areas/${id}/assignments`, {
      method: 'POST',
      body: JSON.stringify({ studentIds }),
    }),
  removeAssignment: (areaId: number, studentId: number) =>
    request<void>(`/cleaning-areas/${areaId}/assignments/${studentId}`, { method: 'DELETE' }),
  searchStudents: async (keyword: string) => {
    try {
      return await request<StudentActivity[]>(
        `/students/activities${keyword ? `?keyword=${encodeURIComponent(keyword)}` : ''}`,
      )
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && error.code === 'NO_SEARCH_RESULT')
        return []
      throw error
    }
  },
  studentMonth: (id: number, year: number, month: number) =>
    request<StudentMonth>(`/students/${id}/activities?year=${year}&month=${month}`),
  weeklyService: () => request<WeeklyService>('/service-times/weekly'),
  notices: async () => {
    const items = await request<NoticeResponse[]>('/notices')
    return items.map(({ read, ...notice }) => ({ ...notice, isRead: read }))
  },
  notice: (id: number) => request<NoticeDetail>(`/notices/${id}`),
  createNotice: (title: string, content: string) =>
    request<{ noticeId: number }>('/notices', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    }),
  updateNotice: (id: number, title: string, content: string) =>
    request<void>(`/notices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ title, content }),
    }),
  deleteNotice: (id: number) => request<void>(`/notices/${id}`, { method: 'DELETE' }),
}

export function publicFileUrl(path: string) {
  try {
    const base = new URL(API_BASE, window.location.origin)
    return new URL(path, `${base.toString().replace(/\/$/, '')}/`).toString()
  } catch {
    return path
  }
}

export function getOAuthRedirectUri() {
  return 'https://ecoguard-web.https.gsmsv.site'
}

export function createOAuthAuthorizationRequest(state: string) {
  const redirectUri = getOAuthRedirectUri()
  const authorizationUrl =
    (import.meta.env.VITE_GSM_AUTHORIZATION_URL as string | undefined) ??
    'https://oauth.authorization.datagsm.kr/v1/oauth/authorize'
  const url = new URL(authorizationUrl)
  // Some deployments provide the complete DataGSM authorization URL, including
  // its public client_id. Prefer the explicit variable when both are present.
  const clientId =
    (import.meta.env.VITE_GSM_CLIENT_ID as string | undefined)?.trim() ||
    url.searchParams.get('client_id')?.trim()
  if (!clientId || !redirectUri) return null

  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)

  return { url: url.toString(), redirectUri }
}
