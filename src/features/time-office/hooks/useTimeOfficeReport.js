import { useMutation } from "@tanstack/react-query"

import { getMusterRollWorkHoursReportApi } from "../api/timeOfficeReport.api"

function normalizeTimeOfficeReportResponse(raw) {
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

export default function useTimeOfficeReport() {
  return useMutation({
    mutationFn: async (payload) => {
      const raw = await getMusterRollWorkHoursReportApi(payload)
      return normalizeTimeOfficeReportResponse(raw)
    },
  })
}
