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
  notes?: string;
  voiceChannelId?: string;
}

export interface Game {
  name: string;
  value: string;
}
