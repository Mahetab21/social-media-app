import { Request, Response ,NextFunction} from "express";
import { signUpSchemaType ,confirmEmailSchemaType, signInSchemaType} from "./user.validation";
import { HydratedDocument, Model } from "mongoose";
import userModel, { IUser, RoleType } from "../../DB/model/user.model";
import { UserRepository } from "../../DB/repositories/user.repository";
import { th } from "zod/v4/locales";
import { AppError } from "../../utils/classError";
import { Compare, Hash } from "../../utils/hash";
import { generateOtp, sendEmail } from "../../service/sendEmail";
import { emailTemplate } from "../../service/email.temp";
import { eventEmitter } from "../../utils/event";
import { GenerateToken } from "../../utils/token";

class UserService{
    // private _userModel : Model<IUser> = userModel;
    private _userModel = new UserRepository(userModel)
    constructor(){

    }
//=====================signUp================
 signUp = async (req:Request,res:Response,next:NextFunction)=>{
    let {fName,lName,email,password,cPassword,age,address,phone,gender}: signUpSchemaType =req.body;
    if(await this._userModel.findOne({email})){
        throw new AppError("Email already exists",409)
    }
    const hash = await Hash(password);
    const otp=await generateOtp();
    const hashOtp= await Hash(String(otp))
    eventEmitter.emit("confirmEmail",{email,otp});
   const user = await this._userModel.createOneUser({fName,lName,otp:hashOtp,email,password:hash,age,address,phone,gender});
    return res.status(201).json({message:"User created successfully",user});
}
//=====================confirmEmail=========
confirmEmail=async(req:Request,res:Response,next:NextFunction)=>{
    const {email,otp}:confirmEmailSchemaType=req.body;
    const user = await this._userModel.findOne({email , confirmed : { $exists:false} })
    if(!user){
        throw new AppError("Invalid email or user already confirmed",400)
    }
    if(! await Compare(otp, user?.otp!)){
        throw new AppError("Invalid OTP",400)
    }
    await this._userModel.updateOne({email: user?.email}, {confirmed:true , $unset:{otp:""}} );
    return res.status(200).json({message:"Email confirmed successfully"});

}
//=====================signIn================
 signIn = async(req:Request,res:Response,next:NextFunction)=>{
    const{email,password}:signInSchemaType = req.body;
    const user = await this._userModel.findOne({email , confirmed :true})
    if(!user){
        throw new AppError("Invalid email or not confirmed yet",400)
    }
    if(! await Compare(password,user?.password!)){
        throw new AppError("Invalid password",400)
    }
    const access_token = await GenerateToken({
    payload: { id: user._id, email: user.email },
    signature:user.role === RoleType.user
        ? process.env.ACCESS_TOKEN_USER!
        : process.env.ACCESS_TOKEN_ADMIN!,
    options: { expiresIn: "1d" },
  });

   const refresh_token = await GenerateToken({
    payload: { id: user._id, email: user.email },
    signature:user.role === RoleType.user
        ? process.env.REFRESH_TOKEN_USER!
        : process.env.REFRESH_TOKEN_ADMIN!,
    options: { expiresIn: "1y"},
  });

    return res.status(200).json({message:"User signed in successfully",access_token,refresh_token,user});
}
}
export default new UserService();