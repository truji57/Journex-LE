export function getNet(trade) {
  if (trade.beneficioNeto !== undefined && trade.beneficioNeto !== null) return Number(trade.beneficioNeto)
  return (Number(trade.profit) || 0) + (Number(trade.fees) || 0)
}

export function getValue(trade, displayMode = 'dollar') {
  if (displayMode === 'R') {
    if (trade.resultado && trade.resultado.toLowerCase().includes('even')) return 0
    if (trade.resultado && trade.resultado.toLowerCase().includes('loss')) return -1
    return trade.ratio ? Number(trade.ratio) : 1
  }
  return getNet(trade)
}

export function detectSession(dateString, sessions) {
  if (!sessions || sessions.length === 0) return ''
  const d = new Date(dateString)
  const minutes = d.getHours() * 60 + d.getMinutes()
  for (const session of sessions) {
    const [sH, sM] = session.start.split(':').map(Number)
    const [eH, eM] = session.end.split(':').map(Number)
    let startMin = sH * 60 + sM
    let endMin = eH * 60 + eM
    if (endMin <= startMin) endMin += 24 * 60
    let m = minutes
    if (m < startMin) m += 24 * 60
    if (m >= startMin && m <= endMin) return session.name
  }
  return ''
}

export const apiBase = 'http://localhost:3001'

export async function api(path, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(apiBase + path, opts)
  if (!r.ok) {
    const e = await r.json().catch(() => ({}))
    throw new Error(e.error || 'Error')
  }
  return r.json()
}
