import { createPortal } from 'react-dom'

/** A viewport-level, non-dismissible progress state for document uploads. */
export default function UploadProgressOverlay({ title, description = 'Please wait while we process your file.' }) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
      aria-busy="true"
      aria-label={title}
    >
      <div className="soft-enter flex flex-col items-center gap-4 rounded-xl bg-white p-8 text-center shadow-2xl">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" aria-hidden="true" />
        <p className="text-lg font-semibold text-slate-900">{title}</p>
        <p className="text-sm text-slate-600">{description}</p>
      </div>
    </div>,
    document.body,
  )
}
