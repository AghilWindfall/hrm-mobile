import httpClient from "../../../lib/httpClient"

export async function getCompanyOverviewApi(employeeId) {
  const response = await httpClient.get(
    "/service/api/ShiftAllocation/GetCompanyOverview",
    {
      params: { employeeId },
    },
  )

  return response.data
}

export default getCompanyOverviewApi
