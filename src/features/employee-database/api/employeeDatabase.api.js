import httpClient from "../../../lib/httpClient"

export async function getDepartmentsApi(userId) {
  const response = await httpClient.get(
    "/service/api/Department/GetDepartmentByUserId",
    { params: { userId } },
  )
  return response.data
}

export async function getAllDesignationsApi() {
  const response = await httpClient.get(
    "/service/api/Designation/GetAllDesignation",
  )
  return response.data
}

export async function getEmployeeDatabaseApi(payload) {
  try {
    const response = await httpClient.post(
      "/service/api/ShiftAllocation/GetEmployeeDatabase",
      payload,
      { timeout: 60000 },
    )
    return response.data
  } catch (error) {
    const statusCode = error?.response?.status
    const apiMessage =
      error?.response?.data?.Message ||
      error?.response?.data?.message ||
      error?.message ||
      "Employee database request failed."

    throw new Error(
      statusCode
        ? `Employee database API failed (${statusCode}): ${apiMessage}`
        : `Employee database API failed: ${apiMessage}`,
    )
  }
}

export default getEmployeeDatabaseApi
