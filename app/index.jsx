import { Redirect } from "expo-router"
import { ActivityIndicator, View } from "react-native"

import useAuthStore from "../src/features/auth/store/auth.store"

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)

  if (!hasHydrated) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return <Redirect href={isAuthenticated ? "/dashboard" : "/login"} />
}
