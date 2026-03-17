import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { Animated } from "react-native"
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native"

import useAuthStore from "../../src/features/auth/store/auth.store"
import useDashboardEvents from "../../src/features/dashboard/hooks/useDashboardEvents"
import { resolveNumericUserId } from "../../src/utils/user"

function cleanEventText(value) {
  if (!value || typeof value !== "string") {
    return ""
  }

  return value.replace(/\s+/g, " ").trim()
}

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const eventsQuery = useDashboardEvents(userId)

  const { width } = useWindowDimensions()
  const columns = width >= 700 ? 3 : 2
  const marqueeAnim = useRef(new Animated.Value(0)).current
  const [tickerWidth, setTickerWidth] = useState(0)
  const [textWidth, setTextWidth] = useState(0)

  const baseModules = useMemo(
    () => [
      { key: "profile", label: "Profile", icon: "person" },
      { key: "team", label: "Our Team", icon: "people" },
      { key: "policy", label: "General Policy", icon: "briefcase" },
      { key: "password", label: "Change Password", icon: "lock-closed" },
      { key: "calendar", label: "Calendar", icon: "calendar" },
      {
        key: "attendance",
        label: "Self Attendance Report",
        icon: "stats-chart",
      },
      { key: "punch", label: "Punch Log Report", icon: "apps" },
      { key: "leave", label: "Leave Request", icon: "arrow-up-circle" },
      { key: "shift", label: "Employee Shift Status", icon: "time" },
    ],
    [],
  )

  const conditionalModules = useMemo(
    () => [
      {
        key: "user-roles",
        label: "User Roles",
        icon: "shield-checkmark",
        permission: "UserRoleAssign",
      },
      {
        key: "live-punch-request",
        label: "Live Punch Request",
        icon: "log-in",
        permission: "ManualPunch",
      },
      {
        key: "leave-approval",
        label: "Leave Approval",
        icon: "checkmark-done-circle",
        permission: "LeaveApproval",
      },
      {
        key: "alerts",
        label: "Alerts",
        icon: "notifications",
        permission: "HrPolicy",
      },
      {
        key: "attendance-report",
        label: "Attendance Report",
        icon: "document-text",
        permission: "HrPolicy",
      },
      {
        key: "company-overview",
        label: "Company Overview",
        icon: "business",
        permission: "HrPolicy",
      },
      {
        key: "employee-database",
        label: "Employee Database",
        icon: "folder-open",
        permission: "HrPolicy",
      },
      {
        key: "muster-roll",
        label: "Muster Roll",
        icon: "list",
        permission: "HrPolicy",
      },
      {
        key: "time-office-report",
        label: "Time Office Report",
        icon: "time",
        permission: "HrPolicy",
      },
      {
        key: "hod-report",
        label: "HOD Report",
        icon: "podium",
        permission: "HrPolicy",
      },
      {
        key: "quick-search",
        label: "Quick Search",
        icon: "search",
        permission: "HrPolicy",
      },
    ],
    [],
  )

  const modules = useMemo(() => {
    if (!user) {
      return baseModules
    }

    const hrOverrideKeys = new Set([
      "user-roles",
      "live-punch-request",
      "leave-approval",
      "alerts",
      "attendance-report",
      "company-overview",
      "employee-database",
      "muster-roll",
      "time-office-report",
      "hod-report",
      "quick-search",
    ])

    const leaveApprovalGroupKeys = new Set([
      "leave-approval",
      "alerts",
      "attendance-report",
    ])

    const moduleMap = new Map(baseModules.map((module) => [module.key, module]))

    // HR policy overrides inconsistent payload flags and enables full HR view.
    if (user.HrPolicy === true) {
      conditionalModules
        .filter((module) => hrOverrideKeys.has(module.key))
        .forEach((module) => {
          moduleMap.set(module.key, module)
        })

      return Array.from(moduleMap.values())
    }

    if (user.LeaveApproval === true) {
      conditionalModules
        .filter((module) => leaveApprovalGroupKeys.has(module.key))
        .forEach((module) => {
          moduleMap.set(module.key, module)
        })
    }

    if (user.ManualPunch === true) {
      const livePunchModule = conditionalModules.find(
        (module) => module.key === "live-punch-request",
      )

      if (livePunchModule) {
        moduleMap.set(livePunchModule.key, livePunchModule)
      }
    }

    if (user.UserRoleAssign === true) {
      const userRolesModule = conditionalModules.find(
        (module) => module.key === "user-roles",
      )

      if (userRolesModule) {
        moduleMap.set(userRolesModule.key, userRolesModule)
      }
    }

    return Array.from(moduleMap.values())
  }, [user, baseModules, conditionalModules])

  const eventText = useMemo(() => {
    const firstEvent = (eventsQuery.data || [])[0]?.event
    return cleanEventText(firstEvent)
  }, [eventsQuery.data])

  useEffect(() => {
    if (!eventText || !tickerWidth || !textWidth) {
      return
    }

    const travelDistance = tickerWidth + textWidth
    const duration = Math.max(9000, Math.floor((travelDistance / 60) * 1000))

    marqueeAnim.setValue(tickerWidth)
    const loopAnimation = Animated.loop(
      Animated.timing(marqueeAnim, {
        toValue: -textWidth,
        duration,
        useNativeDriver: true,
      }),
    )

    loopAnimation.start()

    return () => {
      loopAnimation.stop()
    }
  }, [eventText, tickerWidth, textWidth, marqueeAnim])

  const handleModulePress = (moduleKey) => {
    const routeMap = {
      attendance: "/self-attendance",
      "attendance-report": "/attendance-report",
      team: "/our-team",
      leave: "/leave-request",
      "leave-approval": "/leave-approval",
      punch: "/punch-log",
      "live-punch-request": "/live-punch-request",
      policy: "/hr-policy",
      profile: "/profile",
      calendar: "/calendar",
      shift: "/shift-status",
      password: "/change-password",
    }

    if (routeMap[moduleKey]) {
      router.push(routeMap[moduleKey])
      return
    }

    Alert.alert(
      "Module not available",
      "This module is not added in mobile yet.",
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#D77A00", "#F5A300", "#F6B53E"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroSub}>HRM Dashboard</Text>
        <Text style={styles.heroTitle}>Windfall Productions</Text>
      </LinearGradient>

      {eventText ? (
        <View
          style={styles.tickerWrap}
          onLayout={(event) => setTickerWidth(event.nativeEvent.layout.width)}
        >
          <View style={styles.tickerBadge}>
            <Ionicons name="sparkles-outline" size={14} color="#1E4D7A" />
            <Text style={styles.tickerBadgeText}>Event</Text>
          </View>
          <View style={styles.tickerTrack}>
            <Animated.Text
              numberOfLines={1}
              onLayout={(event) => setTextWidth(event.nativeEvent.layout.width)}
              style={[
                styles.tickerText,
                {
                  transform: [{ translateX: marqueeAnim }],
                },
              ]}
            >
              {eventText}
            </Animated.Text>
          </View>
        </View>
      ) : null}

      <FlatList
        data={modules}
        key={columns}
        numColumns={columns}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
            <Pressable
              onPress={() => handleModulePress(item.key)}
              style={({ pressed }) => [
                styles.card,
                pressed ? styles.cardPressed : null,
              ]}
            >
              <View style={styles.iconBubble}>
                <Ionicons name={item.icon} size={26} color="#39414E" />
              </View>
              <Text style={styles.cardText}>{item.label}</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E9EAEC",
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  heroSub: {
    color: "#3E2B0D",
    fontSize: 13,
    fontWeight: "600",
  },
  heroTitle: {
    marginTop: 4,
    color: "#1E1F21",
    fontSize: 24,
    fontWeight: "800",
  },
  tickerWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D3DEE8",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  tickerBadge: {
    borderBottomWidth: 1,
    borderBottomColor: "#E3EAF2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FD",
  },
  tickerBadgeText: {
    color: "#1E4D7A",
    fontSize: 12,
    fontWeight: "800",
  },
  tickerTrack: {
    height: 36,
    justifyContent: "center",
  },
  tickerText: {
    color: "#2B3F56",
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 10,
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  row: {
    gap: 10,
    marginBottom: 10,
  },
  cardWrap: {
    flex: 1,
  },
  card: {
    minHeight: 140,
    backgroundColor: "#F7F7F8",
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 14,
    gap: 10,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  iconBubble: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECEDEF",
  },
  cardText: {
    textAlign: "center",
    color: "#2F3540",
    fontSize: 15,
    fontWeight: "600",
  },
})
