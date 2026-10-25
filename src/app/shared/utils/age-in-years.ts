/** Completed years, using calendar dates without UTC timezone shifts. */
export function ageInYears(value: string | null | undefined, today = new Date()): number | null {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T| )/)
  if (!match) return null
  const [, y, m, d] = match
  const year = Number(y), month = Number(m), day = Number(d)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
  let age = today.getFullYear() - year
  if (today.getMonth() < month - 1 || (today.getMonth() === month - 1 && today.getDate() < day)) age--
  return age < 0 ? null : age
}
