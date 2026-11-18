import { Request, Response } from 'express';
import { Server, Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import ChatModel from '../../DB/model/chat.model';
import { publicUser } from '../../DB/model/user.model';
import { requireConnection } from '../../utils/privacy';
import { pagination } from '../../utils/pagination';
import { AppError } from '../../utils/classError';
import { uploadFile, deleteFile } from '../../utils/s3.config';
import { authenticate } from '../../middleware/Authentication';

export async function emitToUser(io: Server, id: unknown, event: string, payload: unknown) {
  // Recheck receiving sessions too, so logout/password changes revoke open sockets.
  for (const socket of io.sockets.sockets.values()) {
    if (String(socket.data.user?._id) !== String(id)) continue;
    try { await authenticate(socket.handshake.auth.authorization); socket.emit(event, payload); }
    catch { socket.disconnect(true); }
  }
}
export class ChatService {
  private async history(filter: any, query: any) {
    const { page, limit, skip } = pagination(query);
    const chat = await ChatModel.findOne(filter).select({ message: { $slice: [skip, limit] } });
    if (!chat) throw new AppError('Chat not found', 404);
    const result = await ChatModel.aggregate([{ $match: { _id: chat._id } }, { $project: { count: { $size: '$message' } } }]);
    const total = result[0]?.count || 0;
    return { chat, pagination: { page, limit, totalMessages: total, totalPages: Math.ceil(total / limit) } };
  }
  getChat = async (req: Request, res: Response) => {
    const target = await requireConnection(req.user!, req.params.userId);
    return res.json(await this.history({ participants: { $all: [req.user!._id, target._id] }, group: { $exists: false } }, req.query));
  };
  getGroupChat = async (req: Request, res: Response) => {
    const result = await this.history({ _id: req.params.groupId, participants: req.user!._id, group: { $exists: true } }, req.query);
    // Group history is shared with members; new live delivery respects account blocks.
    return res.json(result);
  };
  createGroupChat = async (req: Request, res: Response) => {
    const ids = [...new Set<string>(req.body.participants)];
    const participants: Types.ObjectId[] = [req.user!._id];
    for (const id of ids) participants.push((await requireConnection(req.user!, id))._id);
    const roomId = 'group:' + randomUUID();
    const groupImage = req.file ? await uploadFile({ path: 'chat/' + roomId, file: req.file }) : undefined;
    try {
      const chat = await ChatModel.create({ group: req.body.group, groupImage, participants, createdBy: req.user!._id, roomId, message: [] });
      return res.status(201).json({ chat });
    } catch (error) { if (groupImage) await deleteFile({ Key: groupImage }); throw error; }
  };
  sayHi = async (_data: unknown, _socket: Socket, _io: Server) => ({ message: 'Connected' });
  sendMessage = async (data: any, socket: Socket, io: Server) => {
    const actor = socket.data.user, target = await requireConnection(actor, data.sendTo);
    const pairKey = [String(actor._id), String(target._id)].sort().join(':');
    const message = { content: data.content, createdBy: actor._id };
    const filter = { pairKey, 'message.9999': { $exists: false } };
    let chat;
    try {
      chat = await ChatModel.findOneAndUpdate(filter, { $setOnInsert: { participants: [actor._id, target._id], createdBy: actor._id }, $push: { message } }, { upsert: true, new: true, runValidators: true });
    } catch (error: any) {
      if (error.code !== 11000) throw error;
      chat = await ChatModel.findOneAndUpdate(filter, { $push: { message } }, { new: true, runValidators: true });
    }
    if (!chat) throw new AppError('Chat has reached its message capacity', 409);
    const payload = { chatId: chat._id, content: data.content, from: publicUser(actor) };
    await emitToUser(io, actor._id, 'successMessage', payload);
    await emitToUser(io, target._id, 'newMessage', payload);
    return { chatId: chat._id };
  };
  join_room = async (data: any, socket: Socket, _io: Server) => {
    const chat = await ChatModel.findOne({ roomId: data.roomId, participants: socket.data.user._id, group: { $exists: true } });
    if (!chat) throw new AppError('Group not found', 404);
    await socket.join(chat.roomId!);
    return { roomId: chat.roomId };
  };
  sendGroupMessage = async (data: any, socket: Socket, io: Server) => {
    const actor = socket.data.user;
    const chat = await ChatModel.findOneAndUpdate({ _id: data.groupId, participants: actor._id, group: { $exists: true }, 'message.9999': { $exists: false } }, { $push: { message: { content: data.content, createdBy: actor._id } } }, { new: true, runValidators: true });
    if (!chat) throw new AppError('Group unavailable or full', 404);
    const payload = { groupId: chat._id, content: data.content, from: publicUser(actor) };
    for (const id of chat.participants) {
      if (String(id) === String(actor._id)) { await emitToUser(io, id, 'successMessage', payload); continue; }
      try { await requireConnection(actor, id, false); } catch { continue; }
      await emitToUser(io, id, 'newMessage', payload);
    }
    return { groupId: chat._id };
  };
}
