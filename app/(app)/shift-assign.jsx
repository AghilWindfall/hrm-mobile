import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import useAuthStore from "../../src/features/auth/store/auth.store"
import useShiftDetails, {
  useShiftDepartments,
  useShiftOptions,
  useUpdateShiftAllocation,
} from "../../src/features/shift/hooks/useShiftDetails"
import { formatToIsoDate, parseDateInput } from "../../src/utils/date"
import {
  hasShiftAssignAccess,
  resolveNumericUserId,
} from "../../src/utils/user"

function toDatePayload(date) {
  return {
    Day: date.getDate(),
    Month: date.getMonth() + 1,
    Year: date.getFullYear(),
  }
}

function formatShiftDate(value) {
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

function formatIsoDateWithDay(value) {
  const date = parseDateInput(value)
  if (!date) {
    return value || "-"
  }

  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getEmployeeKey(item, index) {
  return String(item?.EmployeeId || item?.EmployeeCode || index)
}

function buildDateRangePayload(fromDate, toDate) {
  const start = parseDateInput(fromDate)
  const end = parseDateInput(toDate)

  if (!start || !end || start > end) {
    return []
  }

  const dates = []
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)

  while (cursor <= end) {
    dates.push(toDatePayload(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}

function summarizeShiftCodes(shiftDetails = []) {
  const uniqueCodes = []

  shiftDetails.forEach((shift) => {
    const code = String(shift?.ShiftCode || "").trim()
    if (code && !uniqueCodes.includes(code)) {
      uniqueCodes.push(code)
    }
  })

  if (uniqueCodes.length === 0) {
    return "No shift assigned"
  }

  if (uniqueCodes.length <= 2) {
    return uniqueCodes.join(" | ")
  }

  return `${uniqueCodes.slice(0, 2).join(" | ")} +${uniqueCodes.length - 2}`
}

function DateInput({ label, value, onPress }) {
  return (
    <Pressable style={styles.dateField} onPress={onPress}>
      <Text style={styles.dateFieldLabel}>{label}</Text>
      <Text style={styles.dateFieldValue}>{value}</Text>
      <Ionicons name="calendar-outline" size={16} color="#385773" />
    </Pressable>
  )
}

function EmployeeShiftCard({ item, employeeKey, selected, onToggleSelect }) {
  const shifts = Array.isArray(item?.ShiftAssignedDetail)
    ? item.ShiftAssignedDetail
    : []

  return (
    <Pressable
      style={[styles.card, selected ? styles.cardSelected : null]}
      onPress={() => onToggleSelect(employeeKey)}
    >
      <View style={styles.cardHeader}>
        <View
          style={[styles.checkbox, selected ? styles.checkboxSelected : null]}
        >
          {selected ? (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          ) : null}
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.empName}>{item?.EmployeeName || "Employee"}</Text>
          <Text style={styles.empCode}>{item?.EmployeeCode || "-"}</Text>
        </View>
      </View>

      <Text style={styles.currentShiftLabel}>Current shift</Text>
      <Text style={styles.currentShiftValue}>
        {summarizeShiftCodes(shifts)}
      </Text>

      {shifts[0]?.FromDate ? (
        <Text style={styles.currentShiftDate}>
          Last date: {formatShiftDate(shifts[0]?.FromDate)}
        </Text>
      ) : null}
    </Pressable>
  )
}

export default function ShiftAssignScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const canAssignShift = useMemo(() => hasShiftAssignAccess(user), [user])

  const shiftMutation = useShiftDetails()
  const departmentsQuery = useShiftDepartments(userId)
  const shiftOptionsQuery = useShiftOptions()
  const updateShiftMutation = useUpdateShiftAllocation()

  const today = useMemo(() => new Date(), [])
  const [fromDate, setFromDate] = useState(formatToIsoDate(today))
  const [toDate, setToDate] = useState(formatToIsoDate(today))
  const [pickerField, setPickerField] = useState(null)

  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([])
  const [isDepartmentExpanded, setIsDepartmentExpanded] = useState(false)
  const [rows, setRows] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [errors, setErrors] = useState({})

  const [searchCode, setSearchCode] = useState("")
  const [searchName, setSearchName] = useState("")
  const [selectedEmployees, setSelectedEmployees] = useState({})

  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false)
  const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState(false)
  const [selectedShiftId, setSelectedShiftId] = useState(null)

  const selectedShiftLabel = useMemo(() => {
    if (!selectedShiftId) {
      return "Select shift"
    }

    const selectedShift = (shiftOptionsQuery.data || []).find(
      (item) => Number(item?.ShiftId) === Number(selectedShiftId),
    )

    return (
      selectedShift?.ShiftCode || selectedShift?.ShiftName || "Select shift"
    )
  }, [selectedShiftId, shiftOptionsQuery.data])

  const filteredRows = useMemo(() => {
    const codeTerm = searchCode.trim().toLowerCase()
    const nameTerm = searchName.trim().toLowerCase()

    return rows.filter((item) => {
      const code = String(item?.EmployeeCode || "").toLowerCase()
      const name = String(item?.EmployeeName || "").toLowerCase()

      const codeMatch = codeTerm ? code.includes(codeTerm) : true
      const nameMatch = nameTerm ? name.includes(nameTerm) : true
      return codeMatch && nameMatch
    })
  }, [rows, searchCode, searchName])

  const pickerValue = useMemo(() => {
    if (pickerField === "from") {
      return parseDateInput(fromDate) || new Date()
    }

    if (pickerField === "to") {
      return parseDateInput(toDate) || new Date()
    }

    return new Date()
  }, [pickerField, fromDate, toDate])

  const selectedEmployeeCount = useMemo(
    () => Object.values(selectedEmployees).filter(Boolean).length,
    [selectedEmployees],
  )

  const allVisibleSelected =
    filteredRows.length > 0 &&
    filteredRows.every((item, index) => {
      const key = getEmployeeKey(item, index)
      return Boolean(selectedEmployees[key])
    })

  const toggleEmployeeSelection = (employeeKey) => {
    setSelectedEmployees((prev) => ({
      ...prev,
      [employeeKey]: !prev[employeeKey],
    }))
  }

  const toggleSelectAllVisible = () => {
    setSelectedEmployees((prev) => {
      const next = { ...prev }
      filteredRows.forEach((item, index) => {
        const key = getEmployeeKey(item, index)
        next[key] = !allVisibleSelected
      })
      return next
    })
  }

  const toggleDepartment = (departmentId) => {
    const targetId = Number(departmentId)

    setSelectedDepartmentIds((prev) => {
      if (prev.includes(targetId)) {
        return prev.filter((id) => id !== targetId)
      }

      return [...prev, targetId]
    })
  }

  const onPickDate = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setPickerField(null)
    }

    if (event?.type === "dismissed" || !selectedDate || !pickerField) {
      return
    }

    const next = formatToIsoDate(selectedDate)
    if (pickerField === "from") {
      setFromDate(next)
      const currentTo = parseDateInput(toDate)
      const nextFrom = parseDateInput(next)
      if (currentTo && nextFrom && currentTo < nextFrom) {
        setToDate(next)
      }
    } else {
      setToDate(next)
    }

    setErrors((prev) => ({ ...prev, range: undefined }))
  }

  const handleSearch = async () => {
    const from = parseDateInput(fromDate)
    const to = parseDateInput(toDate)

    if (!from || !to) {
      setErrors({ range: "Select valid dates." })
      return
    }

    if (from > to) {
      setErrors({ range: "From date cannot be after To date." })
      return
    }

    if (!userId) {
      setErrors({ range: "User ID not found. Please login again." })
      return
    }

    setErrors({})

    const allDepartments = departmentsQuery.data || []
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
      FromDate: toDatePayload(from),
      ToDate: toDatePayload(to),
    }

    try {
      const data = await shiftMutation.mutateAsync(payload)
      setRows(data || [])
      setSelectedEmployees({})
      setHasSearched(true)
    } catch (error) {
      setRows([])
      setSelectedEmployees({})
      setHasSearched(true)
      setErrors({
        range: error?.message || "Unable to load shift details. Please retry.",
      })
    }
  }

  const openAssignModal = () => {
    if (selectedEmployeeCount === 0) {
      Alert.alert("Select employees", "Please select at least one employee.")
      return
    }

    setIsAssignModalVisible(true)
  }

  const closeAssignModal = () => {
    setIsAssignModalVisible(false)
    setIsShiftDropdownOpen(false)
  }

  const handleApplyShift = async () => {
    if (!selectedShiftId) {
      Alert.alert("Select shift", "Please select a shift before applying.")
      return
    }

    const dateObjects = buildDateRangePayload(fromDate, toDate)
    if (dateObjects.length === 0) {
      Alert.alert("Invalid dates", "Please select a valid date range.")
      return
    }

    const selectedRows = filteredRows.filter((item, index) => {
      const key = getEmployeeKey(item, index)
      return Boolean(selectedEmployees[key])
    })

    if (selectedRows.length === 0) {
      Alert.alert("Select employees", "Please select at least one employee.")
      return
    }

    const payload = selectedRows.map((item) => ({
      EmployeeId: Number(item?.EmployeeId),
      CreatedUser: Number(userId),
      ShiftAssignedDetail: dateObjects.map((dateObject) => ({
        ShiftId: Number(selectedShiftId),
        FromDateObject: dateObject,
      })),
    }))

    try {
      await updateShiftMutation.mutateAsync(payload)
      closeAssignModal()
      Alert.alert("Shift assigned", "Shift has been updated successfully.")
      await handleSearch()
    } catch (error) {
      Alert.alert(
        "Update failed",
        error?.message || "Unable to update shift allocation.",
      )
    }
  }

  useEffect(() => {
    if (!canAssignShift) {
      Alert.alert(
        "Access restricted",
        "Shift assignment is available only for HR/HOD users.",
      )
      router.replace("/shift-status")
      return
    }

    handleSearch()
    // Initial load with today's date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, canAssignShift])

  if (!canAssignShift) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerTitle}>Access restricted</Text>
        <Text style={styles.centerSub}>Opening shift status...</Text>
      </View>
    )
  }

  if (!userId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerTitle}>User ID not found</Text>
        <Text style={styles.centerSub}>Please login again.</Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#123047", "#1F4E6F", "#2D6E8F"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>Workforce Planning</Text>
        <Text style={styles.heroTitle}>Shift Assign</Text>
        <Text style={styles.heroMeta}>
          Showing: {formatIsoDateWithDay(fromDate)} to{" "}
          {formatIsoDateWithDay(toDate)}
        </Text>
      </LinearGradient>

      <View style={styles.filterCard}>
        <Pressable
          style={styles.sectionToggleButton}
          onPress={() => setIsDepartmentExpanded((prev) => !prev)}
        >
          <Text style={styles.sectionLabel}>
            Department ({selectedDepartmentIds.length} selected)
          </Text>
          <Ionicons
            name={isDepartmentExpanded ? "chevron-up" : "chevron-down"}
            size={18}
            color="#355268"
          />
        </Pressable>

        {isDepartmentExpanded ? (
          departmentsQuery.isLoading ? (
            <View style={styles.inlineLoadingWrap}>
              <ActivityIndicator size="small" color="#2C6DA5" />
              <Text style={styles.inlineLoadingText}>
                Loading departments...
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.departmentScroll}
              contentContainerStyle={styles.chipWrap}
              nestedScrollEnabled
            >
              {(departmentsQuery.data || []).map((department) => {
                const departmentId = Number(department?.Dep_Id)
                const isSelected = selectedDepartmentIds.includes(departmentId)

                return (
                  <Pressable
                    key={String(departmentId)}
                    style={[
                      styles.departmentChip,
                      isSelected ? styles.departmentChipSelected : null,
                    ]}
                    onPress={() => toggleDepartment(departmentId)}
                  >
                    <Text
                      style={[
                        styles.departmentChipText,
                        isSelected ? styles.departmentChipTextSelected : null,
                      ]}
                    >
                      {department?.Dep_Name || "Department"}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          )
        ) : null}

        <View style={styles.dateRow}>
          <DateInput
            label="From"
            value={fromDate}
            onPress={() => setPickerField("from")}
          />
          <DateInput
            label="To"
            value={toDate}
            onPress={() => setPickerField("to")}
          />
        </View>

        <Pressable style={styles.showButton} onPress={handleSearch}>
          <Ionicons name="search" size={15} color="#FFFFFF" />
          <Text style={styles.showButtonText}>Show</Text>
        </Pressable>

        <View style={styles.searchRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={16} color="#6D8090" />
            <TextInput
              value={searchCode}
              onChangeText={setSearchCode}
              placeholder="Search by code"
              placeholderTextColor="#8FA0AD"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="person-outline" size={16} color="#6D8090" />
            <TextInput
              value={searchName}
              onChangeText={setSearchName}
              placeholder="Search by name"
              placeholderTextColor="#8FA0AD"
              style={styles.searchInput}
            />
          </View>
        </View>

        {errors.range ? (
          <Text style={styles.errorText}>{errors.range}</Text>
        ) : null}
      </View>

      {shiftMutation.isPending ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#D38C2D" />
          <Text style={styles.centerSub}>Loading shift details...</Text>
        </View>
      ) : hasSearched && filteredRows.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>No shift data found</Text>
          <Text style={styles.centerSub}>
            Try another date range or department selection.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={getEmployeeKey}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const employeeKey = getEmployeeKey(item, index)
            const selected = Boolean(selectedEmployees[employeeKey])

            return (
              <EmployeeShiftCard
                item={item}
                employeeKey={employeeKey}
                selected={selected}
                onToggleSelect={toggleEmployeeSelection}
              />
            )
          }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={60}
          windowSize={9}
          removeClippedSubviews
        />
      )}

      {!shiftMutation.isPending && filteredRows.length > 0 ? (
        <View style={styles.bottomActionBar}>
          <Pressable
            style={styles.selectAllButton}
            onPress={toggleSelectAllVisible}
          >
            <Ionicons
              name={allVisibleSelected ? "checkbox" : "square-outline"}
              size={18}
              color="#2C6DA5"
            />
            <Text style={styles.selectAllText}>
              {allVisibleSelected ? "Unselect all" : "Select all"}
            </Text>
          </Pressable>

          <Text style={styles.selectionMeta}>
            {selectedEmployeeCount} selected
          </Text>

          <Pressable
            style={[
              styles.assignButton,
              selectedEmployeeCount === 0 ? styles.assignButtonDisabled : null,
            ]}
            disabled={selectedEmployeeCount === 0}
            onPress={openAssignModal}
          >
            <Text style={styles.assignButtonText}>Assign</Text>
          </Pressable>
        </View>
      ) : null}

      <Modal
        visible={isAssignModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeAssignModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Common Shift Assign</Text>

            <Text style={styles.modalMeta}>
              Employees: {selectedEmployeeCount}
            </Text>
            <Text style={styles.modalMeta}>
              Date:{" "}
              {fromDate === toDate
                ? formatIsoDateWithDay(fromDate)
                : `${formatIsoDateWithDay(fromDate)} to ${formatIsoDateWithDay(toDate)}`}
            </Text>

            <Text style={styles.modalLabel}>Select Shift</Text>
            <Pressable
              style={styles.shiftSelectField}
              onPress={() => setIsShiftDropdownOpen((prev) => !prev)}
            >
              <Text style={styles.shiftSelectText}>{selectedShiftLabel}</Text>
              <Ionicons
                name={isShiftDropdownOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color="#385773"
              />
            </Pressable>

            {isShiftDropdownOpen ? (
              <View style={styles.shiftDropdownWrap}>
                {shiftOptionsQuery.isLoading ? (
                  <View style={styles.inlineLoadingWrap}>
                    <ActivityIndicator size="small" color="#2C6DA5" />
                    <Text style={styles.inlineLoadingText}>
                      Loading shifts...
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.shiftDropdownScroll}
                    contentContainerStyle={styles.shiftDropdownContent}
                  >
                    {(shiftOptionsQuery.data || []).map((shiftOption) => {
                      const isSelected =
                        Number(shiftOption?.ShiftId) === Number(selectedShiftId)

                      return (
                        <Pressable
                          key={String(shiftOption?.ShiftId)}
                          style={[
                            styles.shiftOption,
                            isSelected ? styles.shiftOptionSelected : null,
                          ]}
                          onPress={() => {
                            setSelectedShiftId(Number(shiftOption?.ShiftId))
                            setIsShiftDropdownOpen(false)
                          }}
                        >
                          <Text
                            style={[
                              styles.shiftOptionText,
                              isSelected
                                ? styles.shiftOptionTextSelected
                                : null,
                            ]}
                          >
                            {shiftOption?.ShiftName || shiftOption?.ShiftCode}
                          </Text>
                        </Pressable>
                      )
                    })}
                  </ScrollView>
                )}
              </View>
            ) : null}

            <View style={styles.modalActionRow}>
              <Pressable style={styles.cancelButton} onPress={closeAssignModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.applyButton}
                onPress={handleApplyShift}
                disabled={updateShiftMutation.isPending}
              >
                {updateShiftMutation.isPending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.applyButtonText}>Apply changes</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {pickerField ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={onPickDate}
          maximumDate={new Date(2100, 11, 31)}
          minimumDate={
            pickerField === "to"
              ? parseDateInput(fromDate) || new Date(2000, 0, 1)
              : new Date(2000, 0, 1)
          }
        />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ECF2F6",
  },
  hero: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  heroLabel: {
    color: "#A4C7DF",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  heroMeta: {
    color: "#D6E5EF",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
  },
  filterCard: {
    marginTop: 10,
    marginHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#D7E0E8",
    gap: 10,
  },
  sectionLabel: {
    color: "#123047",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionToggleButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  departmentScroll: {
    maxHeight: 130,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingBottom: 2,
  },
  departmentChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#C8D5E0",
    backgroundColor: "#F6FAFD",
  },
  departmentChipSelected: {
    backgroundColor: "#2C6DA5",
    borderColor: "#2C6DA5",
  },
  departmentChipText: {
    color: "#355268",
    fontSize: 12,
    fontWeight: "600",
  },
  departmentChipTextSelected: {
    color: "#FFFFFF",
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
  },
  dateField: {
    flex: 1,
    backgroundColor: "#F4F8FB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D7E0E8",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateFieldLabel: {
    fontSize: 11,
    color: "#6D8090",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dateFieldValue: {
    flex: 1,
    fontSize: 13,
    color: "#1B2F3E",
    fontWeight: "600",
  },
  showButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2C6DA5",
    borderRadius: 10,
    paddingVertical: 11,
  },
  showButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D7E0E8",
    borderRadius: 10,
    backgroundColor: "#F4F8FB",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 13,
    color: "#1B2F3E",
    fontWeight: "600",
  },
  selectAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectAllText: {
    color: "#2C6DA5",
    fontSize: 13,
    fontWeight: "700",
  },
  assignButton: {
    borderRadius: 10,
    backgroundColor: "#2C6DA5",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  assignButtonDisabled: {
    opacity: 0.45,
  },
  assignButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  selectionMeta: {
    color: "#5F7485",
    fontSize: 12,
    fontWeight: "700",
  },
  errorText: {
    color: "#BF1F1F",
    fontSize: 12,
    fontWeight: "600",
  },
  inlineLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inlineLoadingText: {
    color: "#5F7485",
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    paddingBottom: 88,
  },
  bottomActionBar: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E0E8",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#001F3F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7E0E8",
    padding: 12,
  },
  cardSelected: {
    borderColor: "#2C6DA5",
    backgroundColor: "#EFF7FF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#7F95A8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "#FFFFFF",
  },
  checkboxSelected: {
    backgroundColor: "#2C6DA5",
    borderColor: "#2C6DA5",
  },
  headerTextWrap: {
    flex: 1,
  },
  empName: {
    color: "#1B2F3E",
    fontSize: 15,
    fontWeight: "700",
  },
  empCode: {
    color: "#6D8090",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  currentShiftLabel: {
    color: "#5F7485",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  currentShiftValue: {
    color: "#123047",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  currentShiftDate: {
    color: "#6D8090",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 3,
  },
  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 8,
  },
  centerTitle: {
    color: "#1B2F3E",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  centerSub: {
    color: "#6D8090",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(8,16,24,0.45)",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#D7E0E8",
    gap: 10,
    maxHeight: "75%",
  },
  modalTitle: {
    color: "#123047",
    fontSize: 18,
    fontWeight: "800",
  },
  modalMeta: {
    color: "#5F7485",
    fontSize: 12,
    fontWeight: "600",
  },
  modalLabel: {
    color: "#123047",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  shiftSelectField: {
    borderWidth: 1,
    borderColor: "#D7E0E8",
    borderRadius: 10,
    backgroundColor: "#F4F8FB",
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  shiftSelectText: {
    color: "#1B2F3E",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    paddingRight: 8,
  },
  shiftDropdownWrap: {
    borderWidth: 1,
    borderColor: "#D7E0E8",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    maxHeight: 220,
  },
  shiftDropdownScroll: {
    maxHeight: 220,
  },
  shiftDropdownContent: {
    paddingVertical: 4,
  },
  shiftOption: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  shiftOptionSelected: {
    backgroundColor: "#EAF4FC",
  },
  shiftOptionText: {
    color: "#355268",
    fontSize: 13,
    fontWeight: "600",
  },
  shiftOptionTextSelected: {
    color: "#123047",
    fontWeight: "800",
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: "#C8D5E0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#385773",
    fontSize: 13,
    fontWeight: "700",
  },
  applyButton: {
    borderRadius: 10,
    backgroundColor: "#2C6DA5",
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
})
