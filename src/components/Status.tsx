export function Status({ value, label }: { value: string; label: string }) {
  const className = value.toLowerCase().replaceAll('_', '-')
  return <span className={`status status-${className}`}>{label}</span>
}
