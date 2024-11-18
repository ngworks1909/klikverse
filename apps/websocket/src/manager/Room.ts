export class Room {
    private readonly roomId: string;
    private readonly players: string[];
    private isPending: boolean;
    private readonly maxPlayers: number;
    constructor(id: string) {
      this.roomId = id;
      this.players = [];
      this.isPending = true;
      this.maxPlayers = 4;
    }
  
    addPlayer(player: string) {
      if (this.players.length >= this.maxPlayers) {
        throw new Error('Room is full');
      }
      
      this.players.push(player);
      
      // Update pending status if room is full
      if (this.players.length === this.maxPlayers) {
        this.isPending = false;
      }
      
      return true;
    }

    getRoomId() {
      return this.roomId;
    }
  
    getPlayerCount() {
      return this.players.length;
    }
  
    isFull() {
      return this.players.length === this.maxPlayers;
    }
    
    isPendingRoom() {
      return this.isPending;
    }
  }