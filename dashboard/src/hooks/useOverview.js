import { useEffect, useState } from "react"
import { API_URL } from "../api/config"

export default function useOverview() {

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    async function load() {

      try {

        const token = localStorage.getItem("token")

        const res = await fetch(`${API_URL}/api/dashboard/overview`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        const json = await res.json()

        setData(json)

      } catch (err) {

        console.error("Overview fetch error", err)

      } finally {
        setLoading(false)
      }

    }

    load()

  }, [])

  return { data, loading }

}