import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  isTaskOverdue,
  localDay,
  untilNextLocalDay,
} from '../src/lib/task-calendar.ts'

for (const status of ['pending', 'in_progress', 'done'] as const) {
  test(`calendar boundaries for ${status}`, () => {
    assert.equal(isTaskOverdue(null, status, '2026-10-03'), false)
    assert.equal(
      isTaskOverdue('2026-10-02', status, '2026-10-03'),
      status !== 'done',
    )
    assert.equal(isTaskOverdue('2026-10-03', status, '2026-10-03'), false)
    assert.equal(isTaskOverdue('2026-10-04', status, '2026-10-03'), false)
  })
}

test('different local days and day rollover leave the saved date untouched', () => {
  const saved = { dueDate: '2026-10-03', status: 'pending' as const }
  assert.equal(isTaskOverdue(saved.dueDate, saved.status, '2026-10-03'), false)
  assert.equal(isTaskOverdue(saved.dueDate, saved.status, '2026-10-04'), true)
  assert.deepEqual(saved, { dueDate: '2026-10-03', status: 'pending' })
})

test('local calendar components and timer use the next civil midnight, including DST', () => {
  const previous = process.env.TZ
  try {
    process.env.TZ = 'America/New_York'
    assert.equal(localDay(new Date('2026-10-04T01:00:00Z')), '2026-10-03')
    assert.equal(
      untilNextLocalDay(new Date('2026-03-08T00:00:00-05:00')),
      23 * 60 * 60 * 1000,
    )
    assert.equal(
      untilNextLocalDay(new Date('2026-11-01T00:00:00-04:00')),
      25 * 60 * 60 * 1000,
    )
    assert.equal(untilNextLocalDay(new Date('2026-10-03T23:59:59-04:00')), 1000)
    process.env.TZ = 'Asia/Tokyo'
    assert.equal(localDay(new Date('2026-10-03T16:00:00Z')), '2026-10-04')
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
})
