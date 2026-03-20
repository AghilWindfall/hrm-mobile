import httpClient from "../../../lib/httpClient"

export async function loginApi(payload) {
  const response = await httpClient.get("/service/api/User/AuthenticateUser", {
    params: {
      username: payload.identifier,
      password: payload.password,
    },
  })

  return response.data
}

export default loginApi
