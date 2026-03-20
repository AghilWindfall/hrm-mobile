import { loginApi } from "../api/login.api"

function normalizeLoginResponse(response, payload) {
  if (response === false || response === null || response === undefined) {
    throw new Error("Invalid username or password.")
  }

  if (Array.isArray(response) && response.length === 0) {
    throw new Error("Invalid username or password.")
  }

  if (typeof response === "object" && response?.success === false) {
    throw new Error(response?.message || "Authentication failed.")
  }

  const apiUser = Array.isArray(response) ? response[0] : null

  const user = apiUser ||
    response?.user ||
    response?.data?.user ||
    (typeof response === "object" ? response : null) || {
      identifier: payload.identifier,
    }

  return { user, raw: response }
}

export async function loginService(payload) {
  const response = await loginApi(payload)
  return normalizeLoginResponse(response, payload)
}

export default loginService
