/** Civil days are canonical strings, never UTC timestamps. */
export function isTaskOverdue(
  dueDate: string | null,
  status: 'pending' | 'in_progress' | 'done',
  today: string,
): boolean {
  return dueDate !== null && status !== 'done' && dueDate < today
}

export function localDay(now = new Date()): string {
  return [
    now.getFullYear().toString().padStart(4, '0'),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0'),
  ].join('-')
}

export function untilNextLocalDay(now = new Date()): number {
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  return Math.max(1, midnight.getTime() - now.getTime())
}
