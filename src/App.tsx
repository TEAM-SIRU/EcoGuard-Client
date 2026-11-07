import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import leafLogo from './assets/leaf-logo.svg'
import { api, ApiError, hasSession, login, logout, onUnauthorized } from './api'
import type {
  Applicant,
  Appeal,
  Area,
  Notice,
  NoticeDetail,
  Profile,
  Recruitment as RecruitmentRecord,
  ReviewItem,
  StudentActivity,
  StudentMonth,
} from './types'
import { ERROR_MESSAGES } from './constants/errorMessages'
import { navigation, pageSubtitles, pageTitles } from './constants/navigation'
import type { Page } from './constants/navigation'
import { Modal } from './components/Modal'
import { MonthPicker } from './components/MonthPicker'
import { exportStudentsCsv } from './lib/csv'
import { Login } from './pages/LoginPage'
import { Dashboard } from './pages/DashboardPage'
import { Review } from './pages/ReviewPage'
import { Appeals } from './pages/AppealsPage'
import { Recruitment, Applicants, RecruitmentForm } from './pages/RecruitmentPage'
import { Zones, AssignmentForm } from './pages/ZonesPage'
import { Activity, StudentDetail } from './pages/ActivityPage'
import { Notices } from './pages/NoticesPage'
import { createPreviewData } from './mocks/preview'
import './App.css'

