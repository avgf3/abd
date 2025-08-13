import { useEffect } from 'react'

/**
 * Hook that enables drag-to-scroll functionality while preserving native wheel scrolling
 * 
 * @param ref - Reference to the scrollable element
 * @param options - Configuration options
 * @param options.button - Mouse button to use for dragging (0 = left, 1 = middle, 2 = right)
 * @param options.enabled - Whether the hook is enabled
 */
export function useGrabScroll<T extends HTMLElement>(
  ref: React.RefObject<T>,
  options?: { button?: number; enabled?: boolean }
): void {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    const isEnabled = options?.enabled ?? true
    if (!isEnabled) return

    let isDown = false
    let startX = 0
    let startY = 0
    let scrollLeft = 0
    let scrollTop = 0
    let hasMoved = false
    let originalUserSelect: string | null = null

    const onMouseDown = (e: MouseEvent) => {
      const button = options?.button ?? 0
      if (e.button !== button) return
      
      // Only start if content is scrollable
      if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) return

      isDown = true
      hasMoved = false
      startX = e.clientX
      startY = e.clientY
      scrollLeft = el.scrollLeft
      scrollTop = el.scrollTop
      el.classList.add('cursor-grabbing')

      // Disable text selection during drag without blocking default wheel behavior
      originalUserSelect = document.body.style.userSelect
      document.body.style.userSelect = 'none'
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      
      // Only consider it a drag if mouse moved more than 3 pixels
      // This prevents accidental drags from interfering with clicks
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        hasMoved = true
        el.scrollTo({ left: scrollLeft - dx, top: scrollTop - dy })
      }
    }

    const endDrag = () => {
      if (!isDown) return
      isDown = false
      hasMoved = false
      el.classList.remove('cursor-grabbing')

      // Restore text selection
      if (originalUserSelect !== null) {
        document.body.style.userSelect = originalUserSelect
        originalUserSelect = null
      }
    }

    // Add event listeners
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    window.addEventListener('mouseup', endDrag)
    el.addEventListener('mouseleave', endDrag)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove as any)
      window.removeEventListener('mouseup', endDrag)
      el.removeEventListener('mouseleave', endDrag)
    }
  }, [ref, options?.button, options?.enabled])
}