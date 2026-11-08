import type { StudentActivity, StudentMonth } from '../types'
import { publicFileUrl } from '../api'
import { Card } from '../components/Card'
import { Empty } from '../components/Empty'
import { STATUS_LABELS } from '../constants/status'
import type { TodayStatus } from '../constants/status'

export function Activity({
  students,
  keyword,
  onSearch,
  sort,
  onSort,
  onSelect,
}: {
  students: StudentActivity[]
  keyword: string
  onSearch: (value: string) => void
  sort: string
  onSort: (value: string) => void
  onSelect: (student: StudentActivity) => void
}) {
  const sorted = [...students].sort((a, b) =>
    sort === '활동 시간순' ? b.totalMinutes - a.totalMinutes : a.name.localeCompare(b.name, 'ko'),
  )
  return (
    <Card className="activity-list">
      <div className="activity-toolbar">
        <label className="search-box">
          <span>⌕</span>
          <input
            value={keyword}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="이름이나 학번으로 찾기"
          />
        </label>
        <div className="sort-pills">
          {['이름순', '활동 시간순'].map((item) => (
            <button
              key={item}
              className={sort === item ? 'active' : ''}
              onClick={() => onSort(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {students.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>학생</th>
                <th>구역</th>
                <th>승인</th>
                <th>활동 시간</th>
                <th>최근 인증</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((student) => (
                <tr key={student.studentId}>
                  <td>
                    <b>{student.name}</b>
                    <small> · {student.studentNumber ?? '학번 없음'}</small>
                  </td>
                  <td>{student.area ?? '미배정'}</td>
                  <td>
                    <b className="approved-count">{student.attendanceDays}회</b>
                  </td>
                  <td>
                    <b>{student.totalMinutes}분</b>
                  </td>
                  <td>
                    <button className="recent-link" onClick={() => onSelect(student)}>
                      최근 기록 ›
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title="검색 결과가 없어요" detail="다른 이름이나 학번으로 검색해 주세요." />
      )}
    </Card>
  )
}

export function StudentDetail({
  student,
  month,
  selectedMonth,
  onBack,
}: {
  student: StudentActivity
  month: StudentMonth | null
  selectedMonth: Date
  onBack: () => void
}) {
  return (
    <Card className="activity-detail">
      <button className="text-button" onClick={onBack}>
        ← 학생 목록
      </button>
      <div className="student-detail-head">
        <div className="avatar">{student.name.slice(0, 1)}</div>
        <div>
          <h2>
            {student.name} <small>{student.studentNumber}</small>
          </h2>
          <p>
            {student.area ?? '구역 미배정'} · 누적 {student.totalMinutes}분
          </p>
        </div>
      </div>
      {month ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <span>승인</span>
              <strong>{month.summary.approvedCount}회</strong>
            </div>
            <div className="stat-card">
              <span>반려</span>
              <strong>{month.summary.rejectedCount}회</strong>
            </div>
            <div className="stat-card">
              <span>미제출</span>
              <strong>{month.summary.notSubmittedCount}회</strong>
            </div>
            <div className="stat-card">
              <span>이번 달</span>
              <strong>{month.monthlyMinutes}분</strong>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>구역</th>
                  <th>인증 결과</th>
                  <th>활동 시간</th>
                  <th>사진</th>
                </tr>
              </thead>
              <tbody>
                {month.records.map((record) => (
                  <tr key={`${record.date}-${record.verificationId ?? record.result}`}>
                    <td>{record.date}</td>
                    <td>{record.area ?? '-'}</td>
                    <td>{translateResult(record.result)}</td>
                    <td>{record.minutes}분</td>
                    <td>
                      {record.photoUrl ? (
                        <a href={publicFileUrl(record.photoUrl)} target="_blank" rel="noreferrer">
                          사진 보기 ↗
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty
          title="월별 활동 기록을 불러오지 못했어요"
          detail={`${selectedMonth.getFullYear()}년 ${selectedMonth.getMonth() + 1}월 기록을 확인해 주세요.`}
        />
      )}
    </Card>
  )
}
function translateResult(result: string) {
  return STATUS_LABELS[result as TodayStatus] ?? result
}
