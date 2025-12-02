import mongoose, { HydratedDocument, Types } from "mongoose";
import { Schema ,model, models } from "mongoose";
import { IPost } from "./post.model";

export enum OnModelEnum{
    post="post",
    Comment="Comment"
}
export interface IComment{
    content?:string,
    attachments?:string[],
    assestFolderId?:string,

    createdBy:Types.ObjectId,
    refId:Types.ObjectId ,
    onModel:OnModelEnum,
    
    postId?: Types.ObjectId,       // Reference to post when this is a direct comment on a post
    commentId?: Types.ObjectId,    // Reference to parent comment when this is a reply

    likes?:Schema.Types.ObjectId[],
    tags?:Schema.Types.ObjectId[],

    deletedAt?:Date,
    deletedBy?:Schema.Types.ObjectId,
    restoredAt?:Date,
    restoredBy?:Schema.Types.ObjectId,

    isFrozen?: boolean,
    frozenAt?: Date,
    frozenBy?: Schema.Types.ObjectId,
}

export const commentSchema = new Schema<IComment>({
    content:{type:String,minLength:3,maxLength:5000,required:function(){return this.attachments?.length==0}},
    attachments:[String],
    assestFolderId:{type:String},

    createdBy:{type:Schema.Types.ObjectId,ref:"User",required:true},
    refId:{type:mongoose.Schema.Types.ObjectId,refPath:"onModel",required:true},
    onModel:{type:String,required:true,enum:OnModelEnum},
    
    postId:{type:Schema.Types.ObjectId,ref:"Post"},     // Reference to post when commenting on a post
    commentId:{type:Schema.Types.ObjectId,ref:"Comment"}, // Reference to parent comment when replying

    likes:[{type:Schema.Types.ObjectId,ref:"User"}],
    tags:[{type:Schema.Types.ObjectId,ref:"User"}],


    deletedAt:{type:Date},
    deletedBy:{type:Schema.Types.ObjectId,ref:"User"},

    restoredAt:{type:Date},
    restoredBy:{type:Schema.Types.ObjectId,ref:"User"},
    
    isFrozen: { type: Boolean, default: false },
    frozenAt: { type: Date },
    frozenBy: { type: Schema.Types.ObjectId, ref: "User" }
},{
    timestamps:true,
    toJSON:{
        virtuals:true
    },
    toObject:{
        virtuals:true
    },
    
    strictQuery:true
})
commentSchema.pre(["find","findOne","findOneAndUpdate","findOneAndDelete"],function(next){
    const query=this.getQuery();
    const { paranoid,...rest}=query;
    if(paranoid=== false){
        this.setQuery({...rest,deletedAt:{$exists:true}})
    }else{
        this.setQuery({...rest,deletedAt:{$exists:false}})
    }
    next()
})

// Middleware to set postId and commentId based on onModel and refId
commentSchema.pre("save", function(next) {
    if (this.onModel === OnModelEnum.post) {
        this.postId = this.refId;
        delete (this as any).commentId;
    } else if (this.onModel === OnModelEnum.Comment) {
        this.commentId = this.refId;
        // For replies, postId will be set in the service layer
    }
    next();
})
commentSchema.virtual("replies",{
    ref:"Comment",
    localField:"_id",
    foreignField:"commentId"
})
const CommentModel = models.Comment || model("Comment",commentSchema);
export default CommentModel;