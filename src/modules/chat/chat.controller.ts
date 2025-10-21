import { Router } from "express";
import { ChatService } from "./chat.service";
import { Authentication } from "../../middleware/Authentication";
import * as CV from "./chat.validation";
import { Validation } from "../../middleware/validation";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";

const chatRouter = Router({ mergeParams: true });
const CS = new ChatService();

chatRouter.get("/", Authentication(), Validation(CV.getChatSchema), CS.getChat);
chatRouter.get("/group/:groupId", Authentication(), Validation(CV.getGroupChatSchema), CS.getGroupChat);
chatRouter.post(
  "/group",
  Authentication(),
  multerCloud({ fileTypes: fileValidation.image }).single("attachment"),
  Validation(CV.createGroupChatSchema),
  CS.createGroupChat
);

export default chatRouter;
