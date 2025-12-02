import { Router } from "express";
import UC from "./user.service";
import { Validation } from "./../../middleware/validation";
import * as UV from "./user.validation";
import { Authentication } from "../../middleware/Authentication";
import { TokenType } from "../../utils/token";
import { fileValidation, multerCloud } from "../../middleware/multer.cloud";
import { authorization } from "../../middleware/authorization";
import { RoleType } from "../../DB/model/user.model";
import chatRouter from "../chat/chat.controller";
const userRouter = Router();
userRouter.use("/:userId/chat", chatRouter);

/**
 * @swagger
 * /users/signUp:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fName
 *               - email
 *               - password
 *               - age
 *               - gender
 *             properties:
 *               fName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               age:
 *                 type: number
 *               gender:
 *                 type: string
 *                 enum: [male, female]
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
userRouter.post("/signUp", Validation(UV.signUpSchema), UC.signUp);

/**
 * @swagger
 * /users/confirmEmail:
 *   patch:
 *     summary: Confirm user email
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email confirmed successfully
 */
userRouter.patch(
  "/confirmEmail",
  Validation(UV.confirmEmailSchema),
  UC.confirmEmail
);

/**
 * @swagger
 * /users/signIn:
 *   post:
 *     summary: Sign in user
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User signed in successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.post("/signIn", Validation(UV.signInSchema), UC.signIn);

/**
 * @swagger
 * /users/logInWithGmail:
 *   post:
 *     summary: Login with Gmail
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully
 */
userRouter.post(
  "/logInWithGmail",
  Validation(UV.logInWithGmailSchema),
  UC.logInWithGmail
);

/**
 * @swagger
 * /users/getProfile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
userRouter.get("/getProfile", Authentication(), UC.getProfile);

/**
 * @swagger
 * /users/logOut:
 *   post:
 *     summary: Log out user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
userRouter.post(
  "/logOut",
  Authentication(),
  Validation(UV.logOutSchema),
  UC.logOut
);

/**
 * @swagger
 * /users/refreshToken:
 *   get:
 *     summary: Refresh access token
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
userRouter.get(
  "/refreshToken",
  Authentication(TokenType.refresh),
  UC.refreshToken
);

/**
 * @swagger
 * /users/forgetPassword:
 *   patch:
 *     summary: Request password reset
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
userRouter.patch(
  "/forgetPassword",
  Validation(UV.forgetPasswordSchema),
  UC.forgetPassword
);

/**
 * @swagger
 * /users/resetPassword:
 *   patch:
 *     summary: Reset password with token
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid token
 */
userRouter.patch(
  "/resetPassword",
  Validation(UV.resetPasswordSchema),
  UC.resetPassword
);

/**
 * @swagger
 * /users/uploadImage:
 *   post:
 *     summary: Upload profile image
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Profile image file
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.post(
  "/uploadImage",
  Authentication(),
  multerCloud({ fileTypes: fileValidation.image }).single("image"),
  UC.uploadImage
);
//userRouter.post("/uploadImage",Authentication(),multerCloud({fileTypes:fileValidation.image}).array("images"),UC.uploadImage)

/**
 * @swagger
 * /users/uploadImages:
 *   post:
 *     summary: Upload multiple images
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Images uploaded successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.post("/uploadImages", Authentication(), UC.uploadImages);

/**
 * @swagger
 * /users/freezeAccount/{userId}:
 *   patch:
 *     summary: Freeze user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: User ID (optional)
 *     responses:
 *       200:
 *         description: Account frozen successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.patch(
  "/freezeAccount{/:userId}",
  Authentication(TokenType.access),
  Validation(UV.freezeSchema),
  UC.freezeAccount
);

/**
 * @swagger
 * /users/unFreezeAccount/{userId}:
 *   patch:
 *     summary: Unfreeze user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to unfreeze
 *     responses:
 *       200:
 *         description: Account unfrozen successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.patch(
  "/unFreezeAccount/:userId",
  Authentication(TokenType.access),
  Validation(UV.unFreezeSchema),
  UC.unFreezeAccount
);

/**
 * @swagger
 * /users/deleteAccount/{userId}:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.delete(
  "/deleteAccount/:userId",
  Authentication(TokenType.access),
  Validation(UV.deleteSchema),
  UC.deleteAccount
);

/**
 * @swagger
 * /users/updatePassword:
 *   patch:
 *     summary: Update user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.patch(
  "/updatePassword",
  Authentication(TokenType.access),
  Validation(UV.updatePasswordSchema),
  UC.updatePassword
);

/**
 * @swagger
 * /users/updateBasicInfo:
 *   patch:
 *     summary: Update user basic information
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fName:
 *                 type: string
 *                 description: First name
 *               age:
 *                 type: number
 *                 minimum: 13
 *                 description: User age
 *     responses:
 *       200:
 *         description: Information updated successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.patch(
  "/updateBasicInfo",
  Authentication(TokenType.access),
  Validation(UV.updateBasicInfoSchema),
  UC.updateBasicInfo
);

/**
 * @swagger
 * /users/updateEmail:
 *   patch:
 *     summary: Request email update
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: New email address
 *     responses:
 *       200:
 *         description: Confirmation email sent
 *       401:
 *         description: Unauthorized
 */
