import { useMutation, useQuery } from "@tanstack/react-query"

import {
  getAllShiftApi,
  getAttendanceDetailsApi,
  getDepartmentsByUserIdApi,
} from "../api/attendanceReport.api"

function normalizeAsArray(raw) {
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

export function useDepartmentsByUserId(userId) {
  return useQuery({
    queryKey: ["attendance-report", "departments", userId],
    queryFn: async () => {
      const raw = await getDepartmentsByUserIdApi(userId)
      return normalizeAsArray(raw)
    },
    enabled: Boolean(userId),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })
}

export function useAllShifts() {
  return useQuery({
    queryKey: ["attendance-report", "shifts"],
    queryFn: async () => {
      const raw = await getAllShiftApi()
      return normalizeAsArray(raw)
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })
}

export default function useAttendanceReport() {
  return useMutation({
    mutationFn: async (payload) => {
      const raw = await getAttendanceDetailsApi(payload)
      return normalizeAsArray(raw)
    },
  })
}
