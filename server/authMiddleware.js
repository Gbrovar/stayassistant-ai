import jwt from "jsonwebtoken"

export function authenticate(req,res,next){

  const authHeader = req.headers.authorization

  if(!authHeader){
    return res.status(401).json({error:"missing token"})
  }

  const token = authHeader.split(" ")[1]

  try{

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "stayassistant_secret"
    )

    req.propertyId = decoded.propertyId

    next()

  }catch(err){

    return res.status(401).json({error:"invalid token"})

  }

}