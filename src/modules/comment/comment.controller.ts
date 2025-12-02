import { Router } from "express";
import CS from "./comment.service";
import { Validation } from "./../../middleware/validation";
import * as CV from "./comment.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";
const commentRouter = Router({ mergeParams: true });

/**
 * @swagger
 * /posts/{postId}/comments:
 *   post:
 *     summary: Create a comment on a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to comment on
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Comment content
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 maxItems: 2
 *                 description: Image attachments for the comment
 *     responses:
 *       201:
 *         description: Comment created successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Post not found
 */
commentRouter.post(
  "/",
  Authentication(TokenType.access),
  multerCloud({ fileTypes: fileValidation.image }).array("attachments", 2),
  Validation(CV.createCommentSchema),
  CS.createComment
);

/**
 * @swagger
 * /posts/{postId}/comments:
 *   patch:
 *     summary: Freeze/unfreeze a comment
 *     tags: [Comments]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               commentId:
 *                 type: string
 *                 description: Comment ID to freeze/unfreeze
 *     responses:
 *       200:
 *         description: Comment freeze status updated
 *       401:
 *         description: Unauthorized
 */
commentRouter.patch(
  "/",
  Authentication(TokenType.access),
  Validation(CV.freezeCommentSchema),
  CS.freezeComment
);

/**
 * @swagger
 * /posts/{postId}/comments/{commentId}:
 *   delete:
 *     summary: Permanently delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID to delete
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
commentRouter.delete(
  "/:commentId",
  Authentication(),
  Validation(CV.hardDeleteCommentSchema),
  CS.hardDeleteComment
);

/**
 * @swagger
 * /posts/{postId}/comments/{commentId}:
 *   patch:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: Updated comment content
 *     responses:
 *       200:
 *         description: Comment updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
commentRouter.patch(
  "/:commentId",
  Authentication(TokenType.access),
  Validation(CV.updateCommentSchema),
  CS.updateComment
);

/**
 * @swagger
 * /posts/{postId}/comments:
 *   get:
 *     summary: Get all comments for a post
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID to get comments for
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *         description: Number of comments per page
 *     responses:
 *       200:
 *         description: List of comments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   content:
 *                     type: string
 *                   attachments:
 *                     type: array
 *                     items:
 *                       type: string
 *                   createdBy:
 *                     type: string
 *                   postId:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
commentRouter.get(
  "/",
  Authentication(),
  Validation(CV.getCommentsByIdSchema),
  CS.getCommentsById
);

/**
 * @swagger
 * /posts/{postId}/comments/{commentId}:
 *   get:
 *     summary: Get a comment with its replies
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID to retrieve with replies
 *     responses:
 *       200:
 *         description: Comment with replies retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 content:
 *                   type: string
 *                 attachments:
 *                   type: array
 *                   items:
 *                     type: string
 *                 replies:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
commentRouter.get(
  "/:commentId",
  Authentication(),
  Validation(CV.getCommentWithReplySchema),
  CS.getCommentWithReply
);
export default commentRouter;
