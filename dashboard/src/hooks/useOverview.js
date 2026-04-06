import { useEffect, useState } from "react"

export default function useOverview() {

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    async function load() {

      try {

        const token = localStorage.getItem("token")

        const res = await fetch("http://localhost:3000/api/dashboard/overview", {
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