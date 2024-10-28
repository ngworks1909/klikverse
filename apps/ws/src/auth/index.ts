import jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { User } from '../manager/GameManager';


export interface userJwtClaims {
    userId: string
}

export const extractJwtToken = (token: string, socket: Socket): User | null => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret") as userJwtClaims;
        if(!decoded.userId) return null
        return new User(decoded.userId, socket)
    } catch (error) {
        return null
    }
    
}