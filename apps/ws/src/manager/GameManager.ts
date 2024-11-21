import { Socket } from "socket.io";
import { LudoGame } from "../ludo/LudoGame";
import prisma from "../lib/auth";
import {createId} from '@paralleldrive/cuid2'
import { socketManager } from "./SocketManager";
import { validateInitGame, validateMovePiece, validateRoomId, validateUpdateMove } from "../zod/validateGame";
import { FastLudoGame } from "../ludo/FastLudoGame";

export class User{
    private userId: string;
    private socket: Socket;

    constructor(userId: string, socket: Socket) {
        this.userId = userId;
        this.socket = socket;
    }

    public getSocket(){
        return this.socket
    }
    public getUserId(){
        return this.userId
    }
}
export class GameManager {
    private onlineUsers: User[];
    private ludogames: LudoGame[];
    private fastludogames: FastLudoGame[]
    
    private pendingRooms: Map<string, string>
    private roomManager: Map<string, "LUDO" | "FAST_LUDO" | "RUMMY" | "CRICKET">

    constructor() {
        this.onlineUsers = []
        this.ludogames = [];
        this.fastludogames = []
        this.pendingRooms = new Map();
        this.roomManager = new Map()
    }

    public addUser(user: User) {
        this.onlineUsers.push(user)
        this.addHandler(user)
    }

    public removeUser(socket: Socket) {
        const user = this.onlineUsers.find(u => u.getSocket().id === socket.id);
        if(!user){
            console.log('User not found?');
            return;
        }
        this.onlineUsers = this.onlineUsers.filter(u => u.getSocket().id!== socket.id);
    }

    private addHandler(user: User){
        user.getSocket().on('INIT_GAME', async(data) => {
            const message = JSON.parse(data)
            console.log('INIT started')
            if(!message || !message.payload){
                return
            }
            const isValidInit = validateInitGame.safeParse(message.payload);
            if(!isValidInit.success) return 
            const {gameId} = message.payload;
            if(!gameId) return
            const gameDetails = await this.fetchGameDetails(gameId);
            if(!gameDetails){
                user.getSocket().send('Game not found')
                console.log('Game not found');
                return;
            }
            const pendingRoomId = this.pendingRooms.get(gameId)
            if(pendingRoomId){
                if(gameDetails.gameType === "LUDO"){
                    const ludogame = this.ludogames.find(l => l.getRoomId() === pendingRoomId);
                    if(!ludogame){
                        console.log('Pending ludo game not found');
                        return
                    }
                    if(user.getUserId() in ludogame.getPlayerIds()){
                        user.getSocket().emit('GAME_ALERT', {message: 'Trying to connect with yourself?'});
                        return
                    };
                    ludogame.addPlayer(user.getUserId());
                    socketManager.addUser(pendingRoomId, user)
                    if(ludogame.getPlayerSize() === gameDetails.maxPlayers){
                        this.pendingRooms.set(gameId, "")
                            this.roomManager.set(pendingRoomId, "LUDO")
                            ludogame.startGame();
                        // const isGameCreated = await this.storeLudoGameToDB(ludogame)
                        // if(isGameCreated){
                        //     this.pendingLudoRoomId = null;
                        //     ludogame.startGame();
                        //     return;
                        // }
                        // else{
                        //     const message = JSON.stringify({payload: {roomId: this.pendingLudoRoomId}})
                        //     socketManager.broadcast(this.pendingLudoRoomId, 'EXIT_GAME', message)
                        // }
                        
                    }
                    return
                }

                if(gameDetails.gameType === "FAST_LUDO"){
                    const fastludogame = this.fastludogames.find(l => l.getRoomId() === pendingRoomId);
                    if(!fastludogame){
                        console.log('Pending ludo game not found');
                        return
                    }
                    if(user.getUserId() in fastludogame.getPlayerIds()){
                        user.getSocket().emit('GAME_ALERT', {message: 'Trying to connect with yourself?'});
                        return
                    };
                    fastludogame.addPlayer(user.getUserId());
                    socketManager.addUser(pendingRoomId, user)
                    if(fastludogame.getPlayerSize() === gameDetails.maxPlayers){
                            this.pendingRooms.set(gameId, "")
                            this.roomManager.set(pendingRoomId, "FAST_LUDO")
                            fastludogame.startGame();
                        // const isGameCreated = await this.storeLudoGameToDB(ludogame)
                        // if(isGameCreated){
                        //     this.pendingLudoRoomId = null;
                        //     ludogame.startGame();
                        //     return;
                        // }
                        // else{
                        //     const message = JSON.stringify({payload: {roomId: this.pendingLudoRoomId}})
                        //     socketManager.broadcast(this.pendingLudoRoomId, 'EXIT_GAME', message)
                        // }
                        
                    }
                }
            }
            else{
                if(gameDetails.gameType === "LUDO"){
                    const {entryFee, maxPlayers} = gameDetails;
                    const totalAmount = entryFee * maxPlayers;
                    const tax = totalAmount * 0.05;
                    const winAmount = totalAmount - tax;
    
                    const roomId = createId()
                    const game = new LudoGame(gameId, roomId, user.getUserId(), winAmount);
                    socketManager.addUser(roomId, user)
                    this.ludogames.push(game);
                    user.getSocket().send(`New game created with roomId: ${roomId}`)
                    console.log('NEW game created')
                    this.pendingRooms.set(gameId, roomId);
                    return
                }
                if(gameDetails.gameType === "FAST_LUDO"){
                    const {entryFee, maxPlayers} = gameDetails;
                    const totalAmount = entryFee * maxPlayers;
                    const tax = totalAmount * 0.05;
                    const winAmount = totalAmount - tax;
    
                    const roomId = createId()
                    const game = new FastLudoGame(gameId, roomId, user.getUserId(), winAmount);
                    socketManager.addUser(roomId, user)
                    this.fastludogames.push(game);
                    user.getSocket().send(`New game created with roomId: ${roomId}`)
                    console.log('NEW game created')
                    this.pendingRooms.set(gameId, roomId);
                }
            }
        });

        user.getSocket().on('ROLL_DICE', (data) => {
            const message = JSON.parse(data);
            if(!message || !message.payload){
                return
            }
            const isValidRoom = validateRoomId.safeParse(message.payload);
            if(!isValidRoom.success){
                return
            }
            const {roomId} = message.payload
            const gameType = this.roomManager.get(roomId);
            if(gameType === "LUDO"){
                const ludogame = this.ludogames.find(l => l.getRoomId() == roomId);
                if(ludogame){
                    ludogame.rollDice(roomId, user.getUserId());
                }
                return
            }
            if(gameType === "FAST_LUDO"){
                const fastludogame = this.fastludogames.find(l => l.getRoomId() == roomId);
                if(fastludogame){
                    fastludogame.rollDice(roomId, user.getUserId());
                }
            }
            
        })

        user.getSocket().on('MOVE_PIECE', async(data) => {
            const message = JSON.parse(data);
            if(!message || !message.payload) return
            const isValidMove = validateMovePiece.safeParse(message.payload)
            if(!isValidMove.success) return
            const {roomId, pieceId} = message.payload;
            const ludogame = this.ludogames.find(l => l.getRoomId() === roomId);
            if(ludogame){
               ludogame.makeMove(user.getUserId(), pieceId);
            }
        });

        user.getSocket().on('MOVE_UPDATED', async(data) => {
            const message = JSON.parse(data);
            if(!message || !message.payload) return
            const isValidUpdateMove = validateUpdateMove.safeParse(message.payload)
            if(!isValidUpdateMove.success) return
            const {roomId, newPosition} = message.payload;
            const ludogame = this.ludogames.find(l => l.getRoomId() === roomId);
            if(ludogame){
                if(newPosition === 57){
                    const playerId = user.getUserId()
                    const hasWonGame = ludogame.checkWinCondition(playerId)
                    if(hasWonGame){
                        await ludogame.endGame(playerId)
                        this.deleteGame(roomId)
                        const message = JSON.stringify({payload: {roomId, winnerId: playerId}})
                        socketManager.broadcast(roomId, 'WON_GAME', message)
                        return
                    }
                }
                
                ludogame.nextTurn();
            }
        });

        user.getSocket().on('EXIT_GAME', (data) => {
            const message = JSON.parse(data);
            const {roomId} = message.payload;
            const ludogame = this.ludogames.find(l => l.getRoomId() === roomId);
            if(ludogame){
                ludogame.removePlayer(user.getUserId());
                socketManager.removeUser(user)
            }
        })
    }

