import { Server, Socket } from 'socket.io';
import { ChatEvents } from './chat.event';
export class ChatGateway {
  private events = new ChatEvents();
  register = (socket: Socket, io: Server) => this.events.register(socket, io);
}
