import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import { Alert } from "react-native"

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
    const xlsxModule = await import("xlsx")
    const XLSX = xlsxModule.default || xlsxModule

    const canShare = await Sharing.isAvailableAsync()
    if (!canShare) {
      Alert.alert(
        "Sharing unavailable",
        "File sharing is not available on this device.",
      )
      return false
    }

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || "Report")

    const base64 = XLSX.write(workbook, {
      type: "base64",
      bookType: "xlsx",
    })

    const stamp = new Date().toISOString().slice(0, 10)
    const safePrefix = String(filePrefix || "report").replace(/\s+/g, "-")
    const fileUri = `${FileSystem.cacheDirectory}${safePrefix}-${stamp}.xlsx`

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    })

    await Sharing.shareAsync(fileUri, {
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dialogTitle: "Export Excel",
      UTI: "org.openxmlformats.spreadsheetml.sheet",
    })

    return true
  } catch (error) {
    Alert.alert(
      "Export failed",
      error?.message || "Unable to generate Excel file.",
    )
    return false
  }
}

export default exportRowsAsExcel
