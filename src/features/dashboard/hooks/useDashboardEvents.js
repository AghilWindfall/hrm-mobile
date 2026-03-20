import { useQuery } from "@tanstack/react-query"

import { getDashboardEventsApi } from "../api/events.api"

function normalizeEventsResponse(raw) {
  if (Array.isArray(raw)) {
    return raw
  }

  if (typeof raw !== "string") {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }

    if (typeof parsed === "string") {
      const parsedAgain = JSON.parse(parsed)
      return Array.isArray(parsedAgain) ? parsedAgain : []
    }
  } catch {
    return []
  }

  return []
}

export default function useDashboardEvents(userId) {
  return useQuery({
    queryKey: ["dashboard", "events", userId],
    queryFn: async () => {
      const raw = await getDashboardEventsApi(userId)
      return normalizeEventsResponse(raw)
    },
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  })
}
