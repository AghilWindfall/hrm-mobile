import axios from "axios"

const baseURL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://14.143.148.218:8080"

const httpClient = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
})

export default httpClient
