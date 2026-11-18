import { Schema, model, Types, HydratedDocument } from 'mongoose';
export enum GenderType { male = 'male', female = 'female' }
export enum RoleType { admin = 'admin', user = 'user', superAdmin = 'superAdmin' }
export enum ProviderType { google = 'google', system = 'system' }
export interface IUser {
  _id: Types.ObjectId; fName: string; lName: string; userName?: string; email: string;
  password: string; age: number; phone?: string; address?: string; gender: GenderType;
  role: RoleType; confirmed: boolean; provider: ProviderType; tokenVersion: number;
  changeCredentials?: Date; deletedAt?: Date; deletedBy?: Types.ObjectId;
  restoredAt?: Date; restoredBy?: Types.ObjectId; createdAt: Date; updatedAt: Date;
  image?: string; profileImage?: string; coverImage?: string; tempProfileImage?: string; tempProfileImageExpires?: Date;
  friends: Types.ObjectId[]; blockedUsers: Types.ObjectId[]; twoFactorEnabled: boolean;
}
export const publicUser = (user: any) => ({ _id: user._id, fName: user.fName, lName: user.lName, userName: user.userName, profileImage: user.profileImage });
function sanitize(_doc: unknown, result: Record<string, any>) {
  for (const key of ['password', 'otp', 'twoFactorOtp', 'twoFactorOtpExpiry', 'newEmail', 'emailChangeRequested', 'tempProfileImage', 'tempProfileImageExpires', 'tokenVersion', '__v']) delete result[key];
  return result;
}
const schema = new Schema<IUser>({
  fName: { type: String, required: true, minlength: 2, maxlength: 100, trim: true },
  lName: { type: String, required: true, minlength: 2, maxlength: 100, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: function () { return this.provider === ProviderType.system; } },
  age: { type: Number, min: 18, max: 60, required: function () { return this.provider === ProviderType.system; } },
  gender: { type: String, enum: GenderType, required: function () { return this.provider === ProviderType.system; } },
  phone: String, address: String, confirmed: { type: Boolean, default: false },
  provider: { type: String, enum: ProviderType, default: ProviderType.system },
  role: { type: String, enum: RoleType, default: RoleType.user }, tokenVersion: { type: Number, default: 0 },
  changeCredentials: Date, deletedAt: Date, deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  restoredAt: Date, restoredBy: { type: Schema.Types.ObjectId, ref: 'User' },
  image: String, profileImage: String, coverImage: String, tempProfileImage: String, tempProfileImageExpires: Date,
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }], blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  twoFactorEnabled: { type: Boolean, default: false },
}, { timestamps: true, strictQuery: true, toJSON: { virtuals: true, transform: sanitize }, toObject: { virtuals: true, transform: sanitize } });
schema.virtual('userName').get(function () { return this.fName + ' ' + this.lName; });
export default model<IUser>('User', schema);
