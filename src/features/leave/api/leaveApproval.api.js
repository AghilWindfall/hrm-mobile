import httpClient from "../../../lib/httpClient"

export async function getApprovalLeaveTypesApi() {
  const response = await httpClient.get("/service/api/LeaveTypes/GetLeaveTypes")
  return response.data
}

export async function getPendingLeavesForApprovalApi(payload = {}) {
  const response = await httpClient.post(
    "/service/api/LeaveRegister/GetPendingLeavesForApproval",
    payload,
  )

  return response.data
}

export async function createLeaveSanctionApi(payload = []) {
  const response = await httpClient.post(
    "/service/api/LeaveSanction/Create",
    payload,
  )

  return response.data
}
