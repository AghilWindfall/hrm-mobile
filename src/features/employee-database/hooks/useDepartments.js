import { useQuery } from "@tanstack/react-query"

import { getDepartmentsApi } from "../api/employeeDatabase.api"

export default function useDepartments(userId) {
  return useQuery({
    queryKey: ["emp-db-departments", userId],
    queryFn: () => getDepartmentsApi(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}