    private async fetchGameDetails(gameId: string){
        const details = await prisma.game.findUnique({
            where: {
                gameId
            }
        });
        return details 
    }

    private deleteGame(roomId: string){
        const gameType = this.roomManager.get(roomId);
        if(gameType === "LUDO"){
            this.ludogames = this.ludogames.filter(game => game.getRoomId() !== roomId);
        }
        else if(gameType === "FAST_LUDO"){
            this.fastludogames = this.fastludogames.filter(game => game.getRoomId() !== roomId)
        }
        socketManager.deleteRoom(roomId)
    }

    private async storeLudoGameToDB(game: LudoGame){
        const playerIds = game.getPlayerIds();
        await prisma.room.create({
            data: {
                roomId: game.getRoomId(),
                gameId: game.getGameId(),
                players: {
                    create: [
                        {userId: playerIds[0]},
                        {userId: playerIds[1]}
                    ]
                }
            }
        })
        // const status = await prisma.$transaction(async(tx) => {
        //     await tx.room.create({
        //         data: {
        //             roomId: game.getRoomId(),
        //             gameId: game.getGameId(),
        //             players: {
        //                 create: playerIds.map((userId) => {
        //                     return {
        //                         userId
        //                     }
        //                 })
        //             }
        //         }
        //     });

        //     const gameDetails = await tx.game.findUnique({
        //         where: {
        //             gameId: game.getGameId()
        //         },
        //         select: {
        //             entryFee: true
        //         }
        //     })

        //     if(!gameDetails){
        //         return false
        //     }

        //     for(const playerId of playerIds){
        //         const wallet = await tx.wallet.findFirst({
        //             where: {
        //                 userId: playerId
        //             }
        //         });
        //         if(!wallet){
        //             return false
        //         }
        //         const {entryFee} = gameDetails;
        //         await tx.wallet.update({
        //             where: {
        //                 walletId: wallet?.walletId
        //             },
        //             data: {
        //                 totalBalance: {
        //                     decrement: entryFee
        //                 },
        //                 deposit: {
        //                     increment: entryFee
        //                 }
        //             }
        //         })
        //     }
        //     return true;
        // });
        // return !!status
        return false
    }
}