import { useMutation } from "@tanstack/react-query"

import { changePasswordApi } from "../api/changePassword.api"

function normalizeChangePasswordResponse(raw) {
  if (typeof raw === "string") {
    const text = raw.trim()
    if (!text) {
      return { success: true, message: "Password updated successfully." }
    }

    return {
      success: !/fail|error|invalid/i.test(text),
      message: text,
    }
  }

  if (typeof raw === "boolean") {
    return {
      success: raw,
      message: raw
        ? "Password updated successfully."
        : "Unable to update password.",
    }
  }

  if (raw && typeof raw === "object") {
    const success =
      raw.success ??
      raw.Success ??
      raw.isSuccess ??
      raw.status ??
      raw.Status ??
      true

    const message = raw.message || raw.Message || raw.result || raw.Result || ""

    return {
      success: Boolean(success),
      message: String(
        message ||
          (success
            ? "Password updated successfully."
            : "Unable to update password."),
      ),
    }
  }

  return {
    success: true,
    message: "Password updated successfully.",
  }
}

export default function useChangePassword() {
  return useMutation({
    mutationFn: async (payload) => {
      const raw = await changePasswordApi(payload)
      return normalizeChangePasswordResponse(raw)
    },
  })
}
