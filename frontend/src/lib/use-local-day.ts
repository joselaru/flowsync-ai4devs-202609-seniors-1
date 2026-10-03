import { useEffect, useState } from 'react'
import { localDay, untilNextLocalDay } from '@/lib/task-calendar'

export function useLocalDay() {
  const [today, setToday] = useState(localDay)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const refresh = () => {
      clearTimeout(timer)
      setToday(localDay())
      timer = setTimeout(refresh, untilNextLocalDay())
    }
    refresh()
    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return today
}
