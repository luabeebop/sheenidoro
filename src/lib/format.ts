export function fmtMMSS(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function fmtHuman(sec: number) {
  const m = Math.floor(sec / 60)
  if (m === 0) return `${sec}s`
  if (sec % 60 === 0) return `${m}m`
  return `${m}m ${sec % 60}s`
}

export function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

export function startOfWeek(d = new Date()) {
  const copy = new Date(d)
  const day = copy.getDay() // 0 Sun
  const diff = day === 0 ? -6 : 1 - day // Monday start
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}
