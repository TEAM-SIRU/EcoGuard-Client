import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import './App.css'

type Screen = '오늘 현황' | '인증 접수' | '이의신청' | '청소구역' | '학생 · 활동 기록' | '공지 관리' | '운영 설정'
type Appeal = { name: string; zone: string; date: string; response: string; result: '승인' | '반려' }
type Review = { id: number; name: string; zone: string; time: string; result: '대기' | '승인' | '반려'; note: string }

const navItems: { label: Screen; icon: ReactNode; badge?: string }[] = [
  { label: '오늘 현황', icon: <HomeIcon /> },
  { label: '인증 접수', icon: <CheckIcon />, badge: '3' },
  { label: '이의신청', icon: <MessageIcon />, badge: '1' },
  { label: '청소구역', icon: <GridIcon /> },
  { label: '학생 · 활동 기록', icon: <PeopleIcon /> },
  { label: '공지 관리', icon: <BellIcon /> },
  { label: '운영 설정', icon: <SettingsIcon /> },
]

const completeAppeals: Appeal[] = [
  { name: '오태훈', zone: '본관 2층 화장실', date: '9월 25일', response: '세면대까지 잘 보여요. 승인할게요.', result: '승인' },
  { name: '정하은', zone: '본관 2층 화장실', date: '9월 23일', response: '청소 전 사진으로 보여요. 내일 다시 찍어 주세요.', result: '반려' },
  { name: '김서연', zone: '본관 2층 복도 A', date: '9월 18일', response: '확인했어요. 수고했어요.', result: '승인' },
  { name: '한지우', zone: '본관 1층 복도 B', date: '9월 16일', response: '다른 층 사진으로 보여요. 해당 구역을 확인해 주세요.', result: '반려' },
]
const initialPendingAppeals: Appeal[] = [
  { name: '박도윤', zone: '본관 3층 복도', date: '9월 26일', response: '담당 선생님이 확인하고 있어요.', result: '승인' },
]

const initialReviews: Review[] = [
  { id: 1, name: '김민준', zone: '본관 2층 복도 A', time: '오늘 07:42', result: '대기', note: '바닥과 복도 창틀을 청소했어요.' },
  { id: 2, name: '이서윤', zone: '본관 1층 화장실', time: '오늘 07:38', result: '대기', note: '세면대와 거울을 닦았어요.' },
  { id: 3, name: '박지호', zone: '별관 3층 교실 앞', time: '오늘 07:31', result: '대기', note: '복도를 쓸고 쓰레기를 정리했어요.' },
  { id: 4, name: '최하은', zone: '본관 2층 화장실', time: '오늘 07:26', result: '승인', note: '휴지통을 비우고 바닥을 닦았어요.' },
]

const areaNames = ['본관 1층 복도 A', '본관 1층 복도 B', '본관 2층 화장실', '본관 2층 복도 A', '본관 2층 복도 B', '본관 3층 교실 앞', '별관 1층 복도', '별관 2층 화장실', '도서관', '급식실', '운동장', '과학실']
const activities = [
  ['김민준', '2학년 1반 3번', '본관 2층 복도 A', '오늘 07:42', '승인'],
  ['이서윤', '1학년 3반 8번', '본관 1층 화장실', '오늘 07:38', '대기'],
  ['박지호', '3학년 2반 11번', '별관 3층 교실 앞', '오늘 07:31', '대기'],
  ['최하은', '2학년 2반 17번', '본관 2층 화장실', '오늘 07:26', '승인'],
  ['오태훈', '1학년 1반 5번', '도서관', '어제 07:49', '승인'],
]

