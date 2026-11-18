import { Schema, model, Types } from 'mongoose';
export interface IRevokeToken { userId: Types.ObjectId; tokenId: string; expireAt: Date; }
const schema = new Schema<IRevokeToken>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tokenId: { type: String, required: true, unique: true },
  expireAt: { type: Date, required: true, expires: 0 },
}, { timestamps: true });
export default model<IRevokeToken>('RevokeToken', schema);
