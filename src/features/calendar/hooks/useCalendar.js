import { useQuery } from "@tanstack/react-query"

import { getCalendarApi } from "../api/calendar.api"

export default function useCalendar({ employeeId, year, month, enabled }) {
  return useQuery({
    queryKey: ["calendar", employeeId, year, month],
    queryFn: () => getCalendarApi({ employeeId, year, month }),
    enabled,
    staleTime: 60 * 1000,
    placeholderData: (previousData) => previousData,
    retry: 2,
  })
}
