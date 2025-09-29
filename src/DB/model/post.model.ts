import { Schema ,model, models } from "mongoose";
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

    createdBy:Schema.Types.ObjectId,
    likes?:Schema.Types.ObjectId[],
    tags?:Schema.Types.ObjectId[],

    allowComments:AllowCommentEnum,
    availability:AvailabilityEnum,
    deletedAt?:Date,
    deletedBy?:Schema.Types.ObjectId,
    restoredAt?:Date,
    restoredBy?:Schema.Types.ObjectId
}

export const postSchema = new Schema<IPost>({
    content:{type:String,minLength:3,maxLength:5000,required:function(){return this.attachments?.length==0}},
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
const PostModel = models.Post || model("Post",postSchema);
export default PostModel;