import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'moderator' | 'user';
}

export interface ITeamData {
  teamId: string;
  leader: IPlayer;
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
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'moderator', 'user'], default: 'user' },

});

const TeamSchema: Schema = new Schema({
  teamId: { type: String, required: true, unique: true },
  leader: PlayerSchema,
  players: [PlayerSchema],
  reserve: [PlayerSchema],
  createdAt: { type: Date, required: true },
  startTime: { type: String },
  voiceChannelId: { type: String },
  notes: { type: String },
  channelId: { type: String, required: true },
  messageId: { type: String, required: true },
  slots: { type: Number, required: true },
  status: {
    type: String,
    required: true,
    enum: ['active', 'inactive', 'disbanded'],
    default: 'active',
  },
  game: { type: String, required: true },
  serverId: { type: String, required: true },
  serverName: { type: String, required: true },
});

export default mongoose.model<ITeamDocument>('Team', TeamSchema);