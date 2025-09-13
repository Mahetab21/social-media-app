import jwt,{JwtPayload} from 'jsonwebtoken';
import { UserRepository } from '../DB/repositories/user.repository';
import userModel from '../DB/model/user.model';
import { AppError } from './classError';
import revokeTokenModel from '../DB/model/revokeToken.model';
import { RevokeTokenRepository } from '../DB/repositories/revokeToken.repository';

const _userModel = new UserRepository(userModel)
const _revokeToken =  new RevokeTokenRepository(revokeTokenModel)

export const GenerateToken = async({payload,signature, options}:{
  payload: object;
  signature: string;
  options?: jwt.SignOptions;
}): Promise<string> =>{
    return jwt.sign(payload,signature,options as jwt.SignOptions);
}

export enum TokenType{
    access="access",
    refresh="refresh"
}

export const VerifyToken = async({token,signature}:{
    token:string,
    signature:string
}):Promise<JwtPayload>=>{
    return jwt.verify(token,signature) as JwtPayload;
}

export const GetSignature=async(tokenType:TokenType, prefix:string)=>{
    if(tokenType===TokenType.access){
        if(prefix===process.env.BEARER_USER){
            return process.env.ACCESS_TOKEN_USER
    } else if(prefix===process.env.BEARER_ADMIN){
        return process.env.ACCESS_TOKEN_ADMIN
    } else{
        return null;
    }
    }
    else if(tokenType===TokenType.refresh){
        if(prefix===process.env.BEARER_USER){
            return process.env.REFRESH_TOKEN_USER
        } else if(prefix===process.env.BEARER_ADMIN){
            return process.env.REFRESH_TOKEN_ADMIN
        } else{
            return null;
        }
    }
}

export const decodedTokenAndFetchUser = async (token:string , signature:string)=>{
    const decoded = await VerifyToken({token , signature})
    if(!decoded){
        throw new AppError("Invalid Token",400)
    }
    const user = await _userModel.findOne({email:decoded.email})
    if(!user){
        throw new AppError("User not found",404)
    }
    if(!user?.confirmed){
        throw new AppError("Please confirm your email",400)
    }
    if(await _revokeToken.findOne({tokenId:decoded?.jti})){
        throw new AppError("Token has been revoked",401)
    }
    if(user?.changeCredentials?.getTime()! > decoded.iat! * 1000){
        throw new AppError("token has been revoked",401)
    }
    return {decoded , user}
}
