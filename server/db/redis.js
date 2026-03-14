import { createClient } from "redis"

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL not configured")
}

redis.on("error", (err) => {
  console.error("Redis error:", err)
})

export async function connectRedis(){
  if(!redis.isOpen){
    await redis.connect()
    console.log("Redis connected")
  }
}

export default redis