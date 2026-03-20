export function formatToIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseDateInput(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)
  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}
