import { useMutation } from "@tanstack/react-query"

import { getTotalWorkHoursReportApi } from "../api/hodReport.api"

function normalizeHodReportResponse(raw) {
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

export default function useHodReport() {
  return useMutation({
    mutationFn: async (payload) => {
      const raw = await getTotalWorkHoursReportApi(payload)
      return normalizeHodReportResponse(raw)
    },
  })
}
