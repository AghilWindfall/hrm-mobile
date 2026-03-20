import { zodResolver } from "@hookform/resolvers/zod"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { router } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native"
import { Controller, useForm } from "react-hook-form"

import Button from "../../src/components/ui/Button"
import Card from "../../src/components/ui/Card"
import Input from "../../src/components/ui/Input"
import useLogin from "../../src/features/auth/hooks/useLogin"
import loginSchema from "../../src/features/auth/schemas/login.schema"

const COMPANY_NAME = "Windfall Productions"

export default function LoginScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const liftAnim = useRef(new Animated.Value(20)).current
  const toastAnim = useRef(new Animated.Value(0)).current
  const toastTimerRef = useRef(null)
  const [toastMessage, setToastMessage] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  })

  const loginMutation = useLogin()

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),
      Animated.timing(liftAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]).start()
  }, [fadeAnim, liftAnim])

  useEffect(() => {
    if (!loginMutation.error) {
      return
    }

    const message =
      loginMutation.error?.message === "Invalid username or password."
        ? "Invalid credentials"
        : loginMutation.error?.message || "Unable to sign in."

    setToastMessage(message)

    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start()

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }

    toastTimerRef.current = setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        setToastMessage("")
      })
    }, 2400)

    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [loginMutation.error, toastAnim])

  const onSubmit = async (values) => {
    try {
      await loginMutation.mutateAsync(values)
      router.replace("/dashboard")
    } catch (error) {
      // Keep error handling in-screen for user feedback.
    }
  }

  return (
    <LinearGradient
      colors={["#DFF1FF", "#F1F8FF", "#EEF3FA"]}
      style={styles.screen}
    >
      {toastMessage ? (
        <Animated.View
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 8],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      ) : null}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={styles.keyboardWrap}
      >
        <ScrollView
          contentContainerStyle={styles.formContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: liftAnim }],
              },
            ]}
          >
            <View style={styles.brandWrap}>
              <Text style={styles.brandName}>{COMPANY_NAME}</Text>
              <Text style={styles.subtitle}>HRM Mobile Portal</Text>
            </View>

            <Card>
              <Text style={styles.cardTitle}>Sign in</Text>
              <Text style={styles.cardSubtitle}>
                Use your web app credentials to continue.
              </Text>

              <Controller
                control={control}
                name="identifier"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Email or Employee ID"
                    value={value}
                    onChangeText={onChange}
                    placeholder="you@windfall.com"
                    error={errors.identifier?.message}
                    keyboardType="email-address"
                    leftIcon={
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color="#406080"
                      />
                    }
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Password"
                    value={value}
                    onChangeText={onChange}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    error={errors.password?.message}
                    leftIcon={
                      <Ionicons
                        name="lock-closed-outline"
                        size={18}
                        color="#406080"
                      />
                    }
                    rightIcon={
                      <Pressable
                        onPress={() => setShowPassword((current) => !current)}
                        hitSlop={10}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          size={20}
                          color="#406080"
                        />
                      </Pressable>
                    }
                  />
                )}
              />

              <Button
                label="Login"
                onPress={handleSubmit(onSubmit)}
                loading={loginMutation.isPending}
                loadingLabel="Signing in..."
                disabled={loginMutation.isPending}
              />
            </Card>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  toast: {
    position: "absolute",
    top: 44,
    left: 16,
    right: 16,
    zIndex: 99,
    borderRadius: 12,
    backgroundColor: "#B81F33",
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#450811",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  toastText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  keyboardWrap: {
    flex: 1,
  },
  formContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  content: {
    width: "100%",
    gap: 18,
  },
  brandWrap: {
    alignItems: "center",
    gap: 6,
  },
  brandName: {
    color: "#10243A",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  subtitle: {
    color: "#385878",
    fontSize: 15,
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#10243A",
  },
  cardSubtitle: {
    color: "#54677A",
    fontSize: 14,
    marginBottom: 6,
  },
})
