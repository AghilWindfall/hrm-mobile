import { useQuery } from "@tanstack/react-query"

import { getOurTeamDetailsApi } from "../api/team.api"

function normalizeTeamResponse(raw) {
  if (Array.isArray(raw)) {
    return raw
  }

  if (typeof raw !== "string") {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function useOurTeam(employeeId) {
  return useQuery({
    queryKey: ["team", "our-team", employeeId],
    queryFn: async () => {
      const raw = await getOurTeamDetailsApi(employeeId)
      return normalizeTeamResponse(raw)
    },
    enabled: Boolean(employeeId),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 1,
  })
}
