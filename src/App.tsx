import { useCallback, useEffect, useRef, useState } from 'react'
import { Toaster, toast } from 'sonner'
import leafLogo from './assets/leaf-logo.svg'
import { api, ApiError, createOAuthAuthorizationRequest, hasSession, login, logout, onUnauthorized, publicFileUrl, type Applicant, type Appeal, type Area, type Notice, type NoticeDetail, type Profile, type Recruitment, type ReviewItem, type StudentActivity, type StudentMonth } from './api'
import './App.css'

type Page = 'today' | 'review' | 'appeals' | 'recruitment' | 'zones' | 'activity' | 'notices'
const navigation: { id: Page; icon: string; label: string }[] = [
  { id: 'today', icon: '⌂', label: '오늘 현황' }, { id: 'review', icon: '▣', label: '인증 검수' },
  { id: 'appeals', icon: '↗', label: '이의신청' }, { id: 'zones', icon: '⌖', label: '청소구역' },
  { id: 'activity', icon: '▤', label: '학생 · 활동 기록' }, { id: 'notices', icon: '▧', label: '공지 관리' },
  { id: 'recruitment', icon: '♧', label: '모집 관리' },
]
const pageTitles: Record<Page, string> = { today: '오늘 현황', review: '인증 검수', appeals: '이의신청', recruitment: '모집 관리', zones: '청소구역 관리', activity: '학생 · 활동 기록', notices: '공지 관리' }
const EMPTY_REVIEWS: ReviewItem[] = []
const EMPTY_APPEALS: Appeal[] = []
const EMPTY_RECRUITMENTS: Recruitment[] = []
const EMPTY_AREAS: Area[] = []
const EMPTY_STUDENTS: StudentActivity[] = []
const EMPTY_NOTICES: Notice[] = []
const pageSubtitles: Record<Page, string> = { today: '서버에 저장된 운영 현황을 확인해요.', review: 'AI가 판단하기 어려워 넘어온 사진이에요. 확인하면 학생 앱에 바로 결과가 보여요.', appeals: '학생이 제출한 이의신청을 확인하고 처리해요.', recruitment: '선착순 신청 현황과 모집 기간을 관리해요.', zones: '도면에서 청소구역을 활성화하고 담당 학생을 배정해요.', activity: '승인된 인증 1회당 10분을 활동 시간에 쌓아요. 행을 누르면 학생 상세로 가요.', notices: '학생 앱에 게시되는 공지를 관리해요.' }

