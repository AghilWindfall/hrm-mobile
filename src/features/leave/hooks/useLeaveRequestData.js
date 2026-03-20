import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  getLeaveBalanceApi,
  createLeaveApplyApi,
  deleteLeaveApplyApi,
  getLeaveTypesByEmployeeApi,
  getPreviousLeaveLogApi,
} from "../api/leave.api"

function normalizeHistoryResponse(raw) {
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

export function useLeaveBalance(employeeId) {
  return useQuery({
    queryKey: ["leave", "balance", employeeId],
    queryFn: () => getLeaveBalanceApi(employeeId),
    enabled: Boolean(employeeId),
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

export function useLeaveTypes(employeeId) {
  return useQuery({
    queryKey: ["leave", "types", employeeId],
    queryFn: () => getLeaveTypesByEmployeeApi(employeeId),
    enabled: Boolean(employeeId),
    staleTime: 5 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  })
}

export function usePreviousLeaveLog(employeeId, applyStatus) {
  return useQuery({
    queryKey: ["leave", "history", employeeId, applyStatus],
    queryFn: async () => {
      const raw = await getPreviousLeaveLogApi({ employeeId, applyStatus })
      return normalizeHistoryResponse(raw)
    },
    enabled: Boolean(employeeId),
    placeholderData: (previousData) => previousData,
  })
}

export function useCreateLeaveApply(employeeId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createLeaveApplyApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["leave", "balance", employeeId],
      })
      queryClient.invalidateQueries({
        queryKey: ["leave", "history", employeeId],
      })
    },
  })
}

export function useDeleteLeaveApply(employeeId) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteLeaveApplyApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["leave", "balance", employeeId],
      })
      queryClient.invalidateQueries({
        queryKey: ["leave", "history", employeeId],
      })
    },
  })
}
