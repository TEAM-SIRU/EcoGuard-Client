import { useState } from 'react'
import type { Applicant, Recruitment } from '../types'
import { Card, CardTitle } from '../components/Card'
import { Empty } from '../components/Empty'

export function Recruitment({
  items,
  onApplicants,
  onEdit,
}: {
  items: Recruitment[]
  onApplicants: (item: Recruitment) => void
  onEdit: (item: Recruitment) => void
}) {
  return (
    <>
      <div className="callout wide-callout recruitment-callout">
        <b>모집 공고</b>
        <small>
          학년 · 반별 최대 6명까지 모집할 수 있어요. 신청은 먼저 한 순서대로 바로 확정됩니다.
        </small>
      </div>
      <Card className="recruitment-list">
        <div className="recruitment-columns">
          <span>학기</span>
          <span>학년 · 반</span>
          <span>모집 기간</span>
          <span>모집 인원</span>
          <span>신청자</span>
        </div>
        {items.map((item) => (
          <div className="recruitment-row" key={item.recruitmentId}>
            <button className="row-semester" onClick={() => onEdit(item)}>
              {item.semester}
            </button>
            <span>
              {item.grade}학년 · {item.classNo}반
            </span>
            <span>
              {item.period.start.slice(0, 10)} – {item.period.end.slice(0, 10)}
            </span>
            <span>최대 {item.maxCount}명</span>
            <button className="text-button" onClick={() => onApplicants(item)}>
              {item.applicantCount}명 · 신청자 관리 ›
            </button>
          </div>
        ))}
        {!items.length && (
          <Empty title="등록된 모집 공고가 없어요" detail="새 모집 공고를 등록해 주세요." />
        )}
      </Card>
    </>
  )
}

export function Applicants({
  id,
  items,
  onBack,
}: {
  id: number
  items: Applicant[]
  onBack: () => void
}) {
  return (
    <>
      <button className="text-button" onClick={onBack}>
        ← 모집 목록
      </button>
      <Card className="applicant-list">
        <CardTitle title={`모집 #${id} 신청자`} detail={`${items.length}명 · 신청 순서대로 표시`} />
        <div className="applicant-columns">
          <span>신청 순서</span>
          <span>학번</span>
          <span>이름</span>
          <span>신청 사유</span>
        </div>
        {items.map((item) => (
          <div className="applicant-row" key={item.applicationId}>
            <span className="order-badge">{item.order}</span>
            <span>{item.studentNumber ?? '-'}</span>
            <b>{item.name}</b>
            <span>{item.motivation}</span>
          </div>
        ))}
        {!items.length && (
          <Empty title="신청자가 없어요" detail="학생이 신청하면 순서대로 표시됩니다." />
        )}
      </Card>
    </>
  )
}

export function RecruitmentForm({
  initial,
  onSubmit,
}: {
  initial: Recruitment | null
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  const [periodError, setPeriodError] = useState('')
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const form = new FormData(event.currentTarget)
    const start = String(form.get('startDate') ?? '')
    const end = String(form.get('endDate') ?? '')
    if (start && end && end < start) {
      event.preventDefault()
      setPeriodError('종료일은 시작일보다 빠를 수 없습니다.')
      return
    }
    setPeriodError('')
    onSubmit(event)
  }
  return (
    <form
      onSubmit={handleSubmit}
      onChange={(event) => {
        const form = new FormData(event.currentTarget)
        const start = String(form.get('startDate') ?? '')
        const end = String(form.get('endDate') ?? '')
        if (start && end && end >= start) setPeriodError('')
      }}
    >
      <div className="form-grid">
        <label>
          학기
          <select
            name="semester"
            defaultValue={initial?.semester ?? '2026-2'}
            disabled={Boolean(initial)}
          >
            <option value="2026-1">2026학년도 1학기</option>
            <option value="2026-2">2026학년도 2학기</option>
          </select>
        </label>
        <label>
          학년
          <select name="grade" defaultValue={initial?.grade ?? 2} disabled={Boolean(initial)}>
            {[1, 2, 3].map((n) => (
              <option key={n} value={n}>
                {n}학년
              </option>
            ))}
          </select>
        </label>
        <label>
          반
          <input
            name="classNo"
            type="number"
            min="1"
            max="12"
            defaultValue={initial?.classNo ?? 1}
            required
            disabled={Boolean(initial)}
          />
        </label>
        <label>
          모집 인원 (최대 6명)
          <input
            name="maxCount"
            type="number"
            min="1"
            max="6"
            defaultValue={initial?.maxCount ?? 6}
            required
          />
        </label>
        <label>
          모집 시작일
          <input
            name="startDate"
            type="date"
            defaultValue={initial?.period.start.slice(0, 10)}
            required
          />
        </label>
        <label>
          모집 종료일
          <input
            name="endDate"
            type="date"
            defaultValue={initial?.period.end.slice(0, 10)}
            required
          />
          {periodError && (
            <small className="form-error" role="alert">
              {periodError}
            </small>
          )}
        </label>
      </div>
      <div className="modal-actions">
        <button
          className="button secondary"
          type="button"
          onClick={() => window.dispatchEvent(new Event('close-modal'))}
        >
          취소
        </button>
        <button className="button primary">{initial ? '수정 저장' : '등록하기'}</button>
      </div>
    </form>
  )
}
