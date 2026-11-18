import { Types } from 'mongoose';
import userModel, { IUser } from '../DB/model/user.model';
import postModel, { AvailabilityEnum } from '../DB/model/post.model';
import commentModel, { OnModelEnum } from '../DB/model/comment.model';
import { AppError } from './classError';
export async function activeUser(id: unknown) {
  if (!Types.ObjectId.isValid(String(id))) throw new AppError('Invalid user id', 400);
  const user = await userModel.findOne({ _id: id, deletedAt: { $exists: false }, confirmed: true });
  if (!user) throw new AppError('User not found', 404);
  return user;
}
export async function requireConnection(actor: IUser, id: unknown, friends = true) {
  const other = await activeUser(id);
  if (String(actor._id) === String(other._id)) throw new AppError('Choose another user', 400);
  if (actor.blockedUsers.some(x => String(x) === String(id)) || other.blockedUsers.some(x => String(x) === String(actor._id))) throw new AppError('User unavailable', 404);
  if (friends && (!actor.friends.some(x => String(x) === String(id)) || !other.friends.some(x => String(x) === String(actor._id)))) throw new AppError('Friendship required', 403);
  return other;
}
export async function visiblePostFilter(user: IUser) {
  const excluded = await userModel.find({ $or: [{ deletedAt: { $exists: true } }, { blockedUsers: user._id }, { _id: { $in: user.blockedUsers } }] }).distinct('_id');
  const activeAuthors = await userModel.find({ _id: { $nin: excluded }, confirmed: true }).distinct('_id');
  return { deletedAt: { $exists: false }, isFrozen: { $ne: true }, createdBy: { $in: activeAuthors }, $or: [
    { availability: AvailabilityEnum.public }, { createdBy: user._id },
    { availability: AvailabilityEnum.friends, createdBy: { $in: user.friends } },
  ] };
}
export async function visiblePost(id: unknown, user: IUser) {
  const post = await postModel.findOne({ _id: id, ...await visiblePostFilter(user) });
  if (!post) throw new AppError('Post not found', 404);
  return post;
}
export async function visibleComment(id: unknown, postId: unknown, user: IUser) {
  const comment = await commentModel.findOne({ _id: id, isFrozen: { $ne: true }, deletedAt: { $exists: false } });
  if (!comment) throw new AppError('Comment not found', 404);
  let current = comment, depth = 0;
  while (current.onModel === OnModelEnum.Comment) {
    if (++depth > 20) throw new AppError('Reply chain is too deep', 400);
    const parent = await commentModel.findOne({ _id: current.refId, isFrozen: { $ne: true }, deletedAt: { $exists: false } });
    if (!parent) throw new AppError('Comment not found', 404);
    current = parent;
  }
  if (String(current.refId) !== String(postId)) throw new AppError('Comment does not belong to this post', 404);
  await visiblePost(postId, user);
  await requireCommentAuthor(comment.createdBy, user);
  return comment;
}
async function requireCommentAuthor(id: Types.ObjectId, user: IUser) {
  if (String(id) === String(user._id)) return;
  await requireConnection(user, id, false);
}
