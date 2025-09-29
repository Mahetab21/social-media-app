import { EventEmitter } from "events";
import { generateOtp } from "../service/sendEmail";
import { sendEmail } from "../service/sendEmail";
import { emailTemplate } from "../service/email.temp";
import { UserRepository } from "../DB/repositories/user.repository";
import userModel from "../DB/model/user.model";
import { deleteFile, getFile } from "./s3.config";
export const eventEmitter = new EventEmitter();

eventEmitter.on("confirmEmail",async(data)=>{
    const {email,otp}=data;
    await sendEmail({to:email , subject:"confirm your email", html:emailTemplate(otp ,"Email Confirmation")})
})

eventEmitter.on("forgetPassword",async(data)=>{
    const {email,otp}=data;
    await sendEmail({to:email , subject:"forget password", html:emailTemplate(otp ,"forget Password")})
})

eventEmitter.on("uploadProfileImage",async(data)=>{
    const {userId , oldKey , Key ,expireIn}=data;
    const _userModel = new UserRepository(userModel);
    setTimeout(async()=>{
        try {
            await getFile({Key})
            await _userModel.findOneAndUpdate({_id:userId},{$unset:{tempProfileImage:""}})
            if(oldKey){
                await deleteFile({Key:oldKey})
            }
            console.log("success");
        } catch (error:any) {
            console.log({error});
            if(error?.Code=='NoSuchKey'){
                if(!oldKey){
                    await _userModel.findOneAndUpdate({_id:userId},{$unset:{profileImage:""}})
                } else{
                    await _userModel.findOneAndUpdate({_id:userId},{$set:{profileImage:oldKey},$unset:{tempProfileImage:""}})
                }
            }
            
        }
    },expireIn * 1000)
})
eventEmitter.on("confirmNewEmail", async (data) => {
  const { email, otp } = data;
  await sendEmail({ to: email, subject: "Confirm your new email", html: emailTemplate(otp, "Confirm New Email") });
});
eventEmitter.on("notifyTagged", async (data) => {
    const { to, toName, fromName, postId, html, subject } = data;
    await sendEmail({ to, subject, html });
})
eventEmitter.on("twoFactorSetup",async(data)=>{
    const {email,otp}=data;
    await sendEmail({to:email , subject:"Two Factor Authentication Setup", html:emailTemplate(otp ,"Two Factor Authentication Setup")})
})
eventEmitter.on("twoFactorLogin",async(data)=>{
    const {email,otp}=data;
    await sendEmail({to:email , subject:"Two Factor Authentication Login", html:emailTemplate(otp ,"Two Factor Authentication Login")})
})