import { useQuery } from "@tanstack/react-query"

import { getCompanyOverviewApi } from "../api/companyOverview.api"

function normalizeCompanyOverviewResponse(raw) {
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

    return []
  } catch {
    return []
  }
}

export default function useCompanyOverview(employeeId) {
  return useQuery({
    queryKey: ["company-overview", employeeId],
    queryFn: async () => {
      const raw = await getCompanyOverviewApi(employeeId)
      return normalizeCompanyOverviewResponse(raw)
    },
    enabled: Boolean(employeeId),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  })
}
