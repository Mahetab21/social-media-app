import { PostRepository } from  "../../DB/repositories/post.repository";
import { UserRepository } from "../../DB/repositories/user.repository";
import  postModel, { AllowCommentEnum, AvailabilityEnum, IPost }  from "../../DB/model/post.model";
import  userModel  from "../../DB/model/user.model";
import { Request, Response, NextFunction } from "express";
import { uuidv4 } from "zod";
import { deleteFiles, uploadFiles } from "../../utils/s3.config";
import { AppError } from "../../utils/classError";
import { HydratedDocument, Types, UpdateQuery } from "mongoose";
import { eventEmitter } from "../../utils/event";
import { emailTemplate } from "../../service/email.temp";
import { CommentRepository } from "../../DB/repositories/comment.repository";
import commentModel, { IComment, OnModelEnum } from "../../DB/model/comment.model";
import {FreezeCommentInput,HardDeleteCommentInput,UpdateCommentInput,GetCommentsByIdInput,GetCommentWithReplyInput} from "./comment.validation";
import { populate } from "dotenv";
class CommentService {
    private _userModel = new UserRepository(userModel);
    private _postModel = new PostRepository(postModel);
    private _commentModel = new CommentRepository(commentModel);
    constructor(){}
//====================Create Comment===================
createComment = async(req:Request , res:Response , next:NextFunction)=>{
    const{postId, commentId}=req.params;
    let {content , tags ,attachments, onModel}=req.body;

    let doc : HydratedDocument<IPost | IComment> | null=null;
     if(commentId){
        if(onModel !== OnModelEnum.Comment){
            return next(new AppError("onModel must be Comment when replying to a comment",400))
        }
     
      const comment= await this._commentModel.findOne(
        {
            _id:commentId,
            refId:postId,
        },
        {
            populate:{
                path:"refId",
                match:{
                    allowComments:AllowCommentEnum.allow,
                    availability :AvailabilityEnum.public
                }
            }
        }
      )
      if(!comment?.refId){
        return next(new AppError("Comment not found or you are not allowed to reply on this comment",404))
      } doc= comment;
    }else if(onModel === OnModelEnum.post){
            const post = await this._postModel.findOne({
            _id:postId,
            allowComments:AllowCommentEnum.allow,
            //XXx
            availability :AvailabilityEnum.public
        })
         if(!post){ 
        return next(new AppError("Post not found or you are not allowed to comment on this post",404))
    }
        doc=post;
      }else {
        return next(new AppError("Invalid onModel value or missing commentId",400))
    }

    if(
        tags?.length &&(await this._userModel.find({filter:{_id:{ $in: tags}}})).length!== tags.length
    ){
        return next(new AppError("Invalid tags",400))
    }
    const assestFolderId = uuidv4(). toString();
    if(attachments?.length){
        attachments=await uploadFiles({
            files:req?.files as  Express.Multer.File[],
            path:`users/${doc?.createdBy}/posts/${doc?.assestFolderId}/comments/${assestFolderId}`
        })
    }
    const comments= await this._commentModel.create({
        content,
        attachments,
        assestFolderId,
        refId: doc?._id as unknown as Types.ObjectId,
        onModel,
        tags,
        createdBy: req?.user?._id as unknown as Types.ObjectId
    })
    if(!comments){
        await deleteFiles({
            urls: attachments || []
        })
    }
 
    return res.status(201).json({message:"comment created success"})
} 
//====================freeze comment===================
freezeComment = async(req:Request , res:Response , next:NextFunction)=>{
    const {commentId}:FreezeCommentInput = req.params as FreezeCommentInput;
    const userId = req.user?._id;
    if(!userId){ 
        throw new AppError("User not found",404);
     }
    const comment = await this._commentModel.findOneAndUpdate(
        {
            _id: commentId,
            isFrozen: false,
            deletedAt: { $exists: false },
        },{
            $set: {
                isFrozen: true,
                frozenAt: new Date(),
                frozenBy: userId,
                },
            },
            { new: true }
        );
    if(!comment){
        throw new AppError("Comment not found, already frozen or deleted",404);
    }
    return res.status(200).json({ message: "Comment frozen successfully", comment });


}
//====================hard delete comment===========
hardDeleteComment = async(req:Request , res:Response , next:NextFunction)=>{
    const {commentId}:HardDeleteCommentInput = req.params as HardDeleteCommentInput;
    const userId = req.user?._id;
    if(!userId){
        throw new AppError("Unauthorized",401)
    }
    const comment = await this._commentModel.findOne({
        _id: commentId,
        createdBy: userId,
        paranoid: true, 
        });
        if(!comment){
            throw new AppError("Comment not found or not permitted to delete",404);
        }
        if (comment.attachments && comment.attachments.length) {
            await deleteFiles({ urls: comment.attachments });
        }
        const deleted = await this._commentModel.findOneAndDelete({ _id: commentId });

        if(!deleted){
            throw new AppError("Failed to delete comment",500);
        }
        return res.status(200).json({ message: "Comment permanently deleted" });

}   
//===================update comment===================
updateComment = async(req:Request , res:Response , next:NextFunction)=>{
    const { commentId } = req.params as UpdateCommentInput["params"];
    let {content, tags, onModel} = req.body as UpdateCommentInput["body"];
    const userId = req.user?._id;
    
    if(!userId){
       return next(new AppError("User not found",404));
    }
    
    const existingComment = await this._commentModel.findOne({
        _id: commentId,
        createdBy: userId,
        deletedAt: { $exists: false },
        isFrozen: false,
    });

    if(!existingComment){
        return next(new AppError("Comment not found or not permitted to update",404));
    }

    if(tags?.length && (await this._userModel.find({filter:{_id:{ $in: tags}}})).length !== tags.length){
        return next(new AppError("Invalid tags",400));
    }

    let newAttachments: string[] | undefined;
    if(req.files && (req.files as Express.Multer.File[]).length > 0){
        if(existingComment.attachments && existingComment.attachments.length > 0){
            await deleteFiles({ urls: existingComment.attachments });
        }

        newAttachments = await uploadFiles({
            files: req.files as Express.Multer.File[],
            path: `users/${userId}/posts/${existingComment.refId}/comments/${existingComment.assestFolderId}`
        });
    }

    const updateData: any = {};
    if(content !== undefined) updateData.content = content;
    if(newAttachments !== undefined) updateData.attachments = newAttachments;
    if(tags !== undefined) updateData.tags = tags;
    if(onModel !== undefined) updateData.onModel = onModel;
    updateData.updatedAt = new Date();

    const updatedComment = await this._commentModel.findOneAndUpdate(
        {
            _id: commentId,
            createdBy: userId,
            deletedAt: { $exists: false },
            isFrozen: false,
        },
        { $set: updateData },
        { new: true }
    );

    if(!updatedComment){
        if(newAttachments?.length){
            await deleteFiles({ urls: newAttachments });
        }
        return next(new AppError("Failed to update comment",500));
    }

    return res.status(200).json({ 
        message: "Comment updated successfully", 
        comment: updatedComment 
    });
}
//===================get comments by postId=============
getCommentsById = async(req:Request , res:Response , next:NextFunction)=>{
    const {commentId}:GetCommentsByIdInput = req.params as GetCommentsByIdInput;
    const userId = req.user?._id;
    if(!userId){
        throw new AppError("user not found" , 404)
    }
    const comment = await this._commentModel.findOne(
        {
            _id:commentId,
            deletedAt:{$exists:false},
            isFrozen:false
        },
        {
            populate:[
                {
                    path:"createdBy",
                    select:"firstName lastName userName profileImage"
                },
                {
                    path:"tags",
                    select:"firstName lastName userName profileImage"
                },
                {
                    path:"refId",
                    populate:{
                        path:"createdBy",
                        select:"firstName lastName userName profileImage"
                    }
                }
            ]
        }
    )
    if(!comment){
        throw new AppError("comment not found or has been deleted or frozen",404)
    }
    if(comment.refId && comment.onModel == OnModelEnum.post){
        const post = comment.refId as any;
        if(post.availability == AvailabilityEnum.private &&
            post.createdBy.toString() !== userId.toString()
        ){
            throw new AppError("You are not allowed to view this comment",403)
        }
    }
    return res.status(200).json({message:"success",comment})
}
//===================get comment with reply==============
getCommentWithReply = async(req:Request , res:Response , next:NextFunction)=>{
    const {commentId}:GetCommentWithReplyInput = req.params as GetCommentWithReplyInput;
    const userId = req.user?._id;
    if(!userId){
        throw new AppError("user not found" , 404)
    }
    const comment = await this._commentModel.findOne(
        {
            _id:commentId,
            deletedAt:{$exists:false},
            isFrozen:false
        },
        {
            populat:[
                {
                    path:"createdBy",
                    select:"firstName lastName userName profileImage"
                },
                {
                    path: "tags",
                    select: "firstName lastName userName profileImage"
                },
                {
                    path: "refId",
                    populate: {
                        path: "createdBy",
                        select: "firstName lastName userName profileImage"
                    }
   
                }
            ]
        }
    )
    if(!comment){
        throw new AppError("comment not found or has been deleted or frozen",404)
    }
        if(comment.refId && comment.onModel === OnModelEnum.post){
        const post = comment.refId as any;
        if(post.availability === AvailabilityEnum.private &&
            post.createdBy.toString() !== userId.toString()
        ){
            throw new AppError("You are not allowed to view this comment", 403);
        }
    }
    const replies = await this._commentModel.findOne(
        {
            refId:commentId,
            onModel:OnModelEnum.Comment,
            deletedAt:{$exists:false},
            isFrozen:false
        },{
             populate: [
                {
                    path: "createdBy",
                    select: "firstName lastName userName profileImage"
                },
                {
                    path: "tags",
                    select: "firstName lastName userName profileImage"
                }
            ],
            sort: { createdAt: -1 }
        }
    )
    const commentWithReplies = {
        ...comment.toObject(),
        replies: replies || [],
       // repliesCount: replies?.length || 0
    };

    return res.status(200).json({
        message: "Success",
        comment: commentWithReplies
    });

}
}
export default new CommentService();