import jwt from "jsonwebtoken";

export default function auth(req, res, next) {
  const header = req.headers.authorization;
  console.log('Auth header:', header);
  
  if(!header) return res.status(401).json({ message: "No token" });
  const token = header.split(" ")[1];
  console.log('Extracted token:', token ? token.substring(0, 20) + '...' : 'null');
  
  if (!token) return res.status(401).json({ message: "Invalid token format" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded payload:', payload);
    req.userId = payload.id;
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(401).json({ message: "Token invalid" });
  }
}