import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { API_BASE } from '../api'
import { getAuthHeaders } from './authStorage'

// ===== AUTH QUERIES =====

/**
 * Hook to fetch current user profile
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const auth = getAuthHeaders()
      if (!auth.Authorization) return null
      
      const res = await fetch(`${API_BASE}/api/users/me`, {
        headers: auth,
      })
      if (!res.ok) throw new Error('Failed to fetch user')
      return res.json()
    },
    enabled: !!getAuthHeaders().Authorization,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// ===== CLASS QUERIES =====

/**
 * Hook to fetch classes for an instructor
 */
export function useInstructorClasses(instructorId) {
  return useQuery({
    queryKey: ['classes', instructorId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/classes?instructor_id=${encodeURIComponent(instructorId)}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch classes')
      return res.json()
    },
    enabled: !!instructorId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch a single class
 */
export function useClass(classId) {
  return useQuery({
    queryKey: ['class', classId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch class')
      return res.json()
    },
    enabled: !!classId,
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * Hook to fetch class students
 */
export function useClassStudents(classId) {
  return useQuery({
    queryKey: ['classStudents', classId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/students`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch students')
      return res.json()
    },
    enabled: !!classId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Hook to fetch class grades
 */
export function useClassGrades(classId) {
  return useQuery({
    queryKey: ['classGrades', classId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/grades`, {
        headers: getAuthHeaders(),
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('Failed to fetch grades')
      return res.json()
    },
    enabled: !!classId,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

/**
 * Hook to fetch class attendance
 */
export function useClassAttendance(classId) {
  return useQuery({
    queryKey: ['classAttendance', classId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/attendance`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch attendance')
      return res.json()
    },
    enabled: !!classId,
    staleTime: 2 * 60 * 1000,
  })
}

// ===== AMU STAFF QUERIES =====

/**
 * Hook to fetch AMU staff referrals
 */
export function useAmuReferrals(search = '') {
  return useQuery({
    queryKey: ['amuReferrals', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`${API_BASE}/api/amu-staff/referrals${params}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch referrals')
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
  })
}

/**
 * Hook to fetch AMU staff overview stats
 */
export function useAmuOverview() {
  return useQuery({
    queryKey: ['amuOverview'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/amu-staff/overview`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch overview')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })
}

// ===== STUDENT QUERIES =====

/**
 * Hook to fetch all students
 */
export function useStudents(search = '') {
  return useQuery({
    queryKey: ['students', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`${API_BASE}/api/students${params}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch students')
      return res.json()
    },
    staleTime: 3 * 60 * 1000,
  })
}

/**
 * Hook to fetch referred students
 */
export function useReferredStudents(search = '') {
  return useQuery({
    queryKey: ['referredStudents', search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`${API_BASE}/api/students/referred${params}`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error('Failed to fetch referred students')
      return res.json()
    },
    staleTime: 2 * 60 * 1000,
  })
}

// ===== MUTATIONS =====

/**
 * Mutation to create a class
 */
export function useCreateClass() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (classData) => {
      const res = await fetch(`${API_BASE}/api/classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(classData),
      })
      if (!res.ok) throw new Error('Failed to create class')
      return res.json()
    },
    onSuccess: (data) => {
      // Invalidate classes list to refetch
      queryClient.invalidateQueries({ queryKey: ['classes'] })
    },
  })
}

/**
 * Mutation to update enrollment
 */
export function useUpdateEnrollment() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ classId, studentIdentifier, payload }) => {
      const res = await fetch(
        `${API_BASE}/api/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(studentIdentifier)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) throw new Error('Failed to update enrollment')
      return res.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['classStudents', variables.classId] })
      queryClient.invalidateQueries({ queryKey: ['classGrades', variables.classId] })
      queryClient.invalidateQueries({ queryKey: ['classAttendance', variables.classId] })
    },
  })
}

/**
 * Mutation to archive a class
 */
export function useArchiveClass() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (classId) => {
      const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      })
      if (!res.ok) throw new Error('Failed to archive class')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] })
      queryClient.invalidateQueries({ queryKey: ['archivedClasses'] })
    },
  })
}

/**
 * Mutation to upload class files
 */
export function useUploadClassFiles() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ classId, files, type }) => {
      const formData = new FormData()
      for (const file of files) {
        formData.append('files', file)
      }
      formData.append('type', type)
      
      const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/upload`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      })
      if (!res.ok) throw new Error('Failed to upload files')
      return res.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries based on upload type
      if (variables.type === 'gradesheet') {
        queryClient.invalidateQueries({ queryKey: ['classGrades', variables.classId] })
      } else if (variables.type === 'attendance') {
        queryClient.invalidateQueries({ queryKey: ['classAttendance', variables.classId] })
      }
      queryClient.invalidateQueries({ queryKey: ['classStudents', variables.classId] })
    },
  })
}

/**
 * Mutation to predict class risk
 */
export function usePredictClassRisk() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (classId) => {
      const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/predict-risk`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
      })
      if (!res.ok) throw new Error('Failed to predict risk')
      return res.json()
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['classStudents', variables] })
    },
  })
}
