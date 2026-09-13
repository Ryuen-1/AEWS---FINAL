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
  fullScreen = false,
}) {
  useEffect(() => {
    if (!modal) return
    document.body.classList.add('modal-open')
    return () => document.body.classList.remove('modal-open')
  }, [modal])
  
  const classes = fullScreen
    ? ['modal-overlay-enter fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-6', className].filter(Boolean).join(' ')
    : ['modal-overlay-enter fixed inset-x-0 bottom-0 z-20 flex items-center justify-center p-4 sm:p-6', className].filter(Boolean).join(' ')

  const panelClasses = fullScreen
    ? ['mx-auto flex flex-col overflow-hidden', panelClassName].filter(Boolean).join(' ')
    : ['mx-auto flex h-full w-full flex-col overflow-hidden', panelClassName].filter(Boolean).join(' ')

  const contentClasses = ['clean-scrollbar flex-1 overflow-y-auto', contentClassName]
    .filter(Boolean)
    .join(' ')

  const style = fullScreen 
    ? {} 
    : { top: 'var(--dashboard-header-height, 0px)' }

  const panelStyle = fullScreen
    ? { maxHeight: 'calc(100vh - 2rem)' }
    : { maxHeight: 'calc(100vh - var(--dashboard-header-height, 0px) - 1rem)' }

  const overlay = (
    <div
      className={classes}
      style={style}
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

  if (fullScreen && typeof document !== 'undefined') {
    return createPortal(overlay, document.body)
  }

  return overlay
}
