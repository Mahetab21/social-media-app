import { PostRepository } from "../../DB/repositories/post.repository";
import { UserRepository } from "../../DB/repositories/user.repository";
import postModel, { AvailabilityEnum, IPost } from "../../DB/model/post.model";
import userModel from "../../DB/model/user.model";
import { Request, Response, NextFunction } from "express";
import { uuidv4 } from "zod";
import { deleteFiles, uploadFiles } from "../../utils/s3.config";
import { AppError } from "../../utils/classError";
import {
  likePostSchemaType,
  likePostQueryType,
  sendTagEmailSchemaType,
  updatePostSchemaType,
  updatePostBodyType,
  freezePostSchemaType,
  hardDeleteSchemaType,
  getPostByIdSchemaType,
} from "./post.validation";
import { UpdateQuery } from "mongoose";
import { eventEmitter } from "../../utils/event";
import { emailTemplate } from "../../service/email.temp";
class PostService {
  private _userModel = new UserRepository(userModel);
  private _postModel = new PostRepository(postModel);
  constructor() {}
  //====================Create Post====================
  createPost = async (req: Request, res: Response, next: NextFunction) => {
    if (
      req?.body?.tags?.length &&
      (
        await this._userModel.find({
          filter: { _id: { $in: req?.body?.tags } },
        })
      ).length !== req?.body?.tags?.length
    ) {
      throw new AppError("Invalid tags", 400);
    }
    const assestFolderId = uuidv4();
    let attachments: string[] = [];
    if (req?.files?.length) {
      attachments = await uploadFiles({
        files: req?.files as unknown as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${assestFolderId}`,
      });
    }
    const post = await this._postModel.create({
      ...req.body,
      attachments,
      assestFolderId,
      createdBy: req.user?._id,
    });
    if (!post) {
      await deleteFiles({ urls: attachments || [] });
      throw new AppError("Failed to create post", 500);
    }
    return res.status(201).json({ message: "post created success", post });
  };
  //====================like Post=====================
  likePost = async (req: Request, res: Response, next: NextFunction) => {
    const { postId }: likePostSchemaType = req.params as likePostSchemaType;
    const { action }: likePostQueryType = req.query as likePostQueryType;

    let updateQuery: UpdateQuery<IPost> = {
      $addToSet: { likes: req.user?._id },
    };
    if (action === "unlike") {
      updateQuery = { $pull: { likes: req.user?._id } };
    }
    const post = await this._postModel.findOneAndUpdate(
      {
        _id: postId,
        $or: [
          { availability: AvailabilityEnum.public },
          { availability: AvailabilityEnum.private, createdBy: req.user?._id },
          {
            availability: AvailabilityEnum.friends,
            createdBy: { $in: [...(req.user?.friends || []), req.user?._id] },
          },
        ],
      },
      updateQuery,
      { new: true }
    );

    if (!post) {
      throw new AppError("Failed to like post", 500);
    }
    return res
      .status(200)
      .json({ message: `post ${action} successfully`, post });
  };
  //====================update Post====================
  updatePost = async (req: Request, res: Response, next: NextFunction) => {
    const { postId }: updatePostSchemaType = req.params as updatePostSchemaType;
    const {
      content,
      attachments,
      availability,
      allowComments,
      tags,
    }: updatePostBodyType = req.body as updatePostBodyType;
    const post = await this._postModel.findOne({
      _id: postId,
      createdBy: req.user?._id,
      paranoid: true,
    });
    if (!post) {
      throw new AppError("Post not found", 404);
    }
    if (req?.body?.content) {
      post.content = req.body.content;
    }
    if (req?.body?.availability) {
      post.availability = req.body.availability;
    }
    if (req?.body?.allowComments) {
      post.allowComments = req.body.allowComments;
    }
    if (req?.files?.length) {
      await deleteFiles({ urls: post.attachments || [] });
      post.attachments = await uploadFiles({
        files: req?.files as unknown as Express.Multer.File[],
        path: `users/${req?.user?._id}/posts/${post.assestFolderId}`,
      });
    }
    if (req?.body?.tags?.length) {
      if (
        req?.body?.tags?.length &&
        (
          await this._userModel.find({
            filter: { _id: { $in: req?.body?.tags } },
          })
        ).length !== req?.body?.tags?.length
      ) {
        throw new AppError("Invalid tags", 400);
      }
      post.tags = req.body.tags;
    }
    await post.save();
    return res.status(200).json({ message: "post updated successfully", post });
  };
  //====================send email tags=================
  sendTagNotificationEmails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const { postId }: sendTagEmailSchemaType =
      req.params as sendTagEmailSchemaType;
    const post = await this._postModel.findOne({
      _id: postId,
      createdBy: req.user?._id,
      paranoid: true,
    });
    if (!post) {
      throw new AppError("Post not found", 404);
    }
    if (!post.tags || post.tags.length === 0) {
      throw new AppError("No users tagged in this post", 400);
    }
    const taggedUsers = await this._userModel.find({
      filter: { _id: { $in: post.tags } },
      select: "email name username",
    });
    const creator = await this._userModel.findOne(
      { _id: post.createdBy },
      "name username"
    );
    const fromName = creator
      ? `${creator.fName || ""} ${creator.lName || ""}`.trim() ||
        creator.userName
      : "Someone";
    taggedUsers.forEach((u: any) => {
      const to = u.email;
      const toName = u.name || u.username || "";
      const subject = `${fromName} tagged you in a post`;
      const html = emailTemplate(post.content || "", subject);

      eventEmitter.emit("notifyTagged", {
        to,
        toName,
        fromName,
        postId: post._id,
        html,
        subject,
      });
    });

    return res
      .status(200)
      .json({ message: "Tag notification emails sent successfully" });
  };
  //====================get all post=====================
  getPosts = async (req: Request, res: Response, next: NextFunction) => {
    // let {page=1 , limit=5} =req.query as unknown as {page?:number,limit?:number};
    // const {currentPage, docs,countDocument,numberOfPages} = await this._postModel.paginate({ filter: {} , query :{page,limit}});

    const posts = await this._postModel.find({
      filter: {},
      options: {
        populate: [
          {
            path: "comment",
            match: {
              commentId: { $exists: false },
            },
            populate: {
              path: "replies",
            },
          },
        ],
      },
    });

    //return res.status(200).json({ message: "Posts fetched successfully",currentPage, numberOfPages, countDocument ,posts: docs });
    return res
      .status(200)
      .json({ message: "Posts fetched successfully", posts });
  };
  //=====================freeze post====================
  freezePost = async (req: Request, res: Response, next: NextFunction) => {
    const { postId }: freezePostSchemaType = req.params as freezePostSchemaType;
    const userId = req.user?._id;
    if (!userId) {
      throw new AppError("User not found", 404);
    }
    const post = await this._postModel.findOneAndUpdate(
      {
        _id: postId,
        isFrozen: false,
        deletedAt: { $exists: false },
      },
      {
        $set: {
          isFrozen: true,
          frozenAt: new Date(),
          freozenBy: userId,
        },
      }
    );
    if (!post) {
      throw new AppError("Post not found or already frozen", 404);
    }
    return res.status(200).json({ message: "Post frozen successfully", post });
  };
  //======================hard delete post==================
  hardDelete = async (req: Request, res: Response, next: NextFunction) => {
    const { postId }: hardDeleteSchemaType = req.params as hardDeleteSchemaType;
    const post = await this._postModel.findOne({
      _id: postId,
      createdBy: req.user?._id,
      paranoid: true,
    });
    if (!post) {
      throw new AppError("Post not found", 404);
    }
    if (post.attachments && post.attachments.length) {
      await deleteFiles({ urls: post.attachments });
    }

    const deleted = await this._postModel.findOneAndDelete({ _id: postId });
    if (!deleted) {
      throw new AppError("Failed to delete post", 500);
    }
    return res.status(200).json({ message: "Post permanently deleted" });
  };
  //=======================get post by id====================
  getPostById = async (req: Request, res: Response, next: NextFunction) => {
    const { postId }: getPostByIdSchemaType =
      req.params as getPostByIdSchemaType;
    const posts = await this._postModel.find({
      filter: {
        _id: postId,
        availability: AvailabilityEnum.public,
        deletedAt: { $exists: false },
      },
      options: {
        populate: [
          {
            path: "createdBy",
            select: "userName profilePicture",
          },
          {
            path: "comment",
            match: {
              commentId: { $exists: false },
            },
            populate: [
              {
                path: "createdBy",
                select: "userName profilePicture",
              },
              {
                path: "replies",
                populate: {
                  path: "createdBy",
                  select: "userName profilePicture",
                },
              },
            ],
          },
        ],
      },
    });

    const post = posts[0]; // Get the first result
    if (!post) {
      throw new AppError("Post not found or not publicly available", 404);
    }
    return res.status(200).json({ message: "Post fetched successfully", post });
  };
}
export default new PostService();
