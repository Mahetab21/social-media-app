import { Socket } from "socket.io";
import { HydratedDocument } from "mongoose";
import { JwtPayload } from "jsonwebtoken";
import { IUser } from "../../DB/model/user.model";
import { Server } from "socket.io";
import { AppError } from "../../utils/classError";
import { GetSignature, decodedTokenAndFetchUser } from "../../utils/token";
import { Server as HttpServer } from "http";
import { socketWithUserId } from "./gateway.interface";
import { ChatGateway } from "../chat/chat.gatewat";

const connectionSockets = new Map<string, string[]>();
let io: Server | undefined = undefined;
export const initializationIo = (httpServer: HttpServer) => {
  //initialize io server
  io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  //middleware for socket authentication
  io.use(async (socket: socketWithUserId, next) => {
    try {
      const { authorization } = socket.handshake.auth;
      const [prefix, token] = authorization?.split(" ") || [];
      if (!token || !prefix) {
        return next(new AppError("Invalid Token", 400));
      }
      const signature = await GetSignature(prefix);
      if (!signature) {
        return next(new AppError("Invalid signature", 400));
      }
      const { user, decoded } = await decodedTokenAndFetchUser(
        token,
        signature
      );
      const socketIds = connectionSockets.get(user?._id.toString()) || [];
      socketIds.push(socket.id);
      connectionSockets.set(user._id.toString(), socketIds);
      socket.data.user = user;
      next();
    } catch (error: any) {
      next(error);
    }
  });

  const chatGateway: ChatGateway = new ChatGateway();
  //socket connection
  io.on("connection", (socket: socketWithUserId) => {
    console.log(connectionSockets);
    chatGateway.register(socket, getIo());
    // remove socket(disconnection)
    function removeSocket() {
      let remainingTaps = connectionSockets
        .get(socket.data.user._id.toString())
        ?.filter((tab) => {
          return tab !== socket.id;
        });
      if (remainingTaps?.length) {
        connectionSockets.set(socket.data.user._id.toString(), remainingTaps);
      } else {
        connectionSockets.delete(socket.data.user._id.toString());
      }

      getIo().emit("offline_user", socket.data.user._id.toString());
    }
    socket.on("disconnect", () => {
      removeSocket();
    });
  });
};
export const getIo = () => {
  if (!io) {
    throw new AppError("Socket.io not initialized", 500);
  }
  return io;
};
export default connectionSockets;
