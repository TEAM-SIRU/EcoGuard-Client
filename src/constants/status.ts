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
