import { useState } from 'react'
import type { Area, StudentActivity } from '../types'
import { Card } from '../components/Card'
import { Empty } from '../components/Empty'
import { Modal } from '../components/Modal'

export function Zones({
  areas,
  onToggle,
  onAssign,
  onRemove,
}: {
  areas: Area[]
  onToggle: (area: Area) => void
  onAssign: (area: Area) => void
  onRemove: (area: Area, student: Area['assignedStudents'][number]) => Promise<void>
}) {
  const floors = ['본관 1층', '본관 2층', '본관 3층', '본관 4층', '별관 1층', '계단 구역']
  const [floor, setFloor] = useState('본관 2층')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [removingStudent, setRemovingStudent] = useState<Area['assignedStudents'][number] | null>(
    null,
  )
  const [removing, setRemoving] = useState(false)
  const floorNumber =
    floor === '본관 1층'
      ? '1'
      : floor === '본관 2층'
        ? '2'
        : floor === '본관 3층'
          ? '3'
          : floor === '본관 4층'
            ? '4'
            : floor === '계단 구역'
              ? 'stairs'
              : '별'
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
    try {
      await onRemove(selected, removingStudent)
      setRemovingStudent(null)
    } catch {
      /* The page displays the API error and keeps the confirmation open. */
    } finally {
      setRemoving(false)
    }
  }
  return (
    <>
      <div className="floor-tabs page-floor-tabs">
        {floors.map((item) => (
          <button
            key={item}
            className={floor === item ? 'active' : ''}
            onClick={() => {
              setFloor(item)
              setSelectedId(null)
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="zone-layout">
        <Card>
          {filtered.length ? (
            <>
              <div className="zone-grid">
                {filtered.map((area, index) => (
                  <button
                    key={area.areaId}
                    className={`zone-tile ${area.isActive ? 'on' : 'off'} ${selected?.areaId === area.areaId ? 'picked' : ''}`}
                    onClick={() => setSelectedId(area.areaId)}
                  >
                    <span className="zone-index">{String(index + 1).padStart(2, '0')}</span>
                    <b>{area.name}</b>
                    <small>
                      {area.isActive
                        ? `청소 구역　${area.assignedStudents.length}명`
                        : '청소 안 함'}
                    </small>
                  </button>
                ))}
              </div>
              <div className="legend">
                <span>
                  <i className="legend-active" />
                  청소 구역
                </span>
                <span>
                  <i className="legend-off" />
                  청소 안 함
                </span>
                <span>
                  <i className="legend-picked" />
                  선택됨
                </span>
              </div>
            </>
          ) : (
            <Empty
              title={`${floor}에 등록된 구역이 없어요`}
              detail="이 층은 별도로 관리할 청소 구역이 없습니다."
            />
          )}
        </Card>
        {selected && (
          <Card className="zone-detail">
            <div className="zone-detail-title">
              <h2>{selected.name}</h2>
              <div className="zone-toggle">
                <span>청소 구역</span>
                <button
                  className={`switch ${selected.isActive ? 'checked' : ''}`}
                  aria-label="구역 활성화"
                  role="switch"
                  aria-checked={selected.isActive}
                  onClick={() => onToggle(selected)}
                >
                  <i />
                </button>
              </div>
            </div>
            <div className="zone-description">
              <b>구역 안내</b>
              <p>{selected.description || '구역 안내가 등록되지 않았습니다.'}</p>
              {selected.cleanTime && <small>활동 시간 {selected.cleanTime}</small>}
            </div>
            <div className="assigned-heading">
              <b>담당 학생</b>
              <span>{selected.assignedStudents.length}명</span>
            </div>
            {selected.assignedStudents.map((student) => (
              <div className="assigned-student" key={student.studentId}>
                <span>
                  <b>{student.name}</b>
                  <small> · {student.studentNumber ?? ''}</small>
                </span>
                <button
                  type="button"
                  className="remove-student"
                  aria-label={`${student.name} 배정 해제`}
                  title="배정 해제"
                  disabled={removing}
                  onClick={() => setRemovingStudent(student)}
                >
                  배정 해제
                </button>
              </div>
            ))}
            {!selected.assignedStudents.length && (
              <p className="muted empty-inline">배정된 학생이 없습니다.</p>
            )}
            <button
              className="button secondary full-button"
              disabled={!selected.isActive}
              onClick={() => onAssign(selected)}
            >
              ＋ 학생 배정
            </button>
          </Card>
        )}
      </div>
      {areas.length > 0 && filtered.length === 0 && (
        <Empty
          title={`${floor} 구역이 없어요`}
          detail="서버에 등록된 구역 이름에 층 정보가 있는지 확인해 주세요."
        />
      )}
      {removingStudent && selected && (
        <Modal
          title="학생 배정 해제"
          onClose={() => {
            if (!removing) setRemovingStudent(null)
          }}
        >
          <div className="unassign-dialog">
            <p>
              <b>{removingStudent.name}</b> 학생을 <b>{selected.name}</b>에서 배정 해제할까요?
            </p>
            <small>해제하면 학생 앱에서 담당 구역으로 표시되지 않습니다.</small>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={removing}
                onClick={() => setRemovingStudent(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="button notice-delete-button"
                disabled={removing}
                onClick={() => void confirmRemove()}
              >
                {removing ? '해제 중…' : '배정 해제'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

export function AssignmentForm({
  areas,
  selectedArea,
  students,
  searchStatus,
  searchError,
  onRetrySearch,
  onSubmit,
  onCancel,
}: {
  areas: Area[]
  selectedArea?: Area
  students: StudentActivity[]
  searchStatus: 'idle' | 'loading' | 'ready' | 'error'
  searchError: string
  onRetrySearch: () => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>, studentIds: number[]) => void
  onCancel: () => void
}) {
  const [keyword, setKeyword] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([])
  const query = keyword.trim().toLocaleLowerCase()
  const matches = query
    ? students.filter((student) =>
        `${student.name} ${student.studentNumber ?? ''}`.toLocaleLowerCase().includes(query),
      )
    : students
  return (
    <form onSubmit={(event) => onSubmit(event, selectedStudentIds)}>
      <div className="callout">
        한 구역에 여러 학생을 배정할 수 있습니다. 학생은 한 구역만 담당할 수 있어요.
      </div>
      <label>
        청소구역
        <select name="areaId" defaultValue={selectedArea?.areaId}>
          {areas
            .filter((area) => area.isActive)
            .map((area) => (
              <option key={area.areaId} value={area.areaId}>
                {area.name}
              </option>
            ))}
        </select>
      </label>
      <label>
        학생 검색
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="이름 또는 학번"
        />
      </label>
      <div className="assign-student-options">
        {searchStatus === 'loading' || searchStatus === 'idle' ? (
          <small>학생 목록을 불러오는 중…</small>
        ) : searchStatus === 'error' ? (
          <div role="alert">
            <small>학생 목록을 불러오지 못했어요. {searchError}</small>
            <button type="button" className="text-button" onClick={onRetrySearch}>
              다시 검색
            </button>
          </div>
        ) : (
          matches.map((student) => {
            const assigned = Boolean(student.area)
            return (
              <label key={student.studentId}>
                <input
                  type="checkbox"
                  disabled={assigned}
                  checked={selectedStudentIds.includes(student.studentId)}
                  onChange={(event) =>
                    setSelectedStudentIds((current) =>
                      event.target.checked
                        ? [...new Set([...current, student.studentId])]
                        : current.filter((id) => id !== student.studentId),
                    )
                  }
                />
                <span>
                  {student.name} · {student.studentNumber ?? '학번 없음'}
                  {student.area ? ` · 현재 ${student.area} 구역 배정됨` : ''}
                </span>
              </label>
            )
          })
        )}
        {searchStatus === 'ready' && !matches.length && <small>학생 검색 결과가 없습니다.</small>}
      </div>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onCancel}>
          취소
        </button>
        <button className="button primary">배정하기</button>
      </div>
    </form>
  )
}
