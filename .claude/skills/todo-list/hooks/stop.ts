import type { Plan } from '../types'
import { unfinishedLeaves } from './plan'

// How many times one turn is sent back for unfinished steps; after that Claude may stop anyway.
export const MAX_STOP_NUDGES = 2
const LISTED = 5

// The text that sends a stop back to Claude while the plan has unfinished steps, or undefined to
// let it stop. `nudges` is how many this turn has had.
export const stopNudge = (plan: Plan, nudges: number, toolName: string): string | undefined => {
  if (nudges >= MAX_STOP_NUDGES) return undefined
  const open = unfinishedLeaves(plan)
  if (open.length === 0) return undefined
  const listed = open.slice(0, LISTED).map(n => `${n.id} [${n.status}] ${n.title}`)
  const more = open.length > LISTED ? [`+${open.length - LISTED} more`] : []

  return [
    `You are not done: ${open.length} plan step${open.length === 1 ? ' is' : 's are'} still open:`,
    ...listed,
    ...more,
    `Complete them, or update the plan with ${toolName} if they are no longer needed: completed if already done, ` +
      "skipped with a note if not needed, blocked with a note if you need the person's input (then ask them).",
  ].join('\n')
}
