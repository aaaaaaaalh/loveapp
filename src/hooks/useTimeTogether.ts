import { calendarDaysBetween } from '../utils/date'
import { useNow } from './useNow'

// Adapted from useTimeTogether in the MIT reference's Anniversary.jsx.
// Uses local calendar days to avoid UTC / daylight-saving off-by-one errors.
export function useTimeTogether(startDate: string) {
  const now = useNow()
  return calendarDaysBetween(startDate, now)
}
