import { useQuery } from "@tanstack/react-query"

import { getAllDesignationsApi } from "../api/employeeDatabase.api"

export default function useDesignations() {
  return useQuery({
    queryKey: ["emp-db-designations"],
    queryFn: getAllDesignationsApi,
    staleTime: 5 * 60 * 1000,
  })
}
