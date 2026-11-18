import { Types } from 'mongoose';
import User from '../DB/model/user.model';
import Otp, { OtpPurpose } from '../DB/model/otp.model';
import { Hash, Compare } from '../utils/hash';
import { generateOtp, sendEmail } from './sendEmail';
import { emailTemplate } from './email.temp';
import { AppError } from '../utils/classError';
export async function issueOtp(userId: Types.ObjectId, email: string, purpose: OtpPurpose) {
  const user = await User.findOne({ _id: userId, deletedAt: { $exists: false } });
  if (!user) throw new AppError('Account unavailable', 400);
  const code = String(await generateOtp()), hash = await Hash(code), now = new Date();
  try {
    await Otp.findOneAndUpdate({ userId, purpose, sentAt: { $lte: new Date(Date.now() - 60000) } }, {
      $set: { email, hash, sentAt: now, expiresAt: new Date(Date.now() + 600000), attempts: 0, tokenVersion: user.tokenVersion ?? 0 },
    }, { upsert: true, new: true });
  } catch (error: any) {
    if (error.code === 11000) throw new AppError('Wait one minute before requesting another code', 429);
    throw error;
  }
  try { await sendEmail({ to: email, subject: 'Social Media: ' + purpose, html: emailTemplate(code, purpose) }); }
  catch (error) { await Otp.deleteOne({ userId, purpose, hash }); throw error; }
}
export async function consumeOtp(userId: Types.ObjectId, purpose: OtpPurpose, code: string) {
  const user = await User.findOne({ _id: userId, deletedAt: { $exists: false } });
  if (!user) throw new AppError('Invalid code', 400);
  // Increment atomically before comparing so concurrent guesses cannot bypass the attempt cap.
  const otp = await Otp.findOneAndUpdate({ userId, purpose, tokenVersion: user.tokenVersion ?? 0, expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }, { $inc: { attempts: 1 } }, { new: true });
  if (!otp || !await Compare(code, otp.hash)) throw new AppError('Invalid or expired code', 400);
  const consumed = await Otp.findOneAndDelete({ _id: otp._id, hash: otp.hash, expiresAt: { $gt: new Date() } });
  if (!consumed) throw new AppError('Code has already been used', 400);
  return consumed;
}
