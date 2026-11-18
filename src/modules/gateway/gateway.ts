import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { authenticate } from '../../middleware/Authentication';
import { corsOrigins } from '../../config/environment';
import { ChatGateway } from '../chat/chat.gatewat';
import { AppError } from '../../utils/classError';
const connectionSockets = new Map<string, string[]>();
let io: Server | undefined;
export function initializationIo(httpServer: HttpServer) {
  io = new Server(httpServer, { cors: { origin: corsOrigins() }, maxHttpBufferSize: 32768 });
  io.use(async (socket, next) => {
    try {
      const { user, decoded } = await authenticate(socket.handshake.auth.authorization);
      socket.data.user = user; socket.data.expiresAt = decoded.exp! * 1000; next();
    } catch { next(new Error('Invalid or expired session')); }
  });
  const gateway = new ChatGateway();
  io.on('connection', socket => {
    const id = String(socket.data.user._id);
    connectionSockets.set(id, [...(connectionSockets.get(id) || []), socket.id]);
    socket.join('user:' + id);
    const timeout = setTimeout(() => socket.disconnect(true), Math.max(0, socket.data.expiresAt - Date.now()));
    timeout.unref();
    gateway.register(socket, getIo());
    socket.on('disconnect', () => {
      clearTimeout(timeout);
      const remaining = (connectionSockets.get(id) || []).filter(x => x !== socket.id);
      if (remaining.length) connectionSockets.set(id, remaining); else connectionSockets.delete(id);
    });
  });
  return io;
}
export const getIo = () => { if (!io) throw new AppError('Socket server unavailable', 503); return io; };
export default connectionSockets;
