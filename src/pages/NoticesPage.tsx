import { useState } from 'react'
import type { Notice, NoticeDetail } from '../types'
import { Card } from '../components/Card'
import { Empty } from '../components/Empty'
import { Modal } from '../components/Modal'

export function Notices({
  items,
  detail,
  selectedId,
  onSelect,
  onSave,
  onDelete,
}: {
  items: Notice[]
  detail: NoticeDetail | null
  selectedId: number | null
  onSelect: (id: number) => void
  onSave: (detail: NoticeDetail) => void
  onDelete: (id: number) => Promise<void>
}) {
  const [drafts, setDrafts] = useState<Record<number, NoticeDetail>>({})
  const [confirmingDelete, setConfirmingDelete] = useState(
    () =>
      import.meta.env.DEV &&
      new URLSearchParams(window.location.search).get('admin-preview') === 'notice-delete',
  )
  const [deleting, setDeleting] = useState(false)
  const draft = detail ? (drafts[detail.noticeId] ?? detail) : null
  return (
    <>
      <div className="notice-layout">
        <Card className="notice-list">
          <div className="notice-items">
            {items.map((item) => (
              <button
                key={item.noticeId}
                className={`notice-row ${selectedId === item.noticeId ? 'active' : ''}`}
                aria-label={`공지 선택: ${item.title}`}
                onClick={() => onSelect(item.noticeId)}
              >
                <span>
                  <b>{item.title}</b>
                  <small>
                    {new Date(item.createdAt).toLocaleDateString('ko-KR')} ·{' '}
                    {item.isRead ? '읽음' : '안 읽음'}
                  </small>
                </span>
              </button>
            ))}
            {!items.length && (
              <Empty title="등록된 공지가 없어요" detail="새 공지를 작성해 주세요." />
            )}
          </div>
        </Card>
        {draft ? (
          <Card className="notice-detail">
            <label className="notice-field">
              <b>제목</b>
              <input
                value={draft.title}
                onChange={(e) =>
                  setDrafts((current) => ({
                    ...current,
                    [draft.noticeId]: { ...draft, title: e.target.value },
                  }))
                }
              />
            </label>
            <label className="notice-field notice-body-field">
              <b>내용</b>
              <textarea
                value={draft.content}
                onChange={(e) =>
                  setDrafts((current) => ({
                    ...current,
                    [draft.noticeId]: { ...draft, content: e.target.value },
                  }))
                }
              />
            </label>
            <div className="notice-editor-actions">
              <button className="button secondary" onClick={() => setConfirmingDelete(true)}>
                삭제
              </button>
              <button className="button primary" onClick={() => onSave(draft)}>
                저장하고 올리기
              </button>
            </div>
          </Card>
        ) : (
          <Card className="notice-detail">
            <Empty
              title="공지를 선택해 주세요"
              detail="새 공지를 작성하거나 목록에서 선택해 주세요."
            />
          </Card>
        )}
      </div>
      {confirmingDelete && draft && (
        <Modal
          title="정말 삭제하시겠어요?"
          onClose={() => {
            if (!deleting) setConfirmingDelete(false)
          }}
        >
          <div className="notice-delete-dialog">
            <div className="notice-delete-warning">
              <span className="notice-delete-icon" aria-hidden="true">
                !
              </span>
              <p>삭제한 공지는 복구할 수 없어요.</p>
            </div>
            <div className="notice-delete-name">삭제 대상: {draft.title}</div>
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                취소
              </button>
              <button
                className="button notice-delete-button"
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await onDelete(draft.noticeId)
                    setConfirmingDelete(false)
                  } catch {
                    /* Keep the confirmation open when the delete request fails. */
                  } finally {
                    setDeleting(false)
                  }
                }}
              >
                {deleting ? '삭제 중…' : '삭제하기'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
