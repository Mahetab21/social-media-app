import { Request, Response ,NextFunction} from "express";
import { signUpSchemaType ,confirmEmailSchemaType, signInSchemaType , logOutSchemaType, flagType ,logInWithGmailSchemaType, forgetPasswordSchemaType, resetPasswordSchemaType} from "./user.validation";
import { HydratedDocument, Model } from "mongoose";
import userModel, { IUser, RoleType,ProviderType } from "../../DB/model/user.model";
import { UserRepository } from "../../DB/repositories/user.repository";
import { th } from "zod/v4/locales";
import { AppError } from "../../utils/classError";
import { Compare, Hash } from "../../utils/hash";
import { generateOtp, sendEmail } from "../../service/sendEmail";
import { emailTemplate } from "../../service/email.temp";
import { eventEmitter } from "../../utils/event";
import { GenerateToken } from "../../utils/token";
import { v4 as uuidv4 } from "uuid";
import revokeTokenModel, { IRevokeToken } from "../../DB/model/revokeToken.model";
import { RevokeTokenRepository } from "../../DB/repositories/revokeToken.repository";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import { uploadFile, uploadLargeFile ,uploadFiles,createUploadFilePreSignedUrl } from "../../utils/s3.config";
class UserService{
    // private _userModel : Model<IUser> = userModel;
    private _userModel = new UserRepository(userModel)
    private _revokeToken =  new RevokeTokenRepository(revokeTokenModel)
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
    const user = await this._userModel.findOne({email , confirmed :{ $exists:true},provider:ProviderType.system})
    if(!user){
        throw new AppError("Invalid email or not confirmed yet",400)
    }
    if(! await Compare(password,user?.password!)){
        throw new AppError("Invalid password",400)
    }
    const jwtid= uuidv4();
    const access_token = await GenerateToken({
    payload: { id: user._id, email: user.email },
    signature:user.role === RoleType.user
        ? process.env.ACCESS_TOKEN_USER!
        : process.env.ACCESS_TOKEN_ADMIN!,
    options: { expiresIn: "1d" , jwtid },
  });

   const refresh_token = await GenerateToken({
    payload: { id: user._id, email: user.email },
    signature:user.role === RoleType.user
        ? process.env.REFRESH_TOKEN_USER!
        : process.env.REFRESH_TOKEN_ADMIN!,
    options: { expiresIn: "1y", jwtid },
  });

    return res.status(200).json({message:"User signed in successfully",access_token,refresh_token,user});
}
//========================logIn with gmail==============
 logInWithGmail = async (req:Request, res:Response, next:NextFunction) => {
  const { idToken }:logInWithGmailSchemaType = req.body; //from frontend
  const client = new OAuth2Client();
    async function verify() {
    const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.WEB_CLIENT_ID!,
    });
    const payload = ticket.getPayload();
    return payload;
    }

  const { email, email_verified, picture, name } = await verify() as TokenPayload;
  //check email
  let user = await this._userModel.findOne({ email });
  if (!user) {
    user = await this._userModel.create({
      email: email!,
      image: picture!,
      confirmed: email_verified!,
      userName: name!,
      password: uuidv4(),
      provider: ProviderType.google,
    });
  }
  if (user?.provider === ProviderType.system) {
    throw new Error("You can not log in with system account", { cause: 400 });
  }
    const jwtid= uuidv4();
    const access_token = await GenerateToken({
    payload: { id: user._id, email: user.email },
    signature:user.role === RoleType.user
        ? process.env.ACCESS_TOKEN_USER!
        : process.env.ACCESS_TOKEN_ADMIN!,
    options: { expiresIn: "1d" , jwtid },
  });

   const refresh_token = await GenerateToken({
    payload: { id: user._id, email: user.email },
    signature:user.role === RoleType.user
        ? process.env.REFRESH_TOKEN_USER!
        : process.env.REFRESH_TOKEN_ADMIN!,
    options: { expiresIn: "1y", jwtid },
  });
    return res.status(200).json({message:"User logged in with google successfully",access_token,refresh_token,user});
}
//========================get Profile================
 getProfile = async(req:Request,res:Response,next:NextFunction)=>{

    return res.status(200).json({message:"User get profile successfully",user:req.user});
 }
