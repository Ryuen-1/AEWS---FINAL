export function getStudentDisplayName(student) {
  return String(
    student?.student_name ||
    student?.name ||
    student?.student_email ||
    student?.email ||
    student?.student_id ||
    student?.id_number ||
    '',
  ).trim()
}

export function sortStudentsByName(students) {
  return [...(Array.isArray(students) ? students : [])].sort((a, b) => {
    const byName = getStudentDisplayName(a).localeCompare(getStudentDisplayName(b), undefined, {
      sensitivity: 'base',
    })
    if (byName !== 0) return byName

    return String(a?.student_id || a?.id_number || a?.id || '').localeCompare(
      String(b?.student_id || b?.id_number || b?.id || ''),
      undefined,
      { numeric: true, sensitivity: 'base' },
    )
  })
}
