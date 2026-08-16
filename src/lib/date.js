export function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysISO(dateISO, delta) {
  const d = new Date(`${dateISO}T00:00:00`)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}
