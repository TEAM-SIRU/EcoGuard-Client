import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Appeal, Area, ReviewItem, StudentMonth, WeeklyService } from '../types'
import { Card, CardTitle } from '../components/Card'
import type { Page } from '../constants/navigation'
import { STATUS_CLASS_NAMES, STATUS_LABELS } from '../constants/status'
import type { TodayStatus } from '../constants/status'
import { formatTime, getMonday, toDateKey } from '../lib/date'

type TodayStudent = {
  studentId: number
  studentNumber: string | null
  name: string
  area: string
  status: TodayStatus
  records: StudentMonth['records']
}
type TodayFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED'

export function Dashboard({
  reviews,
  appeals,
  areas,
  date,
  preview = false,
  previewStatuses,
  onNavigate,
}: {
  reviews: ReviewItem[]
  appeals: Appeal[]
  areas: Area[]
  date: Date
  preview?: boolean
  previewStatuses: TodayStatus[]
  onNavigate: (page: Page) => void
}) {
  const [todayStudents, setTodayStudents] = useState<TodayStudent[]>([])
  const [todayLoading, setTodayLoading] = useState(false)
  const [weeklyService, setWeeklyService] = useState<WeeklyService | null>(null)
  const [todayFilter, setTodayFilter] = useState<TodayFilter>('ALL')
  const dateKey = toDateKey(date)

  useEffect(() => {
    if (preview) return
    let cancelled = false
    api
      .weeklyService()
      .then((result) => {
        if (!cancelled) setWeeklyService(result)
      })
      .catch(() => {
        if (!cancelled) setWeeklyService(null)
      })
    return () => {
      cancelled = true
    }
  }, [preview])

  useEffect(() => {
    const roster = new Map<number, TodayStudent>()
    areas.forEach((area) =>
      area.assignedStudents.forEach((student) => {
        roster.set(student.studentId, {
          ...student,
          area: area.name,
          status: 'UNKNOWN',
          records: [],
        })
      }),
    )
    const students = [...roster.values()]
    if (preview) {
      const monday = getMonday(date)
      const previewResults: TodayStudent[] = students.map((student, index) => {
        const records: StudentMonth['records'] = Array.from({ length: 5 }, (_, dayIndex) => {
          const day = new Date(monday)
          day.setDate(monday.getDate() + dayIndex)
          const recordDate = toDateKey(day)
          const submitted = index < [22, 21, 18, 0, 0][dayIndex]
          return {
            date: recordDate,
            area: student.area,
            result: submitted ? 'APPROVED' : 'NOT_SUBMITTED',
            verificationId: submitted ? index * 5 + dayIndex : null,
            photoUrl: null,
            minutes: submitted ? 10 : 0,
          }
        })
        return { ...student, status: previewStatuses[index] ?? 'NOT_SUBMITTED', records }
      })
      void Promise.resolve().then(() => {
        setTodayStudents(previewResults)
        setTodayLoading(false)
      })
      return
    }
    if (!students.length) {
      let cancelled = false
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setTodayStudents([])
          setTodayLoading(false)
        }
      })
      return () => {
        cancelled = true
      }
    }
    let cancelled = false
    let next = 0
    const results: TodayStudent[] = new Array(students.length)
    queueMicrotask(() => {
      if (!cancelled) setTodayLoading(true)
    })
    async function worker() {
      while (next < students.length) {
        const index = next++
        const student = students[index]
        let status: TodayStatus = 'UNKNOWN'
        let records: StudentMonth['records'] = []
        try {
          const month = await api.studentMonth(
            student.studentId,
            date.getFullYear(),
            date.getMonth() + 1,
          )
          records = month.records
          status =
            (month.records.find((record) => record.date === dateKey)?.result as
              TodayStatus | undefined) ?? 'UPCOMING'
        } catch {
          /* Show the rest of the dashboard if one student's record is unavailable. */
        }
        results[index] = { ...student, status, records }
      }
    }
    void Promise.all(Array.from({ length: Math.min(6, students.length) }, () => worker())).then(
      () => {
        if (!cancelled) {
          setTodayStudents(results)
          setTodayLoading(false)
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [areas, dateKey, date, preview, previewStatuses])

  const submitted = todayStudents.filter((student) =>
    ['APPROVED', 'REJECTED', 'PROCESSING', 'MANUAL_REVIEW'].includes(student.status),
  ).length
  const approved = todayStudents.filter((student) => student.status === 'APPROVED').length
  const notSubmitted = todayStudents.filter((student) => student.status === 'NOT_SUBMITTED').length
  const stats = [
    {
      label: '제출',
      value: submitted,
      suffix: `/${todayStudents.length}명`,
      target: 'activity' as Page,
      tone: '',
    },
    { label: '승인', value: approved, target: 'activity' as Page, tone: '' },
    {
      label: '선생님 확인 대기 ›',
      value: reviews.length,
      target: 'review' as Page,
      tone: 'highlight',
    },
    { label: '이의신청 ›', value: appeals.length, target: 'appeals' as Page, tone: 'muted' },
    { label: '미제출', value: notSubmitted, target: 'activity' as Page, tone: '' },
  ]
  const latest = [
    ...reviews.slice(0, 2).map((item) => ({
      type: `선생님 확인 · ${formatTime(item.submittedAt)}`,
      title: `${item.studentName} · ${item.areaName}`,
      detail: item.reason || item.failReasons.join(', ') || 'AI가 판단하기 어려운 사진',
      page: 'review' as Page,
    })),
    ...appeals.slice(0, 1).map((item) => ({
      type: '이의신청 · 확인 필요',
      title: `${item.studentName} · ${item.areaName}`,
      detail: item.content,
      page: 'appeals' as Page,
    })),
    ...reviews.slice(2).map((item) => ({
      type: `선생님 확인 · ${formatTime(item.submittedAt)}`,
      title: `${item.studentName} · ${item.areaName}`,
      detail: item.reason || item.failReasons.join(', ') || 'AI가 판단하기 어려운 사진',
      page: 'review' as Page,
    })),
  ].slice(0, 3)
  const pending = (student: TodayStudent) =>
    student.status === 'PROCESSING' || student.status === 'MANUAL_REVIEW'
  const filters: { id: TodayFilter; label: string; count: number }[] = [
    { id: 'ALL', label: '전체', count: todayStudents.length },
    { id: 'PENDING', label: '확인 대기', count: todayStudents.filter(pending).length },
    {
      id: 'APPROVED',
      label: '승인',
      count: todayStudents.filter((student) => student.status === 'APPROVED').length,
    },
    {
      id: 'REJECTED',
      label: '반려',
      count: todayStudents.filter((student) => student.status === 'REJECTED').length,
    },
    {
      id: 'NOT_SUBMITTED',
      label: '미제출',
      count: todayStudents.filter((student) => student.status === 'NOT_SUBMITTED').length,
    },
  ]
  const filteredStudents = todayStudents.filter(
    (student) =>
      todayFilter === 'ALL' ||
      (todayFilter === 'PENDING' ? pending(student) : student.status === todayFilter),
  )
  const weekDays = Array.from({ length: 5 }, (_, index) => {
    const monday = getMonday(date)
    const day = new Date(monday)
    day.setDate(monday.getDate() + index)
    const key = toDateKey(day)
    const active = todayStudents.filter((student) =>
      student.records.some((record) => record.date === key && record.result !== 'NOT_SUBMITTED'),
    ).length
    const summary = weeklyService?.days.find((item) => item.date === key)
    return {
      label: ['월', '화', '수', '목', '금'][index],
      percent:
        summary?.participationRate ??
        (todayStudents.length ? Math.round((active / todayStudents.length) * 100) : 0),
    }
  })
  const todayIndex = date.getDay() >= 1 && date.getDay() <= 5 ? date.getDay() - 1 : -1
  return (
    <>
      <div className="stats-grid dashboard-stats">
        {stats.map(({ label, value, suffix, target, tone }) => (
          <button className={`stat-card ${tone}`} key={label} onClick={() => onNavigate(target)}>
            <span>{label}</span>
            <strong>
              {value}
              {suffix && <small>{suffix}</small>}
            </strong>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <Card className="dashboard-table">
          <div className="card-title dashboard-table-title">
            <h2>학생별 오늘 인증</h2>
            <div className="dashboard-filters" role="tablist" aria-label="오늘 활동 상태">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={todayFilter === filter.id}
                  className={todayFilter === filter.id ? 'active' : ''}
                  onClick={() => setTodayFilter(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>학생</th>
                  <th>구역</th>
                  <th>제출</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => {
                  const review = reviews.find(
                    (item) => item.studentName === student.name && item.areaName === student.area,
                  )
                  const submittedAt = review ? formatTime(review.submittedAt) : '—'
                  return (
                    <tr key={student.studentId}>
                      <td>
                        <b>{student.name}</b>
                        <small>{student.studentNumber ?? '학번 없음'}</small>
                      </td>
                      <td>{student.area}</td>
                      <td>{submittedAt}</td>
                      <td>
                        <span className={`status status-${STATUS_CLASS_NAMES[student.status]}`}>
                          {STATUS_LABELS[student.status]}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                {!filteredStudents.length && (
                  <tr className="dashboard-empty-row">
                    <td colSpan={4}>
                      {todayLoading
                        ? '오늘 현황을 불러오는 중…'
                        : todayStudents.length
                          ? '이 상태의 학생이 없습니다.'
                          : '배정된 학생이 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="dashboard-side">
          <Card className="attention-card">
            <CardTitle title="확인이 필요해요" />
            <div className="attention-list">
              {latest.length ? (
                latest.map((item, index) => (
                  <button
                    key={`${item.type}-${index}`}
                    className={`attention-row ${item.page === 'appeals' ? 'appeal' : ''}`}
                    onClick={() => onNavigate(item.page)}
                  >
                    <small>{item.type}</small>
                    <b>{item.title}</b>
                    <span>{item.detail}</span>
                  </button>
                ))
              ) : (
                <div className="dashboard-quiet">확인이 필요한 항목이 없어요.</div>
              )}
            </div>
          </Card>
          <Card className="week-card">
            <div className="week-heading">
              <b>이번 주 참여율</b>
              <span>제출 / 배정 인원</span>
            </div>
            <div className="week-bars">
              {weekDays.map((day, index) => (
                <div key={day.label}>
                  <b>{day.percent ? `${day.percent}%` : '—'}</b>
                  <i
                    style={{
                      height: `${Math.max(day.percent, 3)}%`,
                      background: index === todayIndex ? '#57c144' : '#edf8eb',
                    }}
                  />
                  <small>{day.label}</small>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
