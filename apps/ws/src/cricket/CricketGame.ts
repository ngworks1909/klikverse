import { GAME_STATUS } from "../ludo/LudoGame";
import { socketManager } from "../manager/SocketManager";

export class Player{
    private playerId: string;
    private hasBatted: boolean = false;
    private score: number = 0;

    constructor(playerId: string){
        this.playerId = playerId
    }

    public getPlayerId(){
        return this.playerId
    }

    public getBatted(){
        return this.hasBatted
    }

    public getScore(){
        return this.score
    }

    public setBatted(){
        this.hasBatted = true
    }

    public updateScore(score: number){
        this.score += score
    }

    public setPlayerId(playerId: string){
        this.playerId = playerId
    }


}

export class CricketGame {
    private gameId: string;
    private roomId: string;
    private player1: Player;
    private player2: Player;
    private battingTurn: number;
    private gameStatus: GAME_STATUS = "Pending";
    private ballsBowled: number = 0;
    private xPosition: number = 0;
    private yPosition: number = 0;
    private speedMeter: number = 0;


    constructor(gameId: string, roomId: string, playerId: string){
        this.gameId = gameId;
        this.roomId = roomId;
        this.player1 = new Player(playerId);
        this.player2 = new Player("")
        this.battingTurn = 0;
    }
    public startGame(){
        if(!this.player1 || !this.player1.getPlayerId()){
            return
        }
        this.battingTurn = 0
        this.gameStatus = "Running";
        socketManager.broadcast(this.roomId, 'START_GAME', 'The game has started');
        socketManager.broadcast(this.roomId, 'CURRENT_TURN', `${this.player1.getPlayerId()}`)
    }

    public addPlayer(userId: string){
        if(!this.player1.getPlayerId()) {
            this.player1 = new Player(userId)
        }
        else if(!this.player2.getPlayerId()){
            this.player2 = new Player(userId)
        }
    }

    public removePlayer(userId: string){
        if(this.player1.getPlayerId() === userId){
            this.player1.setPlayerId("")
        }
        else{
            this.player2.setPlayerId("")
        }
    }

    public throwBall(){
        const message = JSON.stringify({payload: {xPosition: this.xPosition, yPosition: this.yPosition}});
        socketManager.broadcast(this.roomId, 'BALL_THROWN', message);
    }

    public setSpeed(speed: number){
        this.speedMeter = speed
    }
    private isValidPlayer(playerId: string){
        return (this.battingTurn === 0 && this.player1.getPlayerId() === playerId) || (this.battingTurn === 1 && this.player2.getPlayerId() === playerId)
    }
    public moveBall(x: number, y: number, playerId: string){
        if(!this.isValidPlayer(playerId)) return
        this.xPosition = x;
        this.yPosition = y;
        const message = JSON.stringify({payload: {xPosition: this.xPosition, yPosition: this.yPosition}});
        socketManager.broadcast(this.roomId, 'BALL_MOVED', message);
    }

    public hitBall(score: number, playerId: string){
        if(!this.isValidPlayer(playerId)) return;
        this.ballsBowled += 1
        const noBall = this.speedMeter > 60
        if(noBall){
            this.ballsBowled -= 1;
            score += 1
        }
        if(playerId === this.player1.getPlayerId()){
            this.player1.updateScore(score);
        }
        else{
            this.player2.updateScore(score)
        }
        const message = JSON.stringify({payload: {score, noBall}});
        socketManager.broadcast(this.roomId, 'UPDATE_SCORE', message);
        if(noBall) return
        if(this.ballsBowled === 6 && this.player1.getBatted() && this.player2.getBatted()){
            this.endGame()
        }
        else{
            this.inningsBreak()
        }
    }

    private inningsBreak(){
        this.player1.setBatted()
        this.battingTurn = 1
        socketManager.broadcast(this.roomId, 'CURRENT_TURN', `${this.player2.getPlayerId()}`)
    }

    private endGame(){
        this.gameStatus = "Finished"
        const winnerId = (this.player1.getScore() > this.player2.getScore()) ? this.player1.getPlayerId() : this.player2.getPlayerId();
        socketManager.broadcast(this.roomId, 'END_GAME', `${winnerId}`)
    }

}