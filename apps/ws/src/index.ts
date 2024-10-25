import express from 'express';
import http from 'http'
import { Server } from "socket.io";
import { GameManager } from './manager/GameManager';
import { extractJwtToken } from './auth';
import dotenv from 'dotenv'

dotenv.config()
const app = express();

app.get("/",(req,res)=>{
    res.send('Hello User')
})

const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: "*", // Allow any origin (adjust as needed for production)
        methods: ["GET", "POST"], // Allow only specific HTTP methods
    }
});

const gameManager = new GameManager();


io.on('connection', (socket) => {
    let token = socket.handshake.query.token
    if (Array.isArray(token)) {
        token = token[0]; 
    }
    if(!token){
        return socket.disconnect(true)
    }
    const user = extractJwtToken(token, socket)
    if(!user){
        return socket.disconnect(true)
    }
    gameManager.addUser(user)
    socket.send('Connected to socket server')
    
    socket.on('disconnect', () => {
        gameManager.removeUser(socket)
    });
})


server.listen(process.env.PORT || 3000, () => {
    console.log(`Websocket server is running on port ${process.env.PORT}`)
})

