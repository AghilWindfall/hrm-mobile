import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import useAuthStore from "../../src/features/auth/store/auth.store"
import { useLiveManualPunchRequest } from "../../src/features/punch/hooks/usePunchLog"
import { resolveNumericUserId } from "../../src/utils/user"

function pad(value) {
  return String(value).padStart(2, "0")
}

function formatTodayDate(date) {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

function formatCurrentTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function LivePunchRequestScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const [remarks, setRemarks] = useState("")
  const [now, setNow] = useState(() => new Date())
  const [successModalVisible, setSuccessModalVisible] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [successMode, setSuccessMode] = useState(null)
  const [activeSubmitMode, setActiveSubmitMode] = useState(null)

  const createRequestMutation = useLiveManualPunchRequest()
  const remarksInputRef = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const todayDateLabel = useMemo(() => formatTodayDate(now), [now])
  const currentTimeLabel = useMemo(() => formatCurrentTime(now), [now])
  const isSubmittingIn =
    createRequestMutation.isPending && activeSubmitMode === "0"
  const isSubmittingOut =
    createRequestMutation.isPending && activeSubmitMode === "1"

  const submitRequest = async (mode) => {
    const trimmedRemarks = remarks.trim()
    const requestRemarks = trimmedRemarks || (mode === "0" ? "IN" : "OUT")

    if (!userId) {
      Alert.alert("Unable to submit", "User ID is missing.")
      return
    }

    try {
      setActiveSubmitMode(mode)
      await createRequestMutation.mutateAsync({
        UserId: userId,
        Remarks: requestRemarks,
        InOutMode: mode,
      })

      setSuccessMessage(
        mode === "0" ? "You are punched IN" : "You are punched OUT",
      )
      setSuccessMode(mode)
      setSuccessModalVisible(true)
      setRemarks("")
    } catch (error) {
      Alert.alert(
        "Submission failed",
        error?.message || "Unable to submit request right now.",
      )
    } finally {
      setActiveSubmitMode(null)
    }
  }

  return (
    <LinearGradient
      colors={["#EFF7F1", "#EAF1FF", "#F4F6FA"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.screen}
    >
      <Modal
        transparent
        animationType="fade"
        visible={successModalVisible}
        onRequestClose={() => setSuccessModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View
              style={[
                styles.modalIconWrap,
                successMode === "1" ? styles.modalIconOutWrap : null,
              ]}
            >
              <Ionicons
                name={successMode === "1" ? "arrow-down" : "checkmark"}
                size={26}
                color="#FFFFFF"
              />
            </View>
            <Text
              style={[
                styles.modalMessage,
                successMode === "0" ? styles.modalMessageIn : null,
                successMode === "1" ? styles.modalMessageOut : null,
              ]}
            >
              {successMessage}
            </Text>
            <Pressable
              onPress={() => {
                setSuccessModalVisible(false)
                remarksInputRef.current?.focus?.()
              }}
              style={({ pressed }) => [
                styles.modalButton,
                pressed ? styles.modalButtonPressed : null,
              ]}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <Text style={styles.title}>Live Punch Request</Text>
          <Text style={styles.subtitle}>
            Current date and time are automatic. Choose mode and submit remarks.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.block}>
              <Text style={styles.label}>Current Date</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValue}>{todayDateLabel}</Text>
              </View>
            </View>

            <View style={styles.block}>
              <Text style={styles.label}>Current Time</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValue}>{currentTimeLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.rowStack}>
            <Text style={styles.label}>Remarks</Text>
            <TextInput
              ref={remarksInputRef}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Remarks"
              placeholderTextColor="#8C97A7"
              multiline
              numberOfLines={3}
              style={styles.remarksInput}
            />
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={() => submitRequest("0")}
              disabled={createRequestMutation.isPending}
              style={({ pressed }) => [
                styles.actionButton,
                styles.inButton,
                pressed && !createRequestMutation.isPending
                  ? styles.submitPressed
                  : null,
                createRequestMutation.isPending ? styles.submitDisabled : null,
              ]}
            >
              {isSubmittingIn ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.submitText}>In</Text>
            </Pressable>

            <Pressable
              onPress={() => submitRequest("1")}
              disabled={createRequestMutation.isPending}
              style={({ pressed }) => [
                styles.actionButton,
                styles.outButton,
                pressed && !createRequestMutation.isPending
                  ? styles.submitPressed
                  : null,
                createRequestMutation.isPending ? styles.submitDisabled : null,
              ]}
            >
              {isSubmittingOut ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="log-out-outline" size={16} color="#FFFFFF" />
              )}
              <Text style={styles.submitText}>Out</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 20,
    gap: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(13, 22, 34, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D7E9DE",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#17934B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  modalIconOutWrap: {
    backgroundColor: "#C43232",
  },
  modalMessage: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  modalMessageIn: {
    color: "#178E46",
  },
  modalMessageOut: {
    color: "#C43232",
  },
  modalButton: {
    marginTop: 16,
    minWidth: 110,
    borderRadius: 10,
    backgroundColor: "#178E46",
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalButtonPressed: {
    opacity: 0.9,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  hero: {
    gap: 4,
  },
  title: {
    color: "#1A2E44",
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: "#4D6075",
    fontSize: 13,
    fontWeight: "500",
  },
  card: {
    borderWidth: 1,
    borderColor: "#D8DEE6",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    padding: 14,
    gap: 14,
    shadowColor: "#101828",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowStack: {
    gap: 8,
  },
  block: {
    flex: 1,
    gap: 6,
  },
  label: {
    color: "#24384F",
    fontSize: 14,
    fontWeight: "700",
  },
  readOnlyField: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#C8D3DF",
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  readOnlyValue: {
    color: "#1F3348",
    fontSize: 18,
    fontWeight: "700",
  },
  remarksInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#C8D3DF",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    color: "#1F2F3B",
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  actionButton: {
    width: 130,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  inButton: {
    backgroundColor: "#178E46",
    shadowColor: "#0E7A38",
  },
  outButton: {
    backgroundColor: "#1E6AA8",
    shadowColor: "#164B77",
  },
  submitPressed: {
    opacity: 0.92,
  },
  submitDisabled: {
    opacity: 0.65,
  },
  submitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
})
