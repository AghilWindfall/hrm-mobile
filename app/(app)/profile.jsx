import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

import useAuthStore from "../../src/features/auth/store/auth.store"
import useProfile from "../../src/features/profile/hooks/useProfile"

// ─── helpers ────────────────────────────────────────────────────────────────

function resolveEmployeeId(user) {
  const id =
    user?.Emp_Id ||
    user?.EmployeeId ||
    user?.UserId ||
    user?.User_Id ||
    user?.id
  const num = Number(id)
  return Number.isFinite(num) ? num : null
}

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

function buildAddress(parts) {
  return parts.filter(present).join(", ")
}

// ─── presentational atoms ───────────────────────────────────────────────────

function SectionHeader({ icon, label, color }) {
  return (
    <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
      <View style={[styles.sectionIconWrap, { backgroundColor: color + "1A" }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.sectionLabel, { color }]}>{label}</Text>
    </View>
  )
}

function InfoRow({ icon, label, value, iconColor }) {
  if (!present(value)) return null
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={15} color={iconColor || "#7A8FA0"} />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{String(value).trim()}</Text>
      </View>
    </View>
  )
}

function AddressBlock({ title, icon, parts, sectionColor }) {
  const address = buildAddress(parts)
  if (!address) return null
  return (
    <InfoRow
      icon={icon}
      label={title}
      value={address}
      iconColor={sectionColor}
    />
  )
}

// ─── section card ────────────────────────────────────────────────────────────

function ProfileSection({ icon, label, color, children }) {
  const hasContent = Array.isArray(children)
    ? children.some(Boolean)
    : Boolean(children)
  if (!hasContent) return null
  return (
    <View style={styles.card}>
      <SectionHeader icon={icon} label={label} color={color} />
      <View style={styles.cardBody}>{children}</View>
    </View>
  )
}

