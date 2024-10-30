import { User } from "./GameManager";

export class SocketManager{
    private rooms: Map<string, User[]>
    private players: Map<string, string>
    private static instance: SocketManager
    constructor(){
        this.rooms = new Map();
        this.players = new Map()
    }

    static getInstance(){
        if(SocketManager.instance){
            return SocketManager.instance;
        }

        SocketManager.instance = new SocketManager();
        return SocketManager.instance;
    }

    public addUser(roomId: string,  user: User){
        const existingRoom = this.rooms.get(roomId);
        if(existingRoom){
            existingRoom.push(user)
            this.rooms.set(roomId, existingRoom)
            this.players.set(user.getUserId(), roomId)
        }
        else{
            const newRoom = [user];
            this.rooms.set(roomId, newRoom);
            this.players.set(user.getUserId(), roomId)
        }

        const data = JSON.stringify({userId: user.getUserId(), roomId})
        this.broadcast(roomId, 'USER_JOINED', data)

    }

    public removeUser(user: User){
        const roomId = this.players.get(user.getUserId());
        if(!roomId){
            console.log('User is not in any room?')
            return
        };
        const existringRoom = this.rooms.get(roomId);
        if(!existringRoom){
            console.log('Room doesnt exist?');
            return
        }

        const remainingUsers = existringRoom.filter(u => u.getUserId() !== user.getUserId());
        if(remainingUsers.length > 0){
            this.rooms.set(roomId, remainingUsers)
        }
        else{
            this.rooms.delete(roomId);
            this.players.delete(user.getUserId())
        }

    }

    public deleteRoom(roomId: string){
        if (this.rooms.has(roomId)) {
            this.rooms.delete(roomId);
        }
        
        for (const [userId, associatedRoomId] of this.players.entries()) {
            if (associatedRoomId === roomId) {
                this.players.delete(userId); 
            }
        }
    }

    public broadcast(roomId: string, event: string, message: string){
        const users = this.rooms.get(roomId);
        if(!users){
            console.log('No users in room?');
            return
        }
        if(event === "CURRENT_TURN"){
            const playerId = message;
            

        }
        users.forEach((user) => {
            user.getSocket().emit(event, message)
        })
    }
}


export const socketManager = SocketManager.getInstance()