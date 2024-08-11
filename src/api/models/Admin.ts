import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  userId: string;
  username: string;
  displayName: string;
  addedAt: Date;
}

const AdminSchema: Schema = new Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  displayName: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
});

export default mongoose.model<IAdmin>('Admin', AdminSchema);