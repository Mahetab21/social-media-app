import { ChatRepository } from "../../DB/repositories/chat.repository";
import ChatModel from "../../DB/model/chat.model";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/classError";
import { Server, Socket } from "socket.io";
import { UserRepository } from "../../DB/repositories/user.repository";
import userModel from "../../DB/model/user.model";
import connectionSockets from "../gateway/gateway";
import { Types } from "mongoose";
import { uuidv4 } from "zod";
import { deleteFile, uploadFile } from "../../utils/s3.config";
export class ChatService {
  constructor() {}
  private _chatModel = new ChatRepository(ChatModel);
  private _userModel = new UserRepository(userModel);
//==============Rest Api===========================
  //---------------get chat--------------
getChat = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    let { page, limit = 5 } = req.query as unknown as {page: number;limit: number;};

    const result = await this._chatModel.paginateChat({
      filter: {
        participants: { $all: [userId, req?.user?._id] },
        group: { $exists: false },
      },
      query: { page, limit },
      options: {
        populate: [{ path: "participants" }],
      },
    });

    if (!result.docs || result.docs.length === 0) {
      throw new AppError("no chat found", 404);
    }

    return res.status(200).json({
      message: "success",
      chat: result.docs,
      pagination: {
        currentPage: result.currentPage,
        totalPages: result.numberOfPages,
        totalDocuments: result.countDocument,
      },
    });
  };
  //-------------create group chat--------------
createGroupChat = async (req: Request, res: Response, next: NextFunction) => {
    let { group, groupImage, participants } = req.body;
    const createdBy = req?.user?._id as Types.ObjectId;
    const dbParticipants = participants.map((participants:string)=>Types.ObjectId.createFromHexString(participants));
    const users = await this._userModel.find({
      filter:{
        _id:{
          $in:dbParticipants
        },
        friends:{
          $in:[createdBy]
        }
      }
    })
    if(users.length!==participants.length){
      throw new AppError("there are invalid participants",400);
    }
    const roomId= group?.replaceAll(/\s+/g,"_")+"_"+uuidv4();
    if(req?.file){
      groupImage= await uploadFile({
        path:`chat/${roomId}`,
        file:req.file as Express.Multer.File
      })
    }
    participants.push(createdBy)
    const chat= await this._chatModel.create({
      group,
      groupImage,
      participants: dbParticipants,
      createdBy,
      roomId,
      message:[]
    })
    if(!chat){
      if(groupImage){
        await deleteFile({ Key: groupImage})
      }
      throw new AppError("failed to create chat",404);
    }
    return res.status(200).json({message:"success",chat})
  }
  //------------get group chat--------------
getGroupChat= async (req: Request, res: Response, next: NextFunction) => {
    const { groupId } = req.params;
    let { page, limit = 5 } = req.query as unknown as {page: number;limit: number;};
    const chat = await this._chatModel.paginateChat({
      filter: {
         _id:groupId,
        participants: { $in:[req?.user?._id]},
        group: { $exists: true },
      },
      query: { page, limit },
      options: {
        populate:[{
        path:"message.createdBy",
      }] 
      },
    });
    if(!chat){
      throw new AppError("chat not found",404)
    }
    return res.status(200).json({
      message:"success",chat
    })
}


//===============socket Io=====================================
  sayHi = async (data: any, socket: Socket, io: Server) => {
    console.log(data);
  };
  //-------------send message--------
  sendMessage = async (data: any, socket: Socket, io: Server) => {
    const { content, sendTo } = data;
    const createdBy = socket?.data?.user._id;
    const user = await this._userModel.findOne({
      _id: sendTo,
      friends: { $in: [createdBy] },
    });
    if (!user) {
      throw new AppError("user not found", 400);
    }
    const chat = await this._chatModel.findOneAndUpdate(
      {
        participants: { $all: [createdBy, sendTo] },
        group: { $exists: false },
      },
      {
        $push: {
          message: {
            content,
            createdBy,
          },
        },
      }
    );
    if (!chat) {
      const newChat = await this._chatModel.create({
        participants: [createdBy, sendTo],
        createdBy,
        message: [
          {
            content,
            createdBy,
          },
        ],
      });
      if (!newChat) {
        throw new AppError("failed to create chat", 400);
      }
    }
    io.to(connectionSockets.get(createdBy.toString())!).emit("successMessage", {
      content,
    });
    io.to(connectionSockets.get(sendTo.toString())!).emit("newMessage", {
      content,
      from: socket.data.user,
    });
  };
  //-------------join room--------
  join_room = async (data: any, socket: Socket, io: Server) => {
    const { roomId } = data;
    const chat = await this._chatModel.findOne({
      roomId,
      participants: { $in: [socket?.data?.user._id] },
      group: { $exists: true }
    })
    if(!chat){
      throw new AppError("chat not found",404);
    }
    socket.join(chat?.roomId!);
  }
  //-------------send group message--------
  sendGroupMessage = async (data: any, socket: Socket, io: Server) => {
    const { content, groupId } = data;
    const createdBy = socket.data.user._id;
    const chat = await this._chatModel.findOneAndUpdate({
      _id:groupId,
      participants:{
        $all:[createdBy]
      },
      group: { $exists: true }
    },{
      $push:{
        message:{
          content,
          createdBy
        }
      }
    })
    if(!chat){
      throw new AppError("chat not found",404);
    }
    io.to(connectionSockets.get(createdBy.toString())!).emit("successMessage", {content});
    io.to(chat?.roomId!).emit("newMessage",{content,from:socket.data.user,groupId})
      
  }
}
