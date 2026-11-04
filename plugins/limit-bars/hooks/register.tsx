import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Limit } from '../types'

const limits = atom({ plugin: 'limit-bars', key: 'limits' } as const, [] as Limit[])

const LABELS: Record<string, string> = { five_hour: '5 ч', seven_day: 'Неделя' }
const WIDTH = 10

const colorFor = (pct: number) =>
  pct >= 90 ? '#e5534b' : pct >= 70 ? '#d9a21b' : '#3fb950'

const left = (iso: string | undefined, now: number) => {
  if (!iso) return ''
  const s = Math.round((Date.parse(iso) - now) / 1000)
  if (!(s > 0)) return ''
  return s >= 86400
    ? ` · ${Math.floor(s / 86400)}д ${Math.floor((s % 86400) / 3600)}ч`
    : ` · ${Math.floor(s / 3600)}ч ${Math.floor((s % 3600) / 60)}м`
}

// Plain-text bars for the status line: AbovePrompt is not drawn on mobile.
const statusText = (rows: Limit[], now: number) =>
  rows
    .filter(l => LABELS[l.kind])
    .map(l => {
      const pct = Math.max(0, Math.min(100, Math.round(l.percentUsed)))
      const filled = Math.round((pct * WIDTH) / 100)
      return `${LABELS[l.kind]} ${'█'.repeat(filled)}${'░'.repeat(WIDTH - filled)} ${pct}%${left(l.resetsAt, now)}`
    })
    .join('  │  ')

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const u = await $.session.usage()
    await update($, limits, () => u.rateLimits)
    $.ui.status(statusText(u.rateLimits, await $.clock.now()) || undefined)
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, limits, () => e.rateLimits)
    $.ui.status(statusText(e.rateLimits, await $.clock.now()) || undefined)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const rows = (await read($, limits)).filter(l => LABELS[l.kind])
    if (e.props.hasSurvey || rows.length === 0) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const now = await $.clock.now()

    return (
      <Box flexDirection="column">
        {rows.map(l => {
          const pct = Math.max(0, Math.min(100, Math.round(l.percentUsed)))
          const filled = Math.round((pct * WIDTH) / 100)
          return (
            <Text key={l.kind}>
              {LABELS[l.kind].padEnd(6)}{' '}
              <Text color={colorFor(pct)}>{'█'.repeat(filled)}</Text>
              <Text dimColor>{'░'.repeat(WIDTH - filled)}</Text> {pct}%
              <Text dimColor>{left(l.resetsAt, now)}</Text>
            </Text>
          )
        })}
      </Box>
    )
  })
}
