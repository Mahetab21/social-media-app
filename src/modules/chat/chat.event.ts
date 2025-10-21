import { Server, Socket } from "socket.io";
import { socketWithUserId } from "../gateway/gateway.interface";
import { ChatService } from "./chat.service";


export  class ChatEvents {
    private _chatService :ChatService = new ChatService();
    constructor(){}
    sayHi = (socket : Socket , io : Server) => {
        return socket.on("sayHi",(data,callback)=>{
            this ._chatService.sayHi(data , socket , io)

    })   
}
 sendMessage = (socket : Socket , io : Server) => {
        return socket.on("sendMessage",(data,callback)=>{
            this ._chatService.sendMessage(data , socket , io)

    })   
}
join_room= (socket : Socket , io : Server) =>{
    return socket.on("join_room",(data,callback)=>{
        this ._chatService.join_room(data , socket , io)

    })   
}
sendGroupMessage= (socket : Socket , io : Server) =>{
        return socket.on("sendGroupMessage",(data,callback)=>{
        this ._chatService.sendGroupMessage(data , socket , io)

    })   

}
}