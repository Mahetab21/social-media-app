import { Router } from "express";
import PS from "./post.service";
import { Validation } from "./../../middleware/validation";
import * as PV from "./post.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";
import commentRouter from "../comment/comment.controller";
const postRouter = Router({});

postRouter.use("/:postId/comments{/:commentId/reply}", commentRouter);

postRouter.post(
  "/createPost",
  Authentication(TokenType.access),
  multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
  Validation(PV.createPostSchema),
  PS.createPost
);
postRouter.patch(
  "/:postId",
  Authentication(),
  Validation(PV.likePostSchema),
  PS.likePost
);
postRouter.patch(
  "/update/:postId",
  Authentication(),
  multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
  Validation(PV.updatePostSchema),
  PS.updatePost
);
postRouter.post(
  "/:postId/send-tag-emails",
  Authentication(TokenType.access),
  Validation(PV.sendTagEmailSchema),
  PS.sendTagNotificationEmails
);
postRouter.get("/getPost", Authentication(), PS.getPosts);
postRouter.patch(
  "/freeze/:postId",
  Authentication(),
  Validation(PV.freezePostSchema),
  PS.freezePost
);
postRouter.delete(
  "/hard-delete/:postId",
  Authentication(),
  Validation(PV.hardDeleteSchema),
  PS.hardDelete
);
postRouter.get(
  "/getPostById/:postId",
  Validation(PV.getPostByIdSchema),
  PS.getPostById
);
export default postRouter;
