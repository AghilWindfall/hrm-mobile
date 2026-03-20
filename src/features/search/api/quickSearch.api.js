import httpClient from "../../../lib/httpClient"

export async function getEmployeeQuickSearchApi(search, employeeId) {
  const response = await httpClient.get(
    "/service/api/ShiftAllocation/GetEmployeeForQuickSearch",
    {
      params: {
        search,
        EmployeeId: employeeId,
      },
    },
  )

  return response.data
}
