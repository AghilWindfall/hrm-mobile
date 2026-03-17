import { Ionicons } from "@expo/vector-icons"
import DateTimePicker from "@react-native-community/datetimepicker"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useEffect, useMemo, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
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
} from "../../src/features/shift/hooks/useShiftDetails"
import { formatToIsoDate, parseDateInput } from "../../src/utils/date"
import { hasShiftAssignAccess, resolveNumericUserId } from "../../src/utils/user"

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

function getInitials(name) {
  if (!name || typeof name !== "string") {
    return "EM"
  }

  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "EM"
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function getEmployeeKey(item, index) {
  return String(item?.EmployeeId || item?.EmployeeCode || index)
}

function getRangeInDays(fromDate, toDate) {
  const start = parseDateInput(fromDate)
  const end = parseDateInput(toDate)

  if (!start || !end) {
    return 1
  }

  const msPerDay = 24 * 60 * 60 * 1000
  return Math.floor((end - start) / msPerDay) + 1
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

function EmployeeShiftCard({
  item,
  employeeKey,
  expanded,
  onToggle,
  showShiftCountBadge,
}) {
  const shifts = Array.isArray(item?.ShiftAssignedDetail)
    ? item.ShiftAssignedDetail
    : []

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.cardHeader}
        onPress={() => onToggle(employeeKey)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(item?.EmployeeName)}
          </Text>
        </View>

        <View style={styles.headerTextWrap}>
          <Text style={styles.empName}>{item?.EmployeeName || "Employee"}</Text>
          <Text style={styles.empCode}>{item?.EmployeeCode || "-"}</Text>
        </View>

        {showShiftCountBadge ? (
          <View style={styles.shiftCountPill}>
            <Text style={styles.shiftCountText}>{shifts.length} shift</Text>
          </View>
        ) : null}

        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color="#385773"
          style={styles.chevronIcon}
        />
      </Pressable>

      {!expanded ? (
        <View style={styles.collapsedMetaWrap}>
          <Text style={styles.collapsedMetaText}>
            {shifts.length > 0
              ? `${shifts.length} shift entry in selected range`
              : "No shift assigned in selected range"}
          </Text>
        </View>
      ) : shifts.length === 0 ? (
        <View style={styles.emptyShiftWrap}>
          <Text style={styles.emptyShiftText}>
            No shift assigned in this range.
          </Text>
        </View>
      ) : (
        shifts.map((shift, index) => (
          <View
            key={`${shift?.ShiftAllocationId || index}`}
            style={styles.shiftRow}
          >
            <View style={styles.shiftTop}>
              <Text style={styles.shiftCode}>
                {shift?.ShiftCode || "Shift"}
              </Text>
              <View
                style={[
                  styles.confirmPill,
                  shift?.Confirmed ? styles.confirmedPill : styles.pendingPill,
                ]}
              >
                <Text
                  style={[
                    styles.confirmText,
                    shift?.Confirmed
                      ? styles.confirmedText
                      : styles.pendingText,
                  ]}
                >
                  {shift?.Confirmed ? "Confirmed" : "Pending"}
                </Text>
              </View>
            </View>

            <Text style={styles.shiftDescription}>
              {shift?.ShiftDescription || "-"}
            </Text>

            <View style={styles.dateMetaRow}>
              <Text style={styles.dateMetaText}>
                {formatShiftDate(shift?.FromDate)} -{" "}
                {formatShiftDate(shift?.ToDate)}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  )
}

export default function ShiftStatusScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const canAssignShift = useMemo(() => hasShiftAssignAccess(user), [user])
  const shiftMutation = useShiftDetails()
  const departmentsQuery = useShiftDepartments(userId)

  const today = useMemo(() => new Date(), [])
  const [fromDate, setFromDate] = useState(formatToIsoDate(today))
  const [toDate, setToDate] = useState(formatToIsoDate(today))
  const [pickerField, setPickerField] = useState(null)
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([])
  const [isDepartmentExpanded, setIsDepartmentExpanded] = useState(false)
  const [rows, setRows] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [errors, setErrors] = useState({})
  const [searchText, setSearchText] = useState("")
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState({})

  const isWideDateRange = useMemo(
    () => getRangeInDays(fromDate, toDate) > 1,
    [fromDate, toDate],
  )

  const filteredRows = useMemo(() => {
    const keyword = searchText.trim().toLowerCase()

    if (!keyword) {
      return rows
    }

    return rows.filter((item) => {
      const code = String(item?.EmployeeCode || "").toLowerCase()
      const name = String(item?.EmployeeName || "").toLowerCase()
      return code.includes(keyword) || name.includes(keyword)
    })
  }, [rows, searchText])

  const pickerValue = useMemo(() => {
    if (pickerField === "from") {
      return parseDateInput(fromDate) || new Date()
    }

    if (pickerField === "to") {
      return parseDateInput(toDate) || new Date()
    }

    return new Date()
  }, [pickerField, fromDate, toDate])

  const toggleEmployee = (employeeKey) => {
    setExpandedEmployeeIds((prev) => ({
      ...prev,
      [employeeKey]: !prev[employeeKey],
    }))
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
      setExpandedEmployeeIds({})
      setHasSearched(true)
    } catch {
      setRows([])
      setExpandedEmployeeIds({})
      setHasSearched(true)
    }
  }

  useEffect(() => {
    handleSearch()
    // Initial load with today's date.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

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
        <Text style={styles.heroTitle}>Employee Shift Status</Text>
        <Text style={styles.heroMeta}>
          Showing: {formatIsoDateWithDay(fromDate)} to{" "}
          {formatIsoDateWithDay(toDate)}
        </Text>

        {canAssignShift ? (
          <Pressable
            style={styles.assignShortcutButton}
            onPress={() => router.push("/shift-assign")}
          >
            <Ionicons name="git-branch-outline" size={16} color="#FFFFFF" />
            <Text style={styles.assignShortcutText}>Assign Shift</Text>
          </Pressable>
        ) : null}
      </LinearGradient>

      <View style={styles.filterCard}>
        <Pressable
          style={styles.sectionHeaderRow}
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
          <Text style={styles.showButtonText}>Show Shifts</Text>
        </Pressable>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color="#6D8090" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by employee name or code"
            placeholderTextColor="#8FA0AD"
            style={styles.searchInput}
          />
        </View>

        {errors.range ? (
          <Text style={styles.errorText}>{errors.range}</Text>
        ) : null}
      </View>

      {shiftMutation.isPending ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#D38C2D" />
          <Text style={styles.centerSub}>Loading shift status...</Text>
        </View>
      ) : hasSearched && filteredRows.length === 0 ? (
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>No shift data found</Text>
          <Text style={styles.centerSub}>
            Try another date range or search term.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRows}
          keyExtractor={getEmployeeKey}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const employeeKey = getEmployeeKey(item, index)
            const expanded = Boolean(expandedEmployeeIds[employeeKey])

            return (
              <EmployeeShiftCard
                item={item}
                employeeKey={employeeKey}
                expanded={expanded}
                onToggle={toggleEmployee}
                showShiftCountBadge={!isWideDateRange}
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
  assignShortcutButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  assignShortcutText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  departmentScroll: {
    maxHeight: 110,
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
  searchWrap: {
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
  errorText: {
    color: "#BF1F1F",
    fontSize: 12,
    fontWeight: "600",
  },
  listContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D7E0E8",
    padding: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DDECF8",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    color: "#1E4F77",
    fontSize: 14,
    fontWeight: "800",
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
  shiftCountPill: {
    backgroundColor: "#EAF4FC",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  shiftCountText: {
    color: "#2C6DA5",
    fontSize: 11,
    fontWeight: "700",
  },
  chevronIcon: {
    marginLeft: 8,
  },
  collapsedMetaWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E7EEF4",
    paddingTop: 10,
  },
  collapsedMetaText: {
    color: "#6D8090",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyShiftWrap: {
    backgroundColor: "#F5F8FB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  emptyShiftText: {
    color: "#6D8090",
    fontSize: 12,
    fontWeight: "600",
  },
  shiftRow: {
    borderTopWidth: 1,
    borderTopColor: "#E7EEF4",
    paddingTop: 10,
    marginTop: 8,
  },
  shiftTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shiftCode: {
    color: "#123047",
    fontSize: 13,
    fontWeight: "800",
  },
  confirmPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  confirmedPill: {
    backgroundColor: "#DFF6E8",
  },
  pendingPill: {
    backgroundColor: "#FFE9CC",
  },
  confirmText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  confirmedText: {
    color: "#117A3D",
  },
  pendingText: {
    color: "#A8640E",
  },
  shiftDescription: {
    marginTop: 4,
    color: "#4C6272",
    fontSize: 12,
    fontWeight: "600",
  },
  dateMetaRow: {
    marginTop: 5,
  },
  dateMetaText: {
    color: "#6D8090",
    fontSize: 11,
    fontWeight: "600",
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
})
