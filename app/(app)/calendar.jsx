import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useMemo, useState } from "react"
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"

import useAuthStore from "../../src/features/auth/store/auth.store"
import useCalendar from "../../src/features/calendar/hooks/useCalendar"

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function resolveEmployeeId(user) {
  const candidate =
    user?.Emp_Id ||
    user?.EmployeeId ||
    user?.UserId ||
    user?.User_Id ||
    user?.id

  const numeric = Number(candidate)
  return Number.isFinite(numeric) ? numeric : null
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== ""
}

function buildCalendarCells(year, month) {
  const firstWeekDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells = []

  for (let i = 0; i < firstWeekDay; i += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day)
  }

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  return cells
}

function DayCell({ day, item }) {
  if (!day) {
    return <View style={[styles.dayCell, styles.dayCellEmpty]} />
  }

  const isOff = String(item?.SHIFT_CONFIRM || "").toUpperCase() === "OFF"
  const leaveText = item?.LEAVE
  const holidayText = item?.HOLIDAY

  return (
    <View style={styles.dayCell}>
      <View style={styles.dayTop}>
        <Text style={styles.dayNumber}>{day}</Text>
        {hasValue(item?.IN_TIME) && (
          <Text style={[styles.timeText, styles.inTime]}>{item.IN_TIME}</Text>
        )}
        {hasValue(item?.OUT_TIME) && (
          <Text style={[styles.timeText, styles.outTime]}>{item.OUT_TIME}</Text>
        )}
      </View>

      {hasValue(leaveText) && (
        <View style={[styles.statePill, styles.leavePill]}>
          <Text style={styles.stateText}>{leaveText}</Text>
        </View>
      )}

      {hasValue(holidayText) && (
        <View style={[styles.statePill, styles.holidayPill]}>
          <Text style={styles.stateText}>{holidayText}</Text>
        </View>
      )}

      {hasValue(item?.SHIFT_ASSIGN) && (
        <Text numberOfLines={1} style={styles.shiftAssignText}>
          {item.SHIFT_ASSIGN}
        </Text>
      )}

      {hasValue(item?.SHIFT_CONFIRM) && (
        <Text
          numberOfLines={1}
          style={[styles.shiftConfirmText, isOff ? styles.offText : null]}
        >
          {item.SHIFT_CONFIRM}
        </Text>
      )}
    </View>
  )
}

