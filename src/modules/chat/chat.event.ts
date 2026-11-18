import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { ChatService } from './chat.service';
import { authenticate } from '../../middleware/Authentication';
import { generalRules } from '../../utils/generalRules';
export class ChatEvents {
  private service = new ChatService();
  register(socket: Socket, io: Server) {
    const content = z.string().trim().min(1).max(1000);
    const events = {
      sayHi: { schema: z.unknown(), run: this.service.sayHi },
      sendMessage: { schema: z.strictObject({ content, sendTo: generalRules.id }), run: this.service.sendMessage },
      join_room: { schema: z.strictObject({ roomId: z.string().min(1).max(150) }), run: this.service.join_room },
      sendGroupMessage: { schema: z.strictObject({ content, groupId: generalRules.id }), run: this.service.sendGroupMessage },
    };
    let windowStart = Date.now(), count = 0;
    for (const [event, config] of Object.entries(events)) socket.on(event, async (data: unknown, callback?: unknown) => {
      try {
        if (Date.now() - windowStart >= 60000) { count = 0; windowStart = Date.now(); }
        if (++count > 60) throw Object.assign(new Error('Too many socket events'), { statusCode: 429 });
        const parsed = config.schema.safeParse(data);
        if (!parsed.success) throw Object.assign(new Error('Invalid event payload'), { statusCode: 400 });
        socket.data.user = (await authenticate(socket.handshake.auth.authorization)).user;
        const result = await config.run(parsed.data, socket, io);
        if (typeof callback === 'function') callback({ ok: true, data: result });
      } catch (error: any) {
        const payload = { ok: false, error: error.statusCode ? error.message : 'Unable to process event' };
        if (typeof callback === 'function') callback(payload); else socket.emit('eventError', payload);
      }
    });
  }
}
