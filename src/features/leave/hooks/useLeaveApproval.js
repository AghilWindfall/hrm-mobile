import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createLeaveSanctionApi,
  getApprovalLeaveTypesApi,
  getPendingLeavesForApprovalApi,
} from "../api/leaveApproval.api"

function parseNestedJsonString(value) {
  if (typeof value !== "string") {
    return value
  }

  try {
    const parsed = JSON.parse(value)
    return typeof parsed === "string" ? parseNestedJsonString(parsed) : parsed
  } catch {
    return value
  }
}

function normalizeLeaveTypesResponse(raw) {
  const parsed = parseNestedJsonString(raw)
  return Array.isArray(parsed) ? parsed : []
}

function normalizePendingLeavesResponse(raw) {
  const parsed = parseNestedJsonString(raw)
  return Array.isArray(parsed) ? parsed : []
}

export function useApprovalLeaveTypes() {
  return useQuery({
    queryKey: ["leave-approval", "types"],
    queryFn: async () => {
      const raw = await getApprovalLeaveTypesApi()
      return normalizeLeaveTypesResponse(raw)
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export function usePendingLeavesForApproval({
  applyStatus = "P",
  userId,
} = {}) {
  return useQuery({
    queryKey: ["leave-approval", "pending", applyStatus, userId],
    queryFn: async () => {
      const raw = await getPendingLeavesForApprovalApi({
        ApplyStatus: applyStatus,
        UserId: Number(userId),
      })
      return normalizePendingLeavesResponse(raw)
    },
    enabled: Boolean(userId),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  })
}

export function useLeaveSanctionAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createLeaveSanctionApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["leave-approval", "pending"],
      })
    },
  })
}
