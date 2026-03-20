import httpClient from "../../../lib/httpClient"

export async function getOurTeamDetailsApi(employeeId) {
  try {
    const response = await httpClient.get(
      "/service/api/ShiftAllocation/GetOurTeamDetails",
      {
        params: { employeeId },
      },
    )

    return response.data
  } catch {
    // Some deployments expect EmployeeId casing; retry once with alternate key.
    const response = await httpClient.get(
      "/service/api/ShiftAllocation/GetOurTeamDetails",
      {
        params: { EmployeeId: employeeId },
      },
    )

    return response.data
  }
}
