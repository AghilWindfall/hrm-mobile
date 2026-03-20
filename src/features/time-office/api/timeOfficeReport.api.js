import httpClient from "../../../lib/httpClient"

export async function getMusterRollWorkHoursReportApi(payload) {
  const response = await httpClient.post(
    "/service/api/ShiftAllocation/GetMusterRollWorkHoursReport",
    payload,
    {
      // This report payload can take longer than default timeout on mobile networks.
      timeout: 60000,
    },
  )

  return response.data
}

export default getMusterRollWorkHoursReportApi