export default function CalendarScreen() {
  const user = useAuthStore((state) => state.user)
  const employeeId = resolveEmployeeId(user)

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  const [activeYear, setActiveYear] = useState(now.getFullYear())
  const [activeMonth, setActiveMonth] = useState(now.getMonth() + 1)

  const calendarQuery = useCalendar({
    employeeId,
    year: activeYear,
    month: activeMonth,
    enabled: Boolean(employeeId),
  })

  const dataByDay = useMemo(() => {
    const map = new Map()
    ;(calendarQuery.data || []).forEach((row) => {
      const dateNum = Number(row.ATTN_DATE)
      if (Number.isFinite(dateNum)) {
        map.set(dateNum, row)
      }
    })
    return map
  }, [calendarQuery.data])

  const cells = useMemo(
    () => buildCalendarCells(activeYear, activeMonth),
    [activeYear, activeMonth],
  )

  const monthTitle = `${MONTH_NAMES[activeMonth - 1]} ${activeYear}`
  const hasPendingSelectionChange =
    selectedMonth !== activeMonth || selectedYear !== activeYear
  const pendingMonthTitle = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`

  const shiftMonth = (delta) => {
    const date = new Date(selectedYear, selectedMonth - 1 + delta, 1)
    setSelectedYear(date.getFullYear())
    setSelectedMonth(date.getMonth() + 1)
  }

  const applySelection = () => {
    setActiveYear(selectedYear)
    setActiveMonth(selectedMonth)
  }

  if (!employeeId) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.centerTitle}>Employee ID not found</Text>
        <Text style={styles.centerSub}>
          Please login again to load your calendar.
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#1F2F3B", "#2C4A5C"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroSub}>Work Calendar</Text>
        <Text style={styles.heroTitle}>{monthTitle}</Text>
      </LinearGradient>

      <View style={styles.controlPanel}>
        <View style={styles.controlRow}>
          <Pressable style={styles.iconBtn} onPress={() => shiftMonth(-1)}>
            <Ionicons name="chevron-back" size={18} color="#1F2F3B" />
          </Pressable>

          <View style={styles.selectionPill}>
            <Text style={styles.selectionText}>
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </Text>
          </View>

          <Pressable style={styles.iconBtn} onPress={() => shiftMonth(1)}>
            <Ionicons name="chevron-forward" size={18} color="#1F2F3B" />
          </Pressable>
        </View>

        <View style={styles.yearRow}>
          <Pressable
            style={styles.smallBtn}
            onPress={() => setSelectedYear((prev) => prev - 1)}
          >
            <Text style={styles.smallBtnText}>- Year</Text>
          </Pressable>
          <Pressable
            style={styles.smallBtn}
            onPress={() => setSelectedYear((prev) => prev + 1)}
          >
            <Text style={styles.smallBtnText}>+ Year</Text>
          </Pressable>
          <Pressable style={styles.showBtn} onPress={applySelection}>
            <Text style={styles.showBtnText}>Show</Text>
          </Pressable>
        </View>

        <View style={styles.displayInfoRow}>
          <Text style={styles.displayInfoText}>Showing: {monthTitle}</Text>
          {hasPendingSelectionChange ? (
            <Text style={styles.pendingInfoText}>
              Pending: {pendingMonthTitle}
            </Text>
          ) : null}
        </View>
      </View>

      {calendarQuery.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#F5A300" />
          <Text style={styles.centerSub}>Loading calendar...</Text>
        </View>
      ) : calendarQuery.isError ? (
        <View style={styles.centerState}>
          <Text style={styles.centerTitle}>Unable to load calendar</Text>
          <Text style={styles.centerSub}>
            Please try another month or retry.
          </Text>
          <Pressable
            style={styles.showBtn}
            onPress={() => calendarQuery.refetch()}
          >
            <Text style={styles.showBtnText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#37A745" }]}
              />
              <Text style={styles.legendText}>In</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#DF3E3E" }]}
              />
              <Text style={styles.legendText}>Out</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#F3C1C1" }]}
              />
              <Text style={styles.legendText}>Leave</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#C8DDF8" }]}
              />
              <Text style={styles.legendText}>Holiday</Text>
            </View>
          </View>

          <View style={styles.weekHeaderRow}>
            {WEEK_DAYS.map((day) => (
              <View key={day} style={styles.weekHeaderCell}>
                <Text style={styles.weekHeaderText}>{day}</Text>
              </View>
            ))}
          </View>

          <View style={styles.gridWrap}>
            {cells.map((day, index) => (
              <DayCell
                key={`${String(day)}-${index}`}
                day={day}
                item={day ? dataByDay.get(day) : null}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EEF2F6",
  },
  hero: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  heroSub: {
    color: "#AFC4D6",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "700",
    marginTop: 4,
  },

  controlPanel: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DCE4EB",
    gap: 10,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCE4EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6FAFD",
  },
  selectionPill: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: "#F6FAFD",
    borderWidth: 1,
    borderColor: "#DCE4EB",
    borderRadius: 10,
    alignItems: "center",
  },
  selectionText: {
    color: "#1F2F3B",
    fontWeight: "600",
    fontSize: 14,
  },
  yearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  smallBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DCE4EB",
    backgroundColor: "#F6FAFD",
    paddingVertical: 10,
    alignItems: "center",
  },
  smallBtnText: {
    color: "#3D5363",
    fontWeight: "600",
    fontSize: 13,
  },
  showBtn: {
    borderRadius: 10,
    backgroundColor: "#2B6EA6",
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  showBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  displayInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  displayInfoText: {
    color: "#1F2F3B",
    fontWeight: "700",
    fontSize: 12,
  },
  pendingInfoText: {
    color: "#D77A00",
    fontWeight: "700",
    fontSize: 11,
  },

  legendRow: {
    marginHorizontal: 12,
    marginTop: 2,
    marginBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE4EB",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    color: "#455E70",
    fontSize: 12,
    fontWeight: "600",
  },

  weekHeaderRow: {
    marginHorizontal: 12,
    flexDirection: "row",
    backgroundColor: "#5F6670",
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: "hidden",
  },
  weekHeaderCell: {
    width: "14.2857%",
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
  },
  weekHeaderText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },

  gridWrap: {
    marginHorizontal: 12,
    marginBottom: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#C8D3DD",
    backgroundColor: "#FFFFFF",
  },
  dayCell: {
    width: "14.2857%",
    minHeight: 105,
    paddingHorizontal: 5,
    paddingTop: 4,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: "#C8D3DD",
    backgroundColor: "#FDFDFE",
  },
  dayCellEmpty: {
    backgroundColor: "#EEF2F6",
  },
  dayTop: {
    alignItems: "center",
    marginBottom: 4,
    gap: 1,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E2F3A",
  },
  timeText: {
    fontSize: 9,
    fontWeight: "700",
  },
  inTime: {
    color: "#37A745",
  },
  outTime: {
    color: "#DF3E3E",
  },

  statePill: {
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginBottom: 3,
  },
  leavePill: {
    backgroundColor: "#F3C1C1",
  },
  holidayPill: {
    backgroundColor: "#C8DDF8",
  },
  stateText: {
    fontSize: 9,
    color: "#1E2F3A",
    fontWeight: "700",
  },

  shiftAssignText: {
    fontSize: 10,
    color: "#243B4D",
    fontWeight: "700",
    marginBottom: 1,
  },
  shiftConfirmText: {
    fontSize: 10,
    color: "#284BFF",
    fontWeight: "700",
  },
  offText: {
    color: "#274BFF",
  },

  centerState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 8,
  },
  centerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E2F3A",
    textAlign: "center",
  },
  centerSub: {
    fontSize: 13,
    color: "#6C8292",
    textAlign: "center",
  },
})
