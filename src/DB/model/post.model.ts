import { Schema ,model, models, Types } from "mongoose";
export enum AllowCommentEnum{
    allow="allow",
    deny="deny",
}
export enum AvailabilityEnum{
    public="public",
    private="private",
    friends="friends",
}
export interface IPost{
    content?:string,
    attachments?:string[],
    assestFolderId?:string,

    createdBy:Types.ObjectId,
    likes?:Types.ObjectId[],
    tags?:Types.ObjectId[],

    allowComments:AllowCommentEnum,
    availability:AvailabilityEnum,
    deletedAt?:Date,
    deletedBy?:Types.ObjectId,
    restoredAt?:Date,
    restoredBy?:Types.ObjectId,

    isFrozen?: boolean,                 
    frozenAt?: Date,                     
    frozenBy?: Types.ObjectId,    
    unfrozenAt?: Date,                   
    unfrozenBy?: Types.ObjectId,  
}

export const postSchema = new Schema<IPost>({
    content:{type:String,minLength:3,maxLength:5000,required:function(this: IPost): boolean {return !this.attachments?.length}},
    attachments:[String],
    assestFolderId:{type:String},

    createdBy:{type:Schema.Types.ObjectId,ref:"User",required:true},

    likes:[{type:Schema.Types.ObjectId,ref:"User"}],
    tags:[{type:Schema.Types.ObjectId,ref:"User"}],

    allowComments:{type:String,enum:AllowCommentEnum,default:AllowCommentEnum.allow},
    availability:{type:String,enum:AvailabilityEnum,default:AvailabilityEnum.public},

    deletedAt:{type:Date},
    deletedBy:{type:Schema.Types.ObjectId,ref:"User"},

    restoredAt:{type:Date},
    restoredBy:{type:Schema.Types.ObjectId,ref:"User"},


    isFrozen: { type: Boolean, default: false },
    frozenAt: { type: Date },
    frozenBy: { type: Schema.Types.ObjectId, ref: "User" },
    unfrozenAt: { type: Date },
    unfrozenBy: { type: Schema.Types.ObjectId, ref: "User" },
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
postSchema.pre(["find","findOne"],function(next){
    const query=this.getQuery();
    const { paranoid,...rest}=query;
    if(paranoid=== false){
        this.setQuery({...rest,deletedAt:{$exists:true}})
    }else{
        this.setQuery({...rest,deletedAt:{$exists:false}})
    }
    next()
})


postSchema.virtual("comments",{
    ref:"Comment",
    localField:"_id",
    foreignField:"postId",
})
const PostModel = model<IPost>("Post",postSchema);
export default PostModel;