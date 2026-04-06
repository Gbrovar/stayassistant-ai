if (import.meta.env.DEV) {
  console.log("VITE_API_URL =", import.meta.env.VITE_API_URL)
}

export const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000"