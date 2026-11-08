import { useRef } from 'react'

export function MonthPicker({ value, onChange }: { value: Date; onChange: (month: Date) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const monthValue = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`
  function shiftMonth(delta: number) {
    onChange(new Date(value.getFullYear(), value.getMonth() + delta, 1, 12))
  }
  function openPicker() {
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') input.showPicker()
    else input.click()
  }
  return (
    <div className="month-picker" aria-label="활동 기록 월 선택">
      <button
        type="button"
        className="month-step"
        aria-label="이전 달"
        onClick={() => shiftMonth(-1)}
      >
        ‹
      </button>
      <button type="button" className="month-current" onClick={openPicker}>
        {value.getFullYear()}년 {value.getMonth() + 1}월 <span aria-hidden="true">▾</span>
      </button>
      <button
        type="button"
        className="month-step"
        aria-label="다음 달"
        onClick={() => shiftMonth(1)}
      >
        ›
      </button>
      <input
        ref={inputRef}
        className="month-picker-native"
        type="month"
        aria-label="직접 월 선택"
        value={monthValue}
        onChange={(event) => {
          const [year, month] = event.target.value.split('-').map(Number)
          if (year && month) onChange(new Date(year, month - 1, 1, 12))
        }}
      />
    </div>
  )
}
