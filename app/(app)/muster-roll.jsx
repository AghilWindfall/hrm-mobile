import { Ionicons } from "@expo/vector-icons"
import { useMemo, useState } from "react"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import Button from "../../src/components/ui/Button"
import Loader from "../../src/components/ui/Loader"
import useAuthStore from "../../src/features/auth/store/auth.store"
import useMusterRoll from "../../src/features/muster/hooks/useMusterRoll"
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

const STATUS_TONES = {
  P: { bg: "#D7F6DF", border: "#74BF86", text: "#1E5A2D" },
  OFF: { bg: "#E8EDF4", border: "#9BAAC0", text: "#344A64" },
  CL: { bg: "#FFF3C8", border: "#E1B847", text: "#6B4B07" },
  SL: { bg: "#D9F0FF", border: "#62A8D5", text: "#104A6D" },
  EL: { bg: "#FFE4C8", border: "#D4954E", text: "#6D3A0C" },
  ML: { bg: "#FCE0ED", border: "#D681A8", text: "#6C2B4D" },
  WO: { bg: "#E9E2FF", border: "#9B88D8", text: "#463276" },
  PH: { bg: "#E0F4FF", border: "#78B9DA", text: "#0F4F73" },
  LOP: { bg: "#FFE0E0", border: "#D47878", text: "#6D2222" },
  A: { bg: "#FFE8E8", border: "#D88E8E", text: "#7A2B2B" },
  "1/2P": { bg: "#E3FBDD", border: "#79B86C", text: "#24591D" },
  DEFAULT: { bg: "#F3F5F8", border: "#C8D0DD", text: "#415570" },
}

const STATUS_LEGEND = [
  "P",
  "OFF",
  "CL",
  "SL",
  "EL",
  "ML",
  "WO",
  "PH",
  "LOP",
  "1/2P",
]

const METRIC_GROUPS = [
  {
    key: "summary",
    title: "Summary",
    tint: "#DDE350",
    textColor: "#3F4500",
    columns: [
      { key: "P", label: "Total Present" },
      { key: "TotalLeaves", label: "Total Leaves" },
      { key: "PayCycleDays", label: "Pay Cycle" },
    ],
  },
  {
    key: "opening",
    title: "Opening",
    tint: "#B8B7F0",
    textColor: "#2A296B",
    columns: [
      { key: "OpenCL", label: "CL" },
      { key: "OpenSL", label: "SL" },
      { key: "OpenEL", label: "EL" },
      { key: "OpenML", label: "ML" },
      { key: "OpenWO", label: "WO" },
      { key: "OpenPH", label: "PH" },
    ],
  },
  {
    key: "credit",
    title: "Credit",
    tint: "#F5BD85",
    textColor: "#6A3510",
    columns: [
      { key: "CredCL", label: "CL" },
      { key: "CredSL", label: "SL" },
      { key: "CredEL", label: "EL" },
      { key: "CredML", label: "ML" },
      { key: "CredWO", label: "WO" },
      { key: "CredPH", label: "PH" },
    ],
  },
  {
    key: "taken",
    title: "Taken",
    tint: "#F0A7E2",
    textColor: "#5B1E54",
    columns: [
      { key: "TakeCL", label: "CL" },
      { key: "TakeSL", label: "SL" },
      { key: "TakeEL", label: "EL" },
      { key: "TakeML", label: "ML" },
      { key: "TakeWO", label: "WO" },
      { key: "TakePH", label: "PH" },
      { key: "TakeCOFF", label: "COFF" },
      { key: "TakeLOP", label: "LOP" },
    ],
  },
  {
    key: "closing",
    title: "Closing",
    tint: "#A9E2B2",
    textColor: "#1E5630",
    columns: [
      { key: "ClosCL", label: "CL" },
      { key: "ClosSL", label: "SL" },
      { key: "ClosEL", label: "EL" },
      { key: "ClosML", label: "ML" },
      { key: "ClosWO", label: "WO" },
      { key: "ClosPH", label: "PH" },
    ],
  },
]

function buildDatePayload(date) {
  return {
    Day: date.getDate(),
    Month: date.getMonth() + 1,
    Year: date.getFullYear(),
  }
}

function getDayHeaders(year, month) {
  const dayCount = new Date(year, month, 0).getDate()
  return Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1
    return {
      key: `D${day}`,
      label: String(day),
    }
  })
}

function normalizeStatusCode(value) {
  const raw = String(value || "").trim()
  if (!raw) {
    return "-"
  }

  const cleaned = raw.replace(/[()]/g, "").replace(/\s+/g, "").toUpperCase()

  if (cleaned === "HALFP" || cleaned === "1/2P") {
    return "1/2P"
  }

  if (cleaned === "OFFDAY") {
    return "OFF"
  }

  return cleaned
}

function getStatusTone(statusCode) {
  if (STATUS_TONES[statusCode]) {
    return STATUS_TONES[statusCode]
  }

  return STATUS_TONES.DEFAULT
}

function formatMetricValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-"
  }

  const numericValue = Number(value)
  if (Number.isFinite(numericValue)) {
    if (Number.isInteger(numericValue)) {
      return String(numericValue)
    }

    return numericValue.toFixed(1)
  }

  return String(value)
}

