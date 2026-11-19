import { expect, test } from 'claude-code/testing'
import { emptyPlan, setPlan, updateNodes } from './plan'
import type { Plan } from './plan'
import { MAX_STOP_NUDGES, stopNudge } from './stop'

const TOOL = 'mcp__todo-list__plan'
const planOf = (titles: string[]): Plan => {
  const out = setPlan(emptyPlan(), 'Task', titles.map(title => ({ title })), 0)
  if ('error' in out) throw new Error(out.error)

  return out.plan
}
const withStatus = (plan: Plan, id: string, status: 'completed' | 'skipped' | 'blocked' | 'in_progress'): Plan => {
  const out = updateNodes(plan, [{ id, status, ...(status === 'skipped' || status === 'blocked' ? { note: 'why' } : {}) }], 0)
  if ('error' in out) throw new Error(out.error)

  return out.plan
}

test('an empty plan lets Claude stop', () => {
  expect(stopNudge(emptyPlan(), 0, TOOL)).toBeUndefined()
})

test('unfinished steps send the stop back, listing them and the plan tool', () => {
  const plan = withStatus(withStatus(planOf(['A', 'B', 'C']), '1', 'completed'), '2', 'in_progress')
  const text = stopNudge(plan, 0, TOOL) ?? ''
  expect(text).toContain('You are not done: 2 plan steps are still open')
  expect(text).toContain('2 [in_progress] B')
  expect(text).toContain('3 [pending] C')
  expect(text).not.toContain('1 [')
  expect(text).toContain(TOOL)
})

test('completed, skipped and blocked steps all let Claude stop', () => {
  let plan = planOf(['A', 'B', 'C'])
  plan = withStatus(withStatus(withStatus(plan, '1', 'completed'), '2', 'skipped'), '3', 'blocked')
  expect(stopNudge(plan, 0, TOOL)).toBeUndefined()
})

test('after the nudge cap Claude may stop with steps left', () => {
  const plan = planOf(['A'])
  expect(stopNudge(plan, MAX_STOP_NUDGES - 1, TOOL)).toContain('1 plan step is still open')
  expect(stopNudge(plan, MAX_STOP_NUDGES, TOOL)).toBeUndefined()
})

test('a long list names five steps and counts the rest', () => {
  const text = stopNudge(planOf(['A', 'B', 'C', 'D', 'E', 'F', 'G']), 0, TOOL) ?? ''
  expect(text).toContain('5 [pending] E')
  expect(text).not.toContain('6 [pending] F')
  expect(text).toContain('+2 more')
})
