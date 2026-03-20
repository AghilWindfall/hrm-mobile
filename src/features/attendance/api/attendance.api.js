import httpClient from "../../../lib/httpClient"

export async function getSelfAttendanceDetailsApi(payload) {
  const response = await httpClient.post(
    "/service/api/ShiftAllocation/GetSelfAttendanceDetails",
    payload,
  )

  return response.data
}