function App() {
  const [screen, setScreen] = useState<Screen>('이의신청')
  const [loggedIn, setLoggedIn] = useState(true)
  const [appealTab, setAppealTab] = useState<'pending' | 'completed'>('completed')
  const [pendingAppeals, setPendingAppeals] = useState(initialPendingAppeals)
  const [resolvedAppeals, setResolvedAppeals] = useState(completeAppeals)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selectedAppeal, setSelectedAppeal] = useState<Appeal | null>(null)
  const [reviews, setReviews] = useState(initialReviews)
  const [selectedReview, setSelectedReview] = useState<Review | null>(null)
  const [areaTab, setAreaTab] = useState<'areas' | 'schedule'>('areas')
  const [selectedArea, setSelectedArea] = useState(areaNames[2])
  const [search, setSearch] = useState('')
  const [noticeOpen, setNoticeOpen] = useState(false)
  const [notices, setNotices] = useState([
    { title: '2학기 청소구역이 변경되었어요', date: '2026. 09. 01', body: '새 학기 청소구역을 확인하고 담당 학생들과 함께 확인해 주세요.' },
    { title: '청소 인증 사진을 올려 주세요', date: '2026. 08. 24', body: '청소를 마친 뒤 지정된 구역이 잘 보이도록 사진을 촬영해 주세요.' },
    { title: '추석 연휴 청소 일정 안내', date: '2026. 08. 18', body: '연휴 기간에는 청소 인증을 제출하지 않아도 됩니다.' },
  ])
  const [toast, setToast] = useState('')

  const visibleActivities = useMemo(() => activities.filter((row) => row.join(' ').includes(search.trim())), [search])
  function announce(message: string) { setToast(message); window.setTimeout(() => setToast(''), 2400) }
  function review(id: number, result: '승인' | '반려') {
    setReviews((current) => current.map((item) => item.id === id ? { ...item, result } : item))
    setSelectedReview(null)
    announce(`인증을 ${result}했어요.`)
  }

  if (!loggedIn) return <LoginPage onLogin={() => { setLoggedIn(true); setScreen('오늘 현황') }} />

  return <div className="web-app">
    {mobileMenu && <button className="mobile-menu-backdrop" aria-label="메뉴 닫기" onClick={() => setMobileMenu(false)} />}
    <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
      <a className="brand" href="#home" onClick={(event) => event.preventDefault()}><span className="brand-mark"><LeafIcon /></span><span className="brand-copy"><strong>환경지킴이</strong><small>교사 관리</small></span></a>
      <nav className="side-nav" aria-label="주 메뉴">{navItems.map((item) => <button key={item.label} type="button" className={`nav-item ${screen === item.label ? 'active' : ''}`} onClick={() => { setScreen(item.label); setMobileMenu(false) }}><span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span>{item.badge && <span className="nav-badge">{item.badge}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="clean-time"><span className="time-icon"><ClockIcon /></span><div><small>오늘 청소 시간</small><strong>07:25 - 08:20</strong></div></div><div className="profile"><span className="profile-avatar">황</span><span className="profile-copy"><small>담당 선생님</small><strong>황아미 선생님</strong></span><button className="logout" type="button" onClick={() => setLoggedIn(false)}>로그아웃</button></div></div>
    </aside>

    <main className="main-content">
      <div className="mobile-brand"><span className="brand-mark"><LeafIcon /></span><strong>환경지킴이</strong><button aria-label="메뉴" aria-expanded={mobileMenu} onClick={() => setMobileMenu(true)}>☰</button></div>
      <section className="page-content">
        {screen === '오늘 현황' && <Dashboard onNavigate={setScreen} pending={reviews.filter((row) => row.result === '대기').length} appealCount={pendingAppeals.length} />}
        {screen === '인증 접수' && <ReviewPage reviews={reviews} onSelect={setSelectedReview} />}
        {screen === '이의신청' && <AppealPage tab={appealTab} setTab={setAppealTab} pending={pendingAppeals} completed={resolvedAppeals} onSelect={setSelectedAppeal} />}
        {screen === '청소구역' && <AreaPage tab={areaTab} setTab={setAreaTab} area={selectedArea} setArea={setSelectedArea} onToast={announce} />}
        {screen === '학생 · 활동 기록' && <ActivityPage search={search} setSearch={setSearch} rows={visibleActivities} onToast={announce} />}
        {screen === '공지 관리' && <NoticePage notices={notices} onNew={() => setNoticeOpen(true)} />}
        {screen === '운영 설정' && <SettingsPage onToast={announce} />}
      </section>
    </main>

    {selectedReview && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedReview(null) }}><section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><button className="modal-close" onClick={() => setSelectedReview(null)} aria-label="닫기">×</button><span className="overline">인증 사진 검수</span><h2 id="review-title">{selectedReview.name} · {selectedReview.zone}</h2><div className="photo-preview"><span>청소 인증 사진</span><small>{selectedReview.time}</small></div><p>{selectedReview.note}</p><div className="modal-actions"><button className="button secondary" onClick={() => review(selectedReview.id, '반려')}>반려</button><button className="button primary" onClick={() => review(selectedReview.id, '승인')}>승인하기</button></div></section></div>}
    {selectedAppeal && <AppealModal appeal={selectedAppeal} onClose={() => setSelectedAppeal(null)} onResolve={(result) => { setPendingAppeals((current) => current.filter((item) => item !== selectedAppeal)); setResolvedAppeals((current) => [{ ...selectedAppeal, result, response: result === '승인' ? '재확인 후 승인 처리했어요.' : '확인 결과 반려를 유지했어요.' }, ...current]); setSelectedAppeal(null); setAppealTab('completed'); announce(`이의신청을 ${result} 처리했어요.`) }} />}
    {noticeOpen && <NoticeModal onClose={() => setNoticeOpen(false)} onSave={(title, body) => { setNotices((current) => [{ title, body, date: new Intl.DateTimeFormat('ko-KR').format(new Date()) }, ...current]); setNoticeOpen(false); announce('새 공지를 등록했어요.') }} />}
    {toast && <div className="toast" role="status">✓ {toast}</div>}
  </div>
}

