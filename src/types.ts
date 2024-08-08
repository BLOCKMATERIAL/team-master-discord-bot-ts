export interface Team {
    id: string;
    leader: string;
    players: string[];
    reserve: string[];
    createdAt: Date;
    channelId: string;
    messageId: string;
    slots: number;
    game: string;
    startTime?: string;
}

export interface Game {
    name: string;
    value: string;
}