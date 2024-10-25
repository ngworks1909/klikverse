type GAME_STATUS = "Pending" | "Running" | "Finished"
import prisma from '../lib/auth';
import {socketManager} from '../manager/SocketManager'


export class LudoGame {
    private gameId: string;
    private roomId: string;
    private players: string[];
    private currentTurn: number;
    private lastScore: number;
    private gameStatus: GAME_STATUS = "Pending";
    private playerOffSets: number[];
    private safePositions: number[] = [5, 11, 17, 23, 29, 35, 41, 47];
    private winAmount: number
    private playerPositions: { [key: string]: number[] };

    constructor(gameId: string, roomId: string, playerId: string, winAmount: number){
        this.gameId = gameId;
        this.roomId = roomId;
        this.players = [];
        this.playerPositions = {};
        this.addPlayer(playerId);
        this.playerOffSets = [0, 13, 26, 39]
        this.currentTurn = 0;
        this.lastScore = 0;
        this.winAmount = winAmount
    }

    public startGame(){
        this.gameStatus = "Running";
        socketManager.broadcast(this.roomId, 'START_GAME', 'The game has started');
        socketManager.broadcast(this.roomId, 'CURRENT_TURN', `${this.players[this.currentTurn]}`)
    }
    public getRoomId(){
      return this.roomId;
    }

    public getPlayerSize(){
        return this.players.length
    }
    public getPlayerIds(){
        return this.players
    }

    public addPlayer(userId: string){
        this.players.push(userId);
        this.playerPositions[userId] = [0, 0, 0, 0];
    }

    public isValidTurn(playerId: string){
        return this.players[this.currentTurn] !== playerId 
    }

    public makeMove(playerId: string, pieceId: number, steps: number){
        //check if current turn of user and event creator are same
        if(!this.isValidTurn(playerId)){
            return
        }

        const isAllHome = this.playerPositions[playerId].every(position => position === 0);
        if(isAllHome && steps !== 6){
            this.nextTurn();
            return;
        }
        const piecePosition = this.playerPositions[playerId][pieceId];
        if(steps === 6){
            if(piecePosition === 6){
                this.playerPositions[playerId][pieceId] = 1;
                this.broadcastMove(playerId, pieceId, 1)
                this.lastScore = 6;
                return;
            }
        }
        const newPosition = this.calculateNewPosition(piecePosition, steps);
        if(newPosition < 57){
            this.playerPositions[playerId][pieceId] = newPosition;
            this.broadcastMove(playerId, pieceId, newPosition)
            this.lastScore = steps;
            this.checkForKill(newPosition, playerId);
            return
        }
    }

    public checkWinCondition(playerId: string): boolean {
        return this.playerPositions[playerId].every(position => position >= 57);
    }

    private broadcastMove(playerId: string, pieceId: number, steps: number){
        const message = JSON.stringify({payload: {playerId, pieceId , steps}});
            socketManager.broadcast(this.roomId, 'UPDATE_MOVE', message);
    }

    private getPlayerOffset(playerId: string){
        const index = this.players.findIndex(p => p === playerId);
        if(this.players.length === 2 && index === 1){
            return this.playerOffSets[2]
        }
        return this.playerOffSets[index]
    }

    private checkForKill(newPosition: number, currentPlayerId: string) {
        const playerOffset = this.getPlayerOffset(currentPlayerId);
        const normalizedPosition = (newPosition + playerOffset) % 52; // Normalizing position to check kills
    
        for (const [playerId, pieces] of Object.entries(this.playerPositions)) {
            if (playerId !== currentPlayerId) {
                for (let i = 0; i < pieces.length; i++) {
                    // Check if the opponent's piece is on the normalized position and not on a safe position
                    const opponentPiecePosition = (pieces[i] + this.getPlayerOffset(playerId)) % 52;
                    if (pieces[i] !== 0 && opponentPiecePosition === normalizedPosition && !this.isSafePosition(normalizedPosition)) {
                        // Kill the opponent's piece
                        pieces[i] = 0; // Send piece back to home
                        const killMessage = JSON.stringify({ payload: { playerId, pieceId: i } });
                        socketManager.broadcast(this.roomId, 'KILL_PIECE', killMessage);
                    }
                }
            }
        }
    }

    private isSafePosition(position: number): boolean {
        return this.safePositions.includes(position);
    }

    public rollDice(roomId: string, playerId: string){
        console.log('Dice roll called')
        if(!this.isValidTurn(playerId)){
            return
        }
        console.log('Dice rolled')
        const steps =  Math.floor(Math.random() * 6) + 1;
        const message = JSON.stringify({payload: {playerId, steps}})
        socketManager.broadcast(roomId, 'DICE_ROLLED', message);
    }

    private calculateNewPosition(piecePosition: number, steps: number){
        return piecePosition + steps
    }

    public nextTurn(){
        if(this.lastScore === 6){
            socketManager.broadcast(this.roomId, 'CURRENT_TURN', this.players[this.currentTurn])
            return
        }

        this.currentTurn = (this.currentTurn + 1) % this.players.length;
        socketManager.broadcast(this.roomId, 'CURRENT_TURN', this.players[this.currentTurn]);
        this.lastScore = 0;
    }

    public async endGame(winnerId: string){
        await prisma.$transaction(async(tx) => {
            await tx.room.update({
                where: {
                    roomId:this.roomId
                },
                data: {
                    winnerId
                }
            });

            const wallet = await tx.wallet.findFirst({
                where: {
                    userId: winnerId
                }
            });

            if(!wallet){
                return
            }

            await tx.wallet.update({
                where: {
                    walletId: wallet.walletId
                },
                data: {
                    winnings: {
                        increment: this.winAmount
                    },
                }
            })
        })

    }


    public removePlayer(userId: string){
        this.players.splice(this.players.indexOf(userId), 1);
        if(this.gameStatus !== "Pending" && this.players.length === 1){
            this.endGame(this.players[0])
        }
    }

    public getGameId(){
        return this.gameId
    }

}