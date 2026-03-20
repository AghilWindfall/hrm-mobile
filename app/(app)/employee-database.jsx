import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import Loader from "../../src/components/ui/Loader"
import useAuthStore from "../../src/features/auth/store/auth.store"
import useDepartments from "../../src/features/employee-database/hooks/useDepartments"
import useDesignations from "../../src/features/employee-database/hooks/useDesignations"
import useEmployeeDatabase from "../../src/features/employee-database/hooks/useEmployeeDatabase"
import { exportRowsAsExcel } from "../../src/utils/exportExcel"
import { resolveNumericUserId } from "../../src/utils/user"

const GENDER_OPTIONS = ["Both", "Male", "Female"]
const LOCATION_OPTIONS = ["Both", "WFO", "WFH"]
const CATEGORY_OPTIONS = ["All", "Permanent", "Contract", "Probation"]
const STATUS_OPTIONS = [
  { label: "All", value: "All" },
  { label: "Active", value: "Active" },
  { label: "Notice Period", value: "NoticePeriod" },
]

function getStatusStyle(status) {
  const s = String(status || "").toLowerCase()
  if (s === "active") {
    return { bg: "#D7F6DF", border: "#74BF86", text: "#1E5A2D" }
  }
  if (s.includes("notice")) {
    return { bg: "#FFF3C8", border: "#E1B847", text: "#6B4B07" }
  }
  return { bg: "#E8EDF4", border: "#9BAAC0", text: "#344A64" }
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  )
}