function PageHeading({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="page-heading"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [code, setCode] = useState('')
  return <main className="login-preview"><form className="login-preview-card" onSubmit={(event) => { event.preventDefault(); if (code.trim()) onLogin() }}><a className="brand" href="#home" onClick={(event) => event.preventDefault()}><span className="brand-mark"><LeafIcon /></span><span className="brand-copy"><strong>환경지킴이</strong><small>우리 학교를 깨끗하게</small></span></a><span className="overline">TEACHER SIGN IN</span><h1>환경지킴이 로그인</h1><p>DataGSM에서 받은 인증 코드로 로그인해 주세요.</p><label>인증 코드<input value={code} onChange={(event) => setCode(event.target.value)} placeholder="인증 코드 입력" autoComplete="off" /></label><button className="button primary full" disabled={!code.trim()}>로그인</button><small className="preview-note">화면 미리보기입니다. 실제 인증은 서버 연결 후 사용할 수 있어요.</small></form></main>
}

function Dashboard({ onNavigate, pending, appealCount }: { onNavigate: (screen: Screen) => void; pending: number; appealCount: number }) {
  return <><PageHeading title="오늘 현황" description="오늘 우리 학교 청소 현황을 확인해 보세요." action={<span className="date-label">2026년 10월 11일 · 일요일</span>} />
    <div className="stats-grid"><Metric label="오늘 청소 인증" value="28" unit="건" icon="✓" color="green" note="전체 구역 중 82% 완료" /><Metric label="검수 대기" value={String(pending)} unit="건" icon="◷" color="amber" note="확인이 필요한 인증" /><Metric label="이의신청" value={String(appealCount)} unit="건" icon="↗" color="blue" note={appealCount ? '새로운 요청이 있어요' : '처리할 요청이 없어요'} /><Metric label="청소 운영 구역" value="12" unit="개" icon="▦" color="mint" note="활성 구역 기준" /></div>
    <div className="dashboard-grid"><section className="panel"><PanelHead title="오늘 인증 현황" action={<button className="text-action" onClick={() => onNavigate('인증 접수')}>인증 검수 보기 →</button>} /><div className="progress-summary"><div className="progress-ring"><strong>82<span>%</span></strong></div><div><b>청소 인증이 잘 진행되고 있어요</b><p>오늘 목표 34건 중 28건이 완료됐어요.</p><div className="progress-track"><span style={{ width: '82%' }} /></div></div></div><div className="mini-stats"><span><i className="dot green" />승인 <b>25건</b></span><span><i className="dot amber" />검수 대기 <b>{pending}건</b></span><span><i className="dot gray" />미제출 <b>6건</b></span></div></section>
      <section className="panel"><PanelHead title="빠른 확인" /><QuickLink title="인증 접수" detail={`${pending}건의 인증 사진을 확인해 주세요.`} count={String(pending)} onClick={() => onNavigate('인증 접수')} /><QuickLink title="이의신청" detail={`처리할 이의신청이 ${appealCount}건 있어요.`} count={String(appealCount)} onClick={() => onNavigate('이의신청')} /><QuickLink title="새 공지 작성" detail="학생들에게 안내를 전달해 보세요." count="＋" onClick={() => onNavigate('공지 관리')} /></section>
    </div>
    <section className="panel dashboard-bottom"><PanelHead title="오늘 청소 일정" /><div className="schedule-line"><span className="schedule-time">07:25</span><span className="schedule-marker" /><div><b>아침 청소</b><small>청소 시간 07:25 - 08:20 · 12개 구역</small></div><span className="soft-chip">진행 중</span></div></section>
  </>
}

function ReviewPage({ reviews, onSelect }: { reviews: Review[]; onSelect: (review: Review) => void }) {
  const waiting = reviews.filter((item) => item.result === '대기')
  const processed = reviews.filter((item) => item.result !== '대기')
  return <><PageHeading title="인증 접수" description="학생들이 제출한 청소 인증 사진을 확인하고 처리해 주세요." action={<span className="count-chip">검수 대기 <b>{waiting.length}</b></span>} />
    <div className="review-layout"><section className="panel"><PanelHead title="확인할 인증" action={<span className="muted-count">{waiting.length}건 대기 중</span>} />{waiting.length ? <div className="review-list">{waiting.map((item) => <button className="review-row" key={item.id} onClick={() => onSelect(item)}><span className="photo-thumb"><PhotoIcon /></span><span className="review-copy"><b>{item.name}<small>{item.zone}</small></b><span>{item.note}</span></span><span className="review-meta"><small>{item.time}</small><span className="soft-chip amber">검수 대기</span></span><span className="row-arrow">›</span></button>)}</div> : <EmptyState title="모든 인증을 확인했어요" detail="새로운 청소 인증이 도착하면 이곳에 표시됩니다." />}</section>
    <section className="panel processed-panel"><PanelHead title="최근 처리" /><div className="processed-list">{processed.map((item) => <div className="processed-row" key={item.id}><span className="student-avatar">{item.name.slice(0, 1)}</span><span><b>{item.name}</b><small>{item.zone} · {item.time}</small></span><ResultPill result={item.result} /></div>)}</div></section></div>
  </>
}

function AppealPage({ tab, setTab, pending, completed, onSelect }: { tab: 'pending' | 'completed'; setTab: (tab: 'pending' | 'completed') => void; pending: Appeal[]; completed: Appeal[]; onSelect: (appeal: Appeal) => void }) {
  const rows = tab === 'completed' ? completed : pending
  return <><PageHeading title="이의신청" description="반려된 인증에 대해 다시 확인을 요청한 건이에요." action={<div className="appeal-tabs" role="tablist" aria-label="이의신청 처리 상태"><button role="tab" aria-selected={tab === 'pending'} className={tab === 'pending' ? 'selected' : ''} onClick={() => setTab('pending')}>처리 대기 <span>{pending.length}</span></button><button role="tab" aria-selected={tab === 'completed'} className={tab === 'completed' ? 'selected' : ''} onClick={() => setTab('completed')}>처리 완료 <span>{completed.length}</span></button></div>} />
    <div className="appeal-table-wrap"><table className="appeal-table"><thead><tr><th>학생</th><th>구역</th><th>인증일</th><th>답변</th><th>결과</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.name}-${row.date}`} className={tab === 'pending' ? 'clickable-row' : ''} onClick={() => { if (tab === 'pending') onSelect(row) }}><td className="student-name">{row.name}</td><td>{row.zone}</td><td>{row.date}</td><td className="response">{row.response}</td><td><ResultPill result={row.result} /></td></tr>)}</tbody></table></div>
  </>
}

function AppealModal({ appeal, onClose, onResolve }: { appeal: Appeal; onClose: () => void; onResolve: (result: '승인' | '반려') => void }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="appeal-title"><button className="modal-close" onClick={onClose} aria-label="닫기">×</button><span className="overline">이의신청 상세</span><h2 id="appeal-title">{appeal.name} · {appeal.zone}</h2><div className="photo-preview appeal-photo"><span>제출한 청소 인증 사진</span><small>{appeal.date}</small></div><div className="appeal-note"><b>학생 요청</b><p>청소를 마친 뒤 촬영한 사진입니다. 다시 확인 부탁드립니다.</p></div><div className="modal-actions"><button className="button secondary" onClick={() => onResolve('반려')}>반려 유지</button><button className="button primary" onClick={() => onResolve('승인')}>승인 처리</button></div></section></div>
}

function AreaPage({ tab, setTab, area, setArea, onToast }: { tab: 'areas' | 'schedule'; setTab: (tab: 'areas' | 'schedule') => void; area: string; setArea: (area: string) => void; onToast: (message: string) => void }) {
  const [active, setActive] = useState(true)
  const [students, setStudents] = useState(['김민준'])
  const [assignOpen, setAssignOpen] = useState(false)
  return <><PageHeading title="청소구역 관리" description="학기별 청소 시간과 구역, 담당 학생을 관리해요." action={<div className="segmented"><button className={tab === 'areas' ? 'selected' : ''} onClick={() => setTab('areas')}>청소구역</button><button className={tab === 'schedule' ? 'selected' : ''} onClick={() => setTab('schedule')}>운영 일정</button></div>} />
    {tab === 'areas' ? <div className="area-workspace"><section className="panel area-map"><PanelHead title="2학기 청소구역" action={<span className="soft-chip green">12개 구역</span>} /><div className="floor-label"><GridIcon /><span><b>본관 · 1–3층</b><small>구역을 선택하면 담당 정보를 확인할 수 있어요.</small></span></div><div className="area-grid">{areaNames.map((name, index) => <button className={`area-card ${index % 4 !== 1 ? 'area-active' : 'area-inactive'} ${area === name ? 'chosen' : ''}`} key={name} onClick={() => setArea(name)}><span>{name}</span><small>{index % 3 === 0 ? '2명 담당' : index % 4 === 1 ? '미운영' : '1명 담당'}</small></button>)}</div><div className="legend"><span><i className="dot green" />청소 구역</span><span><i className="dot gray" />쉬는 구역</span></div></section>
      <aside className="panel area-detail"><span className="overline">선택한 청소구역</span><h2>{area}</h2><div className="detail-row"><span>청소 시간</span><b>07:25 - 08:20</b></div><div className="detail-row"><span>운영 상태</span><button className={`toggle ${active ? 'on' : ''}`} onClick={() => setActive(!active)} aria-label="청소구역 운영 상태"><i /></button></div><div className="divider"/><PanelHead title="담당 학생" action={<button className="text-action" onClick={() => setAssignOpen(true)}>＋ 학생 지정</button>} /><div className="assigned-list">{students.length ? students.map((name, index) => <div className="student-row" key={name}><span className="student-avatar">{name.slice(0, 1)}</span><span><b>{name}</b><small>{['2학년 1반 3번','1학년 3반 8번','3학년 2반 11번'][index % 3]}</small></span><button className="icon-remove" onClick={() => setStudents((current) => current.filter((student) => student !== name))} aria-label={`${name} 배정 해제`}>×</button></div>) : <div className="no-assigned">아직 배정된 학생이 없어요.</div>}</div><div className="detail-tip">학생들이 골고루 청소할 수 있도록 공평하게 배정해 주세요.</div><button className="button primary full" onClick={() => onToast('구역 설정을 저장했어요.')}>변경사항 저장</button></aside></div>
      : <ScheduleSettings onToast={onToast} />}
    {assignOpen && <AssignStudentsModal assigned={students} onClose={() => setAssignOpen(false)} onSave={(next) => { setStudents(next); setAssignOpen(false); onToast('담당 학생을 저장했어요.') }} />}
  </>
}

function ScheduleSettings({ onToast }: { onToast: (message: string) => void }) {
  const [days, setDays] = useState(['토요일', '일요일'])
  const [month, setMonth] = useState(new Date(2026, 9, 1))
  const [holidays, setHolidays] = useState(['2026-10-03', '2026-10-09'])
  const week = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
  const year = month.getFullYear()
  const monthNumber = month.getMonth()
  const monthDays = new Date(year, monthNumber + 1, 0).getDate()
  const firstWeekday = new Date(year, monthNumber, 1).getDay()
  const calendarCells = [...Array.from({ length: firstWeekday }, () => ''), ...Array.from({ length: monthDays }, (_, index) => String(index + 1))]
  function holidayKey(day: string) { return `${year}-${String(monthNumber + 1).padStart(2, '0')}-${day.padStart(2, '0')}` }
  return <><div className="settings-grid"><section className="panel settings-card"><PanelHead title="청소 운영 시간" /><p className="panel-description">학생들이 청소 인증을 제출할 수 있는 시간을 설정해요.</p><div className="time-fields"><label>시작 시간<input type="time" defaultValue="07:25" /></label><span>–</span><label>종료 시간<input type="time" defaultValue="08:20" /></label></div></section><section className="panel settings-card"><PanelHead title="쉬는 날" /><p className="panel-description">선택한 요일에는 청소 인증을 받지 않아요.</p><div className="day-selector">{week.map((day) => <button className={days.includes(day) ? 'off-day' : ''} key={day} onClick={() => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])}>{day.slice(0, 1)}</button>)}</div><div className="day-legend"><span><i className="dot green"/>청소하는 날</span><span><i className="dot gray"/>쉬는 날</span></div></section><section className="panel settings-card calendar-card"><PanelHead title="공휴일 관리" action={<span className="muted-count">날짜를 눌러 쉬는 날을 선택</span>} /><div className="calendar-head"><button aria-label="이전 달" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}>‹</button><b>{year}년 {monthNumber + 1}월</b><button aria-label="다음 달" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}>›</button></div><div className="calendar-grid">{['일','월','화','수','목','금','토'].map((day) => <span className="weekday" key={day}>{day}</span>)}{calendarCells.map((day, index) => day ? <button className={holidays.includes(holidayKey(day)) ? 'calendar-off' : ''} key={`${day}-${index}`} onClick={() => setHolidays((current) => current.includes(holidayKey(day)) ? current.filter((item) => item !== holidayKey(day)) : [...current, holidayKey(day)])}>{day}</button> : <span className="calendar-blank" key={`blank-${index}`} />)}</div></section></div><div className="settings-save"><button className="button primary" onClick={() => onToast('운영 설정을 저장했어요.')}>설정 저장</button></div></>
}

function AssignStudentsModal({ assigned, onClose, onSave }: { assigned: string[]; onClose: () => void; onSave: (names: string[]) => void }) {
  const candidates = [['김민준','2학년 1반 3번'],['이서윤','1학년 3반 8번'],['박지호','3학년 2반 11번'],['최하은','2학년 2반 17번'],['오태훈','1학년 1반 5번']]
  const [selected, setSelected] = useState(assigned)
  const [query, setQuery] = useState('')
  const filtered = candidates.filter(([name, number]) => `${name} ${number}`.includes(query.trim()))
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="assign-students-modal" role="dialog" aria-modal="true" aria-labelledby="assign-students-title"><button className="modal-close" onClick={onClose} aria-label="닫기">×</button><span className="overline">담당 학생 지정</span><h2 id="assign-students-title">학생을 선택해 주세요</h2><label className="search-box"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="이름 또는 학번 검색" /></label><div className="candidate-list">{filtered.map(([name, number]) => <label className="candidate-row" key={name}><input type="checkbox" checked={selected.includes(name)} onChange={() => setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])} /><span className="student-avatar">{name.slice(0,1)}</span><span><b>{name}</b><small>{number}</small></span></label>)}</div><div className="modal-actions"><span className="selected-count">{selected.length}명 선택</span><button className="button secondary" onClick={onClose}>취소</button><button className="button primary" onClick={() => onSave(selected)}>배정하기</button></div></section></div>
}

function ActivityPage({ search, setSearch, rows, onToast }: { search: string; setSearch: (value: string) => void; rows: string[][]; onToast: (message: string) => void }) {
  const [student, setStudent] = useState<string[] | null>(null)
  function exportCsv() {
    const csv = [['학생','학번','구역','인증 시간','결과'], ...rows].map((row) => row.join(',')).join('\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a'); link.href = url; link.download = '환경지킴이_활동기록.csv'; link.click(); URL.revokeObjectURL(url); onToast('활동 기록을 내려받았어요.')
  }
  return <><PageHeading title="학생 · 활동 기록" description="학생별 청소 활동을 확인하고 기록을 내려받을 수 있어요." action={<button className="button secondary" onClick={exportCsv}><DownloadIcon /> 내보내기</button>} />
    <section className="panel"><PanelHead title="청소 활동 목록" action={<label className="search-box"><SearchIcon /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="학생 또는 구역 검색" /></label>} /><div className="responsive-table"><table className="data-table"><thead><tr><th>학생</th><th>학급</th><th>청소구역</th><th>인증 시간</th><th>결과</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={`${row[0]}-${row[3]}`}><td><b>{row[0]}</b></td><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td><ResultPill result={row[4] === '승인' ? '승인' : '대기'} /></td><td><button className="text-action" onClick={() => setStudent(row)}>상세 보기 →</button></td></tr>)}</tbody></table>{rows.length === 0 && <EmptyState title="검색 결과가 없어요" detail="다른 학생 이름이나 구역으로 검색해 보세요." />}</div></section>
    {student && <div className="detail-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setStudent(null) }}><section className="student-detail panel"><button className="modal-close" onClick={() => setStudent(null)} aria-label="닫기">×</button><span className="student-avatar large">{student[0].slice(0, 1)}</span><span className="overline">학생 활동 상세</span><h2>{student[0]}</h2><p>{student[1]}</p><div className="detail-row"><span>최근 청소구역</span><b>{student[2]}</b></div><div className="detail-row"><span>인증 시간</span><b>{student[3]}</b></div><div className="detail-row"><span>최근 결과</span><ResultPill result={student[4] === '승인' ? '승인' : '대기'} /></div><div className="activity-summary"><b>이번 달 활동</b><span>청소 인증 8회 · 평균 12분</span></div></section></div>}
  </>
}

function NoticePage({ notices, onNew }: { notices: { title: string; body: string; date: string }[]; onNew: () => void }) {
  const [selected, setSelected] = useState(0)
  return <><PageHeading title="공지 관리" description="청소와 학교 운영에 필요한 안내를 학생들에게 전달해요." action={<button className="button primary" onClick={onNew}>＋ 새 공지</button>} />
    <div className="notice-layout"><section className="panel"><PanelHead title="공지 목록" action={<span className="muted-count">{notices.length}개</span>} /><div className="notice-list">{notices.map((notice, index) => <button className={`notice-row ${selected === index ? 'selected' : ''}`} key={`${notice.title}-${notice.date}`} onClick={() => setSelected(index)}><span className="notice-icon"><BellIcon /></span><span><b>{notice.title}</b><small>{notice.date}</small></span><span className="row-arrow">›</span></button>)}</div></section><section className="panel notice-detail"><span className="overline">공지 상세</span>{notices[selected] && <><h2>{notices[selected].title}</h2><span className="notice-date">{notices[selected].date}</span><div className="divider"/><p>{notices[selected].body}</p><div className="notice-audience">게시 대상 <b>전체 학생</b></div></>}</section></div>
  </>
}

function SettingsPage({ onToast }: { onToast: (message: string) => void }) {
  return <><PageHeading title="운영 설정" description="청소 시간과 쉬는 날을 설정해 학사 일정에 맞게 운영해요." /><ScheduleSettings onToast={onToast} /></>
}

function NoticeModal({ onClose, onSave }: { onClose: () => void; onSave: (title: string, body: string) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="review-modal notice-modal" onSubmit={(event) => { event.preventDefault(); if (title.trim() && body.trim()) onSave(title.trim(), body.trim()) }}><button type="button" className="modal-close" onClick={onClose} aria-label="닫기">×</button><span className="overline">공지 관리</span><h2>새 공지 작성</h2><label>공지 제목<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목을 입력해 주세요" /></label><label>공지 내용<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="학생들에게 전달할 내용을 작성해 주세요" rows={5} /></label><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>취소</button><button className="button primary" disabled={!title.trim() || !body.trim()}>공지 등록</button></div></form></div>
}

function Metric({ label, value, unit, icon, color, note }: { label: string; value: string; unit: string; icon: string; color: string; note: string }) { return <article className="metric-card"><span className={`metric-icon ${color}`}>{icon}</span><span className="metric-label">{label}</span><strong>{value}<small>{unit}</small></strong><span className="metric-note">{note}</span></article> }
function PanelHead({ title, action }: { title: string; action?: ReactNode }) { return <div className="panel-head"><h2>{title}</h2>{action}</div> }
function QuickLink({ title, detail, count, onClick }: { title: string; detail: string; count: string; onClick: () => void }) { return <button className="quick-link" onClick={onClick}><span><b>{title}</b><small>{detail}</small></span><span className="quick-count">{count}</span><span className="row-arrow">›</span></button> }
function ResultPill({ result }: { result: string }) { return <span className={`result-pill ${result === '승인' ? 'approved' : result === '반려' ? 'rejected' : 'pending'}`}>{result}</span> }
function EmptyState({ title, detail }: { title: string; detail: string }) { return <div className="empty-state"><span>✓</span><b>{title}</b><small>{detail}</small></div> }
function PhotoIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 18 5-5 3 3 3-4 5 6"/></svg> }
function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg> }
function DownloadIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/></svg> }
function LeafIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.7 3.5c-6 .2-10.7 2-12.6 5.7-1.4 2.6-.3 5.6 2.4 6.4 2.5.7 5.2-.7 6.3-3.7-2.6 1.1-4.5 1-5.9.4 2.9-2.7 6.3-4.4 9.8-5.2.6 4.5-.9 9.2-5 11.3-3.7 1.9-8.5.5-9.4-3.7C4 9.1 9.7 4 19.7 3.5Z" fill="currentColor"/></svg> }
function HomeIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3.5 10 8.5-7 8.5 7v10.5h-6v-7h-5v7h-6V10Z" /></svg> }
function CheckIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4.5h14v15H5zM8 9h8M8 12h8M8 15h5" /></svg> }
function MessageIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v12H9l-5 3v-15ZM8 10h8M8 13h5" /></svg> }
function GridIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg> }
function PeopleIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.3 2.3-5 5.5-5s5 1.7 5.5 5M16 5.5a3 3 0 0 1 0 5.8M17 14c2.2.6 3.4 2.2 3.7 5" /></svg> }
function BellIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17h14l-2-2.5V10a5 5 0 0 0-10 0v4.5L5 17ZM10 20h4" /></svg> }
function SettingsIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19 13.5 1 .8-1.5 2.6-1.3-.5a7.5 7.5 0 0 1-1.6.9l-.2 1.4h-3l-.2-1.4a7.5 7.5 0 0 1-1.6-.9l-1.3.5-1.5-2.6 1-.8a7 7 0 0 1 0-1.9l-1-.8 1.5-2.6 1.3.5a7.5 7.5 0 0 1 1.6-.9l.2-1.4h3l.2 1.4a7.5 7.5 0 0 1 1.6.9l1.3-.5 1.5 2.6-1 .8a7 7 0 0 1 0 1.9Z" transform="translate(-1 -1)" /></svg> }
function ClockIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></svg> }

export default App
