import { Socket } from "socket.io";
import { LudoGame } from "../ludo/LudoGame";
import prisma from "../lib/auth";
import {createId} from '@paralleldrive/cuid2'
import { socketManager } from "./SocketManager";

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
    private pendingLudoRoomId: string | null;

    constructor() {
        this.onlineUsers = []
        this.ludogames = [];
        this.pendingLudoRoomId = null;
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
            const message = JSON.parse(data);
            const {gameId} = message.payload;
            const gameDetails = await this.fetchGameDetails(gameId);
            if(!gameDetails){
                user.getSocket().send('Game not found')
                console.log('Game not found');
                return;
            }
            if(this.pendingLudoRoomId){
                const ludogame = this.ludogames.find(l => l.getRoomId() === this.pendingLudoRoomId);
                if(!ludogame){
                    console.log('Pending game not found');
                    return
                }
                if(user.getUserId() in ludogame.getPlayerIds()){
                    user.getSocket().emit('GAME_ALERT', {message: 'Trying to connect with yourself?'});
                    return
                };

                ludogame.addPlayer(user.getUserId());
                socketManager.addUser(this.pendingLudoRoomId, user)
                if(ludogame.getPlayerSize() === gameDetails.maxPlayers){
                    const isGameCreated = await this.storeLudoGameToDB(ludogame)
                    if(isGameCreated){
                        this.pendingLudoRoomId = null;
                        ludogame.startGame();
                        return;
                    }
                    else{
                        const message = JSON.stringify({payload: {roomId: this.pendingLudoRoomId}})
                        socketManager.broadcast(this.pendingLudoRoomId, 'EXIT_GAME', message)
                    }
                    
                }

            }
            else{
                const {entryFee, maxPlayers} = gameDetails;
                const totalAmount = entryFee * maxPlayers;
                const tax = totalAmount * 0.05;
                const winAmount = totalAmount - tax;

                const roomId = createId()
                const game = new LudoGame(gameId, roomId, user.getUserId(), winAmount);
                this.ludogames.push(game);
                user.getSocket().send('New game created')
                this.pendingLudoRoomId = roomId;
            }
        });

        user.getSocket().on('ROLL_DICE', (data) => {
            const message = JSON.parse(data);
            const {roomId} = message.payload;
            const ludogame = this.ludogames.find(l => l.getRoomId() === roomId);
            if(ludogame){
                ludogame.rollDice(roomId, user.getUserId());
            }
        })

        user.getSocket().on('MOVE_PIECE', async(data) => {
            const message = JSON.parse(data);
            const {roomId, pieceId, steps} = message.payload;
            const ludogame = this.ludogames.find(l => l.getRoomId() === roomId);
            if(ludogame){
               ludogame.makeMove(user.getUserId(), pieceId, steps);
            }
        });

        user.getSocket().on('MOVE_UPDATED', async(data) => {
            const message = JSON.parse(data);
            const {roomId, playerId, newPosition} = message.payload;
            const ludogame = this.ludogames.find(l => l.getRoomId() === roomId);
            if(ludogame){
                if(newPosition === 57){
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
        this.ludogames = this.ludogames.filter(game => game.getRoomId() !== roomId);
        socketManager.deleteRoom(roomId)
    }

    private async storeLudoGameToDB(game: LudoGame){
        const playerIds = game.getPlayerIds();
        const status = await prisma.$transaction(async(tx) => {
            await tx.room.create({
                data: {
                    roomId: game.getRoomId(),
                    gameId: game.getGameId(),
                    players: {
                        create: playerIds.map((userId) => {
                            return {
                                userId
                            }
                        })
                    }
                }
            });

            const gameDetails = await tx.game.findUnique({
                where: {
                    gameId: game.getGameId()
                },
                select: {
                    entryFee: true
                }
            })

            if(!gameDetails){
                return false
            }

            for(const playerId of playerIds){
                const wallet = await tx.wallet.findFirst({
                    where: {
                        userId: playerId
                    }
                });
                if(!wallet){
                    return false
                }
                const {entryFee} = gameDetails;
                await tx.wallet.update({
                    where: {
                        walletId: wallet?.walletId
                    },
                    data: {
                        totalBalance: {
                            decrement: entryFee
                        },
                        deposit: {
                            increment: entryFee
                        }
                    }
                })
            }
            return true;
        });
        return !!status
    }
}