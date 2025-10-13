import { Router } from "express";
import { ChatService } from "./chat.service";
import { Authentication } from "../../middleware/Authentication";
import * as CV from "./chat.validation";
import { Validation } from "../../middleware/validation";

const chatRouter = Router({mergeParams:true});
const CS = new ChatService();


chatRouter.get("/",Authentication(),Validation(CV.getChatSchema),CS.getChat)
export default chatRouter;