userRouter.patch(
  "/updateEmail",
  Authentication(TokenType.access),
  Validation(UV.updateEmailSchema),
  UC.updateEmail
);

/**
 * @swagger
 * /users/confirmNewEmail:
 *   patch:
 *     summary: Confirm new email with token
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Email confirmation token
 *     responses:
 *       200:
 *         description: Email updated successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.patch(
  "/confirmNewEmail",
  Authentication(TokenType.access),
  Validation(UV.confirmNewEmailSchema),
  UC.confirmNewEmail
);

/**
 * @swagger
 * /users/twoFactorSetup:
 *   post:
 *     summary: Enable two-factor authentication
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup initiated - QR code provided
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrCode:
 *                   type: string
 *                 secret:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
userRouter.post(
  "/twoFactorSetup",
  Authentication(TokenType.access),
  UC.enableTwoFactor
);

/**
 * @swagger
 * /users/confirmTwoFactor:
 *   post:
 *     summary: Confirm two-factor authentication setup
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP token from authenticator app
 *                 pattern: '^[0-9]{6}$'
 *     responses:
 *       200:
 *         description: 2FA enabled successfully
 *       401:
 *         description: Unauthorized
 *       400:
 *         description: Invalid token
 */
userRouter.post(
  "/confirmTwoFactor",
  Authentication(TokenType.access),
  Validation(UV.confirmTwoFactorSchema),
  UC.confirmEnableTwoFactor
);

/**
 * @swagger
 * /users/logIn:
 *   post:
 *     summary: Login (with 2FA support)
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful or 2FA required
 *       401:
 *         description: Invalid credentials
 */
userRouter.post("/logIn", Validation(UV.loginSchema), UC.login);

/**
 * @swagger
 * /users/confirmTwoFactorLogin:
 *   post:
 *     summary: Confirm two-factor authentication for login
 *     tags: [Users]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: 6-digit TOTP token
 *                 pattern: '^[0-9]{6}$'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid token
 */
userRouter.post(
  "/confirmTwoFactorLogin",
  Validation(UV.confirmTwoFactorLoginSchema),
  UC.confirmLoginTwoFactor
);

/**
 * @swagger
 * /users/dashboard:
 *   get:
 *     summary: Admin dashboard
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers:
 *                   type: number
 *                 totalPosts:
 *                   type: number
 *                 statistics:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
userRouter.get(
  "/dashboard",
  Authentication(),
  authorization([RoleType.admin, RoleType.superAdmin]),
  UC.dashBoard
);

/**
 * @swagger
 * /users/chandeRole/{userId}:
 *   patch:
 *     summary: Change user role (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to change role
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, admin, superAdmin]
 *                 description: New role for the user
 *     responses:
 *       200:
 *         description: Role changed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
userRouter.patch(
  "/chandeRole/:userId",
  Authentication(),
  authorization([RoleType.admin, RoleType.superAdmin]),
  UC.changeRole
);

/**
 * @swagger
 * /users/friendRequest/{userId}:
 *   post:
 *     summary: Send friend request
 *     tags: [Users - Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request sent
 */
userRouter.post(
  "/friendRequest/:userId",
  Authentication(),
  UC.sendFriendRequest
);

/**
 * @swagger
 * /users/acceptRequest/{requestId}:
 *   patch:
 *     summary: Accept friend request
 *     tags: [Users - Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: requestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request accepted
 */
userRouter.patch(
  "/acceptRequest/:requestId",
  Authentication(),
  UC.acceptFriendRequest
);

/**
 * @swagger
 * /users/blockUser/{userId}:
 *   patch:
 *     summary: Block a user
 *     tags: [Users - Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User blocked successfully
 */
userRouter.patch(
  "/blockUser/:userId",
  Authentication(),
  Validation(UV.blockUserSchema),
  UC.blockUser
);

/**
 * @swagger
 * /users/deleteFriendRequest/{friendRequestId}:
 *   delete:
 *     summary: Delete friend request
 *     tags: [Users - Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendRequestId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend request deleted
 */
userRouter.delete(
  "/deleteFriendRequest/:friendRequestId",
  Authentication(),
  UC.deleteFriendRequest
);

/**
 * @swagger
 * /users/unFriend/{friendId}:
 *   delete:
 *     summary: Remove friend
 *     tags: [Users - Friends]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: friendId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Friend removed successfully
 */
userRouter.delete("/unFriend/:friendId", Authentication(), UC.unFriend);

export default userRouter;
