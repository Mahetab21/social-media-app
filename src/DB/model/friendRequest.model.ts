import mongoose, { Schema ,model, models } from "mongoose";
import { Types } from "mongoose";

export interface IFriendRequest{
    sendTo:Types.ObjectId,
    createdBy:Types.ObjectId,
    acceptedAt?:Date,
    deletedAt?:Date
}

export const friendRequestSchema = new Schema<IFriendRequest>({
    createdBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    sendTo:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    acceptedAt:{type:Date},
    deletedAt:{type:Date},
},{
    timestamps:true,
    strictQuery:true
})
friendRequestSchema.pre(["find","findOne"],function(next){
    const query=this.getQuery();
    const { paranoid,...rest}=query;
    if(paranoid=== false){
        this.setQuery({...rest,deletedAt:{$exists:true}})
    }else{
        this.setQuery({...rest,deletedAt:{$exists:false}})
    }
    next()
})


const FriendRequestModel = models.FriendRequest || model("FriendRequest",friendRequestSchema);
export default FriendRequestModel;