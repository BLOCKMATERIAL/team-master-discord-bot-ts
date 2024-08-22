import { Document, Schema, model } from 'mongoose';

interface ITeamHistoryEntry {
  teamId: string;
  game: string;
  joinedAt: Date;
  leftAt?: Date;
  isReserve: boolean;
}

interface IUser extends Document {
  userId: string;
  username: string;
  displayName: string;
  games: string[];
  teamHistory: ITeamHistoryEntry[];
  notificationsEnabled: boolean;

}

const TeamHistoryEntrySchema = new Schema<ITeamHistoryEntry>({
  teamId: { type: String, required: true },
  game: { type: String, required: true },
  joinedAt: { type: Date, required: true },
  leftAt: { type: Date },
  isReserve: { type: Boolean, default: false },
});

const UserSchema = new Schema<IUser>({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  games: [{ type: String, ref: 'Game' }],
  teamHistory: [TeamHistoryEntrySchema],
  notificationsEnabled: { type: Boolean, default: true },

});

export const User = model<IUser>('User', UserSchema);
