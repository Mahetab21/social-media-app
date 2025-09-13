import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/classError";
import { GetSignature, TokenType, decodedTokenAndFetchUser } from "../utils/token";

export const Authentication = (tokenType:TokenType = TokenType.access)=>{
    return async (req:Request , res:Response , next:NextFunction)=>{
    const {authorization} = req.headers;
    const [prefix,token] = authorization?.split(" ") || [];
    if(!token || !prefix){
        throw new AppError("Invalid Token",400)
    }
    const signature = await GetSignature(tokenType, prefix);
    if(!signature){
        throw new AppError("Invalid signature",400)
    }
    const decoded = await decodedTokenAndFetchUser(token,signature);
    if(!decoded){
        throw new AppError("Invalid Token decoded",400)
    }    

    req.user = decoded?.user;
    req.decoded = decoded?.decoded;
    return next();
  }    
}

