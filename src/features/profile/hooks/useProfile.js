import { useQuery } from "@tanstack/react-query"

import { fetchUserDetails } from "../api/profile.api"

export default function useProfile(employeeId) {
  return useQuery({
    queryKey: ["profile", employeeId],
    queryFn: () => fetchUserDetails(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  })
}
