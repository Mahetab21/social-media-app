import { Router } from "express";
import PS from "./post.service";
import { Validation } from "./../../middleware/validation";
import * as PV from "./post.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";
import commentRouter from "../comment/comment.controller";
const postRouter = Router({});

postRouter.use("/:postId/comments", commentRouter);

/**
 * @swagger
 * /posts/createPost:
 *   post:
 *     summary: Create a new post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Post content
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 2
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       401:
 *         description: Unauthorized
 */
postRouter.post(
  "/createPost",
  Authentication(TokenType.access),
  multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
  Validation(PV.createPostSchema),
  PS.createPost
);

/**
 * @swagger
 * /posts/{postId}:
 *   patch:
 *     summary: Like or unlike a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Post like status updated
 *       401:
 *         description: Unauthorized
 */
postRouter.patch(
  "/:postId",
  Authentication(),
  Validation(PV.likePostSchema),
  PS.likePost
);

/**
 * @swagger
 * /posts/update/{postId}:
 *   patch:
 *     summary: Update a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Post updated successfully
 */
postRouter.patch(
  "/update/:postId",
  Authentication(),
  multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
  Validation(PV.updatePostSchema),
  PS.updatePost
);

/**
 * @swagger
 * /posts/{postId}/send-tag-emails:
 *   post:
 *     summary: Send tag notification emails
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notifications sent
 */
postRouter.post(
  "/:postId/send-tag-emails",
  Authentication(TokenType.access),
  Validation(PV.sendTagEmailSchema),
  PS.sendTagNotificationEmails
);

/**
 * @swagger
 * /posts/getPost:
 *   get:
 *     summary: Get all posts
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of posts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Post'
 */
postRouter.get("/getPost", Authentication(), PS.getPosts);

/**
 * @swagger
 * /posts/freeze/{postId}:
 *   patch:
 *     summary: Freeze a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post frozen successfully
 */
postRouter.patch(
  "/freeze/:postId",
  Authentication(),
  Validation(PV.freezePostSchema),
  PS.freezePost
);

/**
 * @swagger
 * /posts/hard-delete/{postId}:
 *   delete:
 *     summary: Permanently delete a post
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post deleted successfully
 */
postRouter.delete(
  "/hard-delete/:postId",
  Authentication(),
  Validation(PV.hardDeleteSchema),
  PS.hardDelete
);

/**
 * @swagger
 * /posts/getPostById/{postId}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 */
postRouter.get(
  "/getPostById/:postId",
  Validation(PV.getPostByIdSchema),
  PS.getPostById
);
export default postRouter;