export default function App() {
  const [now] = useState(() => new Date())
  const previewParams = new URLSearchParams(window.location.search)
  const noticeDeletePreview = import.meta.env.DEV && previewParams.get('admin-preview') === 'notice-delete'
  const zonesPreview = import.meta.env.DEV && previewParams.get('admin-preview') === 'zones'
  const designPreview = import.meta.env.DEV && previewParams.has('admin-preview')
  const previewNotice: Notice = { noticeId: 1, title: '아침 청소 활동 안내', preview: '이번 주 아침 청소 활동 안내입니다.', isRead: true, createdAt: now.toISOString() }
  const previewAreas: Area[] = [{ areaId: 21, zoneCode: 'main_corridor_f2', name: '2층 복도', description: '복도와 계단 주변을 깨끗하게 관리해요.', cleanTime: '08:00–08:30', semester: '2026-2', isActive: true, assignedStudents: [{ studentId: 101, studentNumber: '2-3', name: '김하늘' }, { studentId: 102, studentNumber: '2-3', name: '박지우' }, { studentId: 103, studentNumber: '2-4', name: '이서윤' }] }]
  const previewNoticeDetail: NoticeDetail = { noticeId: 1, title: previewNotice.title, content: previewNotice.preview, createdAt: previewNotice.createdAt, previousNoticeId: null, nextNoticeId: null }
  const [authenticated, setAuthenticated] = useState(hasSession() || designPreview)
  const [profile, setProfile] = useState<Profile | null>(designPreview ? { userId: 0, name: '담당 선생님', role: 'TEACHER', studentNumber: null, grade: null, classNo: null } : null)
  const [page, setPage] = useState<Page>(zonesPreview ? 'zones' : noticeDeletePreview ? 'notices' : 'today')
  const [reloadKey, setReloadKey] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Record<string, unknown>>(zonesPreview ? { areas: previewAreas } : noticeDeletePreview ? { notices: [previewNotice] } : {})
  const [selectedReview, setSelectedReview] = useState<number | null>(null)
  const [selectedAppeal, setSelectedAppeal] = useState<number | null>(null)
  const [selectedRecruitment, setSelectedRecruitment] = useState<number | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [keyword, setKeyword] = useState('')
  const [sort, setSort] = useState('이름순')
  const [selectedStudent, setSelectedStudent] = useState<StudentActivity | null>(null)
  const [studentMonth, setStudentMonth] = useState<StudentMonth | null>(null)
  const [month, setMonth] = useState(() => new Date())
  const [selectedNotice, setSelectedNotice] = useState<number | null>(noticeDeletePreview ? previewNotice.noticeId : null)
  const [noticeDetail, setNoticeDetail] = useState<NoticeDetail | null>(noticeDeletePreview ? previewNoticeDetail : null)
  const [modal, setModal] = useState<'recruit' | 'assign' | 'notice' | null>(null)
  const [logoutConfirm, setLogoutConfirm] = useState(false)
  const [editingRecruitment, setEditingRecruitment] = useState<Recruitment | null>(null)

  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>) => {
    try { const result = await fn(); setData((current) => ({ ...current, [key]: result })); return result }
    catch (e) { setError(errorMessage(e)); return null }
  }, [])
  const reload = useCallback(() => setReloadKey((n) => n + 1), [])

  useEffect(() => designPreview ? undefined : onUnauthorized(() => { setAuthenticated(false); setProfile(null); setError('로그인이 만료됐어요. 다시 로그인해 주세요.') }), [designPreview])
  useEffect(() => { if (authenticated && error) toast.error(error) }, [authenticated, error])
  useEffect(() => {
    if (!authenticated || designPreview) return
    let cancelled = false
    api.me().then((me) => { if (cancelled) return; setProfile(me); if (me.role !== 'TEACHER') setError('교사 계정으로 로그인해 주세요.') })
      .catch((e) => { if (!cancelled) { setError(errorMessage(e)); if (e instanceof ApiError && e.status === 401) setAuthenticated(false) } })
    return () => { cancelled = true }
  }, [authenticated, designPreview])
  useEffect(() => {
    if (!authenticated || profile?.role !== 'TEACHER' || designPreview) return
    if (page === 'today') {
      let cancelled = false
      Promise.all([api.reviews(), api.appeals(), api.recruitments(), api.areas()])
        .then(([nextReviews, nextAppeals, nextRecruitments, nextAreas]) => { if (!cancelled) setData((current) => ({ ...current, reviews: nextReviews, appeals: nextAppeals, recruitments: nextRecruitments, areas: nextAreas })) })
        .catch((e) => { if (!cancelled) setError(errorMessage(e)) })
        .finally(() => { if (!cancelled) setLoading(false) })
      return () => { cancelled = true }
    }
    if (page === 'review') void Promise.resolve().then(() => run('reviews', api.reviews))
    if (page === 'appeals') void Promise.resolve().then(() => run('appeals', () => api.appeals()))
    if (page === 'recruitment') void Promise.resolve().then(() => run('recruitments', api.recruitments))
    if (page === 'zones') void Promise.resolve().then(() => run('areas', api.areas))
    if (page === 'activity') {
      let cancelled = false
      api.searchStudents(keyword)
        .then((students) => { if (!cancelled) setData((current) => ({ ...current, students })) })
        .catch((e) => { if (!cancelled) setError(errorMessage(e)) })
      return () => { cancelled = true }
    }
    if (page === 'notices') void Promise.resolve().then(() => run('notices', api.notices))
  }, [authenticated, profile, page, reloadKey, keyword, run, designPreview])

  const reviews = (data.reviews as ReviewItem[] | undefined) ?? EMPTY_REVIEWS
  const appeals = (data.appeals as Appeal[] | undefined) ?? EMPTY_APPEALS
  const recruitments = (data.recruitments as Recruitment[] | undefined) ?? EMPTY_RECRUITMENTS
  const areas = (data.areas as Area[] | undefined) ?? EMPTY_AREAS
  const students = (data.students as StudentActivity[] | undefined) ?? EMPTY_STUDENTS
  const notices = (data.notices as Notice[] | undefined) ?? EMPTY_NOTICES
  const activeReviewId = reviews.some((item) => item.verificationId === selectedReview) ? selectedReview : reviews[0]?.verificationId ?? null
  const activeAppealId = appeals.some((item) => item.appealId === selectedAppeal) ? selectedAppeal : appeals[0]?.appealId ?? null
  const activeNoticeId = notices.some((item) => item.noticeId === selectedNotice) ? selectedNotice : notices[0]?.noticeId ?? null
  useEffect(() => {
    if (!activeNoticeId || page !== 'notices' || designPreview) return
    let cancelled = false
    api.notice(activeNoticeId).then((detail) => { if (!cancelled) setNoticeDetail(detail) }).catch((e) => { if (!cancelled) setError(errorMessage(e)) })
    return () => { cancelled = true }
  }, [activeNoticeId, page, reloadKey, designPreview])

  const handleLogin = useCallback(async (authCode: string, redirectUri: string) => {
    setLoading(true); setError('')
    try {
      const result = await login(authCode, redirectUri)
      if (result.role !== 'TEACHER') { await logout(); throw new Error('교사 계정으로 로그인해 주세요.') }
      setAuthenticated(true)
    } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }, [])
  async function handleLogout() { try { await logout() } catch { /* Local logout must complete if the server is unavailable. */ } finally { setLogoutConfirm(false); setAuthenticated(false); setProfile(null); setData({}); setError('') } }
  async function openApplicants(item: Recruitment) {
    setSelectedRecruitment(item.recruitmentId); setLoading(true); setError('')
    try { setApplicants(await api.applicants(item.recruitmentId)) } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }
  async function openStudent(student: StudentActivity) {
    setSelectedStudent(student); setLoading(true); setError('')
    try { setStudentMonth(await api.studentMonth(student.studentId, month.getFullYear(), month.getMonth() + 1)) }
    catch (e) { setStudentMonth(null); setError(errorMessage(e)) } finally { setLoading(false) }
  }
  async function changeMonth(value: Date) {
    if (!Number.isFinite(value.getTime())) return
    setMonth(value)
    if (!selectedStudent) return
    setLoading(true)
    try { setStudentMonth(await api.studentMonth(selectedStudent.studentId, value.getFullYear(), value.getMonth() + 1)) }
    catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }
  async function saveRecruitment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const semester = String(form.get('semester')); const grade = Number(form.get('grade')); const classNo = Number(form.get('classNo')); const maxCount = Number(form.get('maxCount'))
    const startDate = `${form.get('startDate')}T00:00:00`; const endDate = `${form.get('endDate')}T23:59:59`
    setLoading(true); setError('')
    try {
      if (editingRecruitment) await api.updateRecruitment(editingRecruitment.recruitmentId, { maxCount, startDate, endDate })
      else await api.createRecruitment({ semester, grade, classNo, maxCount, startDate, endDate })
      toast.success(editingRecruitment ? '모집 공고를 수정했어요.' : '모집 공고를 등록했어요.')
      setModal(null); setEditingRecruitment(null); reload()
    } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }
  async function toggleArea(area: Area) {
    setLoading(true); setError('')
    try { await api.updateArea(area.areaId, !area.isActive); toast.success(area.isActive ? '청소구역을 비활성화했어요.' : '청소구역을 활성화했어요.'); reload() } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }
  async function assignStudents(event: React.FormEvent<HTMLFormElement>, ids: number[]) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const areaId = Number(form.get('areaId'))
    if (!ids.length) { setError('배정할 학생을 선택해 주세요.'); return }
    setLoading(true); setError('')
    try { await api.assignStudents(areaId, ids); toast.success(`${ids.length}명의 학생을 배정했어요.`); setModal(null); reload() } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }
  async function saveNotice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const title = String(form.get('title') ?? '').trim(); const content = String(form.get('content') ?? '').trim()
    if (!title || !content) { setError('제목과 내용을 입력해 주세요.'); return }
    setLoading(true); setError('')
    try { await api.createNotice(title, content); toast.success('공지를 등록했어요.'); setModal(null); reload() } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }

  if (!authenticated) return <Login onLogin={handleLogin} loading={loading} error={error} />
  if (profile?.role === 'STUDENT') return <><Toaster position="top-right" richColors closeButton /><div className="auth-message"><b>교사 계정이 필요해요</b><p>이 화면은 교사용 관리 페이지입니다.</p><button className="button secondary" onClick={() => setLogoutConfirm(true)}>로그아웃</button>{logoutConfirm && <Modal title="로그아웃하시겠어요?" onClose={() => setLogoutConfirm(false)}><div className="logout-confirm"><p>관리자 페이지에서 로그아웃합니다.</p><div className="modal-actions"><button className="button secondary" onClick={() => setLogoutConfirm(false)}>취소</button><button className="button primary" onClick={() => void handleLogout()}>로그아웃</button></div></div></Modal>}</div></>
  if (!profile) return <><Toaster position="top-right" richColors closeButton /><div className="auth-message">계정 정보를 불러오는 중…</div></>

  const title = pageTitles[page]
  return <div className="app-shell">
    <Toaster position="top-right" richColors closeButton />
    <aside className="sidebar"><div className="brand"><img className="brand-logo" src={leafLogo} alt="" /><span>환경지킴이<small>교사 관리</small></span></div><div className="nav-group">{navigation.map((item) => <button key={item.id} className={`nav-item ${page === item.id ? 'selected' : ''}`} onClick={() => { setPage(item.id); if (item.id === 'recruitment') setSelectedRecruitment(null); setSelectedStudent(null); setError('') }}><span className="nav-icon">{item.icon}</span>{item.label}{item.id === 'review' && reviews.length > 0 && <b className="nav-count">{reviews.length}</b>}{item.id === 'appeals' && appeals.length > 0 && <b className="nav-count">{appeals.length}</b>}</button>)}</div><div className="sidebar-bottom"><div className="avatar">{profile.name.slice(0, 1)}</div><div>{profile.name} 선생님<small>교사 계정</small></div><button className="icon-btn" title="로그아웃" onClick={() => setLogoutConfirm(true)}>↪</button></div></aside>
    <main className="main-area"><div className="page-content"><div className={`page-title-row ${page === 'today' ? 'dashboard-page-title' : ''}`}><div>{page === 'today' && <span className="date-label">{now.toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}</span>}<h1>{selectedStudent && page === 'activity' ? `${selectedStudent.name} 활동 기록` : page === 'recruitment' && selectedRecruitment !== null ? '모집 신청자 관리' : title}</h1>{page !== 'today' && <p className="page-subtitle">{selectedStudent && page === 'activity' ? `${selectedStudent.studentNumber ?? ''} · 승인 인증을 기준으로 활동 시간을 확인해요.` : pageSubtitles[page]}</p>}</div>{page === 'recruitment' && selectedRecruitment === null && <button className="button primary" onClick={() => { setEditingRecruitment(null); setModal('recruit') }}>＋ 새 모집 공고</button>}{page === 'notices' && <button className="button primary" onClick={() => setModal('notice')}>＋ 새 공지</button>}{page === 'activity' && <div className="page-header-actions"><MonthPicker value={month} onChange={(value) => void changeMonth(value)} /><button className="button secondary" onClick={() => exportStudentsCsv(students)}>엑셀로 내보내기</button></div>}</div>
      {loading && <div className="loading-line">서버에서 최신 정보를 불러오는 중…</div>}
      {page === 'today' && <Dashboard reviews={reviews} appeals={appeals} areas={areas} date={now} onNavigate={setPage} />}
      {page === 'review' && <Review items={reviews} selectedId={activeReviewId} onSelect={setSelectedReview} onDecide={async (item, decision, reason) => { setLoading(true); setError(''); try { await api.decideReview(item.verificationId, decision, reason); toast.success(decision === 'APPROVED' ? '인증을 승인했어요.' : '인증을 반려했어요.'); reload() } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) } }} />}
      {page === 'appeals' && <Appeals items={appeals} selectedId={activeAppealId} onSelect={setSelectedAppeal} onDecide={async (item, decision, reply) => { setLoading(true); setError(''); try { await api.decideAppeal(item.appealId, decision, reply, decision === 'APPROVED' ? '이의신청이 승인되었어요' : '이의신청 검토 결과'); toast.success(decision === 'APPROVED' ? '이의신청을 승인했어요.' : '이의신청을 반려했어요.'); reload() } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) } }} />}
      {page === 'recruitment' && (selectedRecruitment !== null ? <Applicants id={selectedRecruitment} items={applicants} onBack={() => setSelectedRecruitment(null)} /> : <Recruitment items={recruitments} onApplicants={openApplicants} onEdit={(item) => { setEditingRecruitment(item); setModal('recruit') }} />)}
      {page === 'zones' && <Zones areas={areas} onToggle={toggleArea} onAssign={(area) => { setData((current) => ({ ...current, assignmentArea: area })); setModal('assign') }} onRemove={async (area, student) => { setLoading(true); setError(''); try { if (zonesPreview) setData((current) => ({ ...current, areas: (current.areas as Area[]).map((item) => item.areaId === area.areaId ? { ...item, assignedStudents: item.assignedStudents.filter((person) => person.studentId !== student.studentId) } : item) })); else { await api.removeAssignment(area.areaId, student.studentId); reload() } toast.success(`${student.name} 학생의 배정을 해제했어요.`) } catch (e) { if (e instanceof ApiError && e.status === 404 && e.code === 'ASSIGNMENT_NOT_FOUND') { setError('이 학생은 이미 배정 해제됐어요. 목록을 새로고침했어요.'); reload(); return } setError(errorMessage(e)); throw e } finally { setLoading(false) } }} />}
      {page === 'activity' && (selectedStudent ? <StudentDetail student={selectedStudent} month={studentMonth} selectedMonth={month} onBack={() => { setSelectedStudent(null); setStudentMonth(null) }} /> : <Activity students={students} keyword={keyword} onSearch={(value) => { setData((current) => ({ ...current, students: [] })); setError(''); setKeyword(value) }} sort={sort} onSort={setSort} onSelect={(student) => void openStudent(student)} />)}
      {page === 'notices' && <Notices items={notices} detail={noticeDetail?.noticeId === activeNoticeId ? noticeDetail : null} selectedId={activeNoticeId} onSelect={setSelectedNotice} onSave={async (detail) => { setLoading(true); setError(''); try { await api.updateNotice(detail.noticeId, detail.title, detail.content); toast.success('공지를 수정했어요.'); reload() } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) } }} onDelete={async (id) => { if (noticeDeletePreview) return; setLoading(true); setError(''); try { await api.deleteNotice(id); toast.success('공지를 삭제했어요.'); setSelectedNotice(null); reload() } catch (e) { setError(errorMessage(e)); throw e } finally { setLoading(false) } }} />}
    </div></main>
    {modal && <Modal title={modal === 'recruit' ? (editingRecruitment ? '모집 공고 수정' : '모집 공고 등록') : modal === 'assign' ? '학생 배정' : '새 공지'} onClose={() => setModal(null)}>{modal === 'recruit' ? <RecruitmentForm initial={editingRecruitment} onSubmit={saveRecruitment} /> : modal === 'assign' ? <AssignmentForm areas={areas} selectedArea={data.assignmentArea as Area | undefined} onSubmit={assignStudents} /> : <form onSubmit={saveNotice}><label>제목<input name="title" required /></label><label>내용<textarea name="content" rows={7} required /></label><div className="modal-actions"><button className="button secondary" type="button" onClick={() => setModal(null)}>취소</button><button className="button primary" disabled={loading}>저장하고 올리기</button></div></form>}</Modal>}
    {logoutConfirm && <Modal title="로그아웃하시겠어요?" onClose={() => setLogoutConfirm(false)}><div className="logout-confirm"><p>관리자 페이지에서 로그아웃합니다.</p><div className="modal-actions"><button className="button secondary" onClick={() => setLogoutConfirm(false)}>취소</button><button className="button primary" onClick={() => void handleLogout()}>로그아웃</button></div></div></Modal>}
  </div>
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const translated: Record<string, string> = { RECRUITMENT_FULL: '모집 인원이 이미 마감됐어요.', INVALID_PERIOD: '모집 기간을 확인해 주세요.', INVALID_MAX_COUNT: '모집 인원은 반별 최대 6명이에요.', RECRUITMENT_CLOSED: '모집이 종료되어 수정할 수 없어요.', MAX_COUNT_BELOW_APPLICANTS: '현재 신청자 수보다 적게 정원을 설정할 수 없어요.', INACTIVE_AREA: '비활성 구역에는 학생을 배정할 수 없어요.', ZONE_MODEL_NOT_READY: 'AI 검수가 준비되지 않은 구역은 활성화할 수 없어요.', ASSIGNMENT_NOT_FOUND: '이미 배정이 해제된 학생이에요.', ALREADY_PROCESSED: '이미 처리된 요청이에요.', NOT_MANUAL_REVIEW: '수동 검토 대기 상태가 아니에요.', OAUTH_FAILED: 'DataGSM 로그인을 확인해 주세요.', UNAUTHORIZED: '로그인이 만료됐어요. 다시 로그인해 주세요.' }
    return error.code && translated[error.code] ? translated[error.code] : error.message
  }
  return error instanceof Error ? error.message : '요청을 처리하지 못했어요.'
}

