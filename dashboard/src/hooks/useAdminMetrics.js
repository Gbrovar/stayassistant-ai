import { useEffect, useState } from "react"
import { API_URL } from "../api/config"

export default function useAdminMetrics() {

  const token = localStorage.getItem("token")

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {

    async function load() {

      try {

        const res = await fetch(`${API_URL}/admin/global-metrics`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const json = await res.json()

        setData(json)

      } catch (err) {
        console.error("Admin metrics error:", err)
      }

      setLoading(false)

    }

    load()

  }, [token])

  return { loading, data }

}