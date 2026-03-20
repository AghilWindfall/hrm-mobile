import httpClient from "../../../lib/httpClient"

export async function getSelfPunchLogDetailsApi(payload) {
  const response = await httpClient.post(
    "/service/api/ShiftAllocation/GetSelfPunchLogDetails",
    payload,
  )

  return response.data
}

export async function createLiveManualPunchRequestApi(payload) {
  const response = await httpClient.post(
    "/service/api/LeaveApply/LiveManualPunchRequest",
    payload,
  )

  return response.data
}
