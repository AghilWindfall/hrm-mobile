import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useState } from "react"
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native"

import useAuthStore from "../../src/features/auth/store/auth.store"
import useChangePassword from "../../src/features/password/hooks/useChangePassword"
import { resolveNumericUserId } from "../../src/utils/user"

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  onToggleSecure,
  error,
  icon,
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
        <Ionicons name={icon} size={17} color="#49657B" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure}
          placeholder={placeholder}
          placeholderTextColor="#90A0AD"
          style={styles.input}
          autoCapitalize="none"
        />
        <Pressable onPress={onToggleSecure} hitSlop={10}>
          <Ionicons
            name={secure ? "eye-off-outline" : "eye-outline"}
            size={18}
            color="#49657B"
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

export default function ChangePasswordScreen() {
  const user = useAuthStore((state) => state.user)
  const userId = resolveNumericUserId(user)
  const changePasswordMutation = useChangePassword()

  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState({})
  const [resultMessage, setResultMessage] = useState(null)

  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const validate = () => {
    const nextErrors = {}

    if (!oldPassword.trim()) {
      nextErrors.oldPassword = "Please enter old password."
    }

    if (!newPassword.trim()) {
      nextErrors.newPassword = "Please enter new password."
    } else if (newPassword.trim().length < 4) {
      nextErrors.newPassword = "New password must be at least 4 characters."
    }

    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm new password."
    } else if (newPassword.trim() !== confirmPassword.trim()) {
      nextErrors.confirmPassword =
        "New password and confirm password do not match."
    }

    if (
      oldPassword.trim() &&
      newPassword.trim() &&
      oldPassword.trim() === newPassword.trim()
    ) {
      nextErrors.newPassword =
        "New password should be different from old password."
    }

    if (!userId) {
      nextErrors.form = "User session not found. Please login again."
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = async () => {
    setResultMessage(null)

    if (!validate()) {
      return
    }

    const payload = {
      UserId: userId,
      Password: oldPassword.trim(),
      newpassword: newPassword.trim(),
    }

    try {
      const result = await changePasswordMutation.mutateAsync(payload)

      setResultMessage({
        type: result.success ? "success" : "error",
        text: result.message,
      })

      if (result.success) {
        setOldPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setErrors({})
      }
    } catch (error) {
      setResultMessage({
        type: "error",
        text: error?.message || "Unable to change password. Please try again.",
      })
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <LinearGradient
          colors={["#132E43", "#1C4866", "#2D6A8D"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroSub}>Security Settings</Text>
          <Text style={styles.heroTitle}>Change Password</Text>
          <Text style={styles.heroMeta}>
            Keep your account safe with a strong password.
          </Text>
        </LinearGradient>

        <View style={styles.card}>
          <PasswordField
            label="Old Password"
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="Enter old password"
            secure={!showOld}
            onToggleSecure={() => setShowOld((prev) => !prev)}
            error={errors.oldPassword}
            icon="lock-closed-outline"
          />

          <PasswordField
            label="New Password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            secure={!showNew}
            onToggleSecure={() => setShowNew((prev) => !prev)}
            error={errors.newPassword}
            icon="key-outline"
          />

          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            secure={!showConfirm}
            onToggleSecure={() => setShowConfirm((prev) => !prev)}
            error={errors.confirmPassword}
            icon="shield-checkmark-outline"
          />

          {errors.form ? (
            <Text style={styles.errorText}>{errors.form}</Text>
          ) : null}

          {resultMessage ? (
            <View
              style={[
                styles.resultBanner,
                resultMessage.type === "success"
                  ? styles.resultSuccess
                  : styles.resultError,
              ]}
            >
              <Ionicons
                name={
                  resultMessage.type === "success"
                    ? "checkmark-circle"
                    : "alert-circle"
                }
                size={16}
                color={resultMessage.type === "success" ? "#117A3D" : "#A11919"}
              />
              <Text
                style={[
                  styles.resultText,
                  resultMessage.type === "success"
                    ? styles.resultSuccessText
                    : styles.resultErrorText,
                ]}
              >
                {resultMessage.text}
              </Text>
            </View>
          ) : null}

          <Pressable
            style={[
              styles.saveButton,
              changePasswordMutation.isPending
                ? styles.saveButtonDisabled
                : null,
            ]}
            onPress={handleSubmit}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Password</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#ECF2F7",
  },
  scroll: {
    paddingBottom: 24,
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  heroSub: {
    color: "#A7C5D8",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 4,
  },
  heroMeta: {
    color: "#D6E6EF",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 8,
  },
  card: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D7E0E8",
    padding: 14,
    gap: 12,
  },
  fieldWrap: {
    gap: 6,
  },
  fieldLabel: {
    color: "#1A3347",
    fontSize: 13,
    fontWeight: "700",
  },
  inputWrap: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4DEE7",
    backgroundColor: "#F5F8FB",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
  },
  inputWrapError: {
    borderColor: "#C0353B",
    backgroundColor: "#FFF6F6",
  },
  input: {
    flex: 1,
    color: "#122033",
    fontSize: 15,
    fontWeight: "600",
    paddingVertical: 11,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 12,
    fontWeight: "600",
  },
  resultBanner: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  resultSuccess: {
    backgroundColor: "#ECFDF3",
    borderColor: "#B7E5C8",
  },
  resultError: {
    backgroundColor: "#FFF1F1",
    borderColor: "#F3C4C4",
  },
  resultText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
  },
  resultSuccessText: {
    color: "#117A3D",
  },
  resultErrorText: {
    color: "#A11919",
  },
  saveButton: {
    marginTop: 4,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: "#2C6DA5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
})
