export type TodayStatus =
  | 'APPROVED'
  | 'REJECTED'
  | 'PROCESSING'
  | 'MANUAL_REVIEW'
  | 'NOT_SUBMITTED'
  | 'UPCOMING'
  | 'UNKNOWN'

export const STATUS_LABELS: Record<TodayStatus, string> = {
  APPROVED: '승인',
  REJECTED: '반려',
  PROCESSING: '확인 대기',
  MANUAL_REVIEW: '확인 대기',
  NOT_SUBMITTED: '미제출',
  UPCOMING: '예정',
  UNKNOWN: '확인 불가',
}

export const STATUS_CLASS_NAMES: Record<TodayStatus, string> = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PROCESSING: 'processing',
  MANUAL_REVIEW: 'manual-review',
  NOT_SUBMITTED: 'not-submitted',
  UPCOMING: 'upcoming',
  UNKNOWN: 'unknown',
}

export const APPEAL_STATUS_LABELS = {
  PENDING: '대기',
  APPROVED: '승인',
  REJECTED: '반려',
} as const
