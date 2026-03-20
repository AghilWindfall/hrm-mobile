import { useMutation } from "@tanstack/react-query"

import {
  createLiveManualPunchRequestApi,
  getSelfPunchLogDetailsApi,
} from "../api/punch.api"

function normalizePunchLogResponse(raw) {
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

export default function usePunchLog() {
  return useMutation({
    mutationFn: async (payload) => {
      const raw = await getSelfPunchLogDetailsApi(payload)
      return normalizePunchLogResponse(raw)
    },
  })
}

function parseResponse(raw) {
  if (Array.isArray(raw)) {
    return raw
  }

  if (typeof raw !== "string") {
    return raw
  }

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === "string") {
      return JSON.parse(parsed)
    }

    return parsed
  } catch {
    return raw
  }
}

function isLiveManualPunchSuccess(data) {
  if (Array.isArray(data)) {
    const firstRow = data[0] || {}
    const result =
      firstRow.Column1 ?? firstRow.column1 ?? firstRow.Result ?? firstRow.result
    return String(result) === "1"
  }

  if (typeof data === "object" && data !== null) {
    if (typeof data.IsSuccess === "boolean") {
      return data.IsSuccess
    }

    const result = data.Column1 ?? data.column1 ?? data.Result ?? data.result
    if (result !== undefined) {
      return String(result) === "1"
    }

    const messageValue =
      data.Message ??
      data.message ??
      data.Messsage ??
      data.messsage ??
      data.Msg ??
      data.msg

    if (messageValue !== undefined) {
      return String(messageValue) === "1"
    }
  }

  return false
}

function resolveLiveManualPunchErrorMessage(data) {
  if (!data || typeof data !== "object") {
    return "Live punch request failed. Please try again."
  }

  const message =
    data.Message ??
    data.message ??
    data.Messsage ??
    data.messsage ??
    data.ErrorMessage ??
    data.errorMessage

  if (message && String(message).trim() && String(message) !== "0") {
    return String(message)
  }

  return "Live punch request failed. Please try again."
}

export function useLiveManualPunchRequest() {
  return useMutation({
    mutationFn: async (payload) => {
      const raw = await createLiveManualPunchRequestApi(payload)
      const parsed = parseResponse(raw)

      if (!isLiveManualPunchSuccess(parsed)) {
        throw new Error(resolveLiveManualPunchErrorMessage(parsed))
      }

      return parsed
    },
  })
}