//========================log Out==================
logOut  = async(req:Request,res:Response,next:NextFunction)=>{
    const {flag}: logOutSchemaType = req.body;
    if(flag === flagType?.all){
        await this._userModel.updateOne({_id:req.user?._id}, { changeCredentials: new Date() })
        return res.status(200).json({message:"User logged out from all devices successfully"});
    }
    await this._revokeToken.create({
        tokenId:req.decoded?.jti!,
        userId:req.user?._id!,
        expireAt: new Date(req.decoded?.exp! * 1000)
    })
    return res.status(200).json({message:"User logged out successfully"});
}
//=========================refresh token============
refreshToken = async(req:Request,res:Response,next:NextFunction)=>{
    const jwtid= uuidv4();
    const access_token = await GenerateToken({
    payload: { id:req?. user?._id, email: req?. user?.email },
    signature:req?. user?.role === RoleType.user
        ? process.env.ACCESS_TOKEN_USER!
        : process.env.ACCESS_TOKEN_ADMIN!,
    options: { expiresIn: "1d" , jwtid },
  });

   const refresh_token = await GenerateToken({
    payload: { id:req?.user?._id, email: req?.user?.email },
    signature:req?.user?.role === RoleType.user
        ? process.env.REFRESH_TOKEN_USER!
        : process.env.REFRESH_TOKEN_ADMIN!,
    options: { expiresIn: "1y", jwtid },
  });
    await this._revokeToken.create({
        tokenId:req.decoded?.jti!,
        userId:req.user?._id!,
        expireAt: new Date(req.decoded?.exp! * 1000)
    })
return res.status(200).json({message:"Token refreshed successfully",access_token,refresh_token});
}
//========================forget password=============
forgetPassword = async(req:Request,res:Response,next:NextFunction)=>{
   const { email }: forgetPasswordSchemaType = req.body;
   const user = await this._userModel.findOne({email , confirmed : { $exists:true} })
    if(!user){
        throw new AppError("Invalid email or user not confirmed",400)
    }
    const otp=await generateOtp();
    const hashOtp= await Hash(String(otp))
    eventEmitter.emit("forgetPassword",{email,otp});
    await this._userModel.updateOne({email: user?.email}, {otp:hashOtp} );
    return res.status(200).json({message:"OTP sent to email successfully"});
}
//========================reset password=============
resetPassword = async(req:Request,res:Response,next:NextFunction)=>{
    const { email, otp, password , cPassword }: resetPasswordSchemaType = req.body;
    const user = await this._userModel.findOne({email , otp : { $exists:true} })
    if(!user){
        throw new AppError("Invalid email or user not requested to change password",400)
    }
    if(!await Compare(otp, user?.otp!)){
        throw new AppError("Invalid OTP",400)
    }
    const hash = await Hash(password);
    await this._userModel.updateOne({email:user?.email}, {password:hash, $unset:{otp:""}});
    return res.status(200).json({message:"Password reset successfully"});
}
//========================upload image===============
uploadImage = async (req:Request,res:Response,next:NextFunction)=>{
    //===upload file===  
    // const Key= await uploadFile({
    //     file:req.file!,
    //     path:`users/${req.user?._id}`,
    // })

    //===upload large file===
    const Key= await uploadLargeFile({
        file:req.file!,
        path:`users/${req.user?._id}`,
    })

    //===upload multiple files===
    // const Key= await uploadFiles({
    //     files:req.files as Express.Multer.File[],
    //     path:`users/${req.user?._id}`,
    // })
    return res.status(200).json({message:"Image uploaded successfully",Key});
}
//========================upload images (createUploadFilePreSignedUrl)===============
uploadImages = async (req:Request,res:Response,next:NextFunction)=>{
    const{ originalname, ContentType }= req.body;
    const url= await createUploadFilePreSignedUrl({
        originalname,
        ContentType,
        path:`users/${req.user?._id}`,
    })
    return res.status(200).json({message:"Image uploaded successfully",url});
}
}

export default new UserService();