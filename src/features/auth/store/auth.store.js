import { create } from "zustand"

const useAuthStore = create((set) => ({
  user: null,
  authPayload: null,
  isAuthenticated: false,
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
}))

export default useAuthStore
