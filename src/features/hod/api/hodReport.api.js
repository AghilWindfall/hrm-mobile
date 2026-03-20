import httpClient from "../../../lib/httpClient"

export async function getTotalWorkHoursReportApi(payload) {
  const response = await httpClient.post(
    "/service/api/ShiftAllocation/GetTotalWorkHoursReport",
    payload,
  )

  return response.data
}

export default getTotalWorkHoursReportApi
