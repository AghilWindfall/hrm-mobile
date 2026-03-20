import httpClient from "../../../lib/httpClient"

export async function getDepartmentsByUserIdApi(userId) {
  try {
    const response = await httpClient.get(
      "/service/api/Department/GetDepartmentByUserId",
      {
        params: { userId },
      },
    )

    return response.data
  } catch {
    // Some deployments expect UserId casing.
    const response = await httpClient.get(
      "/service/api/Department/GetDepartmentByUserId",
      {
        params: { UserId: userId },
      },
    )

    return response.data
  }
}

export async function getAllShiftApi() {
  const response = await httpClient.get(
    "/service/api/ShiftAllocation/GetAllShift",
  )
  return response.data
}

export async function getAttendanceDetailsApi(payload) {
  try {
    const response = await httpClient.post(
      "/service/api/ShiftAllocation/GetAttendanceDetails",
      payload,
    )

    return response.data
  } catch (error) {
    const statusCode = error?.response?.status
    const apiMessage =
      error?.response?.data?.Message ||
      error?.response?.data?.message ||
      error?.message ||
      "Attendance report request failed."

    throw new Error(
      statusCode
        ? `Attendance report API failed (${statusCode}): ${apiMessage}`
        : `Attendance report API failed: ${apiMessage}`,
    )
  }
}
