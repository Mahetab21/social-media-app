import { ChatRepository } from "../../DB/repositories/chat.repository";
import ChatModel from "../../DB/model/chat.model";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../../utils/classError";
import { Server, Socket } from "socket.io";
import { UserRepository } from "../../DB/repositories/user.repository";
import userModel from "../../DB/model/user.model";
import connectionSockets   from "../gateway/gateway";
export class ChatService {
  constructor() {}
  private _chatModel = new ChatRepository(ChatModel);
  private _userModel = new UserRepository(userModel);
  //==============get chat==============
  getChat = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;
    const chat = await this._chatModel.find({
      filter: {
        participants: { $all: [userId, req?.user?._id] },
        group: { $exists: false },
      },
      options: {
        populate: [{ path: "participants" }],
      },
    });
    if (!chat) {
      throw new AppError("no chat found", 404);
    }
    return res.status(200).json({ message: "success", chat });
  };
  //===============socket Io====================
  sayHi = async(data: any, socket: Socket, io: Server) => {
    console.log(data);
  };
  //-------------send message--------
  sendMessage = async(data: any, socket: Socket, io: Server) => {
    const {content , sendTo} = data;
    const createdBy = socket?.data?.user._id;
    const user = await this._userModel.findOne({
      _id:sendTo,
      friends:{$in:[createdBy]}
    })
    if(!user){
      throw new AppError("user not found",400)
    }
    const chat = await this._chatModel.findOneAndUpdate({
      participants: { $all: [createdBy, sendTo] },
      group: { $exists: false },
    },{
      $push:{
        message:{
          content,
          createdBy
        }
      }
    })
    if(!chat){
      const newChat = await this._chatModel.create({
        participants:[createdBy, sendTo],
        createdBy,
        message:[{
          content,
          createdBy
        }]
      })
      if(!newChat){
        throw new AppError("failed to create chat",400)
      }
    }
    io.to(connectionSockets.get(createdBy.toString())!).emit("successMessage",{content})
    io.to(connectionSockets.get(sendTo.toString())!).emit("newMessage",{content,from:socket.data.user})
  }
}
