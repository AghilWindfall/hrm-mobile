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
import usePunchLog from "../../src/features/punch/hooks/usePunchLog"
import { formatToIsoDate, parseDateInput } from "../../src/utils/date"
import { exportRowsAsExcel } from "../../src/utils/exportExcel"
import { resolveNumericUserId } from "../../src/utils/user"

function formatLogTime(value) {
  if (!value || typeof value !== "string") {
    return "-"
  }

  const date = new Date(value.replace(" ", "T"))
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function parseLogTimestamp(value) {
  if (!value || typeof value !== "string") {
    return Number.NaN
  }

  return new Date(value.replace(" ", "T")).getTime()
}

function formatLogDateHeading(value) {
  if (!value || typeof value !== "string") {
    return "-"
  }

  const parts = value.split("-")
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

function parseLogDateKey(value) {
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

function inferPunchMode(item) {
  const machineText = String(item?.Machine || "").toLowerCase()
  const remarksText = String(item?.Remarks || "").toLowerCase()
  const merged = `${machineText} ${remarksText}`

  if (/\bout\b/.test(merged)) {
    return "out"
  }

  if (/\bin\b/.test(merged)) {
    return "in"
  }

  return null
}

function buildPunchDays(rows, sortOrder) {
  const dayMap = new Map()

  rows.forEach((item) => {
    const dateKey = item?.LogDate || "Unknown"
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, [])
    }
    dayMap.get(dateKey).push(item)
  })

  const days = Array.from(dayMap.entries()).map(([dateKey, items]) => {
    const sortedItems = [...items].sort((a, b) => {
      const first = parseLogTimestamp(a?.LogTime)
      const second = parseLogTimestamp(b?.LogTime)

      if (Number.isNaN(first) && Number.isNaN(second)) {
        return 0
      }

      if (Number.isNaN(first)) {
        return 1
      }

      if (Number.isNaN(second)) {
        return -1
      }

      return first - second
    })

    const sessions = []
    let openSession = null

    sortedItems.forEach((item) => {
      const mode = inferPunchMode(item)
      const resolvedMode =
        mode || (openSession && !openSession.punchOut ? "out" : "in")

      if (resolvedMode === "in") {
        if (openSession && !openSession.punchOut) {
          sessions.push({ ...openSession, isIrregular: true })
        }

        openSession = {
          punchIn: item,
          punchOut: null,
          isIrregular: mode === null,
        }
        return
      }

      if (openSession && !openSession.punchOut) {
        sessions.push({ ...openSession, punchOut: item })
        openSession = null
        return
      }

      sessions.push({
        punchIn: null,
        punchOut: item,
        isIrregular: true,
      })
    })

    if (openSession) {
      sessions.push({
        ...openSession,
        isPending: true,
        isIrregular: false,
      })
    }

    sessions.forEach((session, index) => {
      session.sequence = index + 1
    })

    const inEntries = sortedItems.filter(
      (item) => inferPunchMode(item) === "in",
    )
    const outEntries = sortedItems.filter(
      (item) => inferPunchMode(item) === "out",
    )

    const firstPunch = inEntries[0]?.LogTime || sortedItems[0]?.LogTime
    const lastPunch =
      outEntries[outEntries.length - 1]?.LogTime ||
      sortedItems[sortedItems.length - 1]?.LogTime

    return {
      dateKey,
      dateLabel: formatLogDateHeading(dateKey),
      employeeCode: sortedItems[0]?.EmployeeCode || "-",
      employeeName: sortedItems[0]?.EmployeeName || "-",
      firstPunch,
      lastPunch,
      totalPunches: sortedItems.length,
      sessions,
    }
  })

  return days.sort((a, b) => {
    const first = parseLogDateKey(a.dateKey)
    const second = parseLogDateKey(b.dateKey)

    if (Number.isNaN(first) && Number.isNaN(second)) {
      return 0
    }

    if (Number.isNaN(first)) {
      return 1
    }

    if (Number.isNaN(second)) {
      return -1
    }

    return sortOrder === "asc" ? first - second : second - first
  })
}

export default function PunchLogScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const punchLogMutation = usePunchLog()

  const [fromDate, setFromDate] = useState(() => formatToIsoDate(new Date()))
  const [toDate, setToDate] = useState(() => formatToIsoDate(new Date()))
  const [pickerField, setPickerField] = useState(null)
  const [formErrors, setFormErrors] = useState({})
  const [rows, setRows] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [collapsedDays, setCollapsedDays] = useState({})
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

  const punchDays = useMemo(
    () => buildPunchDays(rows, dateSortOrder),
    [rows, dateSortOrder],
  )

  const exportRows = useMemo(() => {
    return punchDays.flatMap((day) =>
      day.sessions.map((session) => ({
        Date: day.dateLabel,
        "Employee Code": day.employeeCode,
        "Employee Name": day.employeeName,
        Session: session.sequence,
        "In Time": session.punchIn
          ? formatLogTime(session.punchIn.LogTime)
          : "-",
        "In Machine": session.punchIn?.Machine || "-",
        "Out Time": session.punchOut
          ? formatLogTime(session.punchOut.LogTime)
          : session.isPending
            ? "Pending"
            : "-",
        "Out Machine": session.punchOut?.Machine || "-",
        Remarks: session.punchIn?.Remarks || session.punchOut?.Remarks || "-",
      })),
    )
  }, [punchDays])

  const pickerValue = useMemo(() => {
    if (!pickerField) {
      return new Date()
    }

    const sourceValue = pickerField === "fromDate" ? fromDate : toDate
    return parseDateInput(sourceValue) || new Date()
  }, [pickerField, fromDate, toDate])

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
      const response = await punchLogMutation.mutateAsync(payload)
      setRows(response)
      setHasSearched(true)
      setCollapsedDays({})
    } catch {
      setRows([])
      setHasSearched(true)
      setCollapsedDays({})
    }
  }

  const toggleDayCollapse = (dateKey) => {
    setCollapsedDays((previous) => ({
      ...previous,
      [dateKey]: !previous[dateKey],
    }))
  }

  const toggleDateSortOrder = () => {
    setDateSortOrder((previous) => (previous === "asc" ? "desc" : "asc"))
  }

  const handleExport = async () => {
    await exportRowsAsExcel({
      rows: exportRows,
      sheetName: "Punch Log",
      filePrefix: "punch-log",
      emptyMessage: "No punch log data available to export.",
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
        <Text style={styles.sectionTitle}>Punch Log Report</Text>

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
          disabled={punchLogMutation.isPending}
          loading={punchLogMutation.isPending}
          loadingLabel="Loading..."
        />
      </View>

      {punchLogMutation.isPending ? <Loader /> : null}

      {hasSearched && punchLogMutation.isError ? (
        <View style={styles.emptyCard}>
          <Text style={styles.errorText}>
            Unable to load punch logs. Try again.
          </Text>
        </View>
      ) : null}

      {!hasSearched ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Select From and To dates, then tap Show to view punch log data.
          </Text>
        </View>
      ) : null}

      {hasSearched && !punchLogMutation.isPending && rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No punch logs found for selected dates.
          </Text>
        </View>
      ) : null}

      {hasSearched && !punchLogMutation.isPending && punchDays.length > 0 ? (
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
      ) : null}

      {punchDays.map((day) => {
        const isCollapsed = Boolean(collapsedDays[day.dateKey])

        return (
          <View key={day.dateKey} style={styles.logCard}>
            <Pressable
              onPress={() => toggleDayCollapse(day.dateKey)}
              style={({ pressed }) => [
                styles.dayHeader,
                pressed ? styles.dayHeaderPressed : null,
              ]}
            >
              <View style={styles.dayHeaderLeft}>
                <Ionicons name="calendar-outline" size={14} color="#50647A" />
                <Text style={styles.metaText}>{day.dateLabel}</Text>
              </View>
              <Ionicons
                name={isCollapsed ? "chevron-down" : "chevron-up"}
                size={18}
                color="#2D4B66"
              />
            </Pressable>

            <View style={styles.logHead}>
              <View style={styles.codePill}>
                <Text style={styles.codeText}>{day.employeeCode}</Text>
              </View>
              <Text style={styles.nameText}>{day.employeeName}</Text>
            </View>

            {!isCollapsed ? (
              <>
                <View style={styles.summaryRow}>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>First In</Text>
                    <Text style={styles.summaryValue}>
                      {formatLogTime(day.firstPunch)}
                    </Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>Last Out</Text>
                    <Text style={styles.summaryValue}>
                      {formatLogTime(day.lastPunch)}
                    </Text>
                  </View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel}>Punches</Text>
                    <Text style={styles.summaryValue}>{day.totalPunches}</Text>
                  </View>
                </View>

                <View style={styles.sessionList}>
                  {day.sessions.map((session) => (
                    <View
                      key={`${day.dateKey}-${session.sequence}`}
                      style={styles.sessionCard}
                    >
                      <Text style={styles.sessionTitle}>
                        Session {session.sequence}
                      </Text>

                      <View style={styles.sessionRow}>
                        <Text style={styles.sessionTagIn}>IN</Text>
                        <Text style={styles.sessionTime}>
                          {session.punchIn
                            ? formatLogTime(session.punchIn.LogTime)
                            : "missing"}
                        </Text>
                        <Text style={styles.sessionMachine}>
                          {session.punchIn?.Machine || "-"}
                        </Text>
                      </View>

                      <View style={styles.sessionRow}>
                        <Text style={styles.sessionTagOut}>OUT</Text>
                        <Text style={styles.sessionTime}>
                          {session.punchOut
                            ? formatLogTime(session.punchOut.LogTime)
                            : session.isPending
                              ? "Pending"
                              : "missing"}
                        </Text>
                        <Text style={styles.sessionMachine}>
                          {session.punchOut?.Machine || "-"}
                        </Text>
                      </View>

                      {session.isIrregular &&
                      (!session.punchIn || !session.punchOut) ? (
                        <Text style={styles.irregularText}>
                          Irregular punch order detected for this session.
                        </Text>
                      ) : null}

                      {session.punchIn?.Remarks || session.punchOut?.Remarks ? (
                        <View style={styles.remarkWrap}>
                          <Text style={styles.remarkLabel}>Remarks</Text>
                          <Text style={styles.remarkText}>
                            {session.punchIn?.Remarks ||
                              session.punchOut?.Remarks}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </View>
        )
      })}

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
  sectionTitle: {
    color: "#1F2E3A",
    fontSize: 16,
    fontWeight: "800",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 8,
  },
  col: {
    flex: 1,
  },
  fieldBlock: {
    gap: 4,
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
    height: 40,
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
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9DEE6",
    padding: 12,
    gap: 8,
  },
  logHead: {
    flexDirection: "row",
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
  nameText: {
    color: "#22374D",
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dayHeader: {
    borderWidth: 1,
    borderColor: "#DFE7F1",
    backgroundColor: "#F4F8FD",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayHeaderPressed: {
    opacity: 0.85,
  },
  dayHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#3A5068",
    fontSize: 13,
    fontWeight: "600",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 6,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: "#F3F7FC",
    borderWidth: 1,
    borderColor: "#DCE6F1",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: "center",
  },
  summaryLabel: {
    color: "#5A6D83",
    fontSize: 11,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#1E3A57",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  sessionList: {
    gap: 8,
  },
  sessionCard: {
    backgroundColor: "#FAFCFF",
    borderWidth: 1,
    borderColor: "#E1E9F3",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  sessionTitle: {
    color: "#365577",
    fontSize: 12,
    fontWeight: "800",
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionTagIn: {
    minWidth: 38,
    textAlign: "center",
    backgroundColor: "#DCF6E8",
    color: "#176C44",
    fontSize: 11,
    fontWeight: "800",
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 3,
  },
  sessionTagOut: {
    minWidth: 38,
    textAlign: "center",
    backgroundColor: "#FFE8E1",
    color: "#A0391F",
    fontSize: 11,
    fontWeight: "800",
    borderRadius: 999,
    overflow: "hidden",
    paddingVertical: 3,
  },
  sessionTime: {
    color: "#243A53",
    fontSize: 13,
    fontWeight: "700",
    minWidth: 86,
  },
  sessionMachine: {
    color: "#5D6E80",
    fontSize: 12,
    flex: 1,
    textAlign: "right",
  },
  irregularText: {
    color: "#B54708",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  remarkWrap: {
    borderTopWidth: 1,
    borderTopColor: "#E5EAF0",
    paddingTop: 8,
    gap: 2,
  },
  remarkLabel: {
    color: "#5B6A79",
    fontSize: 11,
    fontWeight: "700",
  },
  remarkText: {
    color: "#2D4156",
    fontSize: 12,
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
