import { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken'


export function authenticateToken(req: any, res: Response, next: NextFunction) {
  const token = req.headers['authorization'] // Assuming Bearer token format

  if (!token) {
    return res.status(401).send('Unauthorized token'); // Unauthorized
  }

  jwt.verify(token, process.env.JWT_SECRET || "secret", (err: any, user: any) => {
    if (err) {
      return res.status(403).send('Forbidden error'); // Forbidden
    }
    req.user = user; // Save user information for use in the next middleware
    next(); // Proceed to the next middleware
  });
}