function Login({ onLogin, loading, error }: { onLogin: (code: string, redirectUri: string) => void; loading: boolean; error: string }) {
  const [loginError, setLoginError] = useState(() => {
    const query = new URLSearchParams(window.location.search)
    if (query.has('error')) return 'DataGSM 로그인에 실패했어요. 다시 시도해 주세요.'
    const receivedCode = query.get('code')
    const receivedState = query.get('state')
    if (!receivedCode && !receivedState) return ''
    const expectedState = sessionStorage.getItem('ecoguard.oauth-state')
    const redirectUri = sessionStorage.getItem('ecoguard.oauth-redirect-uri')
    return receivedCode && receivedState && expectedState && receivedState === expectedState && redirectUri
      ? ''
      : '로그인 확인 정보가 일치하지 않아요. 다시 로그인해 주세요.'
  })
  const [startingLogin, setStartingLogin] = useState(false)

  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const receivedCode = query.get('code')
    const receivedState = query.get('state')
    const expectedState = sessionStorage.getItem('ecoguard.oauth-state')
    const redirectUri = sessionStorage.getItem('ecoguard.oauth-redirect-uri')
    const oauthError = query.get('error')

    if (oauthError) {
      sessionStorage.removeItem('ecoguard.oauth-state')
      sessionStorage.removeItem('ecoguard.oauth-redirect-uri')
      history.replaceState({}, '', window.location.pathname)
      return
    }

    if (!receivedCode && !receivedState) return

    history.replaceState({}, '', window.location.pathname)
    if (receivedCode && receivedState && expectedState && receivedState === expectedState && redirectUri) {
      sessionStorage.removeItem('ecoguard.oauth-state')
      sessionStorage.removeItem('ecoguard.oauth-redirect-uri')
      onLogin(receivedCode, redirectUri)
      return
    }

    sessionStorage.removeItem('ecoguard.oauth-state')
    sessionStorage.removeItem('ecoguard.oauth-redirect-uri')
  }, [onLogin])

  function startLogin() {
    setStartingLogin(true)
    setLoginError('')
    try {
      const state = crypto.randomUUID()
      const request = createOAuthAuthorizationRequest(state)
      if (!request) {
        setLoginError('VITE_GSM_CLIENT_ID를 배포 환경변수에 설정하고 다시 빌드해 주세요. 인가 URL에 client_id를 포함해도 됩니다.')
        return
      }
      sessionStorage.setItem('ecoguard.oauth-state', state)
      sessionStorage.setItem('ecoguard.oauth-redirect-uri', request.redirectUri)
      window.location.assign(request.url)
    } catch {
      setLoginError('로그인 주소를 준비하지 못했어요. 다시 시도해 주세요.')
    } finally {
      setStartingLogin(false)
    }
  }

  return <><Toaster position="top-right" richColors closeButton /><div className="admin-login-screen"><section className="login-brand-panel"><div className="login-brand"><SproutIcon /><b>환경지킴이</b></div><div className="login-hero"><h1>학교를 깨끗하게,<br />함께 만드는 습관</h1><p>학생들의 아침 청소 인증을 확인하고,<br />구역과 공지를 한곳에서 관리해요.</p></div><p className="login-footer">교사용 관리자 페이지</p></section><section className="login-form-panel"><div className="login-form-content"><div className="login-greeting"><h2>선생님, 안녕하세요</h2><p>학교 교사 계정으로 로그인해 주세요.</p></div><button className="button primary login-oauth" onClick={() => startLogin()} disabled={loading || startingLogin}>{loading || startingLogin ? '로그인 중…' : 'dataGSM으로 로그인'}</button><div className={`login-info ${error || loginError ? 'has-error' : ''}`}><InfoIcon /><p>{error || loginError || '교사 계정만 들어올 수 있어요. 학생은 모바일 앱에서 인증해 주세요.'}</p></div></div></section></div></>
}
function SproutIcon() { return <svg className="login-sprout-icon" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 29V15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M15 16C8.8 16 5.4 12.8 5.2 7.2c5.8-.1 9.1 2.3 10 7.2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 14.5C16 7.4 19.7 3.7 26.7 3.5c.3 6.9-3.1 10.6-10.1 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg> }
function InfoIcon() { return <svg className="login-info-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M10 9v5m0-8h.01" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg> }

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section> }
function CardTitle({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) { return <div className="card-title"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div> }
function Status({ children }: { children: string }) { return <span className={`status status-${children}`}>{children}</span> }
function Empty({ title, detail }: { title: string; detail: string }) { return <div className="empty-state"><span>⌕</span><b>{title}</b><p>{detail}</p></div> }

function MonthPicker({ value, onChange }: { value: Date; onChange: (month: Date) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const monthValue = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
  function shiftMonth(delta: number) { onChange(new Date(value.getFullYear(), value.getMonth() + delta, 1, 12)) }
  function openPicker() {
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') input.showPicker()
    else input.click()
  }
  return <div className="month-picker" aria-label="활동 기록 월 선택">
    <button type="button" className="month-step" aria-label="이전 달" onClick={() => shiftMonth(-1)}>‹</button>
    <button type="button" className="month-current" onClick={openPicker}>{value.getFullYear()}년 {value.getMonth() + 1}월 <span aria-hidden="true">▾</span></button>
    <button type="button" className="month-step" aria-label="다음 달" onClick={() => shiftMonth(1)}>›</button>
    <input ref={inputRef} className="month-picker-native" type="month" aria-label="직접 월 선택" value={monthValue} onChange={(event) => {
      const [year, month] = event.target.value.split('-').map(Number)
      if (year && month) onChange(new Date(year, month - 1, 1, 12))
    }} />
  </div>
}

type TodayStatus = 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'MANUAL_REVIEW' | 'NOT_SUBMITTED' | 'UPCOMING' | 'UNKNOWN'
type TodayStudent = { studentId: number; studentNumber: string | null; name: string; area: string; status: TodayStatus }
type TodayFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_SUBMITTED'

function Dashboard({ reviews, appeals, areas, date, onNavigate }: { reviews: ReviewItem[]; appeals: Appeal[]; areas: Area[]; date: Date; onNavigate: (page: Page) => void }) {
  const [todayStudents, setTodayStudents] = useState<TodayStudent[]>([])
  const [todayLoading, setTodayLoading] = useState(false)
  const [todayFilter, setTodayFilter] = useState<TodayFilter>('ALL')
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  useEffect(() => {
    const roster = new Map<number, TodayStudent>()
    areas.forEach((area) => area.assignedStudents.forEach((student) => {
      roster.set(student.studentId, { ...student, area: area.name, status: 'UNKNOWN' })
    }))
    const students = [...roster.values()]
    if (!students.length) {
      let cancelled = false
      void Promise.resolve().then(() => { if (!cancelled) { setTodayStudents([]); setTodayLoading(false) } })
      return () => { cancelled = true }
    }
    let cancelled = false
    let next = 0
    const results: TodayStudent[] = new Array(students.length)
    queueMicrotask(() => { if (!cancelled) setTodayLoading(true) })
    async function worker() {
      while (next < students.length) {
        const index = next++
        const student = students[index]
        let status: TodayStatus = 'UNKNOWN'
        try {
          const month = await api.studentMonth(student.studentId, date.getFullYear(), date.getMonth() + 1)
          status = (month.records.find((record) => record.date === dateKey)?.result as TodayStatus | undefined) ?? 'UPCOMING'
        } catch { /* Show the rest of the dashboard if one student's record is unavailable. */ }
        results[index] = { ...student, status }
      }
    }
    void Promise.all(Array.from({ length: Math.min(6, students.length) }, () => worker())).then(() => {
      if (!cancelled) { setTodayStudents(results); setTodayLoading(false) }
    })
    return () => { cancelled = true }
  }, [areas, dateKey, date])

  const stats = [
    { label: '선생님 확인 대기', value: String(reviews.length), target: 'review' as Page, tone: 'highlight' },
    { label: '이의신청', value: String(appeals.length), target: 'appeals' as Page, tone: 'muted' },
  ]
  const latest = [
    ...reviews.map((item) => ({ type: `선생님 확인 · ${new Date(item.submittedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}`, title: `${item.studentName} · ${item.areaName}`, detail: item.reason || item.failReasons.join(', ') || 'AI가 판단하기 어려운 사진', page: 'review' as Page })),
    ...appeals.map((item) => ({ type: '이의신청 · 확인 필요', title: `${item.studentName} · ${item.areaName}`, detail: item.content, page: 'appeals' as Page })),
  ].slice(0, 3)
  const pending = (student: TodayStudent) => student.status === 'PROCESSING' || student.status === 'MANUAL_REVIEW'
  const filters: { id: TodayFilter; label: string; count: number }[] = [
    { id: 'ALL', label: '전체', count: todayStudents.length },
    { id: 'PENDING', label: '확인 대기', count: todayStudents.filter(pending).length },
    { id: 'APPROVED', label: '승인', count: todayStudents.filter((student) => student.status === 'APPROVED').length },
    { id: 'REJECTED', label: '반려', count: todayStudents.filter((student) => student.status === 'REJECTED').length },
    { id: 'NOT_SUBMITTED', label: '미제출', count: todayStudents.filter((student) => student.status === 'NOT_SUBMITTED').length },
  ]
  const filteredStudents = todayStudents.filter((student) => todayFilter === 'ALL' || (todayFilter === 'PENDING' ? pending(student) : student.status === todayFilter))
  const statusLabels: Record<TodayStatus, string> = { APPROVED: '승인', REJECTED: '반려', PROCESSING: '확인 대기', MANUAL_REVIEW: '확인 대기', NOT_SUBMITTED: '미제출', UPCOMING: '예정', UNKNOWN: '확인 불가' }
  return <><div className="stats-grid dashboard-stats">{stats.map(({ label, value, target, tone }) => <button className={`stat-card ${tone}`} key={label} onClick={() => onNavigate(target)}><span>{label}</span><strong>{value}</strong></button>)}</div><div className="dashboard-grid"><Card className="dashboard-table"><div className="card-title dashboard-table-title"><h2>오늘 청소 활동</h2><span>{date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</span></div><div className="today-filters" role="tablist" aria-label="오늘 활동 상태"><div>{filters.map((filter) => <button key={filter.id} type="button" role="tab" aria-selected={todayFilter === filter.id} className={todayFilter === filter.id ? 'active' : ''} onClick={() => setTodayFilter(filter.id)}>{filter.label}<span>{filter.count}</span></button>)}</div></div><div className="table-wrap"><table><thead><tr><th>학생</th><th>구역</th><th>상태</th></tr></thead><tbody>{filteredStudents.map((student) => <tr key={student.studentId}><td><b>{student.name}</b><small>{student.studentNumber ?? '학번 없음'}</small></td><td>{student.area}</td><td><span className={`status status-${statusLabels[student.status]}`}>{statusLabels[student.status]}</span></td></tr>)}{!filteredStudents.length && <tr className="dashboard-empty-row"><td colSpan={3}>{todayLoading ? '오늘 현황을 불러오는 중…' : todayStudents.length ? '이 상태의 학생이 없습니다.' : '배정된 학생이 없습니다.'}</td></tr>}</tbody></table></div></Card><div className="dashboard-side"><Card className="attention-card"><CardTitle title="확인이 필요해요" />{latest.length ? latest.map((item, index) => <button key={`${item.type}-${index}`} className={`attention-row ${item.page === 'appeals' ? 'appeal' : ''}`} onClick={() => onNavigate(item.page)}><small>{item.type}</small><b>{item.title}</b><span>{item.detail}</span></button>) : <div className="dashboard-quiet">확인이 필요한 항목이 없어요.</div>}</Card></div></div></>
}

function Review({ items, selectedId, onSelect, onDecide }: { items: ReviewItem[]; selectedId: number | null; onSelect: (id: number) => void; onDecide: (item: ReviewItem, decision: 'APPROVED' | 'REJECTED', reason?: string) => void }) {
  const [reasons, setReasons] = useState<Record<number, string>>({})
  const item = items.find((review) => review.verificationId === selectedId) ?? items[0]
  return <div className="review-grid"><Card className="review-queue"><div className="queue-heading"><b>확인 대기</b><span>{items.length}건</span></div>{items.map((review) => <button key={review.verificationId} className={`review-item ${item?.verificationId === review.verificationId ? 'active' : ''}`} onClick={() => onSelect(review.verificationId)}><b>{review.studentName} · {review.areaName}</b><span>{review.areaName} · 제출 {new Date(review.submittedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span><small>{review.reason || review.failReasons.join(' · ') || 'AI 판단을 확인해 주세요.'}</small></button>)}</Card>{item ? <Card className="review-detail"><div className="review-detail-grid"><div className="review-photo-column">{item.photoUrl ? <img className="evidence-picture" src={publicFileUrl(item.photoUrl)} alt={`${item.studentName} 인증 사진`} /> : <div className="evidence-picture">[학생 제출 사진]</div>}<small>촬영 {new Date(item.submittedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} · 앱 카메라로 촬영됨</small></div><div className="review-info-column"><div className="review-who"><b>{item.studentName} · {item.areaName}</b><small>{item.areaName} · 제출 {new Date(item.submittedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</small></div><div className="review-info-box"><small>AI 판단</small><b>{item.reason || item.failReasons.join(' · ') || 'AI가 자동으로 처리하지 못해 교사 확인이 필요해요.'}</b></div><div className="zone-description review-zone-description"><b>구역 설명</b><p>{item.areaName} 청소 인증 사진을 확인해 주세요.</p></div><label className="review-rejection-reason">반려 사유 <small>입력하면 학생에게 전달돼요. 최대 200자.</small><textarea value={reasons[item.verificationId] ?? ''} maxLength={200} rows={3} onChange={(event) => setReasons((current) => ({ ...current, [item.verificationId]: event.target.value }))} placeholder="학생에게 안내할 반려 사유를 입력해 주세요" /></label><div className="decision-actions"><button className="button primary" onClick={() => onDecide(item, 'APPROVED')}>승인 · 10분 적립</button><button className="button secondary" onClick={() => onDecide(item, 'REJECTED', reasons[item.verificationId])}>반려</button></div></div></div></Card> : <Card><Empty title="검수 대기 인증이 없어요" detail="새로운 인증이 제출되면 여기에 표시돼요." /></Card>}</div>
}

function Appeals({ items, selectedId, onSelect, onDecide }: { items: Appeal[]; selectedId: number | null; onSelect: (id: number) => void; onDecide: (item: Appeal, decision: 'APPROVED' | 'REJECTED', reply: string) => void }) {
  const [replies, setReplies] = useState<Record<number, string>>({})
  const appeal = items.find((item) => item.appealId === selectedId) ?? items[0]
  const reply = appeal ? replies[appeal.appealId] ?? '' : ''
  return <div className="two-col appeal-layout"><Card><CardTitle title="이의신청 목록" detail={`검토 대기 ${items.length}건`} />{items.map((item) => <button key={item.appealId} className={`appeal-list ${appeal?.appealId === item.appealId ? 'active' : ''}`} onClick={() => onSelect(item.appealId)}><span className="avatar">{item.studentName.slice(0, 1)}</span><span><b>{item.studentName}<small> · {item.studentNumber ?? ''}</small></b><small>{item.verificationDate} · {item.round}차 이의신청</small></span><Status>{item.status}</Status></button>)}{!items.length && <Empty title="검토할 이의신청이 없어요" detail="반려 인증에 접수된 신청이 여기에 표시됩니다." />}</Card>{appeal && <Card><CardTitle title="이의신청 상세" detail="인증 사진과 학생 소명을 확인해 주세요." /><div className="appeal-evidence"><div className="photo-placeholder"><img src={publicFileUrl(appeal.photoUrl)} alt="원본 인증 사진" /></div><div><div className="detail-line"><small>학생</small><b>{appeal.studentName} · {appeal.studentNumber}</b></div><div className="detail-line"><small>구역 · 인증일</small><b>{appeal.areaName} · {appeal.verificationDate}</b></div><div className="detail-line"><small>AI 반려 사유</small><b>{appeal.failReasons.join(' · ') || '교사 반려'}</b></div>{appeal.photoUrls.map((url) => <img className="appeal-photo" key={url} src={publicFileUrl(url)} alt="이의신청 추가 사진" />)}<div className="callout"><b>학생 소명 · {appeal.round}차</b><p>{appeal.content}</p></div><label>교사 답변<textarea value={reply} onChange={(e) => setReplies((current) => ({ ...current, [appeal.appealId]: e.target.value }))} rows={3} placeholder="학생에게 전달할 답변을 입력해 주세요" /></label></div></div><div className="decision-actions"><button className="button secondary" disabled={!reply.trim()} onClick={() => onDecide(appeal, 'REJECTED', reply)}>이의신청 반려</button><button className="button primary" disabled={!reply.trim()} onClick={() => onDecide(appeal, 'APPROVED', reply)}>승인 · 10분 적립</button></div></Card>}</div>
}

function Recruitment({ items, onApplicants, onEdit }: { items: Recruitment[]; onApplicants: (item: Recruitment) => void; onEdit: (item: Recruitment) => void }) {
  return <><div className="callout wide-callout recruitment-callout"><b>모집 공고</b><small>학년 · 반별 최대 6명까지 모집할 수 있어요. 신청은 먼저 한 순서대로 바로 확정됩니다.</small></div><Card className="recruitment-list"><div className="recruitment-columns"><span>학기</span><span>학년 · 반</span><span>모집 기간</span><span>모집 인원</span><span>신청자</span></div>{items.map((item) => <div className="recruitment-row" key={item.recruitmentId}><button className="row-semester" onClick={() => onEdit(item)}>{item.semester}</button><span>{item.grade}학년 · {item.classNo}반</span><span>{item.period.start.slice(0, 10)} – {item.period.end.slice(0, 10)}</span><span>최대 {item.maxCount}명</span><button className="text-button" onClick={() => onApplicants(item)}>{item.applicantCount}명 · 신청자 관리 ›</button></div>)}{!items.length && <Empty title="등록된 모집 공고가 없어요" detail="새 모집 공고를 등록해 주세요." />}</Card></>
}

function Applicants({ id, items, onBack }: { id: number; items: Applicant[]; onBack: () => void }) { return <><button className="text-button" onClick={onBack}>← 모집 목록</button><Card className="applicant-list"><CardTitle title={`모집 #${id} 신청자`} detail={`${items.length}명 · 신청 순서대로 표시`} /><div className="applicant-columns"><span>신청 순서</span><span>학번</span><span>이름</span><span>신청 사유</span></div>{items.map((item) => <div className="applicant-row" key={item.applicationId}><span className="order-badge">{item.order}</span><span>{item.studentNumber ?? '-'}</span><b>{item.name}</b><span>{item.motivation}</span></div>)}{!items.length && <Empty title="신청자가 없어요" detail="학생이 신청하면 순서대로 표시됩니다." />}</Card></> }

function Zones({ areas, onToggle, onAssign, onRemove }: { areas: Area[]; onToggle: (area: Area) => void; onAssign: (area: Area) => void; onRemove: (area: Area, student: Area['assignedStudents'][number]) => Promise<void> }) {
  const floors = ['본관 1층', '본관 2층', '본관 3층', '본관 4층', '별관 1층', '계단 구역']
  const [floor, setFloor] = useState('본관 2층')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [removingStudent, setRemovingStudent] = useState<Area['assignedStudents'][number] | null>(null)
  const [removing, setRemoving] = useState(false)
  const floorNumber = floor === '본관 1층' ? '1' : floor === '본관 2층' ? '2' : floor === '본관 3층' ? '3' : floor === '본관 4층' ? '4' : floor === '계단 구역' ? 'stairs' : '별'
  const filtered = areas.filter((area) => {
    const code = area.zoneCode.toLowerCase()
    if (floorNumber === '별') return code.startsWith('practice_') && !code.includes('_stair_')
    if (floorNumber === 'stairs') return code.includes('_stair_')
    if (floorNumber === '1' && code.startsWith('main_entrance_')) return true
    return code.endsWith(`f${floorNumber}`)
  })
  const selected = filtered.find((area) => area.areaId === selectedId) ?? filtered[0]
  async function confirmRemove() {
    if (!selected || !removingStudent) return
    setRemoving(true)
    try { await onRemove(selected, removingStudent); setRemovingStudent(null) } catch { /* The page displays the API error and keeps the confirmation open. */ } finally { setRemoving(false) }
  }
  return <>
    <div className="floor-tabs page-floor-tabs">{floors.map((item) => <button key={item} className={floor === item ? 'active' : ''} onClick={() => { setFloor(item); setSelectedId(null) }}>{item}</button>)}</div>
    <div className="zone-layout">
      <Card><div className="zone-grid">{filtered.map((area, index) => <button key={area.areaId} className={`zone-tile ${area.isActive ? 'on' : 'off'} ${selected?.areaId === area.areaId ? 'picked' : ''}`} onClick={() => setSelectedId(area.areaId)}><span className="zone-index">{String(index + 1).padStart(2, '0')}</span><b>{area.name}</b><small>{area.isActive ? `청소 구역　${area.assignedStudents.length}명` : '청소 안 함'}</small></button>)}</div><div className="legend"><span><i className="legend-active" />청소 구역</span><span><i className="legend-off" />청소 안 함</span><span><i className="legend-picked" />선택됨</span></div></Card>
      {selected && <Card className="zone-detail">
        <div className="zone-detail-title"><h2>{selected.name}</h2><label>청소 구역<button className={`switch ${selected.isActive ? 'checked' : ''}`} aria-label="구역 활성화" onClick={() => onToggle(selected)}><i /></button></label></div>
        <div className="zone-description"><b>구역 안내</b><p>{selected.description || '구역 안내가 등록되지 않았습니다.'}</p>{selected.cleanTime && <small>활동 시간 {selected.cleanTime}</small>}</div>
        <div className="assigned-heading"><b>담당 학생</b><span>{selected.assignedStudents.length}명</span></div>
        {selected.assignedStudents.map((student) => <div className="assigned-student" key={student.studentId}><span><b>{student.name}</b><small> · {student.studentNumber ?? ''}</small></span><button type="button" className="remove-student" aria-label={`${student.name} 배정 해제`} title="배정 해제" disabled={removing} onClick={() => setRemovingStudent(student)}>배정 해제</button></div>)}
        {!selected.assignedStudents.length && <p className="muted empty-inline">배정된 학생이 없습니다.</p>}
        <button className="button secondary full-button" disabled={!selected.isActive} onClick={() => onAssign(selected)}>＋ 학생 배정</button>
      </Card>}
    </div>
    {areas.length > 0 && filtered.length === 0 && <Empty title={`${floor} 구역이 없어요`} detail="서버에 등록된 구역 이름에 층 정보가 있는지 확인해 주세요." />}
    {removingStudent && selected && <Modal title="학생 배정 해제" onClose={() => { if (!removing) setRemovingStudent(null) }}><div className="unassign-dialog"><p><b>{removingStudent.name}</b> 학생을 <b>{selected.name}</b>에서 배정 해제할까요?</p><small>해제하면 학생 앱에서 담당 구역으로 표시되지 않습니다.</small><div className="modal-actions"><button type="button" className="button secondary" disabled={removing} onClick={() => setRemovingStudent(null)}>취소</button><button type="button" className="button notice-delete-button" disabled={removing} onClick={() => void confirmRemove()}>{removing ? '해제 중…' : '배정 해제'}</button></div></div></Modal>}
  </>
}

function Activity({ students, keyword, onSearch, sort, onSort, onSelect }: { students: StudentActivity[]; keyword: string; onSearch: (value: string) => void; sort: string; onSort: (value: string) => void; onSelect: (student: StudentActivity) => void }) {
  const sorted = [...students].sort((a, b) => sort === '활동 시간순' ? b.totalMinutes - a.totalMinutes : a.name.localeCompare(b.name, 'ko'))
  return <Card className="activity-list"><div className="activity-toolbar"><label className="search-box"><span>⌕</span><input value={keyword} onChange={(e) => onSearch(e.target.value)} placeholder="이름이나 학번으로 찾기" /></label><div className="sort-pills">{['이름순', '활동 시간순'].map((item) => <button key={item} className={sort === item ? 'active' : ''} onClick={() => onSort(item)}>{item}</button>)}</div></div>{students.length ? <div className="table-wrap"><table><thead><tr><th>학생</th><th>구역</th><th>승인</th><th>활동 시간</th><th>최근 인증</th></tr></thead><tbody>{sorted.map((student) => <tr key={student.studentId}><td><b>{student.name}</b><small> · {student.studentNumber ?? '학번 없음'}</small></td><td>{student.area ?? '미배정'}</td><td><b className="approved-count">{student.attendanceDays}회</b></td><td><b>{student.totalMinutes}분</b></td><td><button className="recent-link" onClick={() => onSelect(student)}>최근 기록 ›</button></td></tr>)}</tbody></table></div> : <Empty title="검색 결과가 없어요" detail="다른 이름이나 학번으로 검색해 주세요." />}</Card>
}

function StudentDetail({ student, month, selectedMonth, onBack }: { student: StudentActivity; month: StudentMonth | null; selectedMonth: Date; onBack: () => void }) {
  return <Card className="activity-detail"><button className="text-button" onClick={onBack}>← 학생 목록</button><div className="student-detail-head"><div className="avatar">{student.name.slice(0, 1)}</div><div><h2>{student.name} <small>{student.studentNumber}</small></h2><p>{student.area ?? '구역 미배정'} · 누적 {student.totalMinutes}분</p></div></div>{month ? <><div className="stats-grid"><div className="stat-card"><span>승인</span><strong>{month.summary.approvedCount}회</strong></div><div className="stat-card"><span>반려</span><strong>{month.summary.rejectedCount}회</strong></div><div className="stat-card"><span>미제출</span><strong>{month.summary.notSubmittedCount}회</strong></div><div className="stat-card"><span>이번 달</span><strong>{month.monthlyMinutes}분</strong></div></div><div className="table-wrap"><table><thead><tr><th>날짜</th><th>구역</th><th>인증 결과</th><th>활동 시간</th><th>사진</th></tr></thead><tbody>{month.records.map((record) => <tr key={`${record.date}-${record.verificationId ?? record.result}`}><td>{record.date}</td><td>{record.area ?? '-'}</td><td>{translateResult(record.result)}</td><td>{record.minutes}분</td><td>{record.photoUrl ? <a href={publicFileUrl(record.photoUrl)} target="_blank" rel="noreferrer">사진 보기 ↗</a> : '-'}</td></tr>)}</tbody></table></div></> : <Empty title="월별 활동 기록을 불러오지 못했어요" detail={`${selectedMonth.getFullYear()}년 ${selectedMonth.getMonth() + 1}월 기록을 확인해 주세요.`} />}</Card>
}
function translateResult(result: string) { return ({ APPROVED: '승인', REJECTED: '반려', PROCESSING: '검수 중', MANUAL_REVIEW: '수동 검토', NOT_SUBMITTED: '미제출', UPCOMING: '예정' } as Record<string, string>)[result] ?? result }

function Notices({ items, detail, selectedId, onSelect, onSave, onDelete }: { items: Notice[]; detail: NoticeDetail | null; selectedId: number | null; onSelect: (id: number) => void; onSave: (detail: NoticeDetail) => void; onDelete: (id: number) => Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<number, NoticeDetail>>({})
  const [confirmingDelete, setConfirmingDelete] = useState(() => import.meta.env.DEV && new URLSearchParams(window.location.search).get('admin-preview') === 'notice-delete')
  const [deleting, setDeleting] = useState(false)
  const draft = detail ? drafts[detail.noticeId] ?? detail : null
  return <>
    <div className="notice-layout"><Card className="notice-list"><div className="notice-items">{items.map((item) => <button key={item.noticeId} className={`notice-row ${selectedId === item.noticeId ? 'active' : ''}`} onClick={() => onSelect(item.noticeId)}><span><b>{item.title}</b><small>{new Date(item.createdAt).toLocaleDateString('ko-KR')} · {item.isRead ? '읽음' : '안 읽음'}</small></span></button>)}{!items.length && <Empty title="등록된 공지가 없어요" detail="새 공지를 작성해 주세요." />}</div></Card>{draft ? <Card className="notice-detail"><label className="notice-field"><b>제목</b><input value={draft.title} onChange={(e) => setDrafts((current) => ({ ...current, [draft.noticeId]: { ...draft, title: e.target.value } }))} /></label><label className="notice-field notice-body-field"><b>내용</b><textarea value={draft.content} onChange={(e) => setDrafts((current) => ({ ...current, [draft.noticeId]: { ...draft, content: e.target.value } }))} /></label><div className="notice-editor-actions"><button className="button secondary" onClick={() => setConfirmingDelete(true)}>삭제</button><button className="button primary" onClick={() => onSave(draft)}>저장하고 올리기</button></div></Card> : <Card className="notice-detail"><Empty title="공지를 선택해 주세요" detail="새 공지를 작성하거나 목록에서 선택해 주세요." /></Card>}</div>
    {confirmingDelete && draft && <Modal title="정말 삭제하시겠어요?" onClose={() => { if (!deleting) setConfirmingDelete(false) }}>
      <div className="notice-delete-dialog">
        <p>삭제한 공지는 복구할 수 없어요.</p>
        <span className="notice-delete-icon" aria-hidden="true">!</span>
        <div className="notice-delete-name">삭제 대상: {draft.title}</div>
        <div className="modal-actions">
          <button className="button secondary" type="button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>취소</button>
          <button className="button notice-delete-button" type="button" disabled={deleting} onClick={async () => { setDeleting(true); try { await onDelete(draft.noticeId); setConfirmingDelete(false) } catch { /* Keep the confirmation open when the delete request fails. */ } finally { setDeleting(false) } }}>{deleting ? '삭제 중…' : '삭제하기'}</button>
        </div>
      </div>
    </Modal>}
  </>
}

function RecruitmentForm({ initial, onSubmit }: { initial: Recruitment | null; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return <form onSubmit={onSubmit}><div className="form-grid"><label>학기<select name="semester" defaultValue={initial?.semester ?? '2026-2'} disabled={Boolean(initial)}><option value="2026-1">2026학년도 1학기</option><option value="2026-2">2026학년도 2학기</option></select></label><label>학년<select name="grade" defaultValue={initial?.grade ?? 2} disabled={Boolean(initial)}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n}학년</option>)}</select></label><label>반<input name="classNo" type="number" min="1" max="12" defaultValue={initial?.classNo ?? 1} required disabled={Boolean(initial)} /></label><label>모집 인원 (최대 6명)<input name="maxCount" type="number" min="1" max="6" defaultValue={initial?.maxCount ?? 6} required /></label><label>모집 시작일<input name="startDate" type="date" defaultValue={initial?.period.start.slice(0, 10)} required /></label><label>모집 종료일<input name="endDate" type="date" defaultValue={initial?.period.end.slice(0, 10)} required /></label></div><div className="modal-actions"><button className="button secondary" type="button" onClick={() => window.dispatchEvent(new Event('close-modal'))}>취소</button><button className="button primary">{initial ? '수정 저장' : '등록하기'}</button></div></form>
}
function AssignmentForm({ areas, selectedArea, onSubmit }: { areas: Area[]; selectedArea?: Area; onSubmit: (event: React.FormEvent<HTMLFormElement>, studentIds: number[]) => void }) {
  const [keyword, setKeyword] = useState(''); const [matches, setMatches] = useState<StudentActivity[]>([]); const [searching, setSearching] = useState(false); const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  useEffect(() => { const timer = setTimeout(() => { setSearching(true); api.searchStudents(keyword).then(setMatches).catch(() => setMatches([])).finally(() => setSearching(false)) }, 250); return () => clearTimeout(timer) }, [keyword])
  return <form onSubmit={(event) => onSubmit(event, selectedStudentIds)}><div className="callout">한 구역에 여러 학생을 배정할 수 있습니다. 학생은 한 구역만 담당할 수 있어요.</div><label>청소구역<select name="areaId" defaultValue={selectedArea?.areaId}>{areas.filter((area) => area.isActive).map((area) => <option key={area.areaId} value={area.areaId}>{area.name}</option>)}</select></label><label>학생 검색<input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="이름 또는 학번" /></label><div className="assign-student-options">{searching ? '검색 중…' : matches.map((student) => <label key={student.studentId}><input type="checkbox" checked={selectedStudentIds.includes(student.studentId)} onChange={(event) => setSelectedStudentIds((current) => event.target.checked ? [...new Set([...current, student.studentId])] : current.filter((id) => id !== student.studentId))} /><span>{student.name} · {student.studentNumber ?? '학번 없음'}{student.area ? ` · 현재 ${student.area}` : ''}</span></label>)}{!searching && !matches.length && <small>학생 검색 결과가 없습니다.</small>}</div><div className="modal-actions"><button type="button" className="button secondary" onClick={() => window.dispatchEvent(new Event('close-modal'))}>취소</button><button className="button primary">배정하기</button></div></form>
}
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  useEffect(() => { const close = () => onClose(); window.addEventListener('close-modal', close); return () => window.removeEventListener('close-modal', close) }, [onClose])
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><h2 id="modal-title">{title}</h2></div><button className="icon-btn" onClick={onClose}>×</button></div>{children}</section></div>
}

function exportStudentsCsv(students: StudentActivity[]) {
  const rows = [['학생', '학번', '담당 구역', '승인 일수', '누적 활동 시간(분)'], ...students.map((student) => [student.name, student.studentNumber ?? '', student.area ?? '', String(student.attendanceDays), String(student.totalMinutes)])]
  const blob = new Blob([`\uFEFF${rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'ecoguard-student-activities.csv'; link.click(); URL.revokeObjectURL(url)
}
