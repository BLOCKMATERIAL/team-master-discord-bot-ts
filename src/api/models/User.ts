import mongoose, { Schema, Document } from 'mongoose';
export interface IPlayer {
  id: string;
  name: string;
  isAdmin: boolean;
}

export interface ITeamData {
  teamId: string; 
  leader: string;
  players: IPlayer[];
  reserve: IPlayer[];
  createdAt: Date;
  startTime?: string;
  voiceChannelId?: string;
  notes?: string;
  channelId: string;
  messageId?: string;
  slots: number;
  status: 'active' | 'inactive' | 'disbanded';
  serverId: string; 
  serverName: string;
  game: string;
}

export interface ITeamDocument extends ITeamData, Document {}

const PlayerSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }
});


const TeamSchema: Schema = new Schema({
  teamId: { type: String, required: true, unique: true },  
  leader: { type: String, required: true },
  players: [PlayerSchema],
  reserve: [PlayerSchema],
  createdAt: { type: Date, required: true },
  startTime: { type: String },
  voiceChannelId: { type: String },
  notes: { type: String },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  slots: { type: Number, required: true },
  status: { type: String, required: true, enum: ['active', 'inactive', 'disbanded'], default: 'active' },
  game: { type: String, required: true },
  serverId: { type: String, required: true }, 
  serverName: { type: String, required: true }
});

export default mongoose.model<ITeamDocument>('Team', TeamSchema);