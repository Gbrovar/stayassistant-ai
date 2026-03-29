import { useEffect, useState } from "react"

export default function useResponsive() {

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

    useEffect(() => {

        function handleResize() {
            setIsMobile(window.innerWidth < 768)
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
        }

    }, [])

    return {
        isMobile,
        isTablet: !isMobile && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024
    }

}