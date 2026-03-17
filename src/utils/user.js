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

  return (
    user.HrPolicy === true ||
    user.HOD === true ||
    user.Hod === true ||
    user.IsHOD === true ||
    user.HodReport === true
  )
}
