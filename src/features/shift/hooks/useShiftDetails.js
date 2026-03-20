import { useMutation, useQuery } from "@tanstack/react-query"

import {
  getAllShiftOptionsApi,
  getShiftDepartmentsByUserIdApi,
  getShiftDetailsApi,
  updateShiftAllocationApi,
} from "../api/shift.api"

function normalizeShiftResponse(raw) {
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

export function useShiftDepartments(userId) {
  return useQuery({
    queryKey: ["shift-assign", "departments", userId],
    queryFn: async () => {
      const raw = await getShiftDepartmentsByUserIdApi(userId)
      return normalizeShiftResponse(raw)
    },
    enabled: Boolean(userId),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })
}

export function useShiftOptions() {
  return useQuery({
    queryKey: ["shift-assign", "shift-options"],
    queryFn: async () => {
      const raw = await getAllShiftOptionsApi()
      return normalizeShiftResponse(raw)
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })
}

export default function useShiftDetails() {
  return useMutation({
    mutationFn: async (payload) => {
      const raw = await getShiftDetailsApi(payload)
      return normalizeShiftResponse(raw)
    },
  })
}

export function useUpdateShiftAllocation() {
  return useMutation({
    mutationFn: updateShiftAllocationApi,
  })
}
