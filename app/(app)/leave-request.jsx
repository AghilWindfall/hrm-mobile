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
  ToastAndroid,
  View,
} from "react-native"

import Button from "../../src/components/ui/Button"
import Loader from "../../src/components/ui/Loader"
import useAuthStore from "../../src/features/auth/store/auth.store"
import {
  useCreateLeaveApply,
  useDeleteLeaveApply,
  useLeaveBalance,
  useLeaveTypes,
  usePreviousLeaveLog,
} from "../../src/features/leave/hooks/useLeaveRequestData"
import { formatToIsoDate, parseDateInput } from "../../src/utils/date"

const STATUS_OPTIONS = [
  { key: "A", label: "Approved" },
  { key: "P", label: "Pending" },
  { key: "R", label: "Rejected" },
]

const SESSION_OPTIONS = [
  { id: "1", label: "Full Day", factor: 1 },
  { id: "2", label: "First Half", factor: 0.5 },
  { id: "3", label: "Second Half", factor: 0.5 },
]

function inclusiveDayDifference(fromDate, toDate) {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((toDate - fromDate) / msPerDay) + 1
}

function formatDate(value) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function showToastMessage(message) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT)
    return
  }

  Alert.alert("Validation", message)
}

function countLetters(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "").length
}

function isSpecialLeaveType(item) {
  const leaveName = String(item?.Leave_Name || "")
    .trim()
    .toUpperCase()

  return leaveName.includes("SPECIAL")
}

function isLopLeaveType(item) {
  const leaveCode = String(item?.Leave_Code || "")
    .trim()
    .toUpperCase()
  const leaveName = String(item?.Leave_Name || "")
    .trim()
    .toUpperCase()

  return leaveCode === "LOP" || leaveName.includes("LOSS OF PAY")
}

