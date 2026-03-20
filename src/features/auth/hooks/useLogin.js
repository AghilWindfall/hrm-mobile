import { useMutation } from "@tanstack/react-query"

import loginService from "../services/login.service"
import useAuthStore from "../store/auth.store"

export default function useLogin() {
  const setAuthSession = useAuthStore((state) => state.setAuthSession)

  return useMutation({
    mutationFn: loginService,
    onSuccess: (data) => {
      setAuthSession({ user: data.user, authPayload: data.raw })
    },
  })
}
