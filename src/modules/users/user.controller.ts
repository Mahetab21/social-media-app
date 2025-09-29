import { Router } from "express";
import UC from "./user.service";
import { Validation } from "./../../middleware/validation";
import * as UV from "./user.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";
const userRouter = Router();

userRouter.post("/signUp", Validation(UV.signUpSchema), UC.signUp);
userRouter.patch("/confirmEmail",Validation(UV.confirmEmailSchema),UC.confirmEmail);
userRouter.post("/signIn", Validation(UV.signInSchema), UC.signIn);
userRouter.post("/logInWithGmail",Validation(UV.logInWithGmailSchema),UC.logInWithGmail);
userRouter.get("/getProfile", Authentication(), UC.getProfile);
userRouter.post("/logOut",Authentication(),Validation(UV.logOutSchema),UC.logOut);
userRouter.get("/refreshToken",Authentication(TokenType.refresh),UC.refreshToken);
userRouter.patch("/forgetPassword",Validation(UV.forgetPasswordSchema),UC.forgetPassword);
userRouter.patch("/resetPassword",Validation(UV.resetPasswordSchema),UC.resetPassword);
userRouter.post("/uploadImage",Authentication(),
multerCloud({ fileTypes: fileValidation.image }).
single("image"),
  UC.uploadImage
);
//userRouter.post("/uploadImage",Authentication(),multerCloud({fileTypes:fileValidation.image}).array("images"),UC.uploadImage)
userRouter.post("/uploadImages", Authentication(), UC.uploadImages);
userRouter.patch("/freezeAccount{/:userId}",Authentication(TokenType.access),Validation(UV.freezeSchema),UC.freezeAccount);
userRouter.patch("/unFreezeAccount/:userId",Authentication(TokenType.access),Validation(UV.unFreezeSchema),UC.unFreezeAccount);
userRouter.delete("/deleteAccount/:userId",Authentication(TokenType.access),Validation(UV.deleteSchema),UC.deleteAccount);
userRouter.patch("/updatePassword",Authentication(TokenType.access),Validation(UV.updatePasswordSchema),UC.updatePassword);
userRouter.patch("/updateBasicInfo",Authentication(TokenType.access),Validation(UV.updateBasicInfoSchema),UC.updateBasicInfo);
userRouter.patch("/updateEmail",Authentication(TokenType.access),Validation(UV.updateEmailSchema),UC.updateEmail);
userRouter.patch("/confirmNewEmail",Authentication(TokenType.access),Validation(UV.confirmNewEmailSchema),UC.confirmNewEmail);
userRouter.post("/twoFactorSetup",Authentication(TokenType.access),UC.enableTwoFactor);
userRouter.post("/confirmTwoFactor",Authentication(TokenType.access),Validation(UV.confirmTwoFactorSchema),UC.confirmEnableTwoFactor);
userRouter.post("/logIn",Validation(UV.loginSchema),UC.login);
userRouter.post("/confirmTwoFactorLogin",Validation(UV.confirmTwoFactorLoginSchema),UC.confirmLoginTwoFactor);
export default userRouter;
