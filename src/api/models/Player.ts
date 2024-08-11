import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  userId: string;
  username: string;
  displayName: string;
  games: string[];
  teamHistory: {
    teamId: string;
    game: string;
    joinedAt: Date;
    leftAt?: Date;
  }[];
}

const UserSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  games: [{ type: String, ref: 'Game' }],
//   teamHistory: [{
//     teamId: { type: String, required: true },
//     game: { type: String, required: true },
//     joinedAt: { type: Date, required: true },
//     leftAt: { type: Date }
//   }]
});

export default mongoose.model<IUser>('User', UserSchema);