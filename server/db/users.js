import redis from "./redis.js"

export async function createUser(user){

  const key = `stayassistant:user:${user.email}`

  await redis.set(key,JSON.stringify(user))

}

export async function getUser(email){

  const key = `stayassistant:user:${email}`

  const data = await redis.get(key)

  if(!data) return null

  return JSON.parse(data)

}