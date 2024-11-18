import { Socket } from "socket.io";
export class User{
    private readonly userId: string;
    private readonly socket: Socket;

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