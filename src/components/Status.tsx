export function Status({ children }: { children: string }) {
  return <span className={`status status-${children}`}>{children}</span>
}
