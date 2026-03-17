export function resolveNumericUserId(user) {
  const value =
    user?.UserId ||
    user?.User_Id ||
    user?.Emp_Id ||
    user?.EmployeeId ||
    user?.id

  const numericId = Number(value)
  return Number.isFinite(numericId) ? numericId : null
}

export function hasShiftAssignAccess(user) {
  if (!user || typeof user !== "object") {
    return false
  }

  const hasFlag = (value) =>
    value === true || value === 1 || String(value).toLowerCase() === "true"

  return (
    hasFlag(user.ShiftAssign) ||
    hasFlag(user.ShiftConfirm) ||
    hasFlag(user.HrPolicy) ||
    hasFlag(user.HOD) ||
    hasFlag(user.Hod) ||
    hasFlag(user.IsHOD) ||
    hasFlag(user.HodReport)
  )
}
