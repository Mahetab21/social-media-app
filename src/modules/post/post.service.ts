import { PostRepository } from  "../../DB/repositories/post.repository";
import { UserRepository } from "../../DB/repositories/user.repository";
import  postModel, { AvailabilityEnum, IPost }  from "../../DB/model/post.model";
import  userModel  from "../../DB/model/user.model";
import { Request, Response, NextFunction } from "express";
import { uuidv4 } from "zod";
import { deleteFiles, uploadFiles } from "../../utils/s3.config";
import { AppError } from "../../utils/classError";
import {likePostSchemaType ,likePostQueryType,sendTagEmailSchemaType} from "./post.validation";
import { UpdateQuery } from "mongoose";
import { eventEmitter } from "../../utils/event";
import { emailTemplate } from "../../service/email.temp";
class PostService {
    private _userModel = new UserRepository(userModel);
    private _postModel = new PostRepository(postModel);
    constructor(){}
//====================Create Post====================
createPost = async(req:Request , res:Response , next:NextFunction)=>{
    if(
        req?.body?.tags?.length &&
        (await this._userModel.find({_id:{ $in: req?.body?.tags}})).length !== req?.body?.tags?.length
    ){
        throw new AppError("Invalid tags",400);
    }
    const assestFolderId= uuidv4();
    let attachments:string[]=[]
    if(req?.files?.length){
        attachments=await uploadFiles({
            files:req?.files as unknown as Express.Multer.File[],
            path:`users/${req?.user?._id}/posts/${assestFolderId}`
        })
    }
    const post = await this._postModel.create({
        ...req.body,
        attachments,
        assestFolderId,
        createdBy:req.user?._id
    })
    if(!post){
        await deleteFiles({urls:attachments || []});
        throw new AppError("Failed to create post",500);
    }
    return res.status(201).json({message:"post created success",post})
}    
//====================like Post=====================
likePost= async(req:Request , res:Response , next:NextFunction)=>{
    const {postId}:likePostSchemaType = req.params as likePostSchemaType;
    const {action}:likePostQueryType = req.query as likePostQueryType;

    let updateQuery : UpdateQuery<IPost> ={$addToSet:{likes:req.user?._id}};
    if(action === "unlike"){
        updateQuery = {$pull:{likes:req.user?._id}};
    }
    const post= await this._postModel.findOneAndUpdate
    ({_id:postId,
        $or:[
            {availability:AvailabilityEnum.public},
            {availability:AvailabilityEnum.private,createdBy:req.user?._id},
            {availability:AvailabilityEnum.friends,createdBy:{$in:[...req.user?.friends || [], req.user?._id]}},
        ]
    },
    updateQuery,
    {new:true})

    if(!post){
        throw new AppError("Failed to like post",500);
    }
    return res.status(200).json({message:`post ${action} successfully`,post})
}
//====================update Post====================
updatePost= async(req:Request , res:Response , next:NextFunction)=>{
    const {postId}:likePostSchemaType = req.params as likePostSchemaType;
    const post = await this._postModel.findOne(
        {
            _id:postId,
            createdBy:req.user?._id,
            paranoid:true
        });
    if(!post){
        throw new AppError("Post not found",404);
    }
    if(req?.body?.content){
        post.content=req.body.content;
    }
    if(req?.body?.availability){
        post.availability=req.body.availability;
    }
    if(req?.body?.allowComments){
        post.allowComments=req.body.allowComments;
    }
    if(req?.files?.length){
        await deleteFiles({urls:post.attachments || []});
        post.attachments=await uploadFiles({
            files:req?.files as unknown as Express.Multer.File[],
            path:`users/${req?.user?._id}/posts/${post.assestFolderId}`
        })
    }
    if(req?.body?.tags?.length){
        if(
        req?.body?.tags?.length &&
        (await this._userModel.find({_id:{ $in: req?.body?.tags}})).length !== req?.body?.tags?.length
    ){
        throw new AppError("Invalid tags",400);
    }
        post.tags=req.body.tags;
    }
    await post.save();
    return res.status(200).json({message:"post updated successfully",post})
}
//====================send email tags=================
sendTagNotificationEmails = async (req: Request, res: Response, next: NextFunction) => {
    const { postId }: sendTagEmailSchemaType = req.params as sendTagEmailSchemaType;
    const post = await this._postModel.findOne({
        _id: postId,
        createdBy: req.user?._id,
        paranoid: true
    });
    if (!post) {
        throw new AppError("Post not found", 404);
    }
    if (!post.tags || post.tags.length === 0) {
        throw new AppError("No users tagged in this post", 400);
    }
    const taggedUsers = await this._userModel.find(
        { _id: { $in: post.tags } },
        "email name username"
    );
    const creator = await this._userModel.findOne(
        { _id: post.createdBy },
        "name username"
    );
const fromName = creator
  ? `${creator.fName || ""} ${creator.lName || ""}`.trim() || creator.userName: "Someone";
    taggedUsers.forEach((u: any) => {
        const to = u.email;
        const toName = u.name || u.username || "";
        const subject = `${fromName} tagged you in a post`;
        const html = emailTemplate(post.content || "", subject); 

        eventEmitter.emit("notifyTagged", { to, toName, fromName, postId: post._id, html, subject });
    });

    return res.status(200).json({ message: "Tag notification emails sent successfully" });
}

}
export default new PostService();