function toSafeNumber(value) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : 0
}

function buildExportRows(rows, dayHeaders, selectedYear, selectedMonth) {
  return rows.map((row) => {
    const base = {
      "Employee Code": row?.Emp_Code || "",
      "Employee Name": row?.Emp_Name || "",
      Department: row?.Department || "",
      Branch: row?.Branch_Name || "",
      DOJ: row?.DOJ || "",
      Year: row?.Year || selectedYear,
      Month:
        row?.Month ||
        MONTHS.find((month) => month.value === selectedMonth)?.label ||
        selectedMonth,
    }

    dayHeaders.forEach((day) => {
      base[`Day ${day.label}`] = row?.[day.key] || ""
    })

    METRIC_GROUPS.forEach((group) => {
      group.columns.forEach((column) => {
        base[`${group.title} ${column.label}`] = formatMetricValue(
          row?.[column.key],
        )
      })
    })

    return base
  })
}

export default function MusterRollScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const musterMutation = useMusterRoll()

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [apiErrorMessage, setApiErrorMessage] = useState("")

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return [currentYear, currentYear - 1, currentYear - 2]
  }, [])

  const dayHeaders = useMemo(
    () => getDayHeaders(selectedYear, selectedMonth),
    [selectedYear, selectedMonth],
  )

  const summary = useMemo(() => {
    const employeeCount = rows.length
    const presentDays = rows.reduce((sum, row) => sum + toSafeNumber(row?.P), 0)
    const totalLeaves = rows.reduce(
      (sum, row) => sum + toSafeNumber(row?.TotalLeaves),
      0,
    )

    return {
      employeeCount,
      presentDays: formatMetricValue(presentDays),
      totalLeaves: formatMetricValue(totalLeaves),
    }
  }, [rows])

  const exportRows = useMemo(
    () => buildExportRows(rows, dayHeaders, selectedYear, selectedMonth),
    [rows, dayHeaders, selectedYear, selectedMonth],
  )

  const handleShow = async () => {
    const monthStartDate = new Date(selectedYear, selectedMonth - 1, 1)
    const monthEndDate = new Date(selectedYear, selectedMonth, 0)

    const payload = {
      UserId: userId,
      ActivePage: 1,
      PageRowCount: 50,
      FromDate: buildDatePayload(monthStartDate),
      ToDate: buildDatePayload(monthEndDate),
      SelectYear: selectedYear,
      SelectMonth: selectedMonth,
    }

    try {
      setApiErrorMessage("")
      setRows([])
      setHasSearched(false)

      const response = await musterMutation.mutateAsync(payload)
      setRows(response)
      setHasSearched(true)
    } catch (error) {
      setRows([])
      setHasSearched(true)
      setApiErrorMessage(error?.message || "Unable to load muster roll report.")
    }
  }

  const handleExport = async () => {
    await exportRowsAsExcel({
      rows: exportRows,
      sheetName: "Muster Roll",
      filePrefix: "muster-roll-report",
      emptyMessage: "No muster roll rows available to export.",
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
        <Text style={styles.pageTitle}>Muster Roll</Text>
        <Text style={styles.pageSubtitle}>
          Day-wise attendance with color-coded leave balances for quick mobile
          understanding.
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

        <Button
          label="Show"
          onPress={handleShow}
          loading={musterMutation.isPending}
          loadingLabel="Loading..."
          disabled={musterMutation.isPending}
        />
      </View>

      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>Legend</Text>
        <Text style={styles.legendSub}>Daily Attendance Codes</Text>
        <View style={styles.legendWrap}>
          {STATUS_LEGEND.map((code) => {
            const tone = getStatusTone(code)
            return (
              <View
                key={code}
                style={[
                  styles.legendChip,
                  { backgroundColor: tone.bg, borderColor: tone.border },
                ]}
              >
                <Text style={[styles.legendChipText, { color: tone.text }]}>
                  {code}
                </Text>
              </View>
            )
          })}
        </View>

        <Text style={[styles.legendSub, styles.metricLegendSub]}>
          Leave Balance Sections
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.metricLegendRow}>
            {METRIC_GROUPS.map((group) => (
              <View
                key={group.key}
                style={[
                  styles.metricLegendChip,
                  { backgroundColor: group.tint },
                ]}
              >
                <Text
                  style={[styles.metricLegendText, { color: group.textColor }]}
                >
                  {group.title}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {musterMutation.isPending ? <Loader /> : null}

      {hasSearched && rows.length > 0 ? (
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Employees</Text>
            <Text style={styles.summaryValue}>{summary.employeeCount}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Present Days</Text>
            <Text style={styles.summaryValue}>{summary.presentDays}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Leaves</Text>
            <Text style={styles.summaryValue}>{summary.totalLeaves}</Text>
          </View>
          <Pressable
            onPress={handleExport}
            style={({ pressed }) => [
              styles.exportButton,
              pressed ? styles.exportPressed : null,
            ]}
          >
            <Ionicons name="download-outline" size={15} color="#145533" />
            <Text style={styles.exportButtonText}>Export CSV</Text>
          </Pressable>
        </View>
      ) : null}

      {hasSearched && !musterMutation.isPending && rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            {apiErrorMessage || "No muster roll data found."}
          </Text>
        </View>
      ) : null}

      {!hasSearched ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Select year and month, then tap Show to load muster roll.
          </Text>
        </View>
      ) : null}

      {rows.map((row, index) => (
        <View key={`${row?.Emp_Id || "emp"}-${index}`} style={styles.rowCard}>
          <View style={styles.rowHead}>
            <View style={styles.codePill}>
              <Text style={styles.codeText}>{row?.Emp_Code || "-"}</Text>
            </View>
            <Text style={styles.monthText}>{row?.Month || "-"}</Text>
          </View>

          <Text style={styles.nameText}>{row?.Emp_Name || "-"}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Department</Text>
              <Text style={styles.metaValue}>{row?.Department || "-"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Branch</Text>
              <Text style={styles.metaValue}>{row?.Branch_Name || "-"}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dayGrid}>
              {dayHeaders.map((day) => {
                const code = normalizeStatusCode(row?.[day.key])
                const tone = getStatusTone(code)

                return (
                  <View
                    key={`${row?.Emp_Id || "emp"}-${day.key}`}
                    style={[
                      styles.dayCell,
                      { backgroundColor: tone.bg, borderColor: tone.border },
                    ]}
                  >
                    <Text style={styles.dayLabel}>{day.label}</Text>
                    <Text style={[styles.dayValue, { color: tone.text }]}>
                      {code}
                    </Text>
                  </View>
                )
              })}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.metricGroupsRow}>
              {METRIC_GROUPS.map((group) => (
                <View
                  key={`${row?.Emp_Id || "emp"}-${group.key}`}
                  style={styles.metricGroup}
                >
                  <View
                    style={[
                      styles.metricGroupHeader,
                      { backgroundColor: group.tint },
                    ]}
                  >
                    <Text
                      style={[
                        styles.metricGroupTitle,
                        { color: group.textColor },
                      ]}
                    >
                      {group.title}
                    </Text>
                  </View>

                  <View style={styles.metricGrid}>
                    {group.columns.map((column) => (
                      <View
                        key={`${row?.Emp_Id || "emp"}-${group.key}-${column.key}`}
                        style={styles.metricItem}
                      >
                        <Text style={styles.metricLabel}>{column.label}</Text>
                        <Text style={styles.metricValue}>
                          {formatMetricValue(row?.[column.key])}
                        </Text>
                      </View>
                    ))}
                  </View>
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
    paddingBottom: 30,
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
    color: "#536A81",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  filterLabel: {
    color: "#223B54",
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
  legendCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8DCE2",
    padding: 12,
    gap: 8,
  },
  legendTitle: {
    color: "#24384E",
    fontSize: 15,
    fontWeight: "800",
  },
  legendSub: {
    color: "#4F6378",
    fontSize: 12,
    fontWeight: "700",
  },
  legendWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  legendChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  legendChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  metricLegendSub: {
    marginTop: 4,
  },
  metricLegendRow: {
    flexDirection: "row",
    gap: 8,
  },
  metricLegendChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  metricLegendText: {
    fontSize: 11,
    fontWeight: "800",
  },
  summaryRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7DFEA",
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 8,
  },
  summaryBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DBE4F0",
    backgroundColor: "#F6FAFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryLabel: {
    color: "#5D768F",
    fontSize: 11,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#233A52",
    marginTop: 2,
    fontSize: 16,
    fontWeight: "800",
  },
  exportButton: {
    minHeight: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#B7D5BB",
    backgroundColor: "#EAF8EB",
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
    opacity: 0.88,
  },
  emptyCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D5DCE7",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  emptyText: {
    color: "#4C6078",
    fontSize: 13,
    textAlign: "center",
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8E0EB",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 9,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  codePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFD0E4",
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  codeText: {
    color: "#234360",
    fontSize: 12,
    fontWeight: "700",
  },
  monthText: {
    color: "#526A83",
    fontSize: 12,
    fontWeight: "700",
  },
  nameText: {
    color: "#1F344B",
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
    gap: 7,
    paddingVertical: 2,
  },
  dayCell: {
    width: 56,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dayLabel: {
    color: "#5E738B",
    fontSize: 10,
    fontWeight: "700",
  },
  dayValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  metricGroupsRow: {
    flexDirection: "row",
    gap: 10,
  },
  metricGroup: {
    width: 210,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D5DEEA",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  metricGroupHeader: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metricGroupTitle: {
    fontSize: 12,
    fontWeight: "800",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 7,
  },
  metricItem: {
    width: "47%",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1E7F0",
    backgroundColor: "#F8FBFF",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  metricLabel: {
    color: "#617991",
    fontSize: 10,
    fontWeight: "700",
  },
  metricValue: {
    color: "#213A52",
    fontSize: 12,
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9EAEC",
    padding: 20,
  },
  errorText: {
    color: "#B3261E",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "700",
  },
})
