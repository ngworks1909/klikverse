import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'

export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers['authorization'] ; // Get token from the 'Authorization' header

  if (!token) {
    return res.status(403).send('No token provided.');
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET || "secret", (err, decoded) => {
    if (!decoded || err) {
      return res.status(403).send('Failed to authenticate token.');
    }

    // Check if the user is an admin
    if (decoded && typeof decoded === 'object' && 'role' in decoded) {
  
        // Check if the user is an admin
        if (decoded.role !== 'admin') {
          return res.status(403).send('Access denied. Admins only.');
        }
  
        // Proceed to the next middleware if the user is admin
        next();
      } else {
        return res.status(403).send('Invalid token payload.');
      }
  });
}