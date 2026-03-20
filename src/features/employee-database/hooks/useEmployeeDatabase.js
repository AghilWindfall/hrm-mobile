import { useMutation } from "@tanstack/react-query"

import { getEmployeeDatabaseApi } from "../api/employeeDatabase.api"

function normalizeResponse(raw) {
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

export default function useEmployeeDatabase() {
  return useMutation({
    mutationFn: async (payload) => {
      const raw = await getEmployeeDatabaseApi(payload)
      return normalizeResponse(raw)
    },
  })
}
