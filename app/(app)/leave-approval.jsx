// Status mapping utility
const STATUS_MAP = {
  P: { label: "Pending", color: "#F6B53E", text: "#7A4A00" },
  S: {
    label: "1 Level Approval Pending",
    color: "#FFE7B0",
    text: "#7A4A00",
  },
  A: { label: "Approved", color: "#4CAF50", text: "#0B3D1A" },
  R: { label: "Rejected", color: "#F44336", text: "#7A1F1F" },
}

import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { LinearGradient } from "expo-linear-gradient"
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
  useApprovalLeaveTypes,
  useLeaveSanctionAction,
  usePendingLeavesForApproval,
} from "../../src/features/leave/hooks/useLeaveApproval"
import { formatToIsoDate, parseDateInput } from "../../src/utils/date"

const ALL_LEAVE_TYPES = "ALL"
const STATUS_FILTERS = [
  { key: "P", label: "Pending" },
  { key: "S", label: "Processing" },
  { key: "A", label: "Approved" },
  { key: "R", label: "Rejected" },
]

function showToastMessage(message) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.SHORT)
    return
  }

  Alert.alert("Info", message)
}

function formatDisplayDate(value) {
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

function getRowKey(item, index) {
  // Always append index to guarantee uniqueness
  const base = item.Leave_Apply_Id
    ? String(item.Leave_Apply_Id)
    : `emp-${item.Emp_Id || "x"}`
  return `${base}-${index}`
}

function safeDateFromValue(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export default function LeaveApprovalScreen() {
  const user = useAuthStore((state) => state.user)
  const approverUserId = Number(user?.UserId || user?.User_Id || user?.id || 0)
  const todayIso = useMemo(() => formatToIsoDate(new Date()), [])

  const [statusFilter, setStatusFilter] = useState("P")
  const leaveTypesQuery = useApprovalLeaveTypes()
  const pendingLeavesQuery = usePendingLeavesForApproval({
    applyStatus: statusFilter,
    userId: approverUserId,
    keepPreviousData: true,
  })
  const leaveSanctionMutation = useLeaveSanctionAction()

  const [filters, setFilters] = useState({
    fromDate: todayIso,
    toDate: todayIso,
    leaveTypeId: ALL_LEAVE_TYPES,
    employeeQuery: "",
  })
  const [employeeSearchText, setEmployeeSearchText] = useState("")

  const clearFilters = () => {
    setFilters({
      fromDate: todayIso,
      toDate: todayIso,
      leaveTypeId: ALL_LEAVE_TYPES,
      employeeQuery: "",
    })
    setEmployeeSearchText("")
  }

  const [pickerField, setPickerField] = useState(null)
  const [activeRejectId, setActiveRejectId] = useState(null)
  const [rejectRemarksById, setRejectRemarksById] = useState({})
  const [activeActionRowId, setActiveActionRowId] = useState(null)

  const isLoading =
    leaveTypesQuery.isLoading ||
    (pendingLeavesQuery.isLoading && !pendingLeavesQuery.isFetching)
  const hasError = leaveTypesQuery.isError || pendingLeavesQuery.isError
  const isPendingView = statusFilter === "P"
  const isProcessingView = statusFilter === "S"
  const statusFilterLabel =
    STATUS_FILTERS.find((option) => option.key === statusFilter)?.label ||
    "Pending"

  const updateFilter = (key, value) => {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
    }))
  }

  const handleEmployeeSearch = () => {
    updateFilter("employeeQuery", employeeSearchText.trim())
  }

  const pickerValue = useMemo(() => {
    const sourceValue = pickerField ? filters[pickerField] : ""
    return parseDateInput(sourceValue) || new Date()
  }, [pickerField, filters])

  const handleDatePicked = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setPickerField(null)
    }

    if (!selectedDate || !pickerField) {
      return
    }

    const nextIso = formatToIsoDate(selectedDate)
    if (pickerField === "fromDate") {
      updateFilter("fromDate", nextIso)

      const currentTo = parseDateInput(filters.toDate)
      const pickedFrom = parseDateInput(nextIso)
      if (currentTo && pickedFrom && currentTo < pickedFrom) {
        updateFilter("toDate", nextIso)
      }

      return
    }

    updateFilter("toDate", nextIso)
  }

  const handleApprove = async (item) => {
    const leaveApplyId = Number(item?.Leave_Apply_Id || 0)
    const employeeId = Number(item?.Emp_Id || item?.EmpId || 0)

    if (!leaveApplyId || !employeeId || !approverUserId) {
      showToastMessage("Unable to approve this leave request.")
      return
    }

    try {
      setActiveActionRowId(String(leaveApplyId))

      await leaveSanctionMutation.mutateAsync([
        {
          Emp_Id: employeeId,
          Leave_Apply_Id: leaveApplyId,
          Apply_Status: "A",
          UserId: approverUserId,
          Remark_Reject: "",
        },
      ])

      showToastMessage("Leave request approved.")
      setActiveRejectId(null)
      await pendingLeavesQuery.refetch()
    } catch (error) {
      showToastMessage(error?.message || "Unable to approve leave request.")
    } finally {
      setActiveActionRowId(null)
    }
  }

  const handleRejectStart = (item) => {
    const rowId = String(item?.Leave_Apply_Id || "")
    if (!rowId) {
      showToastMessage("Unable to open reject form for this record.")
      return
    }

    setActiveRejectId(rowId)
  }

  const handleRejectConfirm = async (item) => {
    const leaveApplyId = Number(item?.Leave_Apply_Id || 0)
    const employeeId = Number(item?.Emp_Id || item?.EmpId || 0)
    const rowId = String(leaveApplyId || "")

    if (!leaveApplyId || !employeeId || !approverUserId || !rowId) {
      showToastMessage("Unable to reject this record.")
      return
    }

    const remarks = String(rejectRemarksById[rowId] || "").trim()
    if (!remarks) {
      showToastMessage("Please enter reject remarks.")
      return
    }

    try {
      setActiveActionRowId(rowId)

      await leaveSanctionMutation.mutateAsync([
        {
          Emp_Id: employeeId,
          Leave_Apply_Id: leaveApplyId,
          Apply_Status: "R",
          UserId: approverUserId,
          Remark_Reject: remarks,
        },
      ])

      setActiveRejectId(null)
      setRejectRemarksById((previous) => ({
        ...previous,
        [rowId]: "",
      }))
      showToastMessage("Leave request rejected.")
      await pendingLeavesQuery.refetch()
    } catch (error) {
      showToastMessage(error?.message || "Unable to reject leave request.")
    } finally {
      setActiveActionRowId(null)
    }
  }

  const leaveTypeOptions = useMemo(() => {
    const options = [{ Type_Id: ALL_LEAVE_TYPES, Leave_Name: "All Types" }]
    return [...options, ...(leaveTypesQuery.data || [])]
  }, [leaveTypesQuery.data])

  const visiblePendingLeaves = useMemo(() => {
    const fromDate = parseDateInput(filters.fromDate)
    const toDate = parseDateInput(filters.toDate)
    const employeeQuery = filters.employeeQuery.trim().toLowerCase()

    return (pendingLeavesQuery.data || []).filter((item) => {
      if (
        filters.leaveTypeId !== ALL_LEAVE_TYPES &&
        String(item.Leave_Type) !== String(filters.leaveTypeId)
      ) {
        return false
      }

      if (employeeQuery) {
        const employeeName = String(item.Emp_Name || "").toLowerCase()
        const employeeCode = String(item.Emp_Code || "").toLowerCase()
        if (
          !employeeName.includes(employeeQuery) &&
          !employeeCode.includes(employeeQuery)
        ) {
          return false
        }
      }

      const leaveFromDate = safeDateFromValue(item.Leave_From)
      if (fromDate && leaveFromDate && leaveFromDate < fromDate) {
        return false
      }

      if (toDate && leaveFromDate && leaveFromDate > toDate) {
        return false
      }

      return true
    })
  }, [pendingLeavesQuery.data, filters])

  if (isLoading || pendingLeavesQuery.isFetching) {
    return <Loader />
  }

  if (hasError) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>
          Unable to load leave approvals. Please try again.
        </Text>
        <Button
          label="Retry"
          onPress={() => pendingLeavesQuery.refetch()}
          disabled={pendingLeavesQuery.isFetching}
          loading={pendingLeavesQuery.isFetching}
        />
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={["#114A7A", "#1E6EA1", "#2E8CC2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroTitle}>Leave Approval</Text>
        <Text style={styles.heroSub}>
          {visiblePendingLeaves.length} {statusFilterLabel.toLowerCase()}{" "}
          request(s)
        </Text>
      </LinearGradient>

      <View style={styles.filterCard}>
        <View style={styles.statusFilterRow}>
          {STATUS_FILTERS.map((option) => {
            const selected = option.key === statusFilter
            return (
              <Pressable
                key={option.key}
                onPress={() => setStatusFilter(option.key)}
                style={[
                  styles.statusChip,
                  selected ? styles.statusChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.statusChipText,
                    selected ? styles.statusChipTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Text style={styles.filterTitle}>Filter Requests</Text>

        <View style={styles.twoColRow}>
          <View style={[styles.fieldBlock, styles.col]}>
            <Text style={styles.fieldLabel}>From Date</Text>
            <Pressable
              onPress={() => setPickerField("fromDate")}
              style={styles.datePickerTrigger}
            >
              <Text
                style={
                  filters.fromDate
                    ? styles.datePickerText
                    : styles.datePickerPlaceholder
                }
              >
                {filters.fromDate || "From Date"}
              </Text>
              <Ionicons name="calendar-outline" size={17} color="#48637C" />
            </Pressable>
          </View>

          <View style={[styles.fieldBlock, styles.col]}>
            <Text style={styles.fieldLabel}>To Date</Text>
            <Pressable
              onPress={() => setPickerField("toDate")}
              style={styles.datePickerTrigger}
            >
              <Text
                style={
                  filters.toDate
                    ? styles.datePickerText
                    : styles.datePickerPlaceholder
                }
              >
                {filters.toDate || "To Date"}
              </Text>
              <Ionicons name="calendar-outline" size={17} color="#48637C" />
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Employee</Text>
          <View style={styles.searchRow}>
            <TextInput
              value={employeeSearchText}
              onChangeText={setEmployeeSearchText}
              onSubmitEditing={handleEmployeeSearch}
              placeholder="Search by employee name or code"
              style={styles.searchInput}
              placeholderTextColor="#8A9AAF"
              returnKeyType="search"
            />
            <Pressable
              onPress={handleEmployeeSearch}
              style={styles.searchButton}
            >
              <Ionicons name="search" size={16} color="#FFFFFF" />
              <Text style={styles.searchButtonText}>Search</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Leave Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeRow}>
              {leaveTypeOptions.map((option) => {
                const selected =
                  String(filters.leaveTypeId) === String(option.Type_Id)

                return (
                  <Pressable
                    key={option.Type_Id}
                    onPress={() =>
                      updateFilter("leaveTypeId", String(option.Type_Id))
                    }
                    style={[
                      styles.typeChip,
                      selected ? styles.typeChipActive : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        selected ? styles.typeChipTextActive : null,
                      ]}
                    >
                      {option.Leave_Name}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.filterActions}>
          <Pressable
            onPress={() => pendingLeavesQuery.refetch()}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh" size={16} color="#1D5F8B" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>

          <Pressable onPress={clearFilters} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.listSection}>
        {visiblePendingLeaves.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={34}
              color="#4F6A83"
            />
            <Text style={styles.emptyTitle}>No Pending Leaves</Text>
            <Text style={styles.emptyText}>
              Try changing filters or refresh to fetch latest pending approvals.
            </Text>
          </View>
        ) : (
          visiblePendingLeaves.map((item, index) => {
            const rowId = String(item.Leave_Apply_Id || "")
            const rejectRemarks = rejectRemarksById[rowId] || ""
            const isActionLoading =
              leaveSanctionMutation.isPending && activeActionRowId === rowId

            return (
              <View key={getRowKey(item, index)} style={styles.leaveCard}>
                <View style={styles.leaveHead}>
                  <View style={styles.employeeInfoWrap}>
                    <Text style={styles.employeeCode}>
                      {item.Emp_Code || "-"}
                    </Text>
                    <Text style={styles.employeeName}>
                      {item.Emp_Name || "Employee"}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {item.Days || 0} day(s)
                    </Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    {formatDisplayDate(item.Leave_From)} to{" "}
                    {formatDisplayDate(item.Leave_To)}
                  </Text>
                  <Text style={styles.metaText}>{item.Ses_Name || "-"}</Text>
                  {/* Status badge */}
                  {(() => {
                    const statusKey = String(
                      item.Apply_Status || item.Status || statusFilter || "P",
                    ).toUpperCase()
                    const status = isProcessingView
                      ? STATUS_MAP.S
                      : STATUS_MAP[statusKey] || STATUS_MAP.P
                    return (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: status.color },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: status.text },
                          ]}
                        >
                          {status.label}
                        </Text>
                      </View>
                    )
                  })()}
                </View>

                <Text style={styles.leaveTypeText}>
                  {item.Leave_Name || "Leave"}
                </Text>

                {item.Remarks ? (
                  <Text style={styles.remarksText} numberOfLines={3}>
                    {item.Remarks}
                  </Text>
                ) : null}

                {isPendingView && activeRejectId === rowId ? (
                  <View style={styles.rejectBox}>
                    <Text style={styles.rejectLabel}>Reject Remarks</Text>
                    <TextInput
                      value={rejectRemarks}
                      onChangeText={(value) =>
                        setRejectRemarksById((previous) => ({
                          ...previous,
                          [rowId]: value,
                        }))
                      }
                      placeholder="Reason for rejection"
                      style={styles.rejectInput}
                      placeholderTextColor="#8A9AAF"
                      multiline
                      maxLength={180}
                    />
                    <View style={styles.rejectActionRow}>
                      <Pressable
                        onPress={() => setActiveRejectId(null)}
                        style={styles.cancelRejectButton}
                      >
                        <Text style={styles.cancelRejectText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleRejectConfirm(item)}
                        disabled={isActionLoading}
                        style={styles.confirmRejectButton}
                      >
                        <Text style={styles.confirmRejectText}>
                          {isActionLoading ? "Rejecting..." : "Confirm Reject"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                {isPendingView ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => handleApprove(item)}
                      disabled={isActionLoading}
                      style={[
                        styles.actionButton,
                        styles.approveButton,
                        isActionLoading ? styles.actionButtonDisabled : null,
                      ]}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>
                        {isActionLoading ? "Working..." : "Approve"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => handleRejectStart(item)}
                      disabled={isActionLoading}
                      style={[
                        styles.actionButton,
                        styles.rejectButton,
                        isActionLoading ? styles.actionButtonDisabled : null,
                      ]}
                    >
                      <Ionicons name="close" size={16} color="#A32629" />
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </Pressable>
                  </View>
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
            onRequestClose={() => setPickerField(null)}
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
                      ? parseDateInput(filters.fromDate) || undefined
                      : undefined
                  }
                  onChange={handleDatePicked}
                />
                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setPickerField(null)}
                    style={styles.modalAction}
                  >
                    <Text style={styles.modalActionText}>Done</Text>
                  </Pressable>
                </View>
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
                ? parseDateInput(filters.fromDate) || undefined
                : undefined
            }
            onChange={handleDatePicked}
          />
        )
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  statusFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    justifyContent: "center",
  },
  statusChip: {
    borderWidth: 1,
    borderColor: "#C3D2E0",
    backgroundColor: "#F1F7FC",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  statusChipActive: {
    backgroundColor: "#1E6EA1",
    borderColor: "#1E6EA1",
  },
  statusChipText: {
    color: "#2D4965",
    fontSize: 13,
    fontWeight: "700",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  statusBadgeText: {
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  screen: {
    flex: 1,
    backgroundColor: "#EEF4F8",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
  },
  hero: {
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 6,
  },
  heroTitle: {
    color: "#F8FCFF",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  heroSub: {
    color: "#DBF2FF",
    fontSize: 13,
    fontWeight: "600",
  },
  filterCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 12,
    shadowColor: "#001B33",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  filterTitle: {
    color: "#0F385B",
    fontSize: 17,
    fontWeight: "700",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
  fieldBlock: {
    gap: 6,
  },
  fieldLabel: {
    color: "#1F405E",
    fontSize: 13,
    fontWeight: "600",
  },
  datePickerTrigger: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#C9D7E3",
    borderRadius: 12,
    backgroundColor: "#F7FAFD",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  datePickerText: {
    color: "#15293C",
    fontSize: 14,
    fontWeight: "600",
  },
  datePickerPlaceholder: {
    color: "#8094A8",
    fontSize: 14,
    fontWeight: "500",
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#C9D7E3",
    borderRadius: 12,
    backgroundColor: "#F7FAFD",
    paddingHorizontal: 12,
    color: "#10253A",
    fontSize: 14,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#1E6EA1",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  searchButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeChip: {
    borderWidth: 1,
    borderColor: "#C3D2E0",
    backgroundColor: "#F1F7FC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  typeChipActive: {
    backgroundColor: "#1E6EA1",
    borderColor: "#1E6EA1",
  },
  typeChipText: {
    color: "#2D4965",
    fontSize: 12,
    fontWeight: "600",
  },
  typeChipTextActive: {
    color: "#FFFFFF",
  },
  filterActions: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#E8F4FC",
  },
  refreshButtonText: {
    color: "#1D5F8B",
    fontWeight: "700",
    fontSize: 13,
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  clearButtonText: {
    color: "#5A6E82",
    fontWeight: "700",
    fontSize: 12,
  },
  listSection: {
    gap: 12,
  },
  emptyState: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 22,
    alignItems: "center",
    gap: 7,
  },
  emptyTitle: {
    color: "#16324B",
    fontSize: 17,
    fontWeight: "700",
  },
  emptyText: {
    color: "#5A7087",
    fontSize: 13,
    textAlign: "center",
  },
  leaveCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 10,
    shadowColor: "#001B33",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  leaveHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  employeeInfoWrap: {
    flex: 1,
    gap: 2,
  },
  employeeCode: {
    color: "#1D5D89",
    fontSize: 12,
    fontWeight: "800",
  },
  employeeName: {
    color: "#152A3E",
    fontSize: 14,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 999,
    backgroundColor: "#E6F3FD",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeText: {
    color: "#1F5D88",
    fontSize: 12,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  metaText: {
    color: "#4C6278",
    fontSize: 12,
    fontWeight: "600",
    flexShrink: 1,
  },
  leaveTypeText: {
    color: "#0F3556",
    fontSize: 15,
    fontWeight: "700",
  },
  remarksText: {
    color: "#5B7289",
    fontSize: 12,
    lineHeight: 18,
  },
  actionRow: {
    marginTop: 2,
    flexDirection: "row",
    gap: 10,
  },
  actionButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonDisabled: {
    opacity: 0.65,
  },
  approveButton: {
    backgroundColor: "#0D8A58",
  },
  rejectButton: {
    borderWidth: 1,
    borderColor: "#D8A8AA",
    backgroundColor: "#FFF4F4",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  rejectButtonText: {
    color: "#A32629",
    fontWeight: "800",
    fontSize: 13,
  },
  rejectBox: {
    borderRadius: 14,
    backgroundColor: "#FFF6F6",
    borderWidth: 1,
    borderColor: "#F0CDCE",
    padding: 10,
    gap: 8,
  },
  rejectLabel: {
    color: "#853437",
    fontSize: 12,
    fontWeight: "700",
  },
  rejectInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#E5B9BB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#3C2B2B",
    fontSize: 13,
    textAlignVertical: "top",
  },
  rejectActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  cancelRejectButton: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F0E6E7",
  },
  cancelRejectText: {
    color: "#6F4648",
    fontWeight: "700",
    fontSize: 12,
  },
  confirmRejectButton: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#B3383C",
  },
  confirmRejectText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#EEF4F8",
  },
  errorText: {
    color: "#9A2D30",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16, 30, 43, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    padding: 12,
    gap: 8,
  },
  modalTitle: {
    color: "#17324A",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  modalActions: {
    alignItems: "center",
  },
  modalAction: {
    minWidth: 88,
    borderRadius: 10,
    backgroundColor: "#1D5F8B",
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  modalActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
})
