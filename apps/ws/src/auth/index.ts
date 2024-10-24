import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { User } from '../manager/GameManager';


export interface userJwtClaims {
    userId: string
}

export const extractJwtToken = (token: string, socket: Socket): User => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as userJwtClaims;
    return new User(decoded.userId, socket)
}