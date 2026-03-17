import { useEffect } from "react"

export default function Toast({ message, onClose }) {

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="toast">
      {message}
    </div>
  )
}