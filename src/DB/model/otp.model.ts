import { Schema, model, Types } from 'mongoose';
export type OtpPurpose = 'confirm-email' | 'reset-password' | 'change-email' | 'two-factor-setup' | 'two-factor-login';
export interface IOtp {
  userId: Types.ObjectId; purpose: OtpPurpose; hash: string; email: string;
  expiresAt: Date; sentAt: Date; attempts: number; tokenVersion: number;
}
const schema = new Schema<IOtp>({
  userId: { type: Schema.Types.ObjectId, required: true },
  purpose: { type: String, required: true }, hash: { type: String, required: true },
  email: { type: String, required: true }, expiresAt: { type: Date, required: true },
  sentAt: { type: Date, required: true }, attempts: { type: Number, default: 0 }, tokenVersion: { type: Number, default: 0 },
});
schema.index({ userId: 1, purpose: 1 }, { unique: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default model<IOtp>('Otp', schema);
