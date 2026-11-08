export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <span>⌕</span>
      <b>{title}</b>
      <p>{detail}</p>
    </div>
  )
}
