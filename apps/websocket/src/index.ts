import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import { extractJwtToken } from './auth/auth'
import { userManager } from './manager/UserManager'

const app = express()

app.get('/',(req,res)=>{
    res.send('Hello User')
})

const server = http.createServer(app);

export const io = new Server(server, {
    cors: {
        origin: "*", // Allow any origin (adjust as needed for production)
        methods: ["GET", "POST"], // Allow only specific HTTP methods
    }
})

io.on('connection', (socket) => {
    socket.send('Connected to socket server')
    socket.on('ADD_USER', (data) => {
        const token = data;
        if(!token){
            const message = 'Token not found'
            socket.emit('DISCONNECT_USER', message)
            return
        }
        const user = extractJwtToken(token, socket)
        if(!user){
            const message = 'Invalid Token'
            socket.emit('DISCONNECT_USER', message)
            return
        }
        userManager.addUser(user);
    })
    
    socket.on('disconnect', () => {
        userManager.removeUser(socket.id)
    });
})


server.listen(process.env.PORT || 3000, () => {
    console.log(`Websocket server is running on port ${process.env.PORT}`)
})

