import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useMemo, useState } from "react"
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

import Button from "../../src/components/ui/Button"
import Loader from "../../src/components/ui/Loader"
import useAuthStore from "../../src/features/auth/store/auth.store"
import useSelfAttendance from "../../src/features/attendance/hooks/useSelfAttendance"
import { formatToIsoDate, parseDateInput } from "../../src/utils/date"
import { exportRowsAsExcel } from "../../src/utils/exportExcel"
import { resolveNumericUserId } from "../../src/utils/user"

const REQUIRED_ACTUAL_MINUTES = 8 * 60
const HIGH_BREAK_LIMIT_MINUTES = 90

function parseDurationToMinutes(value) {
  if (!value || typeof value !== "string") {
    return 0
  }

  const cleaned = value.trim()
  const match = cleaned.match(/^(\d{1,2}):(\d{1,2})$/)
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

function formatMinutesToDuration(totalMinutes) {
  const safeMinutes = Math.max(0, Math.round(totalMinutes || 0))
  const hours = Math.floor(safeMinutes / 60)
  const minutes = safeMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

function formatApiDate(value) {
  if (!value || value === "Summary") {
    return value || "-"
  }

  const parts = String(value).split("-")
  if (parts.length !== 3) {
    return value
  }

  const [day, month, year] = parts.map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function parseAttendanceDateKey(value) {
  const [day, month, year] = String(value || "")
    .split("-")
    .map(Number)

  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year)
  ) {
    return Number.NaN
  }

  return new Date(year, month - 1, day).getTime()
}

function getBreakCategory(minutes) {
  if (minutes > HIGH_BREAK_LIMIT_MINUTES) {
    return {
      key: "high",
      label: "High Break",
      color: "#B42318",
      bg: "#FEE4E2",
    }
  }

  return null
}

export default function SelfAttendanceScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const attendanceMutation = useSelfAttendance()

  const [fromDate, setFromDate] = useState(() => formatToIsoDate(new Date()))
  const [toDate, setToDate] = useState(() => formatToIsoDate(new Date()))
  const [pickerField, setPickerField] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [rows, setRows] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [dateSortOrder, setDateSortOrder] = useState("asc")

  const todayDate = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }, [])

  const fromDateMax = useMemo(() => {
    const parsedToDate = parseDateInput(toDate)
    if (parsedToDate && parsedToDate < todayDate) {
      return parsedToDate
    }

    return todayDate
  }, [toDate, todayDate])

  const pickerValue = useMemo(() => {
    if (!pickerField) {
      return new Date()
    }

    const sourceValue = pickerField === "fromDate" ? fromDate : toDate
    return parseDateInput(sourceValue) || new Date()
  }, [pickerField, fromDate, toDate])

  const { summaryRow, dataRows } = useMemo(() => {
    const summary = (rows || []).find(
      (item) => String(item?.AttendanceDate || "").trim() === "Summary",
    )

    const details = (rows || []).filter(
      (item) => String(item?.AttendanceDate || "").trim() !== "Summary",
    )

    return { summaryRow: summary || null, dataRows: details }
  }, [rows])

  const sortedDataRows = useMemo(() => {
    return [...dataRows].sort((a, b) => {
      const first = parseAttendanceDateKey(a?.AttendanceDate)
      const second = parseAttendanceDateKey(b?.AttendanceDate)

      if (Number.isNaN(first) && Number.isNaN(second)) {
        return 0
      }

      if (Number.isNaN(first)) {
        return 1
      }

      if (Number.isNaN(second)) {
        return -1
      }

      return dateSortOrder === "asc" ? first - second : second - first
    })
  }, [dataRows, dateSortOrder])

  const insights = useMemo(() => {
    const initial = {
      extraMinutes: 0,
      overtimeDays: 0,
      highBreakDays: 0,
    }

    const totals = sortedDataRows.reduce((acc, item) => {
      const actualMinutes = parseDurationToMinutes(item?.TotalHour)
      const breakMinutes = parseDurationToMinutes(item?.BreakTime)
      const extraMinutes = Math.max(0, actualMinutes - REQUIRED_ACTUAL_MINUTES)

      acc.extraMinutes += extraMinutes

      if (actualMinutes > REQUIRED_ACTUAL_MINUTES) {
        acc.overtimeDays += 1
      }

      if (breakMinutes > HIGH_BREAK_LIMIT_MINUTES) {
        acc.highBreakDays += 1
      }

      return acc
    }, initial)

    return {
      ...totals,
      totalDays: sortedDataRows.length,
    }
  }, [sortedDataRows])

  const exportRows = useMemo(() => {
    const rowsForExcel = sortedDataRows.map((item) => ({
      Date: formatApiDate(item?.AttendanceDate),
      "Employee Code": item?.EmployeeCode || "-",
      "Employee Name": item?.EmployeeName || "-",
      Shift: item?.Shift || "-",
      "Check In": item?.InTime || "-",
      "Check Out": item?.OutTime || "-",
      "Actual Hours": item?.TotalHour || "00:00",
      "Total Hours": item?.WorkTime || "00:00",
      "Break Hours": item?.BreakTime || "00:00",
      "Late Time": item?.LateTime || "00:00",
      "Early Time": item?.EarlyTime || "00:00",
    }))

    if (summaryRow) {
      rowsForExcel.push({
        Date: "Summary",
        "Employee Code": "-",
        "Employee Name": "-",
        Shift: "-",
        "Check In": "-",
        "Check Out": "-",
        "Actual Hours": String(summaryRow.TotalHour || "-").trim(),
        "Total Hours": String(summaryRow.WorkTime || "-").trim(),
        "Break Hours": "-",
        "Late Time": "-",
        "Early Time": "-",
      })
    }

    return rowsForExcel
  }, [sortedDataRows, summaryRow])

  const toggleDateSortOrder = () => {
    setDateSortOrder((previous) => (previous === "asc" ? "desc" : "asc"))
  }

  const openDatePicker = (field) => {
    setPickerField(field)
  }

  const closeDatePicker = () => {
    setPickerField(null)
  }

  const handleDatePicked = (event, selectedDate) => {
    if (event?.type === "dismissed") {
      setPickerField(null)
      return
    }

    if (!selectedDate || !pickerField) {
      return
    }

    if (Platform.OS === "android") {
      setPickerField(null)
    }

    const isoDate = formatToIsoDate(selectedDate)
    if (pickerField === "fromDate") {
      setFromDate(isoDate)
      setFormErrors((previous) => ({
        ...previous,
        fromDate: undefined,
        toDate: undefined,
      }))

      const currentToDate = parseDateInput(toDate)
      const pickedFromDate = parseDateInput(isoDate)
      if (currentToDate && pickedFromDate && currentToDate < pickedFromDate) {
        setToDate(isoDate)
      }

      if (Platform.OS === "ios") {
        setPickerField(null)
      }

      return
    }

    setToDate(isoDate)
    setFormErrors((previous) => ({ ...previous, toDate: undefined }))

    if (Platform.OS === "ios") {
      setPickerField(null)
    }
  }

  const validate = () => {
    const nextErrors = {}
    const from = parseDateInput(fromDate)
    const to = parseDateInput(toDate)

    if (!from) {
      nextErrors.fromDate = "Select a valid From Date."
    }

    if (!to) {
      nextErrors.toDate = "Select a valid To Date."
    }

    if (from && to && to < from) {
      nextErrors.toDate = "To Date should not be less than From Date."
    }

    setFormErrors(nextErrors)
    return { isValid: Object.keys(nextErrors).length === 0, from, to }
  }

  const buildDatePayload = (date) => ({
    Day: date.getDate(),
    Month: date.getMonth() + 1,
    Year: date.getFullYear(),
  })

  const handleShow = async () => {
    const { isValid, from, to } = validate()
    if (!isValid) {
      return
    }

    const payload = {
      UserId: userId,
      ActivePage: 1,
      PageRowCount: 50,
      FromDate: buildDatePayload(from),
      ToDate: buildDatePayload(to),
    }

    try {
      const response = await attendanceMutation.mutateAsync(payload)
      setRows(response)
      setHasSearched(true)
    } catch {
      setRows([])
      setHasSearched(true)
    }
  }

  const handleExport = async () => {
    await exportRowsAsExcel({
      rows: exportRows,
      sheetName: "Self Attendance",
      filePrefix: "self-attendance",
      emptyMessage: "No self attendance data available to export.",
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
        <Text style={styles.pageTitle}>Self Attendance Report</Text>
        <Text style={styles.pageSubtitle}>
          Track actual hours, overtime, and break discipline at a glance.
        </Text>

        <View style={styles.twoColRow}>
          <View style={[styles.fieldBlock, styles.col]}>
            <Text style={styles.fieldLabel}>From Date</Text>
            <Pressable
              onPress={() => openDatePicker("fromDate")}
              style={[
                styles.datePickerTrigger,
                formErrors.fromDate ? styles.inputError : null,
              ]}
            >
              <Text
                style={
                  fromDate
                    ? styles.datePickerText
                    : styles.datePickerPlaceholder
                }
              >
                {fromDate || "Select From Date"}
              </Text>
              <View style={styles.datePickerIconWrap}>
                <Ionicons name="calendar-outline" size={16} color="#4B5E73" />
              </View>
            </Pressable>
            {formErrors.fromDate ? (
              <Text style={styles.fieldError}>{formErrors.fromDate}</Text>
            ) : null}
          </View>

          <View style={[styles.fieldBlock, styles.col]}>
            <Text style={styles.fieldLabel}>To Date</Text>
            <Pressable
              onPress={() => openDatePicker("toDate")}
              style={[
                styles.datePickerTrigger,
                formErrors.toDate ? styles.inputError : null,
              ]}
            >
              <Text
                style={
                  toDate ? styles.datePickerText : styles.datePickerPlaceholder
                }
              >
                {toDate || "Select To Date"}
              </Text>
              <View style={styles.datePickerIconWrap}>
                <Ionicons name="calendar-outline" size={16} color="#4B5E73" />
              </View>
            </Pressable>
            {formErrors.toDate ? (
              <Text style={styles.fieldError}>{formErrors.toDate}</Text>
            ) : null}
          </View>
        </View>

        <Button
          label="Show"
          onPress={handleShow}
          loading={attendanceMutation.isPending}
          loadingLabel="Loading..."
          disabled={attendanceMutation.isPending}
        />
      </View>

      {attendanceMutation.isPending ? <Loader /> : null}

      {!attendanceMutation.isPending && hasSearched ? (
        sortedDataRows.length > 0 ? (
          <>
            <View style={styles.sortRow}>
              <Pressable
                onPress={handleExport}
                style={({ pressed }) => [
                  styles.exportButton,
                  pressed ? styles.sortButtonPressed : null,
                ]}
              >
                <Ionicons name="download-outline" size={14} color="#145533" />
                <Text style={styles.exportButtonText}>Export</Text>
              </Pressable>

              <Pressable
                onPress={toggleDateSortOrder}
                style={({ pressed }) => [
                  styles.sortButton,
                  pressed ? styles.sortButtonPressed : null,
                ]}
              >
                <Ionicons
                  name={dateSortOrder === "asc" ? "arrow-up" : "arrow-down"}
                  size={14}
                  color="#244461"
                />
                <Text style={styles.sortButtonText}>
                  {dateSortOrder === "asc" ? "Oldest First" : "Newest First"}
                </Text>
              </Pressable>
            </View>

            <View style={styles.insightGrid}>
              <View style={[styles.insightCard, styles.insightGreen]}>
                <Text style={styles.insightLabel}>Extra In Office</Text>
                <Text style={styles.insightValue}>
                  {formatMinutesToDuration(insights.extraMinutes)}
                </Text>
              </View>

              <View style={[styles.insightCard, styles.insightBlue]}>
                <Text style={styles.insightLabel}>Overtime Days</Text>
                <Text style={styles.insightValue}>{insights.overtimeDays}</Text>
              </View>

              <View style={[styles.insightCard, styles.insightRed]}>
                <Text style={styles.insightLabel}>High Break Alerts</Text>
                <Text style={styles.insightValue}>
                  {insights.highBreakDays}
                </Text>
              </View>
            </View>

            <View style={styles.metaStrip}>
              <Text style={styles.metaStripText}>
                Required Actual: 08:00 | Break Policy: above 01:30 is marked as
                high.
              </Text>
            </View>

            {(sortedDataRows || []).map((item, index) => {
              const breakMinutes = parseDurationToMinutes(item?.BreakTime)
              const actualMinutes = parseDurationToMinutes(item?.TotalHour)
              const totalMinutes = parseDurationToMinutes(item?.WorkTime)
              const extraMinutes = Math.max(
                0,
                actualMinutes - REQUIRED_ACTUAL_MINUTES,
              )
              const breakStatus = getBreakCategory(breakMinutes)
              const isHighBreak = breakStatus?.key === "high"

              const key =
                item?.AttendanceDate ||
                `${item?.InTime || "in"}-${item?.OutTime || "out"}-${index}`

              return (
                <View key={key} style={styles.dayCard}>
                  <View style={styles.dayCardHead}>
                    <View>
                      <Text style={styles.dayDate}>
                        {formatApiDate(item?.AttendanceDate)}
                      </Text>
                      <Text style={styles.dayEmployee}>
                        {item?.EmployeeCode || "-"} -{" "}
                        {item?.EmployeeName || "-"}
                      </Text>
                    </View>
                    <View style={styles.badgeStack}>
                      {extraMinutes > 0 ? (
                        <View style={styles.extraTag}>
                          <Ionicons
                            name="trending-up"
                            size={10}
                            color="#0E5A32"
                          />
                          <Text style={styles.extraTagText}>
                            +{formatMinutesToDuration(extraMinutes)}
                          </Text>
                        </View>
                      ) : null}
                      {isHighBreak ? (
                        <View
                          style={[
                            styles.breakBadge,
                            {
                              backgroundColor: breakStatus.bg,
                              borderColor: breakStatus.color,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.breakBadgeText,
                              { color: breakStatus.color },
                            ]}
                          >
                            {breakStatus.label}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.timeRow}>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeLabel}>Check In</Text>
                      <Text style={styles.timeValue}>
                        {item?.InTime || "-"}
                      </Text>
                    </View>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeLabel}>Check Out</Text>
                      <Text style={styles.timeValue}>
                        {item?.OutTime || "-"}
                      </Text>
                    </View>
                    <View style={styles.timeBlock}>
                      <Text style={styles.timeLabel}>Shift</Text>
                      <Text style={styles.timeValue}>{item?.Shift || "-"}</Text>
                    </View>
                  </View>

                  <View style={styles.metricsRow}>
                    <Text style={styles.metricText}>
                      Actual: {formatMinutesToDuration(actualMinutes)}
                    </Text>
                    <Text style={styles.metricText}>
                      Total: {formatMinutesToDuration(totalMinutes)}
                    </Text>
                    <Text style={styles.metricText}>
                      Break: {formatMinutesToDuration(breakMinutes)}
                    </Text>
                  </View>

                  <View style={styles.metricsRow}>
                    <Text style={styles.metricStrong}>
                      Overtime:{" "}
                      {extraMinutes > 0
                        ? formatMinutesToDuration(extraMinutes)
                        : "00:00"}
                    </Text>
                    <Text style={styles.metricText}>
                      Late: {item?.LateTime || "00:00"}
                    </Text>
                    <Text style={styles.metricText}>
                      Early: {item?.EarlyTime || "00:00"}
                    </Text>
                  </View>

                  {isHighBreak ? (
                    <View style={styles.alertRow}>
                      <Ionicons name="warning" size={14} color="#B42318" />
                      <Text style={styles.alertText}>
                        Break exceeded 01:30. This is marked as high.
                      </Text>
                    </View>
                  ) : null}
                </View>
              )
            })}

            {summaryRow ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Period Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Hours</Text>
                  <Text style={styles.summaryValue}>
                    {String(summaryRow.WorkTime || "-").trim()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Actual Hours</Text>
                  <Text style={styles.summaryValue}>
                    {String(summaryRow.TotalHour || "-").trim()}
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={28} color="#72839A" />
            <Text style={styles.emptyText}>
              No attendance data for this date range.
            </Text>
          </View>
        )
      ) : null}

      {pickerField ? (
        Platform.OS === "ios" ? (
          <Modal
            transparent
            animationType="fade"
            visible
            onRequestClose={closeDatePicker}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <DateTimePicker
                  mode="date"
                  value={pickerValue}
                  display="inline"
                  minimumDate={
                    pickerField === "toDate"
                      ? parseDateInput(fromDate) || undefined
                      : undefined
                  }
                  maximumDate={
                    pickerField === "fromDate" ? fromDateMax : todayDate
                  }
                  onChange={handleDatePicked}
                />
                <Pressable
                  onPress={closeDatePicker}
                  style={styles.modalDoneBtn}
                >
                  <Text style={styles.modalDoneText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            mode="date"
            value={pickerValue}
            display="default"
            minimumDate={
              pickerField === "toDate"
                ? parseDateInput(fromDate) || undefined
                : undefined
            }
            maximumDate={pickerField === "fromDate" ? fromDateMax : todayDate}
            onChange={handleDatePicked}
          />
        )
      ) : null}
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
    paddingBottom: 32,
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
  twoColRow: {
    flexDirection: "row",
    gap: 8,
  },
  col: {
    flex: 1,
  },
  fieldBlock: {
    gap: 3,
  },
  fieldLabel: {
    color: "#243B52",
    fontSize: 12,
    fontWeight: "700",
  },
  datePickerTrigger: {
    borderWidth: 1,
    borderColor: "#CFD7E2",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingLeft: 10,
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePickerText: {
    color: "#22354A",
    fontSize: 13,
  },
  datePickerPlaceholder: {
    color: "#8090A2",
    fontSize: 13,
  },
  datePickerIconWrap: {
    width: 34,
    height: 34,
    borderLeftWidth: 1,
    borderLeftColor: "#D3DBE6",
    alignItems: "center",
    justifyContent: "center",
  },
  inputError: {
    borderColor: "#BE3240",
  },
  fieldError: {
    color: "#B12C39",
    fontSize: 12,
    fontWeight: "600",
  },
  sortRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF2FB",
    borderWidth: 1,
    borderColor: "#C8DAEE",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  sortButtonPressed: {
    opacity: 0.85,
  },
  sortButtonText: {
    color: "#244461",
    fontSize: 12,
    fontWeight: "800",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EAF8EE",
    borderWidth: 1,
    borderColor: "#B8D9C5",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  exportButtonText: {
    color: "#145533",
    fontSize: 12,
    fontWeight: "800",
  },
  insightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  insightCard: {
    width: "48.5%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  insightBlue: {
    backgroundColor: "#E9F3FF",
    borderColor: "#B5D3F4",
  },
  insightGreen: {
    backgroundColor: "#EAFBEF",
    borderColor: "#B6E8C2",
  },
  insightRed: {
    backgroundColor: "#FEECEC",
    borderColor: "#F2B8B3",
  },
  insightLabel: {
    color: "#395168",
    fontSize: 12,
    fontWeight: "700",
  },
  insightValue: {
    color: "#1A2D40",
    fontSize: 18,
    fontWeight: "800",
  },
  metaStrip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8E0EA",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  metaStripText: {
    color: "#51677D",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  dayCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE3EB",
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  dayCardHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  badgeStack: {
    alignItems: "flex-end",
    gap: 6,
  },
  extraTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DFF9E8",
    borderWidth: 1,
    borderColor: "#8ED9AE",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  extraTagText: {
    color: "#0E5A32",
    fontSize: 10,
    fontWeight: "800",
  },
  dayDate: {
    color: "#1E3348",
    fontSize: 14,
    fontWeight: "800",
  },
  dayEmployee: {
    color: "#5A6F84",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  breakBadge: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  breakBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  timeRow: {
    flexDirection: "row",
    gap: 8,
  },
  timeBlock: {
    flex: 1,
    backgroundColor: "#F6F9FC",
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E0E8F1",
  },
  timeLabel: {
    color: "#60748A",
    fontSize: 11,
    fontWeight: "700",
  },
  timeValue: {
    color: "#243A51",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricText: {
    color: "#3E556D",
    fontSize: 12,
    fontWeight: "700",
  },
  metricStrong: {
    color: "#0F5132",
    fontSize: 12,
    fontWeight: "800",
  },
  alertRow: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#F2B8B3",
    backgroundColor: "#FEECEC",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  alertText: {
    color: "#8A1F14",
    fontSize: 12,
    fontWeight: "700",
    flex: 1,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8DFE8",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  summaryTitle: {
    color: "#243B52",
    fontSize: 14,
    fontWeight: "800",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    color: "#526880",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#1F344A",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDE5EE",
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: "#5C6A76",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
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
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(20,30,40,0.36)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
  },
  modalTitle: {
    color: "#243C55",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalDoneBtn: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: "#1A4E86",
    paddingVertical: 10,
    alignItems: "center",
  },
  modalDoneText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
})
