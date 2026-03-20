import httpClient from "../../../lib/httpClient"

function normalizeCalendarResponse(raw) {
  if (Array.isArray(raw)) {
    return raw
  }

  if (typeof raw === "string") {
    const text = raw.trim()
    if (!text) {
      return []
    }

    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        return parsed
      }

      if (typeof parsed === "string") {
        const parsedTwice = JSON.parse(parsed)
        return Array.isArray(parsedTwice) ? parsedTwice : []
      }

      return []
    } catch {
      return []
    }
  }

  if (raw && typeof raw === "object") {
    if (Array.isArray(raw.data)) {
      return raw.data
    }

    if (typeof raw.data === "string") {
      return normalizeCalendarResponse(raw.data)
    }
  }

  return []
}

export async function getCalendarApi({ employeeId, year, month }) {
  const response = await httpClient.get("/service/api/LeaveApply/GetCalendar", {
    params: {
      Emp_Id: employeeId,
      Year: year,
      Month: month,
    },
  })

  return normalizeCalendarResponse(response.data)
}
