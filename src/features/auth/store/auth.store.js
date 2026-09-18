import AsyncStorage from "@react-native-async-storage/async-storage"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      authPayload: null,
      isAuthenticated: false,
      hasHydrated: false,
      setAuthSession: ({ user, authPayload }) =>
        set({
          user,
          authPayload,
          isAuthenticated: true,
        }),
      clearAuthSession: () =>
        set({
          user: null,
          authPayload: null,
          isAuthenticated: false,
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "auth-session",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        authPayload: state.authPayload,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    }
  )
)

export default useAuthStore
