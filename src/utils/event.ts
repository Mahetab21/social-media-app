import { EventEmitter } from "events";
import { generateOtp } from "../service/sendEmail";
import { sendEmail } from "../service/sendEmail";
import { emailTemplate } from "../service/email.temp";
export const eventEmitter = new EventEmitter();

eventEmitter.on("confirmEmail",async(data)=>{
    const {email,otp}=data;
    await sendEmail({to:email , subject:"confirm your email", html:emailTemplate(otp ,"Email Confirmation")})
})