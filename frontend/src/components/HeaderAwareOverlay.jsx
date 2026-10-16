import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function HeaderAwareOverlay({
  children,
  onBackdropClick = () => {},
  className = '',
  panelClassName = '',
  contentClassName = '',
  role,
  labelledBy,
  modal = true,
  fullScreen = true,
}) {
  useEffect(() => {
    if (!modal) return
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [modal])
  
  const classes = ['modal-overlay-enter fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6', className].filter(Boolean).join(' ')

  const panelClasses = ['mx-auto flex w-full flex-col overflow-hidden', panelClassName].filter(Boolean).join(' ')

  const contentClasses = ['clean-scrollbar flex-1 overflow-y-auto', contentClassName]
    .filter(Boolean)
    .join(' ')

  const panelStyle = { maxHeight: 'calc(100vh - 2rem)' }

  const overlay = (
    <div
      className={classes}
      role={role}
      aria-modal={modal}
      aria-labelledby={labelledBy}
    >
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm z-10"
        onClick={onBackdropClick}
        aria-hidden="true"
      />
      <div
        className={panelClasses + ' modal-panel-enter relative z-20'}
        style={panelStyle}
      >
        <div className={contentClasses}>{children}</div>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(overlay, document.body)
  }

  return overlay
}
