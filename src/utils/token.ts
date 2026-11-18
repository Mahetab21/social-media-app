import jwt, { JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import userModel, { IUser, RoleType } from '../DB/model/user.model';
import revokeTokenModel from '../DB/model/revokeToken.model';
import { AppError } from './classError';
export enum TokenType { access = 'access', refresh = 'refresh' }
export const GenerateToken = async ({ payload, signature, options = {} }: { payload: object; signature: string; options?: jwt.SignOptions }) => jwt.sign(payload, signature, { expiresIn: '15m', ...options, algorithm: 'HS256' });
export const VerifyToken = async ({ token, signature }: { token: string; signature: string }): Promise<JwtPayload> => {
  try {
    const decoded = jwt.verify(token, signature, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.id || !decoded.email || !decoded.jti || !decoded.exp || !Number.isInteger(decoded.tokenVersion)) throw new Error('Invalid claims');
    return decoded;
  } catch { throw new AppError('Invalid or expired token', 401); }
};
export const GetSignature = async (prefix: string, type = TokenType.access) => {
  const role = prefix === process.env.BEARER_USER ? 'USER' : prefix === process.env.BEARER_ADMIN ? 'ADMIN' : null;
  return role ? process.env[type.toUpperCase() + '_TOKEN_' + role] : null;
};
export async function issueTokens(user: IUser) {
  const role = user.role === RoleType.user ? 'USER' : 'ADMIN';
  const jwtid = randomUUID(), payload = { id: user._id.toString(), email: user.email, tokenVersion: user.tokenVersion ?? 0 };
  return {
    access_token: await GenerateToken({ payload, signature: process.env['ACCESS_TOKEN_' + role]!, options: { expiresIn: '15m', jwtid } }),
    refresh_token: await GenerateToken({ payload, signature: process.env['REFRESH_TOKEN_' + role]!, options: { expiresIn: '7d', jwtid } }),
  };
}
export const decodedTokenAndFetchUser = async (token: string, signature: string) => {
  const decoded = await VerifyToken({ token, signature });
  const user = await userModel.findOne({ _id: decoded.id, email: decoded.email, confirmed: true, deletedAt: { $exists: false } });
  if (!user || decoded.tokenVersion !== (user.tokenVersion ?? 0) || await revokeTokenModel.exists({ tokenId: decoded.jti })) throw new AppError('Session is no longer valid', 401);
  return { user, decoded };
};
export async function revokeSession(userId: unknown, tokenId: string) {
  try { await revokeTokenModel.create({ userId, tokenId, expireAt: new Date(Date.now() + 7 * 86400000) }); }
  catch (error: any) { if (error.code === 11000) throw new AppError('Session already revoked', 401); throw error; }
}
