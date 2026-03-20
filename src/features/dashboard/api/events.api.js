import httpClient from "../../../lib/httpClient"

export async function getDashboardEventsApi(userId) {
  const response = await httpClient.get("/service/api/LeaveApply/getevents", {
    params: { UserId: userId },
  })

  return response.data
}
