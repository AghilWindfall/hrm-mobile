import httpClient from "../../../lib/httpClient"

export async function getMusterRollReportApi(payload) {
  try {
    const response = await httpClient.post(
      "/service/api/ShiftAllocation/GetMusterRollReport",
      payload,
      {
        // This report can take longer on low mobile bandwidth.
        timeout: 60000,
      },
    )

    return response.data
  } catch (error) {
    const statusCode = error?.response?.status
    const apiMessage =
      error?.response?.data?.Message ||
      error?.response?.data?.message ||
      error?.message ||
      "Muster roll request failed."

    throw new Error(
      statusCode
        ? `Muster roll API failed (${statusCode}): ${apiMessage}`
        : `Muster roll API failed: ${apiMessage}`,
    )
  }
}

export default getMusterRollReportApi