export default function LeaveRequestScreen() {
  const user = useAuthStore((state) => state.user)
  const employeeId = user?.Emp_Id
  const todayIso = useMemo(() => formatToIsoDate(new Date()), [])
  const [statusFilter, setStatusFilter] = useState("A")
  const [form, setForm] = useState({
    fromDate: todayIso,
    toDate: todayIso,
    leaveTypeId: "",
    sessionId: "1",
    remarks: "",
    compensatoryDate: "",
  })
  const [formErrors, setFormErrors] = useState({})
  const [submitInfo, setSubmitInfo] = useState(null)
  const [pickerField, setPickerField] = useState(null)
  const [successPopupVisible, setSuccessPopupVisible] = useState(false)

  const leaveBalanceQuery = useLeaveBalance(employeeId)
  const leaveTypesQuery = useLeaveTypes(employeeId)
  const historyQuery = usePreviousLeaveLog(employeeId, statusFilter)
  const applyLeaveMutation = useCreateLeaveApply(employeeId)
  const deleteLeaveMutation = useDeleteLeaveApply(employeeId)

  const isLoading = leaveBalanceQuery.isLoading || leaveTypesQuery.isLoading

  const hasError =
    leaveBalanceQuery.isError || leaveTypesQuery.isError || historyQuery.isError

  const leaveTypeMap = useMemo(() => {
    const map = new Map()
    ;(leaveTypesQuery.data || []).forEach((item) => {
      map.set(item.Type_Id, item)
    })
    return map
  }, [leaveTypesQuery.data])

  const leaveTypesForApply = useMemo(
    () =>
      (leaveTypesQuery.data || []).filter((item) => !isSpecialLeaveType(item)),
    [leaveTypesQuery.data],
  )

  const selectedLeaveType = useMemo(
    () =>
      leaveTypesForApply.find(
        (item) => String(item.Type_Id) === String(form.leaveTypeId),
      ),
    [leaveTypesForApply, form.leaveTypeId],
  )

  const selectedLeaveBalance = useMemo(() => {
    if (!selectedLeaveType) {
      return null
    }

    return (leaveBalanceQuery.data || []).find((item) => {
      const sameTypeId =
        String(item.LeaveTypeId) === String(selectedLeaveType.Type_Id)
      const sameCode =
        String(item.LeaveCode || "").toUpperCase() ===
        String(selectedLeaveType.Leave_Code || "").toUpperCase()
      return sameTypeId || sameCode
    })
  }, [leaveBalanceQuery.data, selectedLeaveType])

  const requiresCompensatoryDate = selectedLeaveType?.Leave_Code === "COFF"

  const selectedStatusLabel =
    STATUS_OPTIONS.find((option) => option.key === statusFilter)?.label ||
    "Selected"

  const pickerValue = useMemo(() => {
    if (!pickerField) {
      return new Date()
    }

    const currentValue = parseDateInput(form[pickerField])
    return currentValue || new Date()
  }, [pickerField, form])

  const openDatePicker = (field) => {
    setPickerField(field)
  }

  const closeDatePicker = () => {
    setPickerField(null)
  }

  const handleDatePicked = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setPickerField(null)
    }

    if (event?.type === "dismissed" || !selectedDate || !pickerField) {
      return
    }

    const nextIso = formatToIsoDate(selectedDate)

    if (pickerField === "fromDate") {
      onFormChange("fromDate", nextIso)

      const currentTo = parseDateInput(form.toDate)
      const nextFrom = parseDateInput(nextIso)
      if (currentTo && nextFrom && currentTo < nextFrom) {
        onFormChange("toDate", nextIso)
      }

      return
    }

    onFormChange(pickerField, nextIso)
  }

  const calculateDaysPreview = () => {
    const from = parseDateInput(form.fromDate)
    const to = parseDateInput(form.toDate)
    if (!from || !to || to < from) {
      return "-"
    }

    const session = SESSION_OPTIONS.find(
      (option) => option.id === form.sessionId,
    )
    const isSingleDay = from.getTime() === to.getTime()
    if (isSingleDay && session && session.factor < 1) {
      return "0.5"
    }

    return String(inclusiveDayDifference(from, to))
  }

  const onFormChange = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }))
    setFormErrors((previous) => ({ ...previous, [key]: undefined }))
  }

  const validateAndBuildPayload = () => {
    const nextErrors = {}
    const from = parseDateInput(form.fromDate)
    const to = parseDateInput(form.toDate)

    if (!from) {
      nextErrors.fromDate = "Enter a valid From Date (YYYY-MM-DD)."
    }

    if (!to) {
      nextErrors.toDate = "Enter a valid To Date (YYYY-MM-DD)."
    }

    if (from && to && to < from) {
      nextErrors.toDate = "To Date cannot be earlier than From Date."
    }

    if (!form.leaveTypeId) {
      nextErrors.leaveTypeId = "Select a leave type."
    }

    if (!form.sessionId) {
      nextErrors.sessionId = "Select a session."
    }

    if (!form.remarks.trim()) {
      nextErrors.remarks = "Remarks are required."
    }

    if (form.remarks.trim() && countLetters(form.remarks) < 5) {
      nextErrors.remarks = "Remarks must be at least 5 letters."
    }

    if (form.remarks.trim().length > 250) {
      nextErrors.remarks = "Remarks should be within 250 characters."
    }

    const isSingleDay =
      Boolean(from) && Boolean(to) && from.getTime() === to.getTime()

    if (from && to && !isSingleDay && form.sessionId !== "1") {
      nextErrors.sessionId = "For multi-day leave, session must be Full Day."
    }

    if (requiresCompensatoryDate) {
      const compDate = parseDateInput(form.compensatoryDate)
      if (!compDate) {
        nextErrors.compensatoryDate =
          "Compensatory leave requires a valid remark date (YYYY-MM-DD)."
      }
    }

    setFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      return null
    }

    const session = SESSION_OPTIONS.find(
      (option) => option.id === form.sessionId,
    )
    const days =
      isSingleDay && session?.factor < 1
        ? 0.5
        : inclusiveDayDifference(from, to)

    const availableBalance = Number(selectedLeaveBalance?.BalanceLeaves ?? 0)
    const canApplyWithoutBalance = isLopLeaveType(selectedLeaveType)

    if (
      !canApplyWithoutBalance &&
      (!selectedLeaveBalance || availableBalance < days)
    ) {
      const leaveCode = String(
        selectedLeaveType?.Leave_Code || "",
      ).toUpperCase()
      const fallbackName = selectedLeaveType?.Leave_Name || "selected"
      const errorMessage =
        leaveCode === "CL"
          ? "No casual leave left."
          : `No ${fallbackName} leave left.`

      showToastMessage(errorMessage)
      nextErrors.leaveTypeId = errorMessage
      setFormErrors(nextErrors)
      return null
    }

    const payload = {
      Emp_Id: Number(employeeId),
      Leave_From: form.fromDate,
      Leave_To: form.toDate,
      Leave_Type: Number(form.leaveTypeId),
      Ses_Id: Number(form.sessionId),
      Days: days,
      Remarks: form.remarks.trim(),
      Compensatory_Date: requiresCompensatoryDate
        ? form.compensatoryDate
        : null,
    }

    return payload
  }

  const handleApplyLeave = async () => {
    setSubmitInfo(null)
    const payload = validateAndBuildPayload()
    if (!payload) {
      return
    }

    try {
      await applyLeaveMutation.mutateAsync(payload)

      setSubmitInfo(null)
      setSuccessPopupVisible(true)
      setForm((previous) => ({
        ...previous,
        fromDate: todayIso,
        toDate: todayIso,
        remarks: "",
        compensatoryDate: "",
      }))
    } catch (error) {
      setSubmitInfo({
        type: "error",
        text: error?.message || "Unable to submit leave request.",
      })
    }
  }

  const buildDeletePayload = (item) => ({
    ...item,
    Leave_Apply_Id: Number(item.Leave_Apply_Id || item.Leave_Id || 0),
    Emp_Id: Number(item.Emp_Id || employeeId),
    Emp_Name: item.Emp_Name || user?.Emp_Name || user?.EmpName || "",
    Emp_Code: item.Emp_Code || user?.Emp_Code || user?.EmpCode || "",
    Leave_From: item.Leave_From,
    Leave_To: item.Leave_To,
    Days: Number(item.Days || 0),
    Leave_Type: Number(item.Leave_Type || 0),
    status: item.status || item.Status || "1",
    Status1: item.Status1 ?? null,
    Remarks: item.Remarks || "",
    Leave_Del: Number(item.Leave_Del || 0),
    Leave_Name: item.Leave_Name || "",
    Ses_Id: Number(item.Ses_Id || 0),
    Ses_Name: item.Ses_Name || "",
    Ses_Time: Number(item.Ses_Time || 0),
    Apply_Status: item.Apply_Status || statusFilter,
  })

  const handleDeleteLeave = (item) => {
    const leaveApplyId = Number(item.Leave_Apply_Id || item.Leave_Id || 0)

    if (!leaveApplyId) {
      setSubmitInfo({
        type: "error",
        text: "Unable to delete this leave request.",
      })
      return
    }

    Alert.alert("Delete Leave", "Delete this pending leave request?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            setSubmitInfo(null)
            await deleteLeaveMutation.mutateAsync(buildDeletePayload(item))
            setSubmitInfo({
              type: "success",
              text: "Leave request deleted successfully.",
            })
          } catch (error) {
            setSubmitInfo({
              type: "error",
              text: error?.message || "Unable to delete leave request.",
            })
          }
        },
      },
    ])
  }

  if (!employeeId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>Employee ID is missing in session.</Text>
      </View>
    )
  }

  if (isLoading) {
    return <Loader />
  }

  if (hasError) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>
          Unable to load leave data. Please try again.
        </Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Apply Leave</Text>
        <>
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
                    form.fromDate
                      ? styles.datePickerText
                      : styles.datePickerPlaceholder
                  }
                >
                  {form.fromDate || "From Date"}
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
                    form.toDate
                      ? styles.datePickerText
                      : styles.datePickerPlaceholder
                  }
                >
                  {form.toDate || "To Date"}
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

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Number of Days</Text>
            <View style={styles.readOnlyInput}>
              <Text style={styles.readOnlyValue}>{calculateDaysPreview()}</Text>
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Leave Type</Text>
            <View style={styles.optionWrap}>
              {leaveTypesForApply.map((item) => {
                const selected =
                  String(item.Type_Id) === String(form.leaveTypeId)
                return (
                  <Pressable
                    key={item.Type_Id}
                    onPress={() =>
                      onFormChange("leaveTypeId", String(item.Type_Id))
                    }
                    style={[
                      styles.optionChip,
                      selected ? styles.optionChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        selected ? styles.optionChipTextActive : null,
                      ]}
                    >
                      {item.Leave_Name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            {formErrors.leaveTypeId ? (
              <Text style={styles.fieldError}>{formErrors.leaveTypeId}</Text>
            ) : null}
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Session</Text>
            <View style={styles.optionWrap}>
              {SESSION_OPTIONS.map((option) => {
                const selected = option.id === form.sessionId
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => onFormChange("sessionId", option.id)}
                    style={[
                      styles.optionChip,
                      selected ? styles.optionChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        selected ? styles.optionChipTextActive : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
            {formErrors.sessionId ? (
              <Text style={styles.fieldError}>{formErrors.sessionId}</Text>
            ) : null}
          </View>

          {requiresCompensatoryDate ? (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Compensatory Remark Date</Text>
              <Pressable
                onPress={() => openDatePicker("compensatoryDate")}
                style={[
                  styles.datePickerTrigger,
                  formErrors.compensatoryDate ? styles.inputError : null,
                ]}
              >
                <Text
                  style={
                    form.compensatoryDate
                      ? styles.datePickerText
                      : styles.datePickerPlaceholder
                  }
                >
                  {form.compensatoryDate || "Select Remark Date"}
                </Text>
                <View style={styles.datePickerIconWrap}>
                  <Ionicons name="calendar-outline" size={18} color="#4B5E73" />
                </View>
              </Pressable>
              {formErrors.compensatoryDate ? (
                <Text style={styles.fieldError}>
                  {formErrors.compensatoryDate}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Remarks</Text>
            <TextInput
              value={form.remarks}
              onChangeText={(value) => onFormChange("remarks", value)}
              placeholder="Reason for leave"
              style={[
                styles.input,
                styles.textArea,
                formErrors.remarks ? styles.inputError : null,
              ]}
              placeholderTextColor="#8090A2"
              multiline
              textAlignVertical="top"
              maxLength={250}
            />
            <Text style={styles.charCount}>{form.remarks.length}/250</Text>
            {formErrors.remarks ? (
              <Text style={styles.fieldError}>{formErrors.remarks}</Text>
            ) : null}
          </View>

          {submitInfo?.type === "error" ? (
            <Text style={[styles.submitInfo, styles.submitError]}>
              {submitInfo.text}
            </Text>
          ) : null}

          <Button
            label="Request"
            onPress={handleApplyLeave}
            loading={applyLeaveMutation.isPending}
            loadingLabel="Requesting..."
            disabled={applyLeaveMutation.isPending}
          />
        </>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Leave Balance</Text>
        {(leaveBalanceQuery.data || []).map((item) => (
          <View key={item.LeaveTypeId} style={styles.balanceRow}>
            <View style={styles.balanceTitleWrap}>
              <Text style={styles.balanceTitle}>{item.LeaveName}</Text>
              <Text style={styles.balanceCode}>{item.LeaveCode}</Text>
            </View>
            <View style={styles.balanceStats}>
              <Text style={styles.statPill}>Total {item.TotalLeaves}</Text>
              <Text style={styles.statPill}>Taken {item.TotalLeavesTaken}</Text>
              <Text style={[styles.statPill, styles.statPillStrong]}>
                Balance {item.BalanceLeaves}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Previous Leave Log</Text>
        <View style={styles.tabRow}>
          {STATUS_OPTIONS.map((option) => {
            const selected = option.key === statusFilter
            return (
              <Pressable
                key={option.key}
                onPress={() => setStatusFilter(option.key)}
                style={[styles.tab, selected ? styles.tabActive : null]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    selected ? styles.tabLabelActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {historyQuery.isFetching ? (
          <Text style={styles.historyUpdatingText}>Updating leave log...</Text>
        ) : null}

        {(historyQuery.data || []).length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="calendar-clear-outline" size={26} color="#6D7680" />
            <Text style={styles.emptyText}>
              No {selectedStatusLabel} leave records found.
            </Text>
          </View>
        ) : (
          (historyQuery.data || []).map((item, index) => {
            const typeLabel =
              item.Leave_Name ||
              leaveTypeMap.get(item.Leave_Type)?.Leave_Name ||
              "Leave"

            const leaveApplyId = Number(
              item.Leave_Apply_Id || item.Leave_Id || 0,
            )
            const isPendingItem = (item.Apply_Status || statusFilter) === "P"
            const isDeleting =
              deleteLeaveMutation.isPending &&
              Number(deleteLeaveMutation.variables?.Leave_Apply_Id) ===
                leaveApplyId

            const historyKey =
              item.Leave_Apply_Id ||
              item.Leave_Id ||
              `${item.Leave_From || "from"}-${item.Leave_To || "to"}-${item.Leave_Type || "type"}-${index}`

            return (
              <View key={historyKey} style={styles.historyCard}>
                <View style={styles.historyHead}>
                  <View style={styles.historyHeadMain}>
                    <Text style={styles.historyType}>{typeLabel}</Text>
                    <Text style={styles.historyDays}>{item.Days} day(s)</Text>
                  </View>
                  {isPendingItem ? (
                    <Pressable
                      onPress={() => handleDeleteLeave(item)}
                      disabled={isDeleting}
                      hitSlop={8}
                      style={styles.deleteButton}
                    >
                      <Ionicons
                        name={
                          isDeleting ? "hourglass-outline" : "trash-outline"
                        }
                        size={18}
                        color={isDeleting ? "#7B8898" : "#B42318"}
                      />
                    </Pressable>
                  ) : null}
                </View>
                <Text style={styles.historyMeta}>
                  {formatDate(item.Leave_From)} to {formatDate(item.Leave_To)}
                </Text>
                <Text style={styles.historyMeta}>
                  Session: {item.Ses_Name || "-"}
                </Text>
                {item.Remarks ? (
                  <Text style={styles.historyRemarks} numberOfLines={2}>
                    {item.Remarks}
                  </Text>
                ) : null}
              </View>
            )
          })
        )}
      </View>

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
                  display="spinner"
                  minimumDate={
                    pickerField === "toDate"
                      ? parseDateInput(form.fromDate) || undefined
                      : undefined
                  }
                  maximumDate={
                    pickerField === "fromDate"
                      ? parseDateInput(form.toDate) || undefined
                      : undefined
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
                ? parseDateInput(form.fromDate) || undefined
                : undefined
            }
            maximumDate={
              pickerField === "fromDate"
                ? parseDateInput(form.toDate) || undefined
                : undefined
            }
            onChange={handleDatePicked}
          />
        )
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={successPopupVisible}
        onRequestClose={() => setSuccessPopupVisible(false)}
      >
        <View style={styles.successBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={26} color="#FFFFFF" />
            </View>
            <Text style={styles.successTitle}>Leave Applied</Text>
            <Text style={styles.successMessage}>
              Your leave request has been submitted successfully.
            </Text>
            <Pressable
              onPress={() => setSuccessPopupVisible(false)}
              style={styles.successButton}
            >
              <Text style={styles.successButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#D8DCE2",
    gap: 6,
  },
  fieldBlock: {
    gap: 3,
  },
  fieldLabel: {
    color: "#243B52",
    fontSize: 12,
    fontWeight: "700",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 8,
  },
  col: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CFD7E2",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: "#22354A",
    fontSize: 13,
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
  readOnlyInput: {
    borderWidth: 1,
    borderColor: "#D6DEE8",
    borderRadius: 10,
    backgroundColor: "#F2F5F9",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  readOnlyValue: {
    color: "#2C3D50",
    fontWeight: "700",
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionChip: {
    borderWidth: 1,
    borderColor: "#CFD7E2",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: "#F8FAFD",
  },
  optionChipActive: {
    borderColor: "#18548F",
    backgroundColor: "#E5F1FD",
  },
  optionChipText: {
    color: "#2F4358",
    fontWeight: "600",
    fontSize: 11,
  },
  optionChipTextActive: {
    color: "#0F4D88",
    fontWeight: "700",
  },
  textArea: {
    minHeight: 58,
  },
  charCount: {
    textAlign: "right",
    color: "#7B8898",
    fontSize: 12,
  },
  fieldError: {
    color: "#B12C39",
    fontSize: 12,
    fontWeight: "600",
  },
  submitInfo: {
    fontSize: 13,
    fontWeight: "700",
  },
  submitError: {
    color: "#A72937",
  },
  sectionTitle: {
    color: "#1F2E3A",
    fontSize: 16,
    fontWeight: "800",
  },
  balanceRow: {
    borderWidth: 1,
    borderColor: "#E1E5EA",
    borderRadius: 12,
    padding: 10,
    gap: 8,
    backgroundColor: "#F9FBFD",
  },
  balanceTitleWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceTitle: {
    color: "#233446",
    fontSize: 14,
    fontWeight: "700",
  },
  balanceCode: {
    color: "#5D6E81",
    fontSize: 12,
    fontWeight: "700",
  },
  balanceStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statPill: {
    backgroundColor: "#EEF2F6",
    color: "#38495A",
    fontSize: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  statPillStrong: {
    backgroundColor: "#DDEFFD",
    color: "#124C80",
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#CED7E2",
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#F7F9FC",
  },
  tabActive: {
    backgroundColor: "#1A4E86",
    borderColor: "#1A4E86",
  },
  tabLabel: {
    color: "#304357",
    fontWeight: "700",
    fontSize: 12,
  },
  tabLabelActive: {
    color: "#FFFFFF",
  },
  historyUpdatingText: {
    color: "#667A8F",
    fontSize: 12,
    fontWeight: "600",
  },
  historyCard: {
    borderWidth: 1,
    borderColor: "#E1E6ED",
    backgroundColor: "#FBFCFD",
    borderRadius: 12,
    padding: 10,
    gap: 5,
  },
  historyHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  historyHeadMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  historyType: {
    color: "#203549",
    fontSize: 14,
    fontWeight: "800",
    flex: 1,
  },
  historyDays: {
    color: "#1A4E86",
    fontSize: 12,
    fontWeight: "700",
  },
  historyMeta: {
    color: "#55687C",
    fontSize: 12,
  },
  historyRemarks: {
    color: "#2E4053",
    fontSize: 12,
    fontStyle: "italic",
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FDECEC",
    borderWidth: 1,
    borderColor: "#F7C9C5",
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
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 14,
    gap: 6,
  },
  emptyText: {
    color: "#5C6A76",
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
  successBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,25,35,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  successCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D8E4EF",
  },
  successIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#1D8F4B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  successTitle: {
    color: "#16324A",
    fontSize: 20,
    fontWeight: "800",
  },
  successMessage: {
    marginTop: 8,
    color: "#4A6076",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  successButton: {
    marginTop: 14,
    minWidth: 110,
    borderRadius: 10,
    backgroundColor: "#1A4E86",
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  successButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
})
