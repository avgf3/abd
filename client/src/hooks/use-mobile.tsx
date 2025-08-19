import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      // فحص متعدد الطرق لضمان دقة الكشف
      const screenWidth = window.innerWidth < MOBILE_BREAKPOINT
      const userAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      
      // إعطاء أولوية لعرض الشاشة مع مراعاة الأجهزة اللمسية
      return screenWidth || (touchDevice && window.innerWidth < 1024)
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const touchMql = window.matchMedia('(pointer: coarse)')
    
    const onChange = () => {
      setIsMobile(checkMobile())
    }
    
    // الاستماع لتغييرات متعددة
    mql.addEventListener("change", onChange)
    touchMql.addEventListener("change", onChange)
    window.addEventListener("resize", onChange)
    window.addEventListener("orientationchange", onChange)
    
    // فحص أولي
    setIsMobile(checkMobile())
    
    return () => {
      mql.removeEventListener("change", onChange)
      touchMql.removeEventListener("change", onChange)
      window.removeEventListener("resize", onChange)
      window.removeEventListener("orientationchange", onChange)
    }
  }, [])

  return !!isMobile
}