const EMPTY_REVIEWS: ReviewItem[] = []
const EMPTY_APPEALS: Appeal[] = []
const EMPTY_RECRUITMENTS: RecruitmentRecord[] = []
const EMPTY_AREAS: Area[] = []
const EMPTY_STUDENTS: StudentActivity[] = []
const EMPTY_NOTICES: Notice[] = []
export default function App() {
  const [now] = useState(() => new Date())
  const previewParams = new URLSearchParams(window.location.search)
  const noticeDeletePreview =
    import.meta.env.DEV && previewParams.get('admin-preview') === 'notice-delete'
  const zonesPreview = import.meta.env.DEV && previewParams.get('admin-preview') === 'zones'
  const todayPreview = import.meta.env.DEV && previewParams.get('admin-preview') === 'today'
  const designPreview = import.meta.env.DEV && previewParams.has('admin-preview')
  const previewData = designPreview ? createPreviewData(now) : null
  const [authenticated, setAuthenticated] = useState(hasSession() || designPreview)
  const [profile, setProfile] = useState<Profile | null>(
    designPreview
      ? {
          userId: 0,
          name: '담당 선생님',
          role: 'TEACHER',
          studentNumber: null,
          grade: null,
          classNo: null,
        }
      : null,
  )
  const [page, setPage] = useState<Page>(
    zonesPreview ? 'zones' : noticeDeletePreview ? 'notices' : 'today',
  )
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const actionLocks = useRef(new Set<string>())
  const requestSequence = useRef(new Map<string, number>())
  const [data, setData] = useState<Record<string, unknown>>(
    todayPreview
      ? {
          areas: previewData?.todayAreas ?? [],
          reviews: previewData?.todayReviews ?? [],
          appeals: previewData?.todayAppeals ?? [],
        }
      : zonesPreview
        ? { areas: previewData?.areas ?? [] }
        : noticeDeletePreview
          ? { notices: previewData?.notice ? [previewData.notice] : [] }
          : {},
  )
  const [assignmentStudents, setAssignmentStudents] = useState<StudentActivity[]>([])
  const [assignmentStudentsStatus, setAssignmentStudentsStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [assignmentStudentsError, setAssignmentStudentsError] = useState('')
  const [selectedReview, setSelectedReview] = useState<number | null>(null)
  const [selectedAppeal, setSelectedAppeal] = useState<number | null>(null)
  const [selectedRecruitment, setSelectedRecruitment] = useState<number | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState('이름순')
  const [selectedStudent, setSelectedStudent] = useState<StudentActivity | null>(null)
  const [studentMonth, setStudentMonth] = useState<StudentMonth | null>(null)
  const [month, setMonth] = useState(() => new Date())
  const [selectedNotice, setSelectedNotice] = useState<number | null>(
    noticeDeletePreview ? (previewData?.notice.noticeId ?? null) : null,
  )
  const [noticeDetail, setNoticeDetail] = useState<NoticeDetail | null>(
    noticeDeletePreview ? (previewData?.noticeDetail ?? null) : null,
  )
  const [modal, setModal] = useState<'recruit' | 'assign' | 'notice' | null>(null)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [editingRecruitment, setEditingRecruitment] = useState<RecruitmentRecord | null>(null)

  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>) => {
    const sequence = (requestSequence.current.get(key) ?? 0) + 1
    requestSequence.current.set(key, sequence)
    try {
      const result = await fn()
      if (requestSequence.current.get(key) !== sequence) return null
      setData((current) => ({ ...current, [key]: result }))
      return result
    } catch (e) {
      if (requestSequence.current.get(key) === sequence) setError(errorMessage(e))
      return null
    }
  }, [])
  const reload = useCallback(() => setReloadKey((n) => n + 1), [])
  async function runOnce(key: string, action: () => Promise<void>) {
    if (actionLocks.current.has(key)) return
    actionLocks.current.add(key)
    try {
      await action()
    } finally {
      actionLocks.current.delete(key)
    }
  }

  useEffect(
    () =>
      designPreview
        ? undefined
        : onUnauthorized(() => {
            setAuthenticated(false)
            setProfile(null)
            setError('로그인이 만료됐어요. 다시 로그인해 주세요.')
          }),
    [designPreview],
  )
  useEffect(() => {
    if (authenticated && error) toast.error(error)
  }, [authenticated, error])
  useEffect(() => {
    if (!authenticated || designPreview) return
    let cancelled = false
    api
      .me()
      .then((me) => {
        if (cancelled) return
        setProfile(me)
        if (me.role !== 'TEACHER') setError('교사 계정으로 로그인해 주세요.')
      })
      .catch((e) => {
        if (!cancelled) {
          setError(errorMessage(e))
          if (e instanceof ApiError && e.status === 401) setAuthenticated(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [authenticated, designPreview])
  useEffect(() => {
    if (!authenticated || profile?.role !== 'TEACHER' || designPreview) return
    if (page === 'today') {
      let cancelled = false
      Promise.all([api.reviews(), api.appeals(), api.recruitments(), api.areas()])
        .then(([nextReviews, nextAppeals, nextRecruitments, nextAreas]) => {
          if (!cancelled)
            setData((current) => ({
              ...current,
              reviews: nextReviews,
              appeals: nextAppeals,
              recruitments: nextRecruitments,
              areas: nextAreas,
            }))
        })
        .catch((e) => {
          if (!cancelled) setError(errorMessage(e))
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
      return () => {
        cancelled = true
      }
    }
    if (page === 'review') void Promise.resolve().then(() => run('reviews', api.reviews))
    if (page === 'appeals') void Promise.resolve().then(() => run('appeals', () => api.appeals()))
    if (page === 'recruitment')
      void Promise.resolve().then(() => run('recruitments', api.recruitments))
    if (page === 'zones') void Promise.resolve().then(() => run('areas', api.areas))
    if (page === 'activity') {
      let cancelled = false
      api
        .searchStudents(keyword)
        .then((students) => {
          if (!cancelled) setData((current) => ({ ...current, students }))
        })
        .catch((e) => {
          if (!cancelled) setError(errorMessage(e))
        })
      return () => {
        cancelled = true
      }
    }
    if (page === 'notices') void Promise.resolve().then(() => run('notices', api.notices))
  }, [authenticated, profile, page, reloadKey, keyword, run, designPreview])

  useEffect(() => {
    if (!authenticated || profile?.role !== 'TEACHER' || page !== 'zones' || designPreview) return
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setAssignmentStudentsStatus('loading')
      setAssignmentStudentsError('')
    })
    api
      .searchStudents('')
      .then((students) => {
        if (cancelled) return
        setAssignmentStudents(students)
        setAssignmentStudentsStatus('ready')
      })
      .catch((searchError) => {
        if (cancelled) return
        setAssignmentStudentsError(errorMessage(searchError))
        setAssignmentStudentsStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [authenticated, profile, page, designPreview])

  function retryAssignmentStudents() {
    setAssignmentStudentsStatus('loading')
    setAssignmentStudentsError('')
    api
      .searchStudents('')
      .then((students) => {
        setAssignmentStudents(students)
        setAssignmentStudentsStatus('ready')
      })
      .catch((searchError) => {
        setAssignmentStudentsError(errorMessage(searchError))
        setAssignmentStudentsStatus('error')
      })
  }

  const reviews = (data.reviews as ReviewItem[] | undefined) ?? EMPTY_REVIEWS
  const appeals = (data.appeals as Appeal[] | undefined) ?? EMPTY_APPEALS
  const recruitments = (data.recruitments as RecruitmentRecord[] | undefined) ?? EMPTY_RECRUITMENTS
  const areas = (data.areas as Area[] | undefined) ?? EMPTY_AREAS
  const students = (data.students as StudentActivity[] | undefined) ?? EMPTY_STUDENTS
  const notices = (data.notices as Notice[] | undefined) ?? EMPTY_NOTICES
  const activeReviewId = reviews.some((item) => item.verificationId === selectedReview)
    ? selectedReview
    : (reviews[0]?.verificationId ?? null)
  const activeAppealId = appeals.some((item) => item.appealId === selectedAppeal)
    ? selectedAppeal
    : (appeals[0]?.appealId ?? null)
  const activeNoticeId = notices.some((item) => item.noticeId === selectedNotice)
    ? selectedNotice
    : (notices[0]?.noticeId ?? null)
  useEffect(() => {
    if (!activeNoticeId || page !== 'notices' || designPreview) return
    let cancelled = false
    api
      .notice(activeNoticeId)
      .then((detail) => {
        if (!cancelled) setNoticeDetail(detail)
      })
      .catch((e) => {
        if (!cancelled && !(e instanceof ApiError && e.status === 404)) setError(errorMessage(e))
      })
    return () => {
      cancelled = true
    }
  }, [activeNoticeId, page, reloadKey, designPreview])

  const handleLogin = useCallback(async (authCode: string, redirectUri: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await login(authCode, redirectUri)
      if (result.role !== 'TEACHER') {
        await logout()
        throw new Error('교사 계정으로 로그인해 주세요.')
      }
      setAuthenticated(true)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])
  async function handleLogout() {
    try {
      await logout()
    } catch {
      /* Local logout must complete if the server is unavailable. */
    } finally {
      setLogoutConfirm(false)
      setAuthenticated(false)
      setProfile(null)
      setData({})
      setError('')
    }
  }
  async function openApplicants(item: RecruitmentRecord) {
    setSelectedRecruitment(item.recruitmentId)
    setLoading(true)
    setError('')
    try {
      setApplicants(await api.applicants(item.recruitmentId))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }
  async function openStudent(student: StudentActivity) {
    setSelectedStudent(student)
    setLoading(true)
    setError('')
    try {
      setStudentMonth(
        await api.studentMonth(student.studentId, month.getFullYear(), month.getMonth() + 1),
      )
    } catch (e) {
      setStudentMonth(null)
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }
  async function changeMonth(value: Date) {
    if (!Number.isFinite(value.getTime())) return
    setMonth(value)
    if (!selectedStudent) return
    setLoading(true)
    try {
      setStudentMonth(
        await api.studentMonth(
          selectedStudent.studentId,
          value.getFullYear(),
          value.getMonth() + 1,
        ),
      )
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }
  async function saveRecruitment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const semester = String(form.get('semester'))
    const grade = Number(form.get('grade'))
    const classNo = Number(form.get('classNo'))
    const maxCount = Number(form.get('maxCount'))
    const startDate = `${form.get('startDate')}T00:00:00`
    const endDate = `${form.get('endDate')}T23:59:59`
    await runOnce(`recruitment:${editingRecruitment?.recruitmentId ?? 'new'}`, async () => {
      setLoading(true)
      setError('')
      try {
        if (editingRecruitment)
          await api.updateRecruitment(editingRecruitment.recruitmentId, {
            maxCount,
            startDate,
            endDate,
          })
        else await api.createRecruitment({ semester, grade, classNo, maxCount, startDate, endDate })
        toast.success(editingRecruitment ? '모집 공고를 수정했어요.' : '모집 공고를 등록했어요.')
        setModal(null)
        setEditingRecruitment(null)
        reload()
      } catch (e) {
        setError(errorMessage(e))
      } finally {
        setLoading(false)
      }
    })
  }
  async function toggleArea(area: Area) {
    await runOnce(`area:${area.areaId}:toggle`, async () => {
      setLoading(true)
      setError('')
      try {
        await api.updateArea(area.areaId, !area.isActive)
        toast.success(area.isActive ? '청소구역을 비활성화했어요.' : '청소구역을 활성화했어요.')
        reload()
      } catch (e) {
        setError(errorMessage(e))
      } finally {
        setLoading(false)
      }
    })
  }
  async function assignStudents(event: React.FormEvent<HTMLFormElement>, ids: number[]) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const areaId = Number(form.get('areaId'))
    if (!ids.length) {
      toast.error('배정할 학생을 선택해 주세요.')
      return
    }
    await runOnce(`assign:${areaId}`, async () => {
      setLoading(true)
      setError('')
      try {
        await api.assignStudents(areaId, ids)
        const assignedAreaName = areas.find((area) => area.areaId === areaId)?.name ?? '청소구역'
        setAssignmentStudents((current) =>
          current.map((student) =>
            ids.includes(student.studentId) ? { ...student, area: assignedAreaName } : student,
          ),
        )
        toast.success(`${ids.length}명의 학생을 배정했어요.`)
        setModal(null)
        reload()
      } catch (e) {
        setError(errorMessage(e))
      } finally {
        setLoading(false)
      }
    })
  }
  async function saveNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') ?? '').trim()
    const content = String(form.get('content') ?? '').trim()
    if (!title || !content) {
      toast.error('제목과 내용을 입력해 주세요.')
      return
    }
    await runOnce('notice:create', async () => {
      setLoading(true)
      setError('')
      try {
        await api.createNotice(title, content)
        toast.success('공지를 등록했어요.')
        setModal(null)
        reload()
      } catch (e) {
        setError(errorMessage(e))
      } finally {
        setLoading(false)
      }
    })
  }

  if (!authenticated) return <Login onLogin={handleLogin} loading={loading} error={error} />
  if (profile?.role === 'STUDENT')
    return (
      <>
        <Toaster position="top-right" richColors closeButton />
        <div className="auth-message">
          <b>교사 계정이 필요해요</b>
          <p>이 화면은 교사용 관리 페이지입니다.</p>
          <button className="button secondary" onClick={() => setLogoutConfirm(true)}>
            로그아웃
          </button>
          {logoutConfirm && (
            <Modal title="로그아웃하시겠어요?" onClose={() => setLogoutConfirm(false)}>
              <div className="logout-confirm">
                <p>관리자 페이지에서 로그아웃합니다.</p>
                <div className="modal-actions">
                  <button className="button secondary" onClick={() => setLogoutConfirm(false)}>
                    취소
                  </button>
                  <button className="button primary" onClick={() => void handleLogout()}>
                    로그아웃
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      </>
    )
  if (!profile)
    return (
      <>
        <Toaster position="top-right" richColors closeButton />
        <div className="auth-message">계정 정보를 불러오는 중…</div>
      </>
    )

  const title = pageTitles[page]
  return (
    <div className="app-shell">
      <Toaster position="top-right" richColors closeButton />
      <aside className="sidebar">
        <div className="brand">
          <img className="brand-logo" src={leafLogo} alt="" />
          <span>
            환경지킴이<small>교사 관리</small>
          </span>
        </div>
        <div className="nav-group">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'selected' : ''}`}
              onClick={() => {
                setPage(item.id)
                if (item.id === 'recruitment') setSelectedRecruitment(null)
                setSelectedStudent(null)
                setError('')
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.id === 'review' && reviews.length > 0 && (
                <b className="nav-count">{reviews.length}</b>
              )}
              {item.id === 'appeals' && appeals.length > 0 && (
                <b className="nav-count">{appeals.length}</b>
              )}
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="avatar">{profile.name.slice(0, 1)}</div>
          <div>
            {profile.name} 선생님<small>교사 계정</small>
          </div>
          <button className="icon-btn" title="로그아웃" onClick={() => setLogoutConfirm(true)}>
            ↪
          </button>
        </div>
      </aside>
      <main className="main-area">
        <div className="page-content">
          <div className={`page-title-row ${page === 'today' ? 'dashboard-page-title' : ''}`}>
            <div>
              {page === 'today' && (
                <span className="date-label">
                  {now.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    weekday: 'short',
                  })}
                </span>
              )}
              <h1>
                {selectedStudent && page === 'activity'
                  ? `${selectedStudent.name} 활동 기록`
                  : page === 'recruitment' && selectedRecruitment !== null
                    ? '모집 신청자 관리'
                    : title}
              </h1>
              {page !== 'today' && (
                <p className="page-subtitle">
                  {selectedStudent && page === 'activity'
                    ? `${selectedStudent.studentNumber ?? ''} · 승인 인증을 기준으로 활동 시간을 확인해요.`
                    : pageSubtitles[page]}
                </p>
              )}
            </div>
            {page === 'recruitment' && selectedRecruitment === null && (
              <button
                className="button primary"
                onClick={() => {
                  setEditingRecruitment(null)
                  setModal('recruit')
                }}
              >
                ＋ 새 모집 공고
              </button>
            )}
            {page === 'notices' && (
              <button className="button primary" onClick={() => setModal('notice')}>
                ＋ 새 공지
              </button>
            )}
            {page === 'activity' && (
              <div className="page-header-actions">
                <MonthPicker value={month} onChange={(value) => void changeMonth(value)} />
                <button className="button secondary" onClick={() => exportStudentsCsv(students)}>
                  엑셀로 내보내기
                </button>
              </div>
            )}
          </div>
          {loading && <div className="loading-line">서버에서 최신 정보를 불러오는 중…</div>}
          {page === 'today' && (
            <Dashboard
              reviews={reviews}
              appeals={appeals}
              areas={areas}
              date={now}
              preview={todayPreview}
              previewStatuses={previewData?.todayStatuses ?? []}
              onNavigate={setPage}
            />
          )}
          {page === 'review' && (
            <Review
              items={reviews}
              selectedId={activeReviewId}
              onSelect={setSelectedReview}
              onDecide={async (item, decision, reason) => {
                await runOnce(`review:${item.verificationId}`, async () => {
                  setLoading(true)
                  setError('')
                  try {
                    await api.decideReview(item.verificationId, decision, reason)
                    setData((current) => ({
                      ...current,
                      reviews: ((current.reviews as ReviewItem[] | undefined) ?? []).filter(
                        (review) => review.verificationId !== item.verificationId,
                      ),
                    }))
                    setSelectedReview(null)
                    toast.success(
                      decision === 'APPROVED' ? '인증을 승인했어요.' : '인증을 반려했어요.',
                    )
                    reload()
                  } catch (e) {
                    setError(errorMessage(e))
                  } finally {
                    setLoading(false)
                  }
                })
              }}
            />
          )}
          {page === 'appeals' && (
            <Appeals
              items={appeals}
              selectedId={activeAppealId}
              onSelect={setSelectedAppeal}
              onDecide={async (item, decision, reply) => {
                await runOnce(`appeal:${item.appealId}`, async () => {
                  setLoading(true)
                  setError('')
                  try {
                    await api.decideAppeal(
                      item.appealId,
                      decision,
                      reply,
                      decision === 'APPROVED' ? '이의신청이 승인되었어요' : '이의신청 검토 결과',
                    )
                    setData((current) => ({
                      ...current,
                      appeals: ((current.appeals as Appeal[] | undefined) ?? []).filter(
                        (appeal) => appeal.appealId !== item.appealId,
                      ),
                    }))
                    setSelectedAppeal(null)
                    toast.success(
                      decision === 'APPROVED' ? '이의신청을 승인했어요.' : '이의신청을 반려했어요.',
                    )
                    reload()
                  } catch (e) {
                    setError(errorMessage(e))
                  } finally {
                    setLoading(false)
                  }
                })
              }}
            />
          )}
          {page === 'recruitment' &&
            (selectedRecruitment !== null ? (
              <Applicants
                id={selectedRecruitment}
                items={applicants}
                onBack={() => setSelectedRecruitment(null)}
              />
            ) : (
              <Recruitment
                items={recruitments}
                onApplicants={openApplicants}
                onEdit={(item) => {
                  setEditingRecruitment(item)
                  setModal('recruit')
                }}
              />
            ))}
          {page === 'zones' && (
            <Zones
              areas={areas}
              onToggle={toggleArea}
              onAssign={(area) => {
                setData((current) => ({ ...current, assignmentArea: area }))
                setModal('assign')
              }}
              onRemove={async (area, student) => {
                setLoading(true)
                setError('')
                try {
                  if (zonesPreview)
                    setData((current) => ({
                      ...current,
                      areas: (current.areas as Area[]).map((item) =>
                        item.areaId === area.areaId
                          ? {
                              ...item,
                              assignedStudents: item.assignedStudents.filter(
                                (person) => person.studentId !== student.studentId,
                              ),
                            }
                          : item,
                      ),
                    }))
                  else {
                    await api.removeAssignment(area.areaId, student.studentId)
                    setAssignmentStudents((current) =>
                      current.map((person) =>
                        person.studentId === student.studentId ? { ...person, area: null } : person,
                      ),
                    )
                    reload()
                  }
                  toast.success(`${student.name} 학생의 배정을 해제했어요.`)
                } catch (e) {
                  if (
                    e instanceof ApiError &&
                    e.status === 404 &&
                    e.code === 'ASSIGNMENT_NOT_FOUND'
                  ) {
                    setError('이 학생은 이미 배정 해제됐어요. 목록을 새로고침했어요.')
                    reload()
                    return
                  }
                  setError(errorMessage(e))
                  throw e
                } finally {
                  setLoading(false)
                }
              }}
            />
          )}
          {page === 'activity' &&
            (selectedStudent ? (
              <StudentDetail
                student={selectedStudent}
                month={studentMonth}
                selectedMonth={month}
                onBack={() => {
                  setSelectedStudent(null)
                  setStudentMonth(null)
                }}
              />
            ) : (
              <Activity
                students={students}
                keyword={keyword}
                onSearch={(value) => {
                  setData((current) => ({ ...current, students: [] }))
                  setError('')
                  setKeyword(value)
                }}
                sort={sort}
                onSort={setSort}
                onSelect={(student) => void openStudent(student)}
              />
            ))}
          {page === 'notices' && (
            <Notices
              items={notices}
              detail={noticeDetail?.noticeId === activeNoticeId ? noticeDetail : null}
              selectedId={activeNoticeId}
              onSelect={setSelectedNotice}
              onSave={async (detail) => {
                await runOnce(`notice:update:${detail.noticeId}`, async () => {
                  setLoading(true)
                  setError('')
                  try {
                    await api.updateNotice(detail.noticeId, detail.title, detail.content)
                    toast.success('공지를 수정했어요.')
                    reload()
                  } catch (e) {
                    setError(errorMessage(e))
                  } finally {
                    setLoading(false)
                  }
                })
              }}
              onDelete={async (id) => {
                if (noticeDeletePreview) return
                await runOnce(`notice:delete:${id}`, async () => {
                  setLoading(true)
                  setError('')
                  try {
                    await api.deleteNotice(id)
                    setData((current) => ({
                      ...current,
                      notices: ((current.notices as Notice[] | undefined) ?? []).filter(
                        (item) => item.noticeId !== id,
                      ),
                    }))
                    setNoticeDetail(null)
                    setSelectedNotice(null)
                    toast.success('공지를 삭제했어요.')
                    reload()
                  } catch (e) {
                    setError(errorMessage(e))
                    throw e
                  } finally {
                    setLoading(false)
                  }
                })
              }}
            />
          )}
        </div>
      </main>
      {modal && (
        <Modal
          title={
            modal === 'recruit'
              ? editingRecruitment
                ? '모집 공고 수정'
                : '모집 공고 등록'
              : modal === 'assign'
                ? '학생 배정'
                : '새 공지'
          }
          onClose={() => setModal(null)}
          isSaving={loading}
        >
          {modal === 'recruit' ? (
            <RecruitmentForm initial={editingRecruitment} onSubmit={saveRecruitment} />
          ) : modal === 'assign' ? (
            <AssignmentForm
              areas={areas}
              selectedArea={data.assignmentArea as Area | undefined}
              students={assignmentStudents}
              searchStatus={assignmentStudentsStatus}
              searchError={assignmentStudentsError}
              onRetrySearch={retryAssignmentStudents}
              onSubmit={assignStudents}
            />
          ) : (
            <form onSubmit={saveNotice}>
              <label>
                제목
                <input name="title" required />
              </label>
              <label>
                내용
                <textarea name="content" rows={7} required />
              </label>
              <div className="modal-actions">
                <button className="button secondary" type="button" onClick={() => setModal(null)}>
                  취소
                </button>
                <button className="button primary" disabled={loading}>
                  저장하고 올리기
                </button>
              </div>
            </form>
          )}
        </Modal>
      )}
      {logoutConfirm && (
        <Modal title="로그아웃하시겠어요?" onClose={() => setLogoutConfirm(false)}>
          <div className="logout-confirm">
            <p>관리자 페이지에서 로그아웃합니다.</p>
            <div className="modal-actions">
              <button className="button secondary" onClick={() => setLogoutConfirm(false)}>
                취소
              </button>
              <button className="button primary" onClick={() => void handleLogout()}>
                로그아웃
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.code && ERROR_MESSAGES[error.code] ? ERROR_MESSAGES[error.code] : error.message
  }
  return error instanceof Error ? error.message : '요청을 처리하지 못했어요.'
}
