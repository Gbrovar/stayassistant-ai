import jwt from "jsonwebtoken"

export function authenticate(req, res, next) {

  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: "missing token" })
  }

  const token = authHeader.split(" ")[1]

  try {

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    )

    req.propertyId = decoded.propertyId
    req.userEmail = decoded.email

    next()

  } catch (err) {

    return res.status(401).json({ error: "invalid token" })

  }

}

export function requireAdmin(req, res, next) {

  const adminEmail = process.env.ADMIN_EMAIL

  if (!req.userEmail) {
    console.log("❌ NO EMAIL IN TOKEN")
    return res.status(403).json({ error: "no email in token" })
  }

  if (req.userEmail !== adminEmail) {
    console.log("❌ NOT ADMIN:", req.userEmail)
    return res.status(403).json({ error: "admin only" })
  }

  next()
}