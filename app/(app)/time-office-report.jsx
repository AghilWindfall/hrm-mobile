import { Ionicons } from "@expo/vector-icons"
import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import Button from "../../src/components/ui/Button"
import Loader from "../../src/components/ui/Loader"
import useAuthStore from "../../src/features/auth/store/auth.store"
import useTimeOfficeReport from "../../src/features/time-office/hooks/useTimeOfficeReport"
import { formatToIsoDate, parseDateInput } from "../../src/utils/date"
import { exportRowsAsExcel } from "../../src/utils/exportExcel"
import { resolveNumericUserId } from "../../src/utils/user"

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
]

const MODES = ["Actual Hours", "Total Hours"]

function buildDatePayload(date) {
  return {
    Day: date.getDate(),
    Month: date.getMonth() + 1,
    Year: date.getFullYear(),
  }
}

function getDayLabel(year, month, day) {
  const date = new Date(year, month - 1, day)
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" })
  return `${day} ${weekday}`
}

function toMinutes(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{1,2})$/)
  if (!match) {
    return 0
  }

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return 0
  }

  return hours * 60 + minutes
}

export default function TimeOfficeReportScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const reportMutation = useTimeOfficeReport()

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedMode, setSelectedMode] = useState("Actual Hours")
  const [rows, setRows] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [apiErrorMessage, setApiErrorMessage] = useState("")

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return [currentYear, currentYear - 1, currentYear - 2]
  }, [])

  const daysInMonth = useMemo(
    () => new Date(selectedYear, selectedMonth, 0).getDate(),
    [selectedYear, selectedMonth],
  )

  const dayHeaders = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, index) => {
      const day = index + 1
      return {
        key: `D${day}`,
        label: getDayLabel(selectedYear, selectedMonth, day),
      }
    })
  }, [daysInMonth, selectedMonth, selectedYear])

  const summary = useMemo(() => {
    const employeeCount = rows.length

    const shortHoursCount = rows.filter((item) => {
      const dayMinutes = dayHeaders.reduce((sum, day) => {
        const value = item?.[day.key]
        return sum + toMinutes(value)
      }, 0)

      return dayMinutes > 0 && dayMinutes < dayHeaders.length * 9 * 60
    }).length

    return { employeeCount, shortHoursCount }
  }, [rows, dayHeaders])

  const exportRows = useMemo(() => {
    return rows.map((item) => {
      const base = {
        Code: item?.Emp_Code || "",
        Name: item?.Emp_Name || "",
        Department: item?.Department || "",
        Branch: item?.Branch_Name || "",
        Mode: selectedMode,
        Year: selectedYear,
        Month:
          MONTHS.find((month) => month.value === selectedMonth)?.label ||
          selectedMonth,
      }

      dayHeaders.forEach((header) => {
        base[header.label] = item?.[header.key] || ""
      })

      return base
    })
  }, [rows, dayHeaders, selectedMode, selectedYear, selectedMonth])

  const handleShow = async () => {
    const requestDate = parseDateInput(formatToIsoDate(new Date()))
    if (!requestDate) {
      return
    }

    const payload = {
      UserId: userId,
      ActivePage: 1,
      PageRowCount: 50,
      FromDate: buildDatePayload(requestDate),
      ToDate: buildDatePayload(requestDate),
      SelectYear: selectedYear,
      SelectMonth: selectedMonth,
      SelectMode: selectedMode,
    }

    try {
      setApiErrorMessage("")
      setRows([])
      setHasSearched(false)
      const response = await reportMutation.mutateAsync(payload)
      setRows(response)
      setHasSearched(true)
    } catch (error) {
      setRows([])
      setHasSearched(true)

      const message = String(error?.message || "")
      if (/canceled|cancelled/i.test(message)) {
        setApiErrorMessage(
          "Request was canceled before completion. Please tap Show again and wait.",
        )
      } else if (/timeout/i.test(message)) {
        setApiErrorMessage(
          "Request timed out. Please try again; network or server may be slow.",
        )
      } else {
        setApiErrorMessage(message || "Unable to load time office report.")
      }
    }
  }

  const handleExport = async () => {
    await exportRowsAsExcel({
      rows: exportRows,
      sheetName: "Time Office Report",
      filePrefix: "time-office-report",
      emptyMessage: "No time office report data available to export.",
    })
  }

  if (!userId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>
          Unable to resolve user ID from session.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.filterCard}>
        <Text style={styles.pageTitle}>Time Office Report</Text>
        <Text style={styles.pageSubtitle}>
          View monthly day-wise {selectedMode.toLowerCase()} across employees.
        </Text>

        <Text style={styles.filterLabel}>Select Year</Text>
        <View style={styles.chipRow}>
          {yearOptions.map((year) => {
            const selected = year === selectedYear
            return (
              <Pressable
                key={year}
                onPress={() => setSelectedYear(year)}
                style={[styles.chip, selected ? styles.chipActive : null]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected ? styles.chipTextActive : null,
                  ]}
                >
                  {year}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.filterLabel}>Select Month</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {MONTHS.map((month) => {
              const selected = month.value === selectedMonth
              return (
                <Pressable
                  key={month.value}
                  onPress={() => setSelectedMonth(month.value)}
                  style={[styles.chip, selected ? styles.chipActive : null]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected ? styles.chipTextActive : null,
                    ]}
                  >
                    {month.label}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </ScrollView>

        <Text style={styles.filterLabel}>Select Mode</Text>
        <View style={styles.chipRow}>
          {MODES.map((mode) => {
            const selected = mode === selectedMode
            return (
              <Pressable
                key={mode}
                onPress={() => setSelectedMode(mode)}
                style={[styles.chip, selected ? styles.chipActive : null]}
              >
                <Text
                  style={[
                    styles.chipText,
                    selected ? styles.chipTextActive : null,
                  ]}
                >
                  {mode}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.actionRow}>
          <View style={styles.showButtonWrap}>
            <Button
              label="Show"
              onPress={handleShow}
              loading={reportMutation.isPending}
              loadingLabel="Loading..."
              disabled={reportMutation.isPending}
            />
          </View>

          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [
              styles.exportButton,
              pressed ? styles.exportPressed : null,
            ]}
          >
            <Ionicons name="download-outline" size={14} color="#145533" />
            <Text style={styles.exportButtonText}>Export</Text>
          </Pressable>
        </View>
      </View>

      {reportMutation.isPending ? <Loader /> : null}

      {hasSearched && rows.length > 0 ? (
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Employees</Text>
            <Text style={styles.summaryValue}>{summary.employeeCount}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Short Hour Trend</Text>
            <Text style={styles.summaryValue}>{summary.shortHoursCount}</Text>
          </View>
        </View>
      ) : null}

      {hasSearched && !reportMutation.isPending && rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {apiErrorMessage || "No time office report data found."}
          </Text>
        </View>
      ) : null}

      {rows.map((item, index) => (
        <View key={`${item?.Emp_Id || "emp"}-${index}`} style={styles.rowCard}>
          <View style={styles.rowHead}>
            <View style={styles.codePill}>
              <Text style={styles.codeText}>{item?.Emp_Code || "-"}</Text>
            </View>
            <Text style={styles.monthPillText}>
              {item?.Month ||
                MONTHS.find((month) => month.value === selectedMonth)?.label}
            </Text>
          </View>

          <Text style={styles.nameText}>{item?.Emp_Name || "-"}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Department</Text>
              <Text style={styles.metaValue}>{item?.Department || "-"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Branch</Text>
              <Text style={styles.metaValue}>{item?.Branch_Name || "-"}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dayGrid}>
              {dayHeaders.map((header) => (
                <View key={header.key} style={styles.dayCell}>
                  <Text style={styles.dayLabel}>{header.label}</Text>
                  <Text style={styles.dayValue}>
                    {item?.[header.key] || "-"}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E9EAEC",
  },
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 28,
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D8DCE2",
    gap: 8,
  },
  pageTitle: {
    color: "#1F2E3A",
    fontSize: 18,
    fontWeight: "800",
  },
  pageSubtitle: {
    color: "#51677D",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  filterLabel: {
    color: "#243B52",
    fontSize: 12,
    fontWeight: "700",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CAD4E2",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: {
    borderColor: "#0A5B8A",
    backgroundColor: "#0A5B8A",
  },
  chipText: {
    color: "#395670",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  actionRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  showButtonWrap: {
    flex: 1,
  },
  exportButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#B8D9C5",
    backgroundColor: "#EAF8EE",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  exportButtonText: {
    color: "#145533",
    fontSize: 13,
    fontWeight: "800",
  },
  exportPressed: {
    opacity: 0.85,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D8E3EF",
    backgroundColor: "#F5FAFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryLabel: {
    color: "#5A728A",
    fontSize: 11,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#1E3953",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D9DEE6",
  },
  emptyText: {
    color: "#5E6B7A",
    textAlign: "center",
    fontSize: 13,
    fontWeight: "600",
  },
  rowCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9DEE6",
    padding: 12,
    gap: 8,
  },
  rowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  codePill: {
    backgroundColor: "#E8F1FB",
    borderColor: "#C8DEF3",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  codeText: {
    color: "#18548F",
    fontWeight: "800",
    fontSize: 12,
  },
  monthPillText: {
    color: "#5A7084",
    fontSize: 12,
    fontWeight: "700",
  },
  nameText: {
    color: "#1E3348",
    fontSize: 15,
    fontWeight: "800",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaItem: {
    width: "48%",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E0E7F0",
    backgroundColor: "#FAFCFF",
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 2,
  },
  metaLabel: {
    color: "#607A96",
    fontSize: 11,
    fontWeight: "700",
  },
  metaValue: {
    color: "#243A51",
    fontSize: 13,
    fontWeight: "700",
  },
  dayGrid: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  dayCell: {
    width: 88,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#DFE7F1",
    backgroundColor: "#F7FAFE",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
  },
  dayLabel: {
    color: "#5F7892",
    fontSize: 11,
    fontWeight: "700",
  },
  dayValue: {
    color: "#20384F",
    fontSize: 13,
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9EAEC",
    paddingHorizontal: 20,
  },
  errorText: {
    color: "#A2202D",
    fontWeight: "700",
    textAlign: "center",
    fontSize: 13,
  },
})