function EmployeeCard({ emp }) {
  const statusStyle = getStatusStyle(emp?.EmpStatus || emp?.Status)
  const statusLabel = emp?.EmpStatus || emp?.Status || "Active"

  return (
    <View style={styles.empCard}>
      <View style={styles.cardHeader}>
        <View style={styles.codePill}>
          <Text style={styles.codePillText}>{emp?.Emp_Code || "—"}</Text>
        </View>
        <Text style={styles.empName} numberOfLines={2}>
          {emp?.Emp_Name || "—"}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusStyle.bg,
              borderColor: statusStyle.border,
            },
          ]}
        >
          <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.designationText}>{emp?.Designation || "—"}</Text>

      <View style={styles.deptRow}>
        <View style={styles.deptTag}>
          <Ionicons name="business-outline" size={11} color="#334E68" />
          <Text style={styles.deptTagText}>{emp?.Department || "—"}</Text>
        </View>
        {emp?.FunctionalDepartment ? (
          <View style={styles.deptTagSecondary}>
            <Text style={styles.deptTagSecondaryText}>
              {emp?.FunctionalDepartment}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoCol}>
          <InfoRow label="Gender" value={emp?.Gender} />
          <InfoRow label="DOJ" value={emp?.DOJ} />
          <InfoRow label="Confirm Date" value={emp?.ConfirmationDate} />
        </View>
        <View style={styles.infoCol}>
          <InfoRow label="Location" value={emp?.Location} />
          <InfoRow label="Category" value={emp?.EmploymentCategory} />
          <InfoRow label="HOD" value={emp?.HOD} />
        </View>
      </View>

      {emp?.ReportingTo ? (
        <View style={styles.reportingRow}>
          <Ionicons name="arrow-redo-outline" size={12} color="#74849A" />
          <Text style={styles.reportingLabel}>Reports to </Text>
          <Text style={styles.reportingValue} numberOfLines={1}>
            {emp?.ReportingTo}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

export default function EmployeeDatabaseScreen() {
  const listRef = useRef(null)
  const shouldAutoScrollRef = useRef(false)
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)

  const deptQuery = useDepartments(userId)
  const desigQuery = useDesignations()
  const mutation = useEmployeeDatabase()

  // Filter state
  const [selectedDeptIds, setSelectedDeptIds] = useState([])
  const [selectedDesigIds, setSelectedDesigIds] = useState([])
  const [gender, setGender] = useState("Both")
  const [location, setLocation] = useState("Both")
  const [category, setCategory] = useState("All")
  const [empStatus, setEmpStatus] = useState("All")
  const [isDeptOpen, setIsDeptOpen] = useState(false)
  const [isDesigOpen, setIsDesigOpen] = useState(false)

  // Results state
  const [employees, setEmployees] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const [apiError, setApiError] = useState("")

  // Client-side search
  const [codeSearch, setCodeSearch] = useState("")
  const [nameSearch, setNameSearch] = useState("")

  const clearQuickSearch = () => {
    setCodeSearch("")
    setNameSearch("")
  }

  const clearFilters = () => {
    setSelectedDeptIds([])
    setSelectedDesigIds([])
    setGender("Both")
    setLocation("Both")
    setCategory("All")
    setEmpStatus("All")
    setCodeSearch("")
    setNameSearch("")
    setApiError("")
  }

  const toggleDept = (id) => {
    const numId = Number(id)
    setSelectedDeptIds((prev) =>
      prev.includes(numId) ? prev.filter((x) => x !== numId) : [...prev, numId],
    )
  }

  const toggleDesig = (id) => {
    const numId = Number(id)
    setSelectedDesigIds((prev) =>
      prev.includes(numId) ? prev.filter((x) => x !== numId) : [...prev, numId],
    )
  }

  const filteredEmployees = useMemo(() => {
    const codeTerm = codeSearch.trim().toLowerCase()
    const nameTerm = nameSearch.trim().toLowerCase()
    return employees.filter((emp) => {
      const code = String(emp?.Emp_Code || "").toLowerCase()
      const name = String(emp?.Emp_Name || "").toLowerCase()
      const codeMatch = codeTerm ? code.includes(codeTerm) : true
      const nameMatch = nameTerm ? name.includes(nameTerm) : true
      return codeMatch && nameMatch
    })
  }, [employees, codeSearch, nameSearch])

  const activeCount = useMemo(
    () =>
      filteredEmployees.filter((e) => {
        const s = String(e?.EmpStatus || e?.Status || "active").toLowerCase()
        return s === "active"
      }).length,
    [filteredEmployees],
  )

  useEffect(() => {
    if (mutation.isPending) {
      return
    }

    if (!shouldAutoScrollRef.current) {
      return
    }

    if (apiError || filteredEmployees.length === 0) {
      shouldAutoScrollRef.current = false
      return
    }

    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true })
      shouldAutoScrollRef.current = false
    }, 250)

    return () => clearTimeout(timer)
  }, [apiError, filteredEmployees.length, mutation.isPending])

  const handleShow = async () => {
    setApiError("")
    shouldAutoScrollRef.current = Boolean(
      codeSearch.trim() || nameSearch.trim(),
    )

    const selectedDepts = (deptQuery.data || []).filter((d) =>
      selectedDeptIds.includes(Number(d?.Dep_Id)),
    )
    const selectedDesigs = (desigQuery.data || []).filter((d) =>
      selectedDesigIds.includes(Number(d?.Des_Id)),
    )

    const payload = {
      Branch: [],
      Department: selectedDepts.map((d) => ({
        Dep_Id: Number(d?.Dep_Id),
        Dep_Name: d?.Dep_Name || "",
        checked: true,
      })),
      Designation: selectedDesigs.map((d) => ({
        Des_Id: Number(d?.Des_Id),
        Des_Name: d?.Des_Name || "",
        checked: true,
      })),
      UserId: userId,
      PageRowCount: 50,
      SelectGender: gender,
      SelectLocation: location,
      SelectEmployeeCategory: category,
      SelectEmploymentStatus: empStatus,
    }

    try {
      const data = await mutation.mutateAsync(payload)
      setEmployees(data)
      setHasSearched(true)
    } catch (error) {
      setEmployees([])
      setHasSearched(true)
      setApiError(
        error?.message || "Unable to load employee database. Please try again.",
      )
    }
  }

  const handleExport = async () => {
    if (!filteredEmployees.length) {
      Alert.alert("No data", "Run the report first to export employees.")
      return
    }

    const rows = filteredEmployees.map((emp) => ({
      "Sl No": emp?.SLNO || "",
      Code: emp?.Emp_Code || "",
      Name: emp?.Emp_Name || "",
      Designation: emp?.Designation || "",
      Department: emp?.Department || "",
      "Functional Dept": emp?.FunctionalDepartment || "",
      "Reporting To": emp?.ReportingTo || "",
      "HR Reporting To": emp?.HR_ReportingTo || "",
      DOJ: emp?.DOJ || "",
      "Confirm Date": emp?.ConfirmationDate || "",
      "Employment Category": emp?.EmploymentCategory || "",
      Gender: emp?.Gender || "",
      Location: emp?.Location || "",
      Status: emp?.EmpStatus || emp?.Status || "",
    }))

    try {
      await exportRowsAsExcel({
        rows,
        sheetName: "Employee Database",
        filePrefix: "Employee_Database",
        emptyMessage: "Run the report first to export employees.",
      })
    } catch (error) {
      Alert.alert("Export failed", error?.message || "Could not export file.")
    }
  }

  // --- Sub-components rendered inside FlatList header ---

  const ListHeader = (
    <View>
      <LinearGradient
        colors={["#123047", "#1F4E6F", "#2D6E8F"]}
        style={{ flex: 1 }}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="people-circle-outline" size={26} color="#EAF7FF" />
          </View>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Employee Database</Text>
            <Text style={styles.heroSubtitle}>
              Search employees with department, designation, gender, location,
              category, and status filters.
            </Text>
          </View>
        </View>

        <View style={styles.heroStatRow}>
          <View style={styles.heroStatChip}>
            <Text style={styles.heroStatValue}>
              {selectedDeptIds.length || "All"}
            </Text>
            <Text style={styles.heroStatLabel}>Departments</Text>
          </View>
          <View style={styles.heroStatChip}>
            <Text style={styles.heroStatValue}>
              {selectedDesigIds.length || "All"}
            </Text>
            <Text style={styles.heroStatLabel}>Designations</Text>
          </View>
          <View style={styles.heroStatChip}>
            <Text style={styles.heroStatValue}>
              {hasSearched ? filteredEmployees.length : 0}
            </Text>
            <Text style={styles.heroStatLabel}>Results</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filtersCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Quick Search</Text>
            <Text style={styles.sectionTitle}>Search by code or name</Text>
          </View>
          <Pressable
            onPress={clearQuickSearch}
            style={styles.clearInlineButton}
          >
            <Ionicons name="refresh-outline" size={14} color="#1E5B88" />
            <Text style={styles.clearInlineButtonText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>Search Code</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={14} color="#74849A" />
            <TextInput
              value={codeSearch}
              onChangeText={setCodeSearch}
              placeholder="WP004"
              placeholderTextColor="#8B9AAF"
              style={styles.searchInput}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>Search Name</Text>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={14} color="#74849A" />
            <TextInput
              value={nameSearch}
              onChangeText={setNameSearch}
              placeholder="Employee name"
              placeholderTextColor="#8B9AAF"
              style={styles.searchInput}
            />
          </View>
        </View>

        <Pressable
          onPress={handleShow}
          disabled={mutation.isPending}
          style={({ pressed }) => [
            styles.showBtn,
            pressed && styles.showBtnPressed,
            mutation.isPending && styles.showBtnDisabled,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.showBtnText}>
            {mutation.isPending ? "Loading..." : "Show"}
          </Text>
        </Pressable>
      </View>

      <View style={styles.filtersCard}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Filters</Text>
            <Text style={styles.sectionTitle}>Refine your employee search</Text>
          </View>
          <Pressable onPress={clearFilters} style={styles.clearInlineButton}>
            <Ionicons name="refresh-outline" size={14} color="#1E5B88" />
            <Text style={styles.clearInlineButtonText}>Reset</Text>
          </Pressable>
        </View>

        <View style={styles.filterBlock}>
          <Pressable
            onPress={() => setIsDeptOpen((p) => !p)}
            style={({ pressed }) => [
              styles.selectorHeader,
              pressed && styles.selectorPressed,
            ]}
          >
            <View style={styles.selectorTitleRow}>
              <Ionicons name="business-outline" size={15} color="#334E68" />
              <Text style={styles.selectorTitle}>Department</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {selectedDeptIds.length === 0
                  ? "All"
                  : `${selectedDeptIds.length} selected`}
              </Text>
            </View>
          </Pressable>

          {isDeptOpen ? (
            <View style={styles.chipWrap}>
              {deptQuery.isLoading ? (
                <Text style={styles.loadingChipText}>Loading...</Text>
              ) : null}
              {(deptQuery.data || []).map((dept) => {
                const id = Number(dept?.Dep_Id)
                const selected = selectedDeptIds.includes(id)
                return (
                  <Pressable
                    key={id}
                    onPress={() => toggleDept(id)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipActive,
                      pressed && styles.chipPressed,
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
                      {dept?.Dep_Name || "Department"}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.filterBlock}>
          <Pressable
            onPress={() => setIsDesigOpen((p) => !p)}
            style={({ pressed }) => [
              styles.selectorHeader,
              pressed && styles.selectorPressed,
            ]}
          >
            <View style={styles.selectorTitleRow}>
              <Ionicons name="briefcase-outline" size={15} color="#334E68" />
              <Text style={styles.selectorTitle}>Designation</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {selectedDesigIds.length === 0
                  ? "All"
                  : `${selectedDesigIds.length} selected`}
              </Text>
            </View>
          </Pressable>

          {isDesigOpen ? (
            <View style={styles.chipWrap}>
              {desigQuery.isLoading ? (
                <Text style={styles.loadingChipText}>Loading...</Text>
              ) : null}
              {(desigQuery.data || []).map((desig) => {
                const id = Number(desig?.Des_Id)
                const selected = selectedDesigIds.includes(id)
                return (
                  <Pressable
                    key={id}
                    onPress={() => toggleDesig(id)}
                    style={({ pressed }) => [
                      styles.chip,
                      selected && styles.chipActive,
                      pressed && styles.chipPressed,
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
                      {desig?.Des_Name || "Designation"}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>Gender</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inlineChips}
          >
            {GENDER_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setGender(opt)}
                style={({ pressed }) => [
                  styles.singleChip,
                  gender === opt && styles.singleChipActive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={
                    gender === opt
                      ? styles.singleChipTextActive
                      : styles.singleChipText
                  }
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>Location</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inlineChips}
          >
            {LOCATION_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setLocation(opt)}
                style={({ pressed }) => [
                  styles.singleChip,
                  location === opt && styles.singleChipActive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={
                    location === opt
                      ? styles.singleChipTextActive
                      : styles.singleChipText
                  }
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>Employee Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inlineChips}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setCategory(opt)}
                style={({ pressed }) => [
                  styles.singleChip,
                  category === opt && styles.singleChipActive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={
                    category === opt
                      ? styles.singleChipTextActive
                      : styles.singleChipText
                  }
                >
                  {opt}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterBlock}>
          <Text style={styles.filterLabel}>Employment Status</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inlineChips}
          >
            {STATUS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => setEmpStatus(opt.value)}
                style={({ pressed }) => [
                  styles.singleChip,
                  empStatus === opt.value && styles.singleChipActive,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text
                  style={
                    empStatus === opt.value
                      ? styles.singleChipTextActive
                      : styles.singleChipText
                  }
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Show button */}
        <Pressable
          onPress={handleShow}
          disabled={mutation.isPending}
          style={({ pressed }) => [
            styles.showBtn,
            pressed && styles.showBtnPressed,
            mutation.isPending && styles.showBtnDisabled,
          ]}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color="#FFFFFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.showBtnText}>
            {mutation.isPending ? "Loading..." : "Show"}
          </Text>
        </Pressable>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={filteredEmployees}
        keyExtractor={(item, index) =>
          String(item?.Emp_Id ?? item?.Emp_Code ?? index)
        }
        renderItem={({ item }) => <EmployeeCard emp={item} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={ListHeader}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />

      {mutation.isPending ? <Loader /> : null}

      {apiError ? (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={18} color="#C0392B" />
          <Text style={styles.errorText}>{apiError}</Text>
        </View>
      ) : null}

      {hasSearched && !mutation.isPending ? (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{filteredEmployees.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#1E5A2D" }]}>
              {activeCount}
            </Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: "#6B4B07" }]}>
              {filteredEmployees.length - activeCount}
            </Text>
            <Text style={styles.summaryLabel}>Others</Text>
          </View>
          <Pressable
            onPress={handleExport}
            disabled={!filteredEmployees.length}
            style={({ pressed }) => [
              styles.exportBtn,
              pressed && styles.exportBtnPressed,
              !filteredEmployees.length && styles.exportBtnDisabled,
            ]}
          >
            <Ionicons name="download-outline" size={15} color="#FFFFFF" />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </Pressable>
        </View>
      ) : null}

      {hasSearched &&
      !mutation.isPending &&
      !apiError &&
      filteredEmployees.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={40} color="#94A3B8" />
          <Text style={styles.emptyTitle}>No employees found</Text>
          <Text style={styles.emptyText}>
            Adjust filters and tap Show to search again.
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F4FA",
  },
  listContent: {
    paddingBottom: 32,
  },
  hero: {
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: "#F7FCFF",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    color: "#DDF0FB",
    fontSize: 13,
    lineHeight: 19,
  },
  heroStatRow: {
    flexDirection: "row",
    gap: 8,
  },
  heroStatChip: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2,
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  heroStatLabel: {
    color: "#D7EDF8",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  filtersCard: {
    margin: 12,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sectionEyebrow: {
    color: "#5F7A94",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sectionTitle: {
    color: "#16324B",
    fontSize: 18,
    fontWeight: "800",
  },
  clearInlineButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E7F3FB",
  },
  clearInlineButtonText: {
    color: "#1E5B88",
    fontSize: 12,
    fontWeight: "700",
  },
  filterBlock: {
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334E68",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#F5F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDE5F0",
  },
  selectorPressed: {
    opacity: 0.75,
  },
  selectorTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectorTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334E68",
  },
  badge: {
    backgroundColor: "#E0EAFF",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2A4B8C",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: "#F0F4FA",
    borderWidth: 1,
    borderColor: "#C5CDD8",
  },
  chipActive: {
    backgroundColor: "#1F4B7A",
    borderColor: "#1F4B7A",
  },
  chipPressed: {
    opacity: 0.7,
  },
  chipText: {
    fontSize: 12,
    color: "#4A5568",
  },
  chipTextActive: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  loadingChipText: {
    fontSize: 12,
    color: "#74849A",
    paddingVertical: 4,
  },

  inlineChips: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 2,
  },
  singleChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F0F4FA",
    borderWidth: 1,
    borderColor: "#C5CDD8",
  },
  singleChipActive: {
    backgroundColor: "#1F4B7A",
    borderColor: "#1F4B7A",
  },
  singleChipText: {
    fontSize: 13,
    color: "#4A5568",
  },
  singleChipTextActive: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F8FF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDE5F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#1F2F3B",
    padding: 0,
  },

  showBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1C5F8D",
    borderRadius: 14,
    paddingVertical: 13,
    marginTop: 6,
  },
  showBtnPressed: {
    backgroundColor: "#144869",
  },
  showBtnDisabled: {
    backgroundColor: "#8aaac9",
  },
  showBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  errorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    margin: 12,
    marginTop: 0,
    backgroundColor: "#FFF5F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F5C6C6",
    padding: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#C0392B",
    lineHeight: 18,
  },

  summaryBar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    gap: 4,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
    minWidth: 72,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2F3B",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#74849A",
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#DDE5F0",
  },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#1C5F8D",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: "auto",
    minWidth: 132,
  },
  exportBtnPressed: {
    backgroundColor: "#144869",
  },
  exportBtnDisabled: {
    backgroundColor: "#8aaac9",
  },
  exportBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    marginHorizontal: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334E68",
  },
  emptyText: {
    fontSize: 13,
    color: "#74849A",
    textAlign: "center",
    paddingHorizontal: 24,
    lineHeight: 18,
  },

  empCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  codePill: {
    backgroundColor: "#E0EAFF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  codePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F3C6E",
    letterSpacing: 0.4,
  },
  empName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2F3B",
    lineHeight: 19,
  },
  statusBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  designationText: {
    fontSize: 12,
    color: "#4A6FA5",
    fontWeight: "500",
    marginBottom: 6,
  },
  deptRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  deptTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EBF4FF",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deptTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F4B7A",
  },
  deptTagSecondary: {
    backgroundColor: "#F0F4FA",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  deptTagSecondaryText: {
    fontSize: 11,
    color: "#4A5568",
  },

  // Info grid
  infoGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  infoCol: {
    flex: 1,
    gap: 6,
  },
  infoRow: {
    flexDirection: "column",
    gap: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: "#74849A",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  infoValue: {
    fontSize: 12,
    color: "#1F2F3B",
    fontWeight: "500",
  },
  reportingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: "#EDF1F7",
    paddingTop: 8,
    marginTop: 4,
  },
  reportingLabel: {
    fontSize: 11,
    color: "#74849A",
  },
  reportingValue: {
    flex: 1,
    fontSize: 11,
    color: "#334E68",
    fontWeight: "600",
  },
})
