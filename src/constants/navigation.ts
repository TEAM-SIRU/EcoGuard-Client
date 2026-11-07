export type Page = 'today' | 'review' | 'appeals' | 'recruitment' | 'zones' | 'activity' | 'notices'

export const navigation: { id: Page; icon: string; label: string }[] = [
  { id: 'today', icon: '⌂', label: '오늘 현황' },
  { id: 'review', icon: '▣', label: '인증 검수' },
  { id: 'appeals', icon: '↗', label: '이의신청' },
  { id: 'zones', icon: '⌖', label: '청소구역' },
  { id: 'activity', icon: '▤', label: '학생 · 활동 기록' },
  { id: 'notices', icon: '▧', label: '공지 관리' },
  { id: 'recruitment', icon: '♧', label: '모집 관리' },
]

export const pageTitles: Record<Page, string> = {
  today: '오늘 현황',
  review: '인증 검수',
  appeals: '이의신청',
  recruitment: '모집 관리',
  zones: '청소구역 관리',
  activity: '학생 · 활동 기록',
  notices: '공지 관리',
}

export const pageSubtitles: Record<Page, string> = {
  today: '서버에 저장된 운영 현황을 확인해요.',
  review: 'AI가 판단하기 어려워 넘어온 사진이에요. 확인하면 학생 앱에 바로 결과가 보여요.',
  appeals: '학생이 제출한 이의신청을 확인하고 처리해요.',
  recruitment: '선착순 신청 현황과 모집 기간을 관리해요.',
  zones: '도면에서 청소구역을 활성화하고 담당 학생을 배정해요.',
  activity: '승인된 인증 1회당 10분을 활동 시간에 쌓아요. 행을 누르면 학생 상세로 가요.',
  notices: '학생 앱에 게시되는 공지를 관리해요.',
}
