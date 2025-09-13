import { Router } from "express";
import  UC from "./user.service";
import { Validation } from "./../../middleware/validation";
import * as UV from "./user.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
const userRouter = Router();

userRouter.post("/signUp",Validation(UV.signUpSchema),UC.signUp)
userRouter.patch("/confirmEmail",Validation(UV.confirmEmailSchema),UC.confirmEmail)
userRouter.post("/signIn",Validation(UV.signInSchema),UC.signIn)
userRouter.post("/logInWithGmail",Validation(UV.logInWithGmailSchema),UC.logInWithGmail)
userRouter.get("/getProfile",Authentication(),UC.getProfile)
userRouter.post("/logOut",Authentication(),Validation(UV.logOutSchema),UC.logOut)
userRouter.get("/refreshToken",Authentication(TokenType.refresh),UC.refreshToken)
userRouter.patch("/forgetPassword",Validation(UV.forgetPasswordSchema),UC.forgetPassword)
userRouter.patch("/resetPassword",Validation(UV.resetPasswordSchema),UC.resetPassword)

export default userRouter;
  