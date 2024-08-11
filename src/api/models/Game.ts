import mongoose, { Schema, Document } from 'mongoose';

export interface IGame extends Document {
  name: string;
  value: string;
}

const GameSchema: Schema = new Schema({
  name: { type: String, required: true },
  value: { type: String, required: true, unique: true }
});

export default mongoose.model<IGame>('Game', GameSchema);