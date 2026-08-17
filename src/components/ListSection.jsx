// One bordered container per logical group of rows — never box the rows
// themselves. Rows are separated by a hairline divider instead of each
// getting their own background/border, so a list doesn't read as nested
// cards-within-cards.
export default function ListSection({ children, className = '' }) {
  return (
    <div className={`divide-y divide-white/5 overflow-hidden rounded-2xl bg-surface ${className}`}>
      {children}
    </div>
  )
}
