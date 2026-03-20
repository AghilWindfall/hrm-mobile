import httpClient from "../../../lib/httpClient"

export async function changePasswordApi(payload) {
  const response = await httpClient.post(
    "/service/api/ShiftAllocation/Changepassword",
    payload,
  )

  return response.data
}
