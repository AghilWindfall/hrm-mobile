import { useMutation } from "@tanstack/react-query"

import { getSelfAttendanceDetailsApi } from "../api/attendance.api"

function normalizeAttendanceResponse(raw) {
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

export default function useSelfAttendance() {
  return useMutation({
    mutationFn: async (payload) => {
      const raw = await getSelfAttendanceDetailsApi(payload)
      return normalizeAttendanceResponse(raw)
    },
  })
}
