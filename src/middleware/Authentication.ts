import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/classError";
import { GetSignature, TokenType, decodedTokenAndFetchUser } from "../utils/token";
import { GraphQLError } from "graphql";

export const Authentication = (tokenType:TokenType = TokenType.access)=>{
    return async (req:Request , res:Response , next:NextFunction)=>{
    const {authorization} = req.headers;
    const [prefix,token] = authorization?.split(" ") || [];
    if(!token || !prefix){
        throw new AppError("Invalid Token",400)
    }
    const signature = await GetSignature(prefix,tokenType);
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

export const AuthenticationGraphQl = async (authorization :string , tokenType:TokenType = TokenType.access)=>{
    const [prefix,token] = authorization?.split(" ") || [];
    if(!token || !prefix){
        throw new GraphQLError("token not found",{
                extensions:{
                  message:"TOKEN_NOT_FOUND",
                  statuscode:404
                }
              })
    }
    const signature = await GetSignature(prefix,tokenType);
    if(!signature){
        throw new GraphQLError("Invalid signature",{
            extensions:{
                message:"INVALID_SIGNATURE",
                statuscode:400
            }
        })
    }
    const {decoded, user} = await decodedTokenAndFetchUser(token,signature);
    return {decoded, user};
  
}



