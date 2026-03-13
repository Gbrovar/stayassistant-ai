import {createClient} from "redis"

const redis = createClient({
  url:process.env.REDIS_PUBLIC_URL
})

redis.on("error",(err)=>{
  console.log("Redis error",err)
})

await redis.connect()

export default redis