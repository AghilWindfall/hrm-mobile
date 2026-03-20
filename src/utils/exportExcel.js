import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import { Alert } from "react-native"

function toDisplayValue(value) {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }

  return String(value)
}

function escapeCsv(value) {
  const normalized = toDisplayValue(value).replace(/\r?\n/g, " ")
  if (
    normalized.includes(",") ||
    normalized.includes('"') ||
    normalized.includes(";")
  ) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function buildCsv(rows) {
  const headers = []
  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!headers.includes(key)) {
        headers.push(key)
      }
    })
  })

  const headerLine = headers.map((h) => escapeCsv(h)).join(",")
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsv(row?.[h])).join(","),
  )

  return [headerLine, ...dataLines].join("\n")
}

export async function exportRowsAsExcel({
  rows,
  sheetName,
  filePrefix,
  emptyMessage,
}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    Alert.alert("No data", emptyMessage || "No rows available to export.")
    return false
  }

  try {
    const canShare = await Sharing.isAvailableAsync()
    if (!canShare) {
      Alert.alert(
        "Sharing unavailable",
        "File sharing is not available on this device.",
      )
      return false
    }

    const csv = buildCsv(rows)

    const stamp = new Date().toISOString().slice(0, 10)
    const safePrefix = String(filePrefix || "report").replace(/\s+/g, "-")
    const fileUri = `${FileSystem.cacheDirectory}${safePrefix}-${stamp}.csv`

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    })

    await Sharing.shareAsync(fileUri, {
      mimeType: "text/csv",
      dialogTitle: sheetName ? `Export ${sheetName}` : "Export Report",
      UTI: "public.comma-separated-values-text",
    })

    return true
  } catch (error) {
    Alert.alert(
      "Export failed",
      error?.message || "Unable to generate export file.",
    )
    return false
  }
}

export default exportRowsAsExcel
