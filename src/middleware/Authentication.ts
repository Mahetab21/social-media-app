import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/classError';
import { GetSignature, TokenType, decodedTokenAndFetchUser } from '../utils/token';
export async function authenticate(authorization: unknown, type = TokenType.access) {
  if (typeof authorization !== 'string') throw new AppError('Authentication required', 401);
  const parts = authorization.split(' ');
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new AppError('Invalid authorization header', 401);
  const signature = await GetSignature(parts[0], type);
  if (!signature) throw new AppError('Invalid authorization prefix', 401);
  return decodedTokenAndFetchUser(parts[1], signature);
}
export const Authentication = (type = TokenType.access) => async (req: Request, res: Response, next: NextFunction) => {
  const { user, decoded } = await authenticate(req.headers.authorization, type);
  req.user = user; req.decoded = decoded; next();
};
export const AuthenticationGraphQl = authenticate;
