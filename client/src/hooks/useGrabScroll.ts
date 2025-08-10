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
      
      // Don't prevent default immediately - only prevent if we actually move
      // This allows other mouse events (like click) to work properly
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
        e.preventDefault() // Now prevent default since we're actively dragging
      }
    }

    const endDrag = (e?: MouseEvent) => {
      if (!isDown) return
      isDown = false
      hasMoved = false
      el.classList.remove('cursor-grabbing')
    }

    // Wheel event handler to ensure normal scrolling works
    const onWheel = (e: WheelEvent) => {
      // Don't interfere with wheel scrolling - let browser handle it normally
      // This ensures mouse wheel scrolling works properly in all tabs
      if (!isDown) {
        // Allow normal wheel scrolling when not dragging
        return
      }
      // If we're actively dragging, let wheel events through too
      // The user might want to scroll while dragging is active
    }

    // Add event listeners
    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove, { passive: false })
    window.addEventListener('mouseup', endDrag)
    el.addEventListener('mouseleave', endDrag)
    
    // Add wheel event listener with passive: true to ensure it doesn't block scrolling
    el.addEventListener('wheel', onWheel, { passive: true })

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove as any)
      window.removeEventListener('mouseup', endDrag)
      el.removeEventListener('mouseleave', endDrag)
      el.removeEventListener('wheel', onWheel)
    }
  }, [ref, options?.button, options?.enabled])
}