import httpClient from "../../../lib/httpClient"

export async function fetchUserDetails(employeeId) {
  let response
  try {
    response = await httpClient.get(
      "/service/api/ShiftAllocation/Getuserdetails",
      { params: { employeeId } },
    )
  } catch {
    response = await httpClient.get(
      "/service/api/ShiftAllocation/Getuserdetails",
      { params: { EmployeeId: employeeId } },
    )
  }
  const data = response.data
  if (Array.isArray(data) && data.length > 0) return data[0]
  if (data && typeof data === "object" && !Array.isArray(data)) return data
  return null
}
