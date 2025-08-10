import { useEffect } from 'react'

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

    const onMouseDown = (e: MouseEvent) => {
      const button = options?.button ?? 0
      if (e.button !== button) return
      // Only start if content is scrollable
      if (el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth) return

      isDown = true
      startX = e.clientX
      startY = e.clientY
      scrollLeft = el.scrollLeft
      scrollTop = el.scrollTop
      el.classList.add('cursor-grabbing')
      e.preventDefault()
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        el.scrollTo({ left: scrollLeft - dx, top: scrollTop - dy })
      }
      e.preventDefault()
    }

    const endDrag = () => {
      if (!isDown) return
      isDown = false
      el.classList.remove('cursor-grabbing')
    }

    el.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove, { passive: false })
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