import type { StudentActivity } from '../types'

export function studentsToCsv(students: StudentActivity[]) {
  const rows = [
    ['학생', '학번', '담당 구역', '승인 일수', '누적 활동 시간(분)'],
    ...students.map((student) => [
      student.name,
      student.studentNumber ?? '',
      student.area ?? '',
      String(student.attendanceDays),
      String(student.totalMinutes),
    ]),
  ]

  return `\uFEFF${rows
    .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(','))
    .join('\n')}`
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportStudentsCsv(students: StudentActivity[]) {
  downloadCsv(studentsToCsv(students), 'ecoguard-student-activities.csv')
}
