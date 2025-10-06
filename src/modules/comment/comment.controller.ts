import { Router } from "express";
import CS from "./comment.service";
import { Validation } from "./../../middleware/validation";
import * as CV from "./comment.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";
const commentRouter = Router({mergeParams:true});

commentRouter.post("/",
    Authentication(TokenType.access),
    multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
    Validation(CV.createCommentSchema),
    CS.createComment);
commentRouter.patch("/",
    Authentication(TokenType.access),
    Validation(CV.freezeCommentSchema),
    CS.freezeComment
)
commentRouter.delete("/:commentId",
    Authentication(),
    Validation(CV.hardDeleteCommentSchema),
    CS.hardDeleteComment
)
commentRouter.patch("/:commentId",
    Authentication(TokenType.access),
    Validation(CV.updateCommentSchema),
    CS.updateComment
)
commentRouter.get("/",
    Authentication(),
    Validation(CV.getCommentsByIdSchema),
    CS.getCommentsById
)
commentRouter.get("/:commentId",
    Authentication(),
    Validation(CV.getCommentWithReplySchema),
    CS.getCommentWithReply
)
export default commentRouter;