// ─── screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user)
  const employeeId = resolveEmployeeId(user)
  const profileQuery = useProfile(employeeId)

  if (profileQuery.isPending) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <ActivityIndicator size="large" color="#F5A300" />
        <Text style={styles.loadingText}>Loading Profile…</Text>
      </SafeAreaView>
    )
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="person-remove-outline" size={48} color="#E05555" />
        </View>
        <Text style={styles.errorTitle}>Profile Unavailable</Text>
        <Text style={styles.errorSub}>
          {profileQuery.error?.message || "Could not load your profile."}
        </Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => profileQuery.refetch()}
        >
          <Ionicons name="refresh" size={16} color="#fff" />
          <Text style={styles.retryBtnText}>Retry</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const d = profileQuery.data

  const currentAddress = buildAddress([
    d.Add1,
    d.Add2,
    d.Add3,
    d.City,
    d.State,
    d.PoBox,
  ])
  const permanentAddress = buildAddress([
    d.PAdd1,
    d.PAdd2,
    d.PAdd3,
    d.PCity,
    d.PState,
    d.PPoBox,
  ])

  return (
    <SafeAreaView style={styles.root} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ─────────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#1F2F3B", "#2C4A5C", "#3A6070"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Avatar */}
          <View style={styles.avatarRing}>
            <LinearGradient
              colors={["#F5A300", "#D77A00"]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitials(d.Emp_Name)}</Text>
            </LinearGradient>
          </View>

          <Text style={styles.heroName}>{d.Emp_Name || "—"}</Text>

          {present(d.Des_Name) && (
            <Text style={styles.heroDesignation}>{d.Des_Name}</Text>
          )}

          <View style={styles.heroBadgeRow}>
            {present(d.Emp_Code) && (
              <View style={styles.heroBadge}>
                <Ionicons name="card-outline" size={12} color="#F5A300" />
                <Text style={styles.heroBadgeText}>{d.Emp_Code}</Text>
              </View>
            )}
            {present(d.Category) && (
              <View style={[styles.heroBadge, styles.heroBadgeSecondary]}>
                <Text style={styles.heroBadgeTextSecondary}>{d.Category}</Text>
              </View>
            )}
          </View>
        </LinearGradient>

        <View style={styles.sections}>
          {/* ── Employment ─────────────────────────────────────────────── */}
          <ProfileSection icon="briefcase" label="Employment" color="#2980B9">
            <InfoRow
              icon="business-outline"
              label="Company"
              value={d.Comp_Name}
              iconColor="#2980B9"
            />
            <InfoRow
              icon="location-outline"
              label="Branch"
              value={d.Branch_Name}
              iconColor="#2980B9"
            />
            <InfoRow
              icon="git-branch-outline"
              label="Department"
              value={d.Dep_Name}
              iconColor="#2980B9"
            />
            <InfoRow
              icon="git-merge-outline"
              label="Sub-Department"
              value={d.SubDep_Name}
              iconColor="#2980B9"
            />
            <InfoRow
              icon="ribbon-outline"
              label="Designation"
              value={d.Des_Name}
              iconColor="#2980B9"
            />
            <InfoRow
              icon="layers-outline"
              label="Grade"
              value={d.GradeName}
              iconColor="#2980B9"
            />
            <InfoRow
              icon="calendar-outline"
              label="Date of Joining"
              value={d.DOJ}
              iconColor="#2980B9"
            />
          </ProfileSection>

          {/* ── Personal ───────────────────────────────────────────────── */}
          <ProfileSection
            icon="person-outline"
            label="Personal Information"
            color="#8E44AD"
          >
            <InfoRow
              icon="calendar-number-outline"
              label="Date of Birth"
              value={d.DOB}
              iconColor="#8E44AD"
            />
            <InfoRow
              icon="body-outline"
              label="Gender"
              value={d.Gender}
              iconColor="#8E44AD"
            />
            <InfoRow
              icon="flag-outline"
              label="Nationality"
              value={d.Nation}
              iconColor="#8E44AD"
            />
            <InfoRow
              icon="people-outline"
              label="Father / Husband Name"
              value={d.FH_Name}
              iconColor="#8E44AD"
            />
            <InfoRow
              icon="school-outline"
              label="Qualification"
              value={d.Qualification}
              iconColor="#8E44AD"
            />
            <InfoRow
              icon="time-outline"
              label="Experience"
              value={d.Experience}
              iconColor="#8E44AD"
            />
          </ProfileSection>

          {/* ── Contact ────────────────────────────────────────────────── */}
          <ProfileSection
            icon="call-outline"
            label="Contact Details"
            color="#27AE60"
          >
            <InfoRow
              icon="phone-portrait-outline"
              label="Mobile"
              value={d.Mobile}
              iconColor="#27AE60"
            />
            <InfoRow
              icon="call-outline"
              label="Office Phone"
              value={d.PhoneOff}
              iconColor="#27AE60"
            />
            <InfoRow
              icon="home-outline"
              label="Residence Phone"
              value={d.PhoneRes}
              iconColor="#27AE60"
            />
            <InfoRow
              icon="mail-outline"
              label="Official Email"
              value={d.EmailOfficial}
              iconColor="#27AE60"
            />
            <InfoRow
              icon="mail-open-outline"
              label="Personal Email"
              value={d.EmailPersonal}
              iconColor="#27AE60"
            />
          </ProfileSection>

          {/* ── Address ────────────────────────────────────────────────── */}
          {(present(currentAddress) || present(permanentAddress)) && (
            <View style={styles.card}>
              <SectionHeader
                icon="map-outline"
                label="Address"
                color="#E67E22"
              />
              <View style={styles.cardBody}>
                {present(currentAddress) && (
                  <AddressBlock
                    icon="navigate-outline"
                    title="Current Address"
                    parts={[d.Add1, d.Add2, d.Add3, d.City, d.State, d.PoBox]}
                    sectionColor="#E67E22"
                  />
                )}
                {present(permanentAddress) && (
                  <AddressBlock
                    icon="home-outline"
                    title="Permanent Address"
                    parts={[
                      d.PAdd1,
                      d.PAdd2,
                      d.PAdd3,
                      d.PCity,
                      d.PState,
                      d.PPoBox,
                    ]}
                    sectionColor="#E67E22"
                  />
                )}
              </View>
            </View>
          )}

          {/* ── Bank ───────────────────────────────────────────────────── */}
          <ProfileSection
            icon="card-outline"
            label="Bank Details"
            color="#16A085"
          >
            <InfoRow
              icon="business-outline"
              label="Bank Name"
              value={d.Bank_Name}
              iconColor="#16A085"
            />
            <InfoRow
              icon="barcode-outline"
              label="Bank Code"
              value={d.Bank_Code}
              iconColor="#16A085"
            />
            <InfoRow
              icon="wallet-outline"
              label="Account Number"
              value={d.Bank_Account_No}
              iconColor="#16A085"
            />
          </ProfileSection>

          {/* ── Identity ───────────────────────────────────────────────── */}
          <ProfileSection
            icon="finger-print-outline"
            label="Identity Documents"
            color="#C0392B"
          >
            <InfoRow
              icon="id-card-outline"
              label="Aadhaar Number"
              value={d.Aadhar_No}
              iconColor="#C0392B"
            />
            <InfoRow
              icon="document-outline"
              label="Voter ID"
              value={d.Election_Id}
              iconColor="#C0392B"
            />
            <InfoRow
              icon="car-outline"
              label="Driving Licence"
              value={d.Driving_Licence}
              iconColor="#C0392B"
            />
            <InfoRow
              icon="airplane-outline"
              label="Passport Number"
              value={d.Passport_No}
              iconColor="#C0392B"
            />
            <InfoRow
              icon="receipt-outline"
              label="PAN Number"
              value={d.Pan_No}
              iconColor="#C0392B"
            />
            <InfoRow
              icon="shield-checkmark-outline"
              label="PF Number"
              value={d.PF_No}
              iconColor="#C0392B"
            />
            <InfoRow
              icon="shield-outline"
              label="ESI Number"
              value={d.ESI_No}
              iconColor="#C0392B"
            />
            {d.ESI_Active === "Y" && (
              <InfoRow
                icon="checkmark-circle-outline"
                label="ESI Status"
                value="Active"
                iconColor="#27AE60"
              />
            )}
          </ProfileSection>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F0F4F8" },

  scroll: { paddingBottom: 40 },

  // ── center states
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F0F4F8",
    gap: 10,
    padding: 32,
  },
  loadingText: { fontSize: 15, color: "#3A4F5C", fontWeight: "500" },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FEF0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  errorTitle: { fontSize: 18, fontWeight: "700", color: "#1F2F3B" },
  errorSub: { fontSize: 13, color: "#7A8FA0", textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1F2F3B",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 8,
  },
  retryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  // ── hero
  hero: {
    alignItems: "center",
    paddingTop: 36,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "#F5A300",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },
  heroDesignation: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontStyle: "italic",
    marginBottom: 14,
    textAlign: "center",
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245,163,0,0.18)",
    borderWidth: 1,
    borderColor: "#F5A300",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  heroBadgeText: { fontSize: 12, fontWeight: "700", color: "#F5A300" },
  heroBadgeSecondary: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroBadgeTextSecondary: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },

  // ── sections wrapper
  sections: { paddingHorizontal: 16, paddingTop: 20, gap: 16 },

  // ── card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardBody: { paddingHorizontal: 16, paddingBottom: 12 },

  // ── section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 4,
    backgroundColor: "#FAFBFC",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
    marginBottom: 4,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ── info row
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F8",
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    marginTop: 1,
  },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    color: "#9AACBA",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#1C2B36",
    fontWeight: "500",
    lineHeight: 20,
  },
})
