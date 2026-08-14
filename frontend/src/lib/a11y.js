/**
 * Accessibility utilities and components
 */

/**
 * Generate a unique ID for accessibility purposes
 */
let idCounter = 0
export function generateId(prefix = 'a11y') {
  return `${prefix}-${idCounter++}`
}

/**
 * Check if element is focusable
 */
export function isFocusable(element) {
  const focusableTags = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A', 'LABEL']
  return (
    focusableTags.includes(element.tagName) ||
    element.getAttribute('tabIndex') !== null ||
    element.getAttribute('contenteditable') === 'true'
  )
}

/**
 * Trap focus within a container (for modals)
 */
export function trapFocus(container) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  const handleTab = (e) => {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }

  container.addEventListener('keydown', handleTab)

  return () => {
    container.removeEventListener('keydown', handleTab)
  }
}

/**
 * Create an accessible button from any element
 */
export function makeAccessibleButton({ onClick, onKeyDown, ...props }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(e)
    }
    onKeyDown?.(e)
  }

  return {
    role: 'button',
    tabIndex: 0,
    onClick,
    onKeyDown: handleKeyDown,
    ...props,
  }
}

/**
 * Announce screen reader message
 */
export function announceToScreenReader(message) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}
