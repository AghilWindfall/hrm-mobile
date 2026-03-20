import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import useAuthStore from "../../src/features/auth/store/auth.store"
import useQuickSearch from "../../src/features/search/hooks/useQuickSearch"
import { resolveNumericUserId } from "../../src/utils/user"

// ─── helpers ────────────────────────────────────────────────────────────────

function present(value) {
  if (value === null || value === undefined) return false
  if (typeof value === "string" && value.trim() === "") return false
  return true
}

function getInitials(name) {
  if (!name) return "?"
  const parts = name.trim().split(" ").filter(Boolean)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ─── sub-components ──────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, iconColor = "#7A8FA0" }) {
  if (!present(value)) return null
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={icon}
        size={14}
        color={iconColor}
        style={styles.infoIcon}
      />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{String(value).trim()}</Text>
      </View>
    </View>
  )
}

function SectionDivider({ label }) {
  return (
    <View style={styles.sectionDivider}>
      <Text style={styles.sectionDividerText}>{label}</Text>
    </View>
  )
}

function EmployeeCard({ emp }) {
  const hasPhoto = present(emp?.Emp_Img)
  const photoUri = hasPhoto ? `data:image/jpeg;base64,${emp.Emp_Img}` : null

  return (
    <View style={styles.card}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#1F2F3B", "#2C4A5C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardHeader}
      >
        <View style={styles.avatarWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.avatar} />
          ) : (
            <LinearGradient
              colors={["#F5A300", "#D77A00"]}
              style={styles.avatarFallback}
            >
              <Text style={styles.avatarInitials}>
                {getInitials(emp?.Emp_Name)}
              </Text>
            </LinearGradient>
          )}
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.empName} numberOfLines={2}>
            {emp?.Emp_Name || "—"}
          </Text>
          <Text style={styles.designation} numberOfLines={1}>
            {emp?.Des_Name || "—"}
          </Text>
          <View style={styles.badgeRow}>
            {present(emp?.Emp_Code) && (
              <View style={styles.codeBadge}>
                <Ionicons name="card-outline" size={11} color="#F5A300" />
                <Text style={styles.codeBadgeText}>{emp.Emp_Code}</Text>
              </View>
            )}
            {present(emp?.EmploymentCategory) && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>
                  {emp.EmploymentCategory}
                </Text>
              </View>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* ── Body ─────────────────────────────────────────────────────── */}
      <View style={styles.cardBody}>
        {/* Organisation */}
        <SectionDivider label="Organisation" />
        <InfoRow
          icon="business-outline"
          label="Branch"
          value={emp?.Branch_Name}
          iconColor="#4A90C4"
        />
        <InfoRow
          icon="albums-outline"
          label="Department"
          value={emp?.Dep_Name}
          iconColor="#4A90C4"
        />
        <InfoRow
          icon="layers-outline"
          label="Sub-Department"
          value={emp?.SubDep_Name}
          iconColor="#4A90C4"
        />

        {/* Contact */}
        {(present(emp?.MobileOffice) ||
          present(emp?.MobilePersonal) ||
          present(emp?.EmailOffice) ||
          present(emp?.EmailPersonal)) && (
          <>
            <SectionDivider label="Contact" />
            <InfoRow
              icon="phone-portrait-outline"
              label="Mobile (Office)"
              value={emp?.MobileOffice}
              iconColor="#3DA86E"
            />
            <InfoRow
              icon="call-outline"
              label="Mobile (Personal)"
              value={emp?.MobilePersonal}
              iconColor="#3DA86E"
            />
            <InfoRow
              icon="mail-outline"
              label="Email (Office)"
              value={emp?.EmailOffice}
              iconColor="#3DA86E"
            />
            <InfoRow
              icon="mail-open-outline"
              label="Email (Personal)"
              value={emp?.EmailPersonal}
              iconColor="#3DA86E"
            />
          </>
        )}

        {/* Personal */}
        {(present(emp?.DOB) ||
          present(emp?.DOJ) ||
          present(emp?.BloodGroup) ||
          present(emp?.Aadhar_No)) && (
          <>
            <SectionDivider label="Personal" />
            <InfoRow
              icon="calendar-outline"
              label="Date of Birth"
              value={emp?.DOB}
              iconColor="#9B6DCA"
            />
            <InfoRow
              icon="briefcase-outline"
              label="Date of Joining"
              value={emp?.DOJ}
              iconColor="#9B6DCA"
            />
            <InfoRow
              icon="water-outline"
              label="Blood Group"
              value={emp?.BloodGroup}
              iconColor="#E05555"
            />
            <InfoRow
              icon="finger-print-outline"
              label="Aadhaar No."
              value={emp?.Aadhar_No}
              iconColor="#9B6DCA"
            />
          </>
        )}

        {/* Statutory */}
        {(present(emp?.EPFNo) ||
          present(emp?.ESINo) ||
          present(emp?.UANNo) ||
          present(emp?.PANNo)) && (
          <>
            <SectionDivider label="Statutory" />
            <InfoRow
              icon="shield-checkmark-outline"
              label="EPF No."
              value={emp?.EPFNo}
              iconColor="#E07B2A"
            />
            <InfoRow
              icon="shield-outline"
              label="ESI No."
              value={emp?.ESINo}
              iconColor="#E07B2A"
            />
            <InfoRow
              icon="id-card-outline"
              label="UAN No."
              value={emp?.UANNo}
              iconColor="#E07B2A"
            />
            <InfoRow
              icon="document-text-outline"
              label="PAN No."
              value={emp?.PANNo}
              iconColor="#E07B2A"
            />
          </>
        )}

        {/* Address */}
        {(present(emp?.PresentAddress) || present(emp?.PermanentAddress)) && (
          <>
            <SectionDivider label="Address" />
            <InfoRow
              icon="location-outline"
              label="Present Address"
              value={emp?.PresentAddress}
              iconColor="#E05555"
            />
            <InfoRow
              icon="home-outline"
              label="Permanent Address"
              value={emp?.PermanentAddress}
              iconColor="#E05555"
            />
          </>
        )}
      </View>
    </View>
  )
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function QuickSearchScreen() {
  const user = useAuthStore((state) => state.user)
  const employeeId = resolveNumericUserId(user)

  const [query, setQuery] = useState("")
  const { results, isLoading, error, hasSearched, search, clear } =
    useQuickSearch()
  const debounceRef = useRef(null)

  const handleChangeText = (text) => {
    setQuery(text)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!text.trim()) {
      clear()
      return
    }

    debounceRef.current = setTimeout(() => {
      search(text, employeeId)
    }, 400)
  }

  const handleClear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    setQuery("")
    clear()
  }

  // ── render helpers ──────────────────────────────────────────────────────

  const renderEmpty = () => {
    if (isLoading) return null

    if (!hasSearched) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="search-outline" size={56} color="#C8D6E2" />
          <Text style={styles.emptyTitle}>Search Employees</Text>
          <Text style={styles.emptySub}>
            Type a name or employee ID above to find people.
          </Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="warning-outline" size={48} color="#E05555" />
          <Text style={styles.errorTitle}>Search Failed</Text>
          <Text style={styles.emptySub}>{error}</Text>
        </View>
      )
    }

    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="person-remove-outline" size={48} color="#C8D6E2" />
        <Text style={styles.emptyTitle}>No Results</Text>
        <Text style={styles.emptySub}>No employees found for "{query}".</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      {/* ── Search Bar ─────────────────────────────────────────────── */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#7A8FA0"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name"
            placeholderTextColor="#9BAAC0"
            value={query}
            onChangeText={handleChangeText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (debounceRef.current) clearTimeout(debounceRef.current)
              search(query, employeeId)
            }}
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color="#9BAAC0" />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Results ────────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#F5A300" />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) =>
            String(item?.Emp_Id ?? item?.Emp_Code ?? index)
          }
          renderItem={({ item }) => <EmployeeCard emp={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  )
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F0F4F8",
  },

  // ── search bar ──
  searchBarWrap: {
    backgroundColor: "#1F2F3B",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1A2A38",
    paddingVertical: 0,
  },

  // ── states ──
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#74849A",
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#344A64",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: "#74849A",
    textAlign: "center",
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#E05555",
    textAlign: "center",
  },

  // ── list ──
  listContent: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
  },

  // ── card ──
  card: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 3,
    shadowColor: "#1F2F3B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 14,
  },
  avatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#F5A300",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  empName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#F4F8FF",
    lineHeight: 20,
  },
  designation: {
    fontSize: 12,
    color: "#B8C8D8",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  codeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,163,0,0.15)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: "rgba(245,163,0,0.4)",
  },
  codeBadgeText: {
    fontSize: 11,
    color: "#F5A300",
    fontWeight: "600",
  },
  categoryBadge: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  categoryBadgeText: {
    fontSize: 11,
    color: "#C8D6E2",
  },

  // ── card body ──
  cardBody: {
    padding: 16,
    gap: 4,
  },
  sectionDivider: {
    marginTop: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF4",
    paddingBottom: 4,
  },
  sectionDividerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9BAAC0",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // ── info row ──
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 4,
    gap: 10,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: "#9BAAC0",
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 13,
    color: "#1A2A38",
    fontWeight: "500",
  },
})
