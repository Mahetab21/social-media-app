import { Router } from "express";
import  UC from "./user.service";
import { Validation } from "./../../middleware/validation";
import * as UV from "./user.validation";
const userRouter = Router();

userRouter.post("/signUp",Validation(UV.signUpSchema),UC.signUp)
userRouter.patch("/confirmEmail",Validation(UV.confirmEmailSchema),UC.confirmEmail)
userRouter.post("/signIn",Validation(UV.signInSchema),UC.signIn)

export default userRouter;
 