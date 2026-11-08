export type Profile = {
  userId: number
  name: string
  role: 'TEACHER' | 'STUDENT'
  studentNumber: string | null
  grade: number | null
  classNo: number | null
}

export type ReviewItem = {
  verificationId: number
  studentName: string
  areaName: string
  photoUrl: string
  submittedAt: string
  reason: string | null
  failReasons: string[]
}

export type Appeal = {
  appealId: number
  verificationId: number
  round: number
  studentName: string
  studentNumber: string | null
  areaName: string
  verificationDate: string
  photoUrl: string
  failReasons: string[]
  content: string
  photoUrls: string[]
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  replyTitle: string | null
  reply: string | null
  createdAt: string
}

export type Recruitment = {
  recruitmentId: number
  semester: string
  grade: number
  classNo: number
  period: { start: string; end: string }
  activityTime: { start: string; end: string }
  periodStatus: string
  maxCount: number
  applicantCount: number
  isFull: boolean
}

export type Applicant = {
  applicationId: number
  order: number
  studentNumber: string | null
  name: string
  motivation: string
  status: string
  appliedAt: string
}

export type Area = {
  areaId: number
  zoneCode: string
  name: string
  description: string | null
  cleanTime: string | null
  semester: string
  isActive: boolean
  assignedStudents: { studentId: number; studentNumber: string | null; name: string }[]
}

export type StudentActivity = {
  studentId: number
  studentNumber: string | null
  name: string
  area: string | null
  photoUrl: string | null
  attendanceDays: number
  totalMinutes: number
}

export type ActivityRecord = {
  date: string
  area: string | null
  result: string
  verificationId: number | null
  photoUrl: string | null
  minutes: number
}

export type StudentMonth = {
  totalMinutes: number
  year: number
  month: number
  monthlyMinutes: number
  summary: {
    completedDays: number
    requiredDays: number
    approvedCount: number
    rejectedCount: number
    notSubmittedCount: number
  }
  records: ActivityRecord[]
}

export type WeeklyService = {
  weekStart: string
  weekEnd: string
  assignedCount: number
  days: { date: string; submittedCount: number; approvedCount: number; participationRate: number }[]
}

export type Notice = {
  noticeId: number
  title: string
  preview: string
  isRead: boolean
  createdAt: string
}

export type NoticeDetail = {
  noticeId: number
  title: string
  content: string
  createdAt: string
  previousNoticeId: number | null
  nextNoticeId: number | null
}
