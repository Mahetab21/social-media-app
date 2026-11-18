import { Schema, model, Types } from 'mongoose';
export interface IFriendRequest { sendTo: Types.ObjectId; createdBy: Types.ObjectId; pairKey: string; acceptedAt?: Date; deletedAt?: Date; }
const schema = new Schema<IFriendRequest>({
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  sendTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  pairKey: { type: String, required: true, unique: true }, acceptedAt: Date, deletedAt: Date,
}, { timestamps: true });
export default model<IFriendRequest>('FriendRequest', schema);
