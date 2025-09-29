import { Router } from "express";
import PS from "./post.service";
import { Validation } from "./../../middleware/validation";
import * as PV from "./post.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";
const postRouter = Router({});
postRouter.post("/createPost",
    Authentication(TokenType.access),
    multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
    Validation(PV.createPostSchema),
    PS.createPost);
postRouter.patch("/:postId",Authentication(),Validation(PV.likePostSchema),PS.likePost);
postRouter.patch("/update/:postId",
    Authentication(),
    multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
    Validation(PV.updatePostSchema),
    PS.updatePost);
postRouter.post(
    "/:postId/send-tag-emails",
    Authentication(TokenType.access),    
    Validation(PV.sendTagEmailSchema),
    PS.sendTagNotificationEmails
);

export default postRouter;