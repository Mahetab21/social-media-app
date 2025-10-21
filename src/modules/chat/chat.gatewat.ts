import { socketWithUserId } from "../gateway/gateway.interface";
import { ChatEvents } from "./chat.event";

import { Server, Socket } from "socket.io";


export class ChatGateway {
    private _chatEvents : ChatEvents = new ChatEvents()
    constructor(){}

    register =(socket : Socket , io : Server)=>{
        this._chatEvents.sayHi(socket, io);
        this._chatEvents.sendMessage(socket, io);
        this._chatEvents.join_room(socket, io);
        this._chatEvents.sendGroupMessage(socket, io);

    }

} 