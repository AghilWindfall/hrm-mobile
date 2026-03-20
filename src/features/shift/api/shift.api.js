import httpClient from "../../../lib/httpClient"

export async function getShiftDepartmentsByUserIdApi(userId) {
  try {
    const response = await httpClient.get(
      "/service/api/Department/GetDepartmentByUserId",
      {
        params: { userId },
      },
    )

    return response.data
  } catch {
    const response = await httpClient.get(
      "/service/api/Department/GetDepartmentByUserId",
      {
        params: { UserId: userId },
      },
    )

    return response.data
  }
}

export async function getAllShiftOptionsApi() {
  const response = await httpClient.get(
    "/service/api/ShiftAllocation/GetAllShift",
  )

  return response.data
}

export async function getShiftDetailsApi(payload) {
  const response = await httpClient.post(
    "/service/api/ShiftAllocation/GetShiftDetails",
    payload,
  )

  return response.data
}

export async function updateShiftAllocationApi(payload) {
  const response = await httpClient.post(
    "/service/api/ShiftAllocation/UpdateShiftAllocation",
    payload,
  )

  return response.data
}
