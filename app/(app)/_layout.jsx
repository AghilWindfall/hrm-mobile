import { Redirect, Stack, router } from "expo-router"

import AppHeaderBar from "../../src/components/layout/AppHeaderBar"
import useAuthStore from "../../src/features/auth/store/auth.store"

export default function AppLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const clearAuthSession = useAuthStore((state) => state.clearAuthSession)
  const user = useAuthStore((state) => state.user)

  if (!isAuthenticated) {
    return <Redirect href="/login" />
  }

  const currentUserName =
    user?.Employee_Name ||
    user?.UserName ||
    user?.EmployeeName ||
    user?.name ||
    user?.identifier ||
    "Employee"

  const handleLogout = () => {
    clearAuthSession()
    router.replace("/login")
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1F2F3B" },
        headerTintColor: "#F4F8FF",
        headerBackTitleVisible: false,
        headerShadowVisible: false,
        headerTitleAlign: "left",
        headerTitle: () => (
          <AppHeaderBar currentUser={currentUserName} onLogout={handleLogout} />
        ),
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
      <Stack.Screen
        name="self-attendance"
        options={{ title: "Self Attendance Report" }}
      />
      <Stack.Screen
        name="attendance-report"
        options={{ title: "Attendance Report" }}
      />
      <Stack.Screen
        name="company-overview"
        options={{ title: "Company Overview" }}
      />
      <Stack.Screen name="hod-report" options={{ title: "HOD Report" }} />
      <Stack.Screen
        name="time-office-report"
        options={{ title: "Time Office Report" }}
      />
      <Stack.Screen name="muster-roll" options={{ title: "Muster Roll" }} />
      <Stack.Screen
        name="employee-database"
        options={{ title: "Employee Database" }}
      />
      <Stack.Screen name="our-team" options={{ title: "Our Team" }} />
      <Stack.Screen name="leave-request" options={{ title: "Leave Request" }} />
      <Stack.Screen
        name="leave-approval"
        options={{ title: "Leave Approval" }}
      />
      <Stack.Screen name="punch-log" options={{ title: "Punch Log Report" }} />
      <Stack.Screen
        name="live-punch-request"
        options={{ title: "Live Punch Request" }}
      />
      <Stack.Screen name="hr-policy" options={{ title: "General Policy" }} />
      <Stack.Screen name="profile" options={{ title: "My Profile" }} />
      <Stack.Screen name="calendar" options={{ title: "Calendar" }} />
      <Stack.Screen
        name="shift-status"
        options={{ title: "Employee Shift Status" }}
      />
      <Stack.Screen name="shift-assign" options={{ title: "Shift Assign" }} />
      <Stack.Screen
        name="change-password"
        options={{ title: "Change Password" }}
      />
      <Stack.Screen name="quick-search" options={{ title: "Quick Search" }} />
    </Stack>
  )
}
