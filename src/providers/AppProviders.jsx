import { QueryClientProvider } from "@tanstack/react-query"
import { StatusBar } from "expo-status-bar"
import { SafeAreaProvider } from "react-native-safe-area-context"

import queryClient from "../lib/queryClient"

export default function AppProviders({ children }) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        {children}
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
