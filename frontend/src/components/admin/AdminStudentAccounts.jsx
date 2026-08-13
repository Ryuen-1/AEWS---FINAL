import { useState, useEffect, useRef } from 'react'
import { User, Mail, GraduationCap, Search, MoreVertical, ChevronRight, CheckCircle, X, Trash2, Building2, Save, Info, RefreshCw } from 'lucide-react'
import { getReferredStudents, deleteStudent, getStudent, updateStudent } from '../../api'
import HeaderAwareOverlay from '../HeaderAwareOverlay'
import ScrollTableContainer from '../ScrollTableContainer'

export default function AdminStudentAccounts() {
  const menuRef = useRef(null)
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actingId, setActingId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [detailStudentId, setDetailStudentId] = useState(null)
  const [detailStudent, setDetailStudent] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)
  const [detailEditedData, setDetailEditedData] = useState({})
  const [detailSaving, setDetailSaving] = useState(false)
  const [detailSaveSuccess, setDetailSaveSuccess] = useState(false)

  const fetchStudents = () => {
    setLoading(true)
    setError(null)
    getReferredStudents(search)
      .then(setStudents)
      .catch((e) => {
        setError(e?.message || 'Failed to load students')
        setStudents([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchStudents()
  }, [search])

  useEffect(() => {
    function handleClickOutside(e) {
      if (e.target.closest?.('button[aria-haspopup="true"]')) return
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!deleteTarget && !detailStudentId) return
    function handleEscape(e) {
      if (e.key !== 'Escape') return
      if (deleteTarget) closeDeleteModal()
      if (detailStudentId) closeDetailModal()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [deleteTarget, detailStudentId, actingId, detailSaving])

  useEffect(() => {
    if (!detailSaveSuccess) return
    const t = setTimeout(() => setDetailSaveSuccess(false), 2500)
    return () => clearTimeout(t)
  }, [detailSaveSuccess])

  const openDeleteModal = (studentId, studentName) => {
    setDeleteTarget({ id: studentId, name: studentName || 'this student' })
  }

  const closeDeleteModal = () => {
    if (!actingId) setDeleteTarget(null)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const studentId = deleteTarget.id
    setActingId(studentId)
    try {
      await deleteStudent(studentId)
      setDeleteTarget(null)
      setError(null)
      fetchStudents()
    } catch (e) {
      setError(e?.message || 'Failed to delete student account')
    } finally {
      setActingId(null)
    }
  }

  const openDetailModal = async (studentId) => {
    setDetailStudentId(studentId)
    setDetailStudent(null)
    setDetailError(null)
    setDetailEditedData({})
    setDetailSaveSuccess(false)
    setDetailLoading(true)
    try {
      const data = await getStudent(studentId)
      setDetailStudent(data)
      setDetailEditedData({
        name: data.name || '',
        email: data.email || '',
        id_number: data.id_number || '',
      })
    } catch (e) {
      setDetailError(e?.message || 'Failed to load student')
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetailModal = () => {
    if (detailSaving) return
    setDetailStudentId(null)
    setDetailStudent(null)
    setDetailError(null)
    setDetailEditedData({})
    setDetailSaveSuccess(false)
    setDetailLoading(false)
  }

  const handleDetailSave = async () => {
    if (!detailStudentId || !detailStudent) return
    setDetailSaving(true)
    setDetailError(null)
    setDetailSaveSuccess(false)
    try {
      await updateStudent(detailStudentId, detailEditedData)
      const updated = await getStudent(detailStudentId)
      setDetailStudent(updated)
      setDetailEditedData({
        name: updated.name || '',
        email: updated.email || '',
        id_number: updated.id_number || '',
      })
      setDetailSaveSuccess(true)
      fetchStudents()
    } catch (e) {
      setDetailError(e?.message || 'Failed to update student')
    } finally {
      setDetailSaving(false)
    }
  }

  const handleResetPassword = async () => {
    if (!detailStudentId || !detailStudent) return
    setDetailSaving(true)
    setDetailError(null)
    try {
      // Generate new password
      const newPassword = Math.random().toString(36).slice(-8)
      await updateStudent(detailStudentId, { password: newPassword })
      setDetailSaveSuccess(true)
      // Show the new password to admin
      alert(`New password for ${detailStudent.name}: ${newPassword}`)
    } catch (e) {
      setDetailError(e?.message || 'Failed to reset password')
    } finally {
      setDetailSaving(false)
    }
  }

  const uniqueStudentsMap = new Map()
  for (const student of students) {
    const idNumber = String(student?.id_number || '').trim().toLowerCase()
    const email = String(student?.email || '').trim().toLowerCase()
    const name = String(student?.name || '').trim().toLowerCase()
    const key = idNumber || email || name || String(student?.id || '')
    const existing = uniqueStudentsMap.get(key)
    if (!existing) {
      uniqueStudentsMap.set(key, student)
      continue
    }

    const existingCreated = existing?.created_at ? String(existing.created_at) : ''
    const currentCreated = student?.created_at ? String(student.created_at) : ''
    if (!existingCreated && currentCreated) {
      uniqueStudentsMap.set(key, student)
    } else if (existingCreated && currentCreated && currentCreated > existingCreated) {
      uniqueStudentsMap.set(key, student)
    }
  }

  const sortedStudents = [...uniqueStudentsMap.values()].sort((a, b) => 
    String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
  )

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <XCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Referred Students</h3>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 focus:bg-white outline-none transition-colors"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 overflow-hidden">
        <ScrollTableContainer>
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-gray-50/80 border-b border-gray-200">
              <tr>
                <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Student</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Student ID</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Email</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left">Created</th>
                <th className="px-5 py-4 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                    Loading students...
                  </td>
                </tr>
              ) : sortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-500">
                    No referred students found. Students will appear here when they are referred by instructors.
                  </td>
                </tr>
              ) : (
                sortedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-teal-50/50 transition-colors">
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600 shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{student.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">Student Account</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2 min-w-0">
                        <GraduationCap className="w-4 h-4 text-slate-400 shrink-0" />
                        <p className="text-sm text-gray-700 truncate">{student.id_number || '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <p className="text-sm text-gray-700 truncate">{student.email || '—'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <p className="text-sm text-gray-700">
                        {student.created_at ? new Date(student.created_at).toLocaleDateString() : '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetailModal(student.id)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          title="View details"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <div className="relative" ref={menuRef}>
                          <button
                            onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
                            aria-haspopup="true"
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === student.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                              <button
                                onClick={() => { openDetailModal(student.id); setOpenMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Info className="w-4 h-4" />
                                View Details
                              </button>
                              <button
                                onClick={() => { openDeleteModal(student.id, student.name); setOpenMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                Delete Account
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </ScrollTableContainer>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <HeaderAwareOverlay
          role="alertdialog"
          modal
          className="flex items-center justify-center"
          panelClassName="max-w-[400px]"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-[400px]">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Student Account</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Are you sure you want to delete the account for <strong>{deleteTarget.name}</strong>? This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={closeDeleteModal}
                    disabled={actingId === deleteTarget.id}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={actingId === deleteTarget.id}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actingId === deleteTarget.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </HeaderAwareOverlay>
      )}

      {/* Student Detail Modal */}
      {detailStudentId && (
        <HeaderAwareOverlay
          role="dialog"
          modal
          className="flex items-center justify-center"
          panelClassName="max-w-[500px]"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-[500px] max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>
                <p className="text-sm text-gray-500">View and manage student account information</p>
              </div>
              <button
                onClick={closeDetailModal}
                disabled={detailSaving}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : detailError ? (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {detailError}
                </div>
              ) : detailStudent ? (
                <>
                  {detailSaveSuccess && (
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Student updated successfully
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={detailEditedData.name || ''}
                        onChange={(e) => setDetailEditedData({ ...detailEditedData, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={detailEditedData.email || ''}
                        onChange={(e) => setDetailEditedData({ ...detailEditedData, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                      <input
                        type="text"
                        value={detailEditedData.id_number || ''}
                        onChange={(e) => setDetailEditedData({ ...detailEditedData, id_number: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                      />
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <button
                        onClick={handleResetPassword}
                        disabled={detailSaving}
                        className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset Password
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {detailStudent && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={closeDetailModal}
                  disabled={detailSaving}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDetailSave}
                  disabled={detailSaving}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {detailSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </HeaderAwareOverlay>
      )}
    </div>
  )
}