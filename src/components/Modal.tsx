import { useCallback, useRef } from 'react'
import type { ReactNode } from 'react'

export function Modal({
  title,
  children,
  onClose,
  isSaving = false,
}: {
  title: string
  children: ReactNode | ((props: { onRequestClose: () => void }) => ReactNode)
  onClose: () => void
  isSaving?: boolean
}) {
  const modalRef = useRef<HTMLDialogElement>(null)
  const requestClose = useCallback(() => {
    if (isSaving) return
    const form = modalRef.current?.querySelector('form')
    const dirty = form
      ? Array.from(form.elements).some((element) => {
          if (element instanceof HTMLInputElement)
            return element.type === 'checkbox' || element.type === 'radio'
              ? element.checked !== element.defaultChecked
              : element.value !== element.defaultValue
          if (element instanceof HTMLTextAreaElement) return element.value !== element.defaultValue
          if (element instanceof HTMLSelectElement)
            return Array.from(element.options).some(
              (option) => option.selected !== option.defaultSelected,
            )
          return false
        })
      : false
    if (dirty && !window.confirm('저장하지 않은 변경 사항이 있어요. 입력 내용을 버리고 닫을까요?'))
      return
    onClose()
  }, [isSaving, onClose])
  const content =
    typeof children === 'function' ? (
      <ModalContent render={children} onRequestClose={requestClose} />
    ) : (
      children
    )
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose()
      }}
    >
      <dialog open ref={modalRef} className="modal" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button
            className="icon-btn"
            aria-label="모달 닫기"
            onClick={requestClose}
            disabled={isSaving}
          >
            ×
          </button>
        </div>
        {content}
      </dialog>
    </div>
  )
}

function ModalContent({
  render,
  onRequestClose,
}: {
  render: (props: { onRequestClose: () => void }) => ReactNode
  onRequestClose: () => void
}) {
  const Render = render
  return <Render onRequestClose={onRequestClose} />
}
