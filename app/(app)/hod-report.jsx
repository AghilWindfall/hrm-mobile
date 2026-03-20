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
import useHodReport from "../../src/features/hod/hooks/useHodReport"
import { formatToIsoDate, parseDateInput } from "../../src/utils/date"
import { exportRowsAsExcel } from "../../src/utils/exportExcel"
import { resolveNumericUserId } from "../../src/utils/user"

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

function buildDatePayload(date) {
  return {
    Day: date.getDate(),
    Month: date.getMonth() + 1,
    Year: date.getFullYear(),
  }
}

export default function HodReportScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const hodReportMutation = useHodReport()

  const [fromDate, setFromDate] = useState(() => formatToIsoDate(new Date()))
  const [toDate, setToDate] = useState(() => formatToIsoDate(new Date()))
  const [pickerField, setPickerField] = useState(null)
  const [errors, setErrors] = useState({})
  const [rows, setRows] = useState([])
  const [hasSearched, setHasSearched] = useState(false)

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

  const summary = useMemo(() => {
    const employeeCount = rows.length
    const shortHourCount = rows.filter((item) => {
      const minHours = Number(item?.MinimumStdHours || 0)
      const actual = toMinutes(item?.ActualHoursWorked)
      return actual < minHours * 60
    }).length

    return { employeeCount, shortHourCount }
  }, [rows])

  const exportRows = useMemo(
    () =>
      rows.map((item) => ({
        "Sl No": item?.SlNo || "",
        Code: item?.Emp_Code || "",
        Name: item?.Emp_Name || "",
        Branch: item?.Branch || "",
        Department: item?.Department || "",
        "Date Period": item?.DatePeriod || "",
        "Minimum Std Hours": item?.MinimumStdHours || 0,
        "Total Hours Worked": item?.TotalHoursWorked || "00:00",
        "Actual Hours Worked": item?.ActualHoursWorked || "00:00",
        "Reason for Short Hours": item?.ReasonforShortHours || "",
        Remarks: item?.Remarks || "",
      })),
    [rows],
  )

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

    setErrors(nextErrors)

    return {
      isValid: Object.keys(nextErrors).length === 0,
      from,
      to,
    }
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

  const handleShow = async () => {
    const { isValid, from, to } = validate()
    if (!isValid || !from || !to) {
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
      const response = await hodReportMutation.mutateAsync(payload)
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
      sheetName: "HOD Report",
      filePrefix: "hod-report",
      emptyMessage: "No HOD report data available to export.",
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
        <Text style={styles.pageTitle}>HOD Report</Text>
        <Text style={styles.pageSubtitle}>
          Total work hours report by employee for the selected period.
        </Text>

        <View style={styles.twoColRow}>
          <View style={[styles.col, styles.fieldBlock]}>
            <Text style={styles.fieldLabel}>From Date</Text>
            <Pressable
              onPress={() => setPickerField("fromDate")}
              style={[
                styles.datePickerTrigger,
                errors.fromDate ? styles.inputError : null,
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
            {errors.fromDate ? (
              <Text style={styles.fieldError}>{errors.fromDate}</Text>
            ) : null}
          </View>

          <View style={[styles.col, styles.fieldBlock]}>
            <Text style={styles.fieldLabel}>To Date</Text>
            <Pressable
              onPress={() => setPickerField("toDate")}
              style={[
                styles.datePickerTrigger,
                errors.toDate ? styles.inputError : null,
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
            {errors.toDate ? (
              <Text style={styles.fieldError}>{errors.toDate}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.showButtonWrap}>
            <Button
              label="Show"
              onPress={handleShow}
              disabled={hodReportMutation.isPending}
              loading={hodReportMutation.isPending}
              loadingLabel="Loading..."
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

      {hodReportMutation.isPending ? <Loader /> : null}

      {hasSearched && !hodReportMutation.isPending && rows.length > 0 ? (
        <View style={styles.summaryRow}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Employees</Text>
            <Text style={styles.summaryValue}>{summary.employeeCount}</Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Short Hours</Text>
            <Text style={styles.summaryValue}>{summary.shortHourCount}</Text>
          </View>
        </View>
      ) : null}

      {hasSearched && !hodReportMutation.isPending && rows.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No HOD report data found for selected dates.
          </Text>
        </View>
      ) : null}

      {rows.map((item, index) => (
        <View key={`${item?.emp_id || "emp"}-${index}`} style={styles.rowCard}>
          <View style={styles.rowHead}>
            <View style={styles.codePill}>
              <Text style={styles.codeText}>{item?.Emp_Code || "-"}</Text>
            </View>
            <Text style={styles.slNoText}>#{item?.SlNo || index + 1}</Text>
          </View>

          <Text style={styles.nameText}>{item?.Emp_Name || "-"}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Branch</Text>
              <Text style={styles.metaValue}>{item?.Branch || "-"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Department</Text>
              <Text style={styles.metaValue}>{item?.Department || "-"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date Period</Text>
              <Text style={styles.metaValue}>{item?.DatePeriod || "-"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Minimum Std Hours</Text>
              <Text style={styles.metaValue}>{item?.MinimumStdHours || 0}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Total Hours Worked</Text>
              <Text style={styles.metaValue}>
                {item?.TotalHoursWorked || "00:00"}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Actual Hours Worked</Text>
              <Text style={styles.metaValue}>
                {item?.ActualHoursWorked || "00:00"}
              </Text>
            </View>
          </View>

          <View style={styles.noteWrap}>
            <Text style={styles.noteLabel}>Reason for Short Hours</Text>
            <Text style={styles.noteText}>
              {item?.ReasonforShortHours || "-"}
            </Text>
          </View>

          <View style={styles.noteWrap}>
            <Text style={styles.noteLabel}>Remarks</Text>
            <Text style={styles.noteText}>{item?.Remarks || "-"}</Text>
          </View>
        </View>
      ))}

      {pickerField ? (
        Platform.OS === "ios" ? (
          <Modal
            transparent
            animationType="fade"
            visible
            onRequestClose={() => setPickerField(null)}
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
                  onPress={() => setPickerField(null)}
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
  pageTitle: {
    color: "#1F2E3A",
    fontSize: 18,
    fontWeight: "800",
  },
  pageSubtitle: {
    color: "#52677D",
    fontSize: 12,
    fontWeight: "600",
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
  slNoText: {
    color: "#5F7286",
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
  noteWrap: {
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E0E7F0",
    backgroundColor: "#FAFCFF",
    paddingHorizontal: 9,
    paddingVertical: 8,
    gap: 3,
  },
  noteLabel: {
    color: "#607A96",
    fontSize: 11,
    fontWeight: "700",
  },
  noteText: {
    color: "#243A51",
    fontSize: 13,
    fontWeight: "600",
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
