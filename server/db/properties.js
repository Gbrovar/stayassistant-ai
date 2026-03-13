import redis from "./redis.js"

export async function createProperty(property){

  const key = `stayassistant:property:${property.id}`

  await redis.set(key,JSON.stringify(property))

}

export async function getProperty(propertyId){

  const key = `stayassistant:property:${propertyId}`

  const data = await redis.get(key)

  if(!data) return null

  return JSON.parse(data)

}