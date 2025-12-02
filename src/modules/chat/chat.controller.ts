import { Router } from "express";
import { ChatService } from "./chat.service";
import { Authentication } from "../../middleware/Authentication";
import * as CV from "./chat.validation";
import { Validation } from "../../middleware/validation";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";

const chatRouter = Router({ mergeParams: true });
const CS = new ChatService();

/**
 * @swagger
 * /users/{userId}/chat:
 *   get:
 *     summary: Get chat messages with a user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to chat with
 *     responses:
 *       200:
 *         description: Chat messages retrieved successfully
 *       401:
 *         description: Unauthorized
 */
chatRouter.get("/", Authentication(), Validation(CV.getChatSchema), CS.getChat);

/**
 * @swagger
 * /users/{userId}/chat/group/{groupId}:
 *   get:
 *     summary: Get group chat messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *         description: Group chat ID
 *     responses:
 *       200:
 *         description: Group chat messages retrieved
 */
chatRouter.get(
  "/group/:groupId",
  Authentication(),
  Validation(CV.getGroupChatSchema),
  CS.getGroupChat
);

/**
 * @swagger
 * /users/{userId}/chat/group:
 *   post:
 *     summary: Create a group chat
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               attachment:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Group chat created successfully
 */
chatRouter.post(
  "/group",
  Authentication(),
  multerCloud({ fileTypes: fileValidation.image }).single("attachment"),
  Validation(CV.createGroupChatSchema),
  CS.createGroupChat
);

export default chatRouter;
