import { useState, useCallback } from "react"

import { getEmployeeQuickSearchApi } from "../api/quickSearch.api"

export default function useQuickSearch() {
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const search = useCallback(async (query, employeeId) => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setHasSearched(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const raw = await getEmployeeQuickSearchApi(trimmed, employeeId)
      const list = Array.isArray(raw) ? raw : []
      setResults(list)
      setHasSearched(true)
    } catch (err) {
      setError(err?.message || "Search failed. Please try again.")
      setResults([])
      setHasSearched(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setResults([])
    setHasSearched(false)
    setError(null)
  }, [])

  return { results, isLoading, error, hasSearched, search, clear }
}
