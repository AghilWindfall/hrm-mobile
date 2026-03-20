import httpClient from "../../../lib/httpClient"

export async function getLeaveBalanceApi(employeeId) {
  const response = await httpClient.get(
    "/service/api/LeaveTypes/GetLeaveBalance",
    {
      params: { employeeId },
    },
  )

  return response.data
}

export async function getLeaveTypesByEmployeeApi(employeeId) {
  const response = await httpClient.get(
    "/service/api/LeaveTypes/GetLeaveTypesByEmployee",
    {
      params: { employeeId },
    },
  )

  return response.data
}

export async function getPreviousLeaveLogApi({ employeeId, applyStatus }) {
  const response = await httpClient.get(
    "/service/api/LeaveApply/GetPreviousLeaveLog",
    {
      params: {
        employeeId,
        applyStatus,
      },
    },
  )

  return response.data
}

export async function createLeaveApplyApi(payload) {
  const response = await httpClient.post(
    "/service/api/LeaveApply/Create",
    payload,
  )
  return response.data
}

export async function deleteLeaveApplyApi(payload) {
  const response = await httpClient.post(
    "/service/api/LeaveApply/Delete",
    payload,
  )

  return response.data
}
