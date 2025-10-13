import mongoose, { models, Types , model } from "mongoose";
import { Schema } from "mongoose";


export interface IMessage{
    content:string;
    createdBy:Types.ObjectId;
    createdAt?:Date;
    updatedAt?:Date;
}

export  interface IChat {
    //----OVO-----
    participants: Types.ObjectId[];
    createdBy: Types.ObjectId;
    message: IMessage[],

    //-----OVM-----
    group?:string,
    groupImage?:string,
    roomId?:string,

    createdAt: Date;
    updatedAt:Date;

}
const messageSchema = new Schema<IMessage>({
    content:{type:String,required:true},
    createdBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
},{
    timestamps: true
})
const chatSchema = new Schema<IChat>({
    participants:[{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true}],
    createdBy:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
    message: {
        type: [messageSchema],
        default: [] 
    },
    group:{type:String},
    groupImage:{type:String},
    roomId:{type:String},
    
},{
    timestamps:true
})
const ChatModel = models.Chat || model("Chat",chatSchema);
export default ChatModel;
