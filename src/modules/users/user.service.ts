import { Request, Response } from 'express';
import { connection, Types } from 'mongoose';
import { OAuth2Client } from 'google-auth-library';
import userModel, { RoleType, ProviderType, IUser } from '../../DB/model/user.model';
import postModel from '../../DB/model/post.model';
import FriendRequest from '../../DB/model/friendRequest.model';
import ChatModel from '../../DB/model/chat.model';
import { AppError } from '../../utils/classError';
import { Compare, Hash } from '../../utils/hash';
import { issueTokens, revokeSession } from '../../utils/token';
import { issueOtp, consumeOtp } from '../../service/otp';
import { uploadFile, createUploadFilePreSignedUrl, headFile, deleteFile } from '../../utils/s3.config';
import { signUpSchema, getOneUserSchemaType } from './user.validation';
import { pagination } from '../../utils/pagination';
import { activeUser, requireConnection } from '../../utils/privacy';

const active = { deletedAt: { $exists: false } };
const pair = (a: unknown, b: unknown) => [String(a), String(b)].sort().join(':');
class UserService {
  private async createAccount(data: any) {
    const { cPassword, ...fields } = data;
    const user = await userModel.create({ ...fields, password: await Hash(fields.password), role: RoleType.user, provider: ProviderType.system });
    await issueOtp(user._id, user.email, 'confirm-email');
    return user;
  }
  signUp = async (req: Request, res: Response) => res.status(201).json({ message: 'Account created; confirm the emailed code', user: await this.createAccount(req.body) });
  resendConfirmation = async (req: Request, res: Response) => {
    const user = await userModel.findOne({ email: req.body.email, confirmed: false, ...active });
    if (user) await issueOtp(user._id, user.email, 'confirm-email');
    return res.json({ message: 'If the account needs confirmation, a code has been sent' });
  };
  confirmEmail = async (req: Request, res: Response) => {
    const user = await userModel.findOne({ email: req.body.email, confirmed: false, ...active });
    if (!user) throw new AppError('Invalid confirmation request', 400);
    await consumeOtp(user._id, 'confirm-email', req.body.otp);
    await userModel.updateOne({ _id: user._id, ...active }, { $set: { confirmed: true } });
    return res.json({ message: 'Email confirmed' });
  };
  private async finishLogin(user: any, res: Response) {
    if (user.twoFactorEnabled) {
      await issueOtp(user._id, user.email, 'two-factor-login');
      return res.json({ message: 'Confirm the emailed login code', twoFactor: true });
    }
    return res.json({ message: 'Signed in', ...await issueTokens(user), user });
  }
  signIn = async (req: Request, res: Response) => {
    const user = await userModel.findOne({ email: req.body.email, confirmed: true, provider: ProviderType.system, ...active });
    if (!user || !await Compare(req.body.password, user.password)) throw new AppError('Invalid credentials', 401);
    return this.finishLogin(user, res);
  };
  login = this.signIn;
  logInWithGmail = async (req: Request, res: Response) => {
    if (!process.env.WEB_CLIENT_ID) throw new AppError('Google sign-in is not configured', 503);
    const ticket = await new OAuth2Client().verifyIdToken({ idToken: req.body.idToken, audience: process.env.WEB_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.email_verified || !payload.email) throw new AppError('Verified Google email required', 401);
    const email = payload.email.toLowerCase();
    let user = await userModel.findOne({ email });
    if (user && (user.deletedAt || user.provider !== ProviderType.google)) throw new AppError('Use the original account sign-in method', 401);
    if (!user) user = await userModel.create({
      email, confirmed: true, provider: ProviderType.google,
      fName: (payload.given_name || 'Google').padEnd(2, ' ').trim().length >= 2 ? (payload.given_name || 'Google') : 'Google',
      lName: payload.family_name && payload.family_name.length >= 2 ? payload.family_name : 'User',
      image: payload.picture, role: RoleType.user,
    });
    return this.finishLogin(user, res);
  };
  getProfile = async (req: Request, res: Response) => {
    const user = await userModel.findById(req.user!._id).populate('friends', 'fName lName profileImage');
    const groups = await ChatModel.find({ participants: req.user!._id, group: { $exists: true } }).select('-message').limit(50);
    return res.json({ user, groups });
  };
  logOut = async (req: Request, res: Response) => {
    if (req.body.flag === 'all') await userModel.updateOne({ _id: req.user!._id }, { $inc: { tokenVersion: 1 } });
    else await revokeSession(req.user!._id, req.decoded!.jti!);
    return res.json({ message: 'Signed out' });
  };
  refreshToken = async (req: Request, res: Response) => {
    await revokeSession(req.user!._id, req.decoded!.jti!);
    return res.json(await issueTokens(req.user!));
  };
  forgetPassword = async (req: Request, res: Response) => {
    const user = await userModel.findOne({ email: req.body.email, confirmed: true, provider: ProviderType.system, ...active });
    if (user) await issueOtp(user._id, user.email, 'reset-password');
    return res.json({ message: 'If the account is eligible, a reset code has been sent' });
  };
  resetPassword = async (req: Request, res: Response) => {
    const user = await userModel.findOne({ email: req.body.email, confirmed: true, provider: ProviderType.system, ...active });
    if (!user) throw new AppError('Invalid reset request', 400);
    await consumeOtp(user._id, 'reset-password', req.body.otp);
    await userModel.updateOne({ _id: user._id, ...active }, { $set: { password: await Hash(req.body.password) }, $inc: { tokenVersion: 1 } });
    return res.json({ message: 'Password reset; sign in again' });
  };
  updatePassword = async (req: Request, res: Response) => {
    if (!req.user!.password || !await Compare(req.body.currentPassword, req.user!.password)) throw new AppError('Incorrect current password', 400);
    await userModel.updateOne({ _id: req.user!._id }, { $set: { password: await Hash(req.body.newPassword) }, $inc: { tokenVersion: 1 } });
    return res.json({ message: 'Password updated; sign in again' });
  };
  updateBasicInfo = async (req: Request, res: Response) => {
    const user = await userModel.findByIdAndUpdate(req.user!._id, { $set: req.body }, { new: true, runValidators: true });
    return res.json({ user });
  };
  updateEmail = async (req: Request, res: Response) => {
    if (!req.user!.password || !await Compare(req.body.password, req.user!.password)) throw new AppError('Incorrect password', 400);
    if (await userModel.exists({ email: req.body.newEmail })) throw new AppError('Email already exists', 409);
    await issueOtp(req.user!._id, req.body.newEmail, 'change-email');
    return res.json({ message: 'Confirmation code sent to the new email' });
  };
  confirmNewEmail = async (req: Request, res: Response) => {
    const otp = await consumeOtp(req.user!._id, 'change-email', req.body.otp);
    await userModel.updateOne({ _id: req.user!._id }, { $set: { email: otp.email }, $inc: { tokenVersion: 1 } });
    return res.json({ message: 'Email updated; sign in again' });
  };
  enableTwoFactor = async (req: Request, res: Response) => {
    if (req.user!.twoFactorEnabled) throw new AppError('Email verification is already enabled for sign-in', 409);
    await issueOtp(req.user!._id, req.user!.email, 'two-factor-setup');
    return res.json({ message: 'Confirm the emailed setup code' });
  };
  confirmEnableTwoFactor = async (req: Request, res: Response) => {
    if (req.user!.twoFactorEnabled) throw new AppError('Already enabled', 409);
    await consumeOtp(req.user!._id, 'two-factor-setup', req.body.otp);
    await userModel.updateOne({ _id: req.user!._id }, { $set: { twoFactorEnabled: true }, $inc: { tokenVersion: 1 } });
    return res.json({ message: 'Email verification enabled; sign in again' });
  };
  confirmLoginTwoFactor = async (req: Request, res: Response) => {
    const user = await userModel.findOne({ email: req.body.email, confirmed: true, twoFactorEnabled: true, ...active });
    if (!user) throw new AppError('Invalid login request', 401);
    await consumeOtp(user._id, 'two-factor-login', req.body.otp);
    return res.json({ message: 'Signed in', ...await issueTokens(user), user });
  };
  private canManage(actor: IUser, target: IUser) {
    if (String(actor._id) === String(target._id)) return;
    if (actor.role === RoleType.superAdmin && target.role !== RoleType.superAdmin) return;
    if (actor.role === RoleType.admin && target.role === RoleType.user) return;
    throw new AppError('Not allowed to manage this account', 403);
  }
  freezeAccount = async (req: Request, res: Response) => {
    const user = await activeUser(req.params.userId || req.user!._id);
    this.canManage(req.user!, user);
    await userModel.updateOne({ _id: user._id }, { $set: { deletedAt: new Date(), deletedBy: req.user!._id }, $inc: { tokenVersion: 1 } });
    return res.json({ message: 'Account frozen' });
  };
  unFreezeAccount = async (req: Request, res: Response) => {
    if (req.user!.role === RoleType.user) throw new AppError('Administrator required', 403);
    const user = await userModel.findOne({ _id: req.params.userId, deletedAt: { $exists: true } });
    if (!user) throw new AppError('Frozen account not found', 404);
    this.canManage(req.user!, user);
    await userModel.updateOne({ _id: user._id }, { $unset: { deletedAt: '', deletedBy: '' }, $set: { restoredAt: new Date(), restoredBy: req.user!._id }, $inc: { tokenVersion: 1 } });
    return res.json({ message: 'Account restored' });
  };
  deleteAccount = async (req: Request, res: Response) => {
    const user = await userModel.findById(req.params.userId);
    if (!user) throw new AppError('Account not found', 404);
    this.canManage(req.user!, user);
    await connection.transaction(async session => {
      await userModel.deleteOne({ _id: user._id }, { session });
      await userModel.updateMany({ friends: user._id }, { $pull: { friends: user._id } }, { session });
      await FriendRequest.deleteMany({ $or: [{ createdBy: user._id }, { sendTo: user._id }] }, { session });
      await postModel.updateMany({ createdBy: user._id }, { $set: { deletedAt: new Date() } }, { session });
    });
    return res.json({ message: 'Account deleted' });
  };
  changeRole = async (req: Request, res: Response) => {
    if (req.user!.role !== RoleType.superAdmin) throw new AppError('Super administrator required', 403);
    const user = await userModel.findOneAndUpdate({ _id: req.params.userId, role: { $ne: RoleType.superAdmin }, ...active }, { $set: { role: req.body.role }, $inc: { tokenVersion: 1 } }, { new: true, runValidators: true });
    if (!user) throw new AppError('Eligible account not found', 404);
    return res.json({ user });
  };
  dashBoard = async (_req: Request, res: Response) => res.json({ data: { totalUsers: await userModel.countDocuments(active), totalPosts: await postModel.countDocuments(active) } });
  sendFriendRequest = async (req: Request, res: Response) => {
    const target = await requireConnection(req.user!, req.params.userId, false);
    if (req.user!.friends.some(id => String(id) === String(target._id))) throw new AppError('Already friends', 409);
    const request = await FriendRequest.create({ createdBy: req.user!._id, sendTo: target._id, pairKey: pair(req.user!._id, target._id) });
    return res.status(201).json({ request });
  };
  acceptFriendRequest = async (req: Request, res: Response) => {
    await connection.transaction(async session => {
      const request = await FriendRequest.findOne({ _id: req.params.requestId, sendTo: req.user!._id, acceptedAt: { $exists: false }, deletedAt: { $exists: false } }).session(session);
      if (!request) throw new AppError('Pending request not found', 404);
      const a = await userModel.findOneAndUpdate({ _id: request.createdBy, blockedUsers: { $ne: request.sendTo }, ...active }, { $addToSet: { friends: request.sendTo } }, { session, new: true });
      const b = await userModel.findOneAndUpdate({ _id: request.sendTo, blockedUsers: { $ne: request.createdBy }, ...active }, { $addToSet: { friends: request.createdBy } }, { session, new: true });
      if (!a || !b) throw new AppError('Request is unavailable', 404);
      request.acceptedAt = new Date(); await request.save({ session });
    });
    return res.json({ message: 'Friend request accepted' });
  };
  blockUser = async (req: Request, res: Response) => {
    const target = await activeUser(req.params.userId);
    if (String(target._id) === String(req.user!._id)) throw new AppError('Cannot block yourself', 400);
    await connection.transaction(async session => {
      await userModel.updateOne({ _id: req.user!._id }, { $addToSet: { blockedUsers: target._id }, $pull: { friends: target._id } }, { session });
      await userModel.updateOne({ _id: target._id }, { $pull: { friends: req.user!._id } }, { session });
      await FriendRequest.deleteMany({ pairKey: pair(target._id, req.user!._id) }, { session });
    });
    return res.json({ message: 'User blocked' });
  };
  deleteFriendRequest = async (req: Request, res: Response) => {
    const result = await FriendRequest.deleteOne({ _id: req.params.friendRequestId, acceptedAt: { $exists: false }, $or: [{ createdBy: req.user!._id }, { sendTo: req.user!._id }] });
    if (!result.deletedCount) throw new AppError('Pending request not found', 404);
    return res.json({ message: 'Request deleted' });
  };
  unFriend = async (req: Request, res: Response) => {
    await connection.transaction(async session => {
      await userModel.updateOne({ _id: req.user!._id }, { $pull: { friends: req.params.friendId } }, { session });
      await userModel.updateOne({ _id: req.params.friendId }, { $pull: { friends: req.user!._id } }, { session });
      await FriendRequest.deleteMany({ pairKey: pair(req.user!._id, req.params.friendId) }, { session });
    });
    return res.json({ message: 'Friend removed' });
  };
  uploadImage = async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('Image required', 400);
    const key = await uploadFile({ file: req.file, path: 'users/' + req.user!._id + '/profile' });
    try { await userModel.updateOne({ _id: req.user!._id }, { $set: { profileImage: key } }); }
    catch (error) { await deleteFile({ Key: key }); throw error; }
    return res.json({ message: 'Profile image uploaded', Key: key });
  };
  uploadImages = async (req: Request, res: Response) => {
    const result = await createUploadFilePreSignedUrl({ path: 'users/' + req.user!._id + '/profile', originalname: req.body.originalname, ContentType: req.body.ContentType, expiresIn: 300 });
    await userModel.updateOne({ _id: req.user!._id }, { $set: { tempProfileImage: result.Key, tempProfileImageExpires: new Date(Date.now() + 300000) } });
    return res.json({ ...result, message: 'Upload the file, then call confirmProfileImage' });
  };
  confirmProfileImage = async (req: Request, res: Response) => {
    const key = req.user!.tempProfileImage;
    if (!key || !req.user!.tempProfileImageExpires || req.user!.tempProfileImageExpires < new Date()) throw new AppError('No active upload', 400);
    const file = await headFile({ Key: key });
    if (!file.ContentLength || file.ContentLength > 5 * 1024 * 1024 || !['image/jpeg', 'image/png'].includes(file.ContentType || '')) throw new AppError('Invalid uploaded image', 400);
    const user = await userModel.findOneAndUpdate({ _id: req.user!._id, tempProfileImage: key }, { $set: { profileImage: key }, $unset: { tempProfileImage: '', tempProfileImageExpires: '' } }, { new: true });
    if (!user) throw new AppError('Upload has been replaced', 409);
    return res.json({ user });
  };
  private admin(context: any) {
    const user = context?.req?.user;
    if (!user || ![RoleType.admin, RoleType.superAdmin].includes(user.role)) throw new AppError('Administrator required', 403);
    return user;
  }
  getOneUser = async (_parent: unknown, args: { id: string }, context: any) => {
    this.admin(context); const { id } = getOneUserSchemaType.parse(args);
    return activeUser(id);
  };
  getAllUser = async (_parent: unknown, args: any, context: any) => {
    this.admin(context); const { skip, limit } = pagination(args);
    return userModel.find(active).sort({ _id: 1 }).skip(skip).limit(limit);
  };
  createUser = async (_parent: unknown, args: any, context: any) => {
    this.admin(context);
    return this.createAccount(signUpSchema.body.parse({ ...args, cPassword: args.password }));
  };
}
export default new UserService();
