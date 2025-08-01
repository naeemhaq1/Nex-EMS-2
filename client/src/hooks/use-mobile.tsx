import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const checkMobile = () => {
      const isSmall = window.innerWidth <= MOBILE_BREAKPOINT
      const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0)
      const hasOrientation = typeof window.orientation !== 'undefined'
      
      // Consider mobile if small screen OR touch device with medium screen
      const shouldBeMobile = isSmall || (window.innerWidth <= 1024 && (isTouchDevice || hasOrientation))
      setIsMobile(shouldBeMobile)
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`)
    const mqlTablet = window.matchMedia(`(max-width: 1024px)`)
    
    mql.addEventListener("change", checkMobile)
    mqlTablet.addEventListener("change", checkMobile)
    checkMobile()
    
    return () => {
      mql.removeEventListener("change", checkMobile)
      mqlTablet.removeEventListener("change", checkMobile)
    }
  }, [])

  return !!isMobile
}

// Export alias for compatibility
export const useMobile = useIsMobile
