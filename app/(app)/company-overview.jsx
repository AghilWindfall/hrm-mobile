import { Ionicons } from "@expo/vector-icons"
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native"

import Loader from "../../src/components/ui/Loader"
import useAuthStore from "../../src/features/auth/store/auth.store"
import useCompanyOverview from "../../src/features/company/hooks/useCompanyOverview"
import { resolveNumericUserId } from "../../src/utils/user"

function MetricCard({ label, value, icon, accent }) {
  return (
    <View style={[styles.metricCard, { borderColor: accent }]}>
      <View style={[styles.metricIconWrap, { backgroundColor: `${accent}1A` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  )
}

function toDisplayNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? String(Math.trunc(numeric)) : "0"
}

export default function CompanyOverviewScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const overviewQuery = useCompanyOverview(userId)

  const overview = (overviewQuery.data || [])[0] || null

  if (!userId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>
          Unable to resolve user ID from session.
        </Text>
      </View>
    )
  }

  if (overviewQuery.isLoading) {
    return <Loader />
  }

  if (overviewQuery.isError) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorText}>Unable to load company overview.</Text>
        <Pressable
          style={({ pressed }) => [
            styles.retryButton,
            pressed ? styles.pressed : null,
          ]}
          onPress={() => overviewQuery.refetch()}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  if (!overview) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.emptyText}>No company overview data found.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>
          {overview.CompanyName || "Company Overview"}
        </Text>
        <Text style={styles.headerMeta}>
          Last Log: {overview.LastLog || "-"}
        </Text>
      </View>

      <View style={styles.grid}>
        <MetricCard
          label="Employees"
          value={toDisplayNumber(overview.EmployeeCount)}
          icon="people"
          accent="#1E6EA1"
        />
        <MetricCard
          label="On Notice"
          value={toDisplayNumber(overview.NoticePeriodCount)}
          icon="alert-circle"
          accent="#B54708"
        />
        <MetricCard
          label="Work From Office"
          value={toDisplayNumber(overview.WorkFromOfficeCount)}
          icon="business"
          accent="#0E9F6E"
        />
        <MetricCard
          label="Work From Home"
          value={toDisplayNumber(overview.WorkFromHomeCount)}
          icon="home"
          accent="#7E3AF2"
        />
      </View>

      <Text style={styles.sectionTitle}>Leave Snapshot</Text>
      <View style={styles.grid}>
        <MetricCard
          label="Today's Leave"
          value={toDisplayNumber(overview.TodaysLeaveCount)}
          icon="calendar"
          accent="#C2410C"
        />
        <MetricCard
          label="Today's Pending"
          value={toDisplayNumber(overview.TodayspendingLeaveCount)}
          icon="time"
          accent="#A16207"
        />
        <MetricCard
          label="Total Pending Leave"
          value={toDisplayNumber(overview.TotalLeavePendingCount)}
          icon="hourglass"
          accent="#B91C1C"
        />
      </View>

      <Text style={styles.sectionTitle}>Attendance Logs</Text>
      <View style={styles.grid}>
        <MetricCard
          label="Today Logs"
          value={toDisplayNumber(overview.TodaysAttendanceLogCount)}
          icon="today"
          accent="#155E75"
        />
        <MetricCard
          label="Previous Day Logs"
          value={toDisplayNumber(overview.PreviousDayAttendanceLogCount)}
          icon="calendar-number"
          accent="#1D4ED8"
        />
      </View>

      <Text style={styles.sectionTitle}>Shift Status</Text>
      <View style={styles.grid}>
        <MetricCard
          label="Today's Assigned"
          value={toDisplayNumber(overview.TodaysAssignedShiftCount)}
          icon="git-branch"
          accent="#0F766E"
        />
        <MetricCard
          label="Today's Approved"
          value={toDisplayNumber(overview.TodaysApprovedShiftCount)}
          icon="checkmark-done"
          accent="#15803D"
        />
        <MetricCard
          label="Prev Assigned"
          value={toDisplayNumber(overview.PreviousDayAssignedShiftCount)}
          icon="git-branch-outline"
          accent="#0369A1"
        />
        <MetricCard
          label="Prev Approved"
          value={toDisplayNumber(overview.PreviousDayApprovedShiftCount)}
          icon="checkmark-done-outline"
          accent="#0D9488"
        />
      </View>

      <Text style={styles.sectionTitle}>Workforce Mix</Text>
      <View style={styles.grid}>
        <MetricCard
          label="Male"
          value={toDisplayNumber(overview.MalesCount)}
          icon="male"
          accent="#1D4ED8"
        />
        <MetricCard
          label="Female"
          value={toDisplayNumber(overview.FemalesCount)}
          icon="female"
          accent="#BE185D"
        />
        <MetricCard
          label="Permanent"
          value={toDisplayNumber(overview.PermanentCount)}
          icon="briefcase"
          accent="#166534"
        />
        <MetricCard
          label="Contract"
          value={toDisplayNumber(overview.ContractCount)}
          icon="document-text"
          accent="#92400E"
        />
        <MetricCard
          label="Probation"
          value={toDisplayNumber(overview.ProbationCount)}
          icon="timer"
          accent="#4338CA"
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EEF3F8",
  },
  content: {
    padding: 14,
    gap: 10,
    paddingBottom: 28,
  },
  headerCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C8D5E2",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },
  headerTitle: {
    color: "#1F3347",
    fontSize: 18,
    fontWeight: "800",
  },
  headerMeta: {
    marginTop: 4,
    color: "#526980",
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    marginTop: 4,
    color: "#27425C",
    fontSize: 14,
    fontWeight: "800",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricCard: {
    width: "48.5%",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 4,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  metricLabel: {
    color: "#546A80",
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    color: "#1D354E",
    fontSize: 20,
    fontWeight: "800",
  },
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF3F8",
    paddingHorizontal: 20,
    gap: 10,
  },
  errorText: {
    color: "#A2202D",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyText: {
    color: "#41586E",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
  retryButton: {
    borderRadius: 10,
    backgroundColor: "#1A4E86",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
})
