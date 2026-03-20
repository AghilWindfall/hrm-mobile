import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useMemo, useState } from "react"
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import Button from "../../src/components/ui/Button"
import Loader from "../../src/components/ui/Loader"
import useAuthStore from "../../src/features/auth/store/auth.store"
import useAttendanceReport, {
  useAllShifts,
  useDepartmentsByUserId,
} from "../../src/features/attendance/hooks/useAttendanceReport"
import { formatToIsoDate, parseDateInput } from "../../src/utils/date"
import { exportRowsAsExcel } from "../../src/utils/exportExcel"
import { resolveNumericUserId } from "../../src/utils/user"

function parseTimeToMinutes(value) {
  if (!value || typeof value !== "string") {
    return 0
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{1,2})$/)
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

function formatDuration(minutes) {
  const safeValue = Math.max(0, Math.round(minutes || 0))
  const hours = Math.floor(safeValue / 60)
  const mins = safeValue % 60
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

function formatApiDate(value) {
  if (!value || typeof value !== "string") {
    return "-"
  }

  const [day, month, year] = value.split("-").map(Number)
  if (!day || !month || !year) {
    return value
  }

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

function buildDatePayload(date) {
  return {
    Day: date.getDate(),
    Month: date.getMonth() + 1,
    Year: date.getFullYear(),
  }
}

function parseSortDate(value) {
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

function hasAttendance(row) {
  return Boolean(
    String(row?.InTime || "").trim() || String(row?.OutTime || "").trim(),
  )
}

export default function AttendanceReportScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)

  const reportMutation = useAttendanceReport()
  const departmentQuery = useDepartmentsByUserId(userId)
  const shiftQuery = useAllShifts()

  const [fromDate, setFromDate] = useState(() => formatToIsoDate(new Date()))
  const [toDate, setToDate] = useState(() => formatToIsoDate(new Date()))
  const [pickerField, setPickerField] = useState(null)
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([])
  const [selectedShiftId, setSelectedShiftId] = useState(null)
  const [codeSearch, setCodeSearch] = useState("")
  const [nameSearch, setNameSearch] = useState("")
  const [rows, setRows] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [apiErrorMessage, setApiErrorMessage] = useState("")
  const [errors, setErrors] = useState({})
  const [isDepartmentOpen, setIsDepartmentOpen] = useState(true)
  const [sortOrder, setSortOrder] = useState("asc")

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

    const source = pickerField === "fromDate" ? fromDate : toDate
    return parseDateInput(source) || new Date()
  }, [pickerField, fromDate, toDate])

  const selectedShiftLabel = useMemo(() => {
    if (!selectedShiftId) {
      return "All shifts"
    }

    const selectedShift = (shiftQuery.data || []).find(
      (item) => Number(item?.ShiftId) === Number(selectedShiftId),
    )

    return selectedShift?.ShiftCode || selectedShift?.ShiftName || "All shifts"
  }, [selectedShiftId, shiftQuery.data])

  const filteredRows = useMemo(() => {
    const codeTerm = codeSearch.trim().toLowerCase()
    const nameTerm = nameSearch.trim().toLowerCase()
    const selectedShift = (shiftQuery.data || []).find(
      (item) => Number(item?.ShiftId) === Number(selectedShiftId),
    )
    const shiftTerm = String(
      selectedShift?.ShiftCode || selectedShift?.ShiftName || "",
    )
      .trim()
      .toLowerCase()

    const filtered = (rows || []).filter((item) => {
      const code = String(item?.EmployeeCode || "").toLowerCase()
      const name = String(item?.EmployeeName || "").toLowerCase()
      const shiftText = String(item?.Shift || "").toLowerCase()

      const codeMatch = codeTerm ? code.includes(codeTerm) : true
      const nameMatch = nameTerm ? name.includes(nameTerm) : true
      const shiftMatch = shiftTerm ? shiftText.includes(shiftTerm) : true
      return codeMatch && nameMatch && shiftMatch
    })

    return filtered.sort((a, b) => {
      const first = parseSortDate(a?.AttendanceDate)
      const second = parseSortDate(b?.AttendanceDate)

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
  }, [
    rows,
    codeSearch,
    nameSearch,
    sortOrder,
    selectedShiftId,
    shiftQuery.data,
  ])

  const summary = useMemo(() => {
    const totalEmployees = filteredRows.length
    const presentCount = filteredRows.filter((item) =>
      hasAttendance(item),
    ).length

    const totalMinutes = filteredRows.reduce(
      (sum, row) => sum + parseTimeToMinutes(row?.TotalHour),
      0,
    )

    const actualMinutes = filteredRows.reduce(
      (sum, row) => sum + parseTimeToMinutes(row?.WorkTime),
      0,
    )

    return {
      totalEmployees,
      presentCount,
      totalHours: formatDuration(totalMinutes),
      actualHours: formatDuration(actualMinutes),
    }
  }, [filteredRows])

  const toggleDepartment = (departmentId) => {
    setSelectedDepartmentIds((previous) => {
      const id = Number(departmentId)
      if (previous.includes(id)) {
        return previous.filter((item) => item !== id)
      }
      return [...previous, id]
    })
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
      setErrors((previous) => ({
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
    setErrors((previous) => ({ ...previous, toDate: undefined }))

    if (Platform.OS === "ios") {
      setPickerField(null)
    }
  }

  const validate = () => {
    const nextErrors = {}
    const parsedFrom = parseDateInput(fromDate)
    const parsedTo = parseDateInput(toDate)

    if (!parsedFrom) {
      nextErrors.fromDate = "Select a valid From Date."
    }

    if (!parsedTo) {
      nextErrors.toDate = "Select a valid To Date."
    }

    if (parsedFrom && parsedTo && parsedTo < parsedFrom) {
      nextErrors.toDate = "To Date should not be less than From Date."
    }

    setErrors(nextErrors)
    return {
      isValid: Object.keys(nextErrors).length === 0,
      from: parsedFrom,
      to: parsedTo,
    }
  }

  const handleShow = async () => {
    const { isValid, from, to } = validate()
    if (!isValid || !from || !to) {
      return
    }

    setApiErrorMessage("")

    const allDepartments = departmentQuery.data || []
    const selectedDepartments =
      selectedDepartmentIds.length > 0
        ? allDepartments.filter((department) =>
            selectedDepartmentIds.includes(Number(department?.Dep_Id)),
          )
        : allDepartments

    const payload = {
      Branch: [],
      Department: selectedDepartments.map((department) => ({
        Dep_Id: Number(department?.Dep_Id),
        Dep_Name: department?.Dep_Name || "",
        checked: true,
      })),
      UserId: userId,
      ActivePage: 1,
      PageRowCount: 50,
      FromDate: buildDatePayload(from),
      ToDate: buildDatePayload(to),
    }

    try {
      const response = await reportMutation.mutateAsync(payload)
      setRows(response)
      setHasSearched(true)
    } catch (error) {
      setRows([])
      setHasSearched(true)
      setApiErrorMessage(
        error?.message ||
          "Unable to load attendance details from report API. Please try again.",
      )
    }
  }

  const handleExport = async () => {
    if (!filteredRows.length) {
      Alert.alert("No data", "Run report first to export rows.")
      return
    }

    const rowsForSheet = filteredRows.map((row) => ({
      Code: row?.EmployeeCode || "",
      Name: row?.EmployeeName || "",
      "Attendance Date": row?.AttendanceDate || "",
      Shift: row?.Shift || "",
      "Check In": row?.InTime || "",
      "Check Out": row?.OutTime || "",
      Status: row?.Status || (hasAttendance(row) ? "Present" : "Absent"),
      "Total Hours": row?.TotalHour || "00:00",
      "Actual Hours": row?.WorkTime || "00:00",
      "Break Hours": row?.BreakTime || "00:00",
      "Late Time": row?.LateTime || "00:00",
      "Early Time": row?.EarlyTime || "00:00",
    }))

    await exportRowsAsExcel({
      rows: rowsForSheet,
      sheetName: "Attendance",
      filePrefix: "attendance-report",
      emptyMessage: "No attendance rows available to export.",
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
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>Attendance Report</Text>
      </View>

      <View style={styles.filterCard}>
        <View style={styles.twoColRow}>
          <View style={[styles.col, styles.fieldBlock]}>
            <Text style={styles.fieldLabel}>From Date</Text>
            <Pressable
              onPress={() => openDatePicker("fromDate")}
              style={[
                styles.dateTrigger,
                errors.fromDate ? styles.inputError : null,
              ]}
            >
              <Text style={fromDate ? styles.dateText : styles.datePlaceholder}>
                {fromDate || "Select From Date"}
              </Text>
              <Ionicons name="calendar-outline" size={16} color="#4D5E74" />
            </Pressable>
            {errors.fromDate ? (
              <Text style={styles.fieldError}>{errors.fromDate}</Text>
            ) : null}
          </View>

          <View style={[styles.col, styles.fieldBlock]}>
            <Text style={styles.fieldLabel}>To Date</Text>
            <Pressable
              onPress={() => openDatePicker("toDate")}
              style={[
                styles.dateTrigger,
                errors.toDate ? styles.inputError : null,
              ]}
            >
              <Text style={toDate ? styles.dateText : styles.datePlaceholder}>
                {toDate || "Select To Date"}
              </Text>
              <Ionicons name="calendar-outline" size={16} color="#4D5E74" />
            </Pressable>
            {errors.toDate ? (
              <Text style={styles.fieldError}>{errors.toDate}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Pressable
            onPress={() => setIsDepartmentOpen((previous) => !previous)}
            style={({ pressed }) => [
              styles.selectorHeader,
              pressed ? styles.selectorPressed : null,
            ]}
          >
            <View style={styles.selectorTitleRow}>
              <Ionicons name="business-outline" size={15} color="#334E68" />
              <Text style={styles.selectorTitle}>Departments</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {selectedDepartmentIds.length === 0
                  ? "All"
                  : `${selectedDepartmentIds.length} selected`}
              </Text>
            </View>
          </Pressable>

          {isDepartmentOpen ? (
            <View style={styles.chipWrap}>
              {(departmentQuery.data || []).map((department) => {
                const id = Number(department?.Dep_Id)
                const selected = selectedDepartmentIds.includes(id)

                return (
                  <Pressable
                    key={id}
                    onPress={() => toggleDepartment(id)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected ? styles.chipActive : null,
                      pressed ? styles.chipPressed : null,
                    ]}
                  >
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={14}
                      color={selected ? "#FFFFFF" : "#4A5568"}
                    />
                    <Text
                      style={selected ? styles.chipTextActive : styles.chipText}
                    >
                      {department?.Dep_Name || "Department"}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Shift</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inlineChips}
          >
            <Pressable
              onPress={() => setSelectedShiftId(null)}
              style={({ pressed }) => [
                styles.singleChip,
                !selectedShiftId ? styles.singleChipActive : null,
                pressed ? styles.chipPressed : null,
              ]}
            >
              <Text
                style={
                  !selectedShiftId
                    ? styles.singleChipTextActive
                    : styles.singleChipText
                }
              >
                All shifts
              </Text>
            </Pressable>
            {(shiftQuery.data || []).map((shift) => {
              const selected =
                Number(selectedShiftId) === Number(shift?.ShiftId)

              return (
                <Pressable
                  key={String(shift?.ShiftId)}
                  onPress={() => setSelectedShiftId(Number(shift?.ShiftId))}
                  style={({ pressed }) => [
                    styles.singleChip,
                    selected ? styles.singleChipActive : null,
                    pressed ? styles.chipPressed : null,
                  ]}
                >
                  <Text
                    style={
                      selected
                        ? styles.singleChipTextActive
                        : styles.singleChipText
                    }
                  >
                    {shift?.ShiftCode || shift?.ShiftName || "Shift"}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </View>

        <View style={styles.twoColRow}>
          <View style={[styles.col, styles.fieldBlock]}>
            <Text style={styles.fieldLabel}>Search By Code</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={14} color="#74849A" />
              <TextInput
                value={codeSearch}
                onChangeText={setCodeSearch}
                placeholder="WP221"
                placeholderTextColor="#8B9AAF"
                style={styles.searchInput}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <View style={[styles.col, styles.fieldBlock]}>
            <Text style={styles.fieldLabel}>Search By Name</Text>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={14} color="#74849A" />
              <TextInput
                value={nameSearch}
                onChangeText={setNameSearch}
                placeholder="Albert"
                placeholderTextColor="#8B9AAF"
                style={styles.searchInput}
              />
            </View>
          </View>
        </View>

        {codeSearch || nameSearch ? (
          <Pressable
            onPress={() => {
              setCodeSearch("")
              setNameSearch("")
            }}
            style={({ pressed }) => [
              styles.clearSearchBtn,
              pressed ? styles.quickBtnPressed : null,
            ]}
          >
            <Text style={styles.clearSearchText}>Clear Search Filters</Text>
          </Pressable>
        ) : null}

        <Button
          label="Show Attendance"
          onPress={handleShow}
          disabled={
            reportMutation.isPending ||
            departmentQuery.isLoading ||
            shiftQuery.isLoading
          }
          loading={reportMutation.isPending}
          loadingLabel="Fetching..."
        />
      </View>

      {departmentQuery.isLoading ||
      shiftQuery.isLoading ||
      reportMutation.isPending ? (
        <Loader />
      ) : null}

      {hasSearched && reportMutation.isError ? (
        <View style={styles.emptyCard}>
          <Text style={styles.errorText}>
            {apiErrorMessage ||
              "Unable to load attendance details. Please try again."}
          </Text>
        </View>
      ) : null}

      {hasSearched && !reportMutation.isPending && filteredRows.length > 0 ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Summary</Text>
            <View style={styles.summaryActions}>
              <Pressable
                onPress={handleExport}
                style={({ pressed }) => [
                  styles.exportButton,
                  pressed ? styles.sortButtonPressed : null,
                ]}
              >
                <Ionicons name="download-outline" size={13} color="#1B5E20" />
                <Text style={styles.exportButtonText}>Export CSV</Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setSortOrder((previous) =>
                    previous === "asc" ? "desc" : "asc",
                  )
                }
                style={({ pressed }) => [
                  styles.sortButton,
                  pressed ? styles.sortButtonPressed : null,
                ]}
              >
                <Ionicons
                  name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                  size={13}
                  color="#1F496D"
                />
                <Text style={styles.sortButtonText}>
                  {sortOrder === "asc" ? "Oldest" : "Newest"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Employees</Text>
              <Text style={styles.summaryValue}>{summary.totalEmployees}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Present</Text>
              <Text style={styles.summaryValue}>{summary.presentCount}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Total Hrs</Text>
              <Text style={styles.summaryValue}>{summary.totalHours}</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Actual Hrs</Text>
              <Text style={styles.summaryValue}>{summary.actualHours}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {!hasSearched ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Select date range and filters, then tap Show Attendance.
          </Text>
        </View>
      ) : null}

      {hasSearched && !reportMutation.isPending && filteredRows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No attendance data found for selected filters.
          </Text>
        </View>
      ) : null}

      {filteredRows.map((row, index) => (
        <View
          key={`${row?.EmployeeCode || "NA"}-${row?.AttendanceDate || "date"}-${index}`}
          style={styles.rowCard}
        >
          <View style={styles.rowHead}>
            <View style={styles.codePill}>
              <Text style={styles.codeText}>{row?.EmployeeCode || "-"}</Text>
            </View>
            <Text style={styles.datePill}>
              {formatApiDate(row?.AttendanceDate)}
            </Text>
          </View>

          <Text style={styles.employeeName}>{row?.EmployeeName || "-"}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Shift</Text>
              <Text style={styles.metaValue}>
                {row?.Shift || selectedShiftLabel || "-"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>
                {row?.Status || (hasAttendance(row) ? "Present" : "Absent")}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Check In</Text>
              <Text style={styles.metaValue}>{row?.InTime || "-"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Check Out</Text>
              <Text style={styles.metaValue}>{row?.OutTime || "-"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Total Hours</Text>
              <Text style={styles.metaValue}>{row?.TotalHour || "00:00"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Actual Hours</Text>
              <Text style={styles.metaValue}>{row?.WorkTime || "00:00"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Break</Text>
              <Text style={styles.metaValue}>{row?.BreakTime || "00:00"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Late / Early</Text>
              <Text
                style={styles.metaValue}
              >{`${row?.LateTime || "00:00"} / ${row?.EarlyTime || "00:00"}`}</Text>
            </View>
          </View>
        </View>
      ))}

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
    backgroundColor: "#EEF2F7",
  },
  content: {
    padding: 14,
    gap: 12,
    paddingBottom: 28,
  },
  headerCard: {
    borderRadius: 16,
    backgroundColor: "#1D3557",
    padding: 14,
    borderWidth: 1,
    borderColor: "#2E4F7D",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  headerSub: {
    color: "#D6E3F5",
    marginTop: 4,
    fontSize: 12,
  },
  filterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8DEE8",
    padding: 12,
    gap: 10,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 8,
  },
  col: {
    flex: 1,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: "#263E57",
    fontSize: 12,
    fontWeight: "700",
  },
  dateTrigger: {
    borderWidth: 1,
    borderColor: "#CDD6E2",
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  dateText: {
    color: "#213A52",
    fontSize: 13,
  },
  datePlaceholder: {
    color: "#76879C",
    fontSize: 13,
  },
  inputError: {
    borderColor: "#B3261E",
  },
  fieldError: {
    color: "#B3261E",
    fontSize: 12,
  },
  selectorHeader: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D9E5",
    paddingHorizontal: 10,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FBFF",
  },
  selectorPressed: {
    opacity: 0.9,
  },
  selectorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectorTitle: {
    color: "#274462",
    fontSize: 13,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C2D3E8",
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#2A4D73",
    fontSize: 11,
    fontWeight: "700",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CBD5E2",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipActive: {
    borderColor: "#1D3557",
    backgroundColor: "#1D3557",
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    color: "#334E68",
    fontSize: 12,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  inlineChips: {
    gap: 8,
    paddingVertical: 2,
  },
  singleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#CAD4E2",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  singleChipActive: {
    borderColor: "#0A5B8A",
    backgroundColor: "#0A5B8A",
  },
  singleChipText: {
    color: "#395670",
    fontSize: 12,
    fontWeight: "600",
  },
  singleChipTextActive: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  searchBox: {
    borderWidth: 1,
    borderColor: "#DAE1EB",
    borderRadius: 10,
    backgroundColor: "#F8FBFF",
    minHeight: 38,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  searchInput: {
    flex: 1,
    color: "#29445C",
    fontSize: 13,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    minHeight: 34,
    borderWidth: 1,
    borderColor: "#CAD5E2",
    backgroundColor: "#F3F8FF",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  quickBtnPressed: {
    opacity: 0.85,
  },
  clearSearchText: {
    color: "#375470",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryCard: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D9E1EC",
    padding: 12,
    gap: 10,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  summaryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#B9D6BC",
    backgroundColor: "#EAF8EB",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  exportButtonText: {
    color: "#1B5E20",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryTitle: {
    color: "#1C334C",
    fontWeight: "800",
    fontSize: 16,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#C8D8EA",
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sortButtonPressed: {
    opacity: 0.88,
  },
  sortButtonText: {
    color: "#1F496D",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryBox: {
    width: "48%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9E5F2",
    backgroundColor: "#F5FAFF",
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  summaryLabel: {
    color: "#56708A",
    fontSize: 11,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#1F3954",
    marginTop: 2,
    fontSize: 16,
    fontWeight: "800",
  },
  rowCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D8E0EB",
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 8,
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
  datePill: {
    color: "#516A82",
    fontSize: 12,
    fontWeight: "600",
  },
  employeeName: {
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
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2F7",
    padding: 20,
  },
  errorText: {
    color: "#B3261E",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  modalTitle: {
    color: "#243A52",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  modalDoneBtn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#1D3557",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  modalDoneText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
})
