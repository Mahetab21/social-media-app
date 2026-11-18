import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import postModel from '../../DB/model/post.model';
import userModel from '../../DB/model/user.model';
import commentModel from '../../DB/model/comment.model';
import { deleteFiles, uploadFiles } from '../../utils/s3.config';
import { AppError } from '../../utils/classError';
import { visiblePost, visiblePostFilter, requireConnection } from '../../utils/privacy';
import { pagination } from '../../utils/pagination';
import { sendEmail } from '../../service/sendEmail';
import { emailTemplate } from '../../service/email.temp';

class PostService {
  private async tags(ids: string[] = [], user: any) {
    for (const id of ids) if (String(id) !== String(user._id)) await requireConnection(user, id, false);
  }
  createPost = async (req: Request, res: Response) => {
    await this.tags(req.body.tags, req.user!);
    const assestFolderId = randomUUID();
    const attachments = Array.isArray(req.files) && req.files.length ? await uploadFiles({ files: req.files, path: 'users/' + req.user!._id + '/posts/' + assestFolderId }) : [];
    try {
      const { content, availability, allowComments, tags } = req.body;
      const post = await postModel.create({ content, availability, allowComments, tags, attachments, assestFolderId, createdBy: req.user!._id });
      return res.status(201).json({ post });
    } catch (error) { await deleteFiles({ urls: attachments }); throw error; }
  };
  private async like(id: string, action: string, user: any) {
    const post = await postModel.findOneAndUpdate({ _id: id, ...await visiblePostFilter(user) }, action === 'unlike' ? { $pull: { likes: user._id } } : { $addToSet: { likes: user._id } }, { new: true });
    if (!post) throw new AppError('Post not found', 404);
    return post;
  }
  likePost = async (req: Request, res: Response) => res.json({ post: await this.like(req.params.postId!, String(req.query.action), req.user!) });
  updatePost = async (req: Request, res: Response) => {
    const post = await postModel.findOne({ _id: req.params.postId, createdBy: req.user!._id, isFrozen: { $ne: true } });
    if (!post) throw new AppError('Post not found', 404);
    await this.tags(req.body.tags, req.user!);
    const previous = post.attachments || [];
    let uploads: string[] = [];
    if (Array.isArray(req.files) && req.files.length) uploads = await uploadFiles({ files: req.files, path: 'users/' + req.user!._id + '/posts/' + post.assestFolderId });
    for (const key of ['content', 'availability', 'allowComments', 'tags']) if (req.body[key] !== undefined) post.set(key, req.body[key]);
    if (uploads.length) post.attachments = uploads;
    try { await post.save(); } catch (error) { await deleteFiles({ urls: uploads }); throw error; }
    if (uploads.length) await deleteFiles({ urls: previous });
    return res.json({ post });
  };
  getPosts = async (req: Request, res: Response) => {
    const { page, limit, skip } = pagination(req.query), filter = await visiblePostFilter(req.user!);
    const [posts, total] = await Promise.all([postModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit), postModel.countDocuments(filter)]);
    return res.json({ posts, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  };
  getPostById = async (req: Request, res: Response) => res.json({ post: await visiblePost(req.params.postId, req.user!) });
  freezePost = async (req: Request, res: Response) => {
    const post = await postModel.findOneAndUpdate({ _id: req.params.postId, createdBy: req.user!._id, isFrozen: { $ne: true }, deletedAt: { $exists: false } }, { $set: { isFrozen: true, frozenAt: new Date(), frozenBy: req.user!._id } }, { new: true });
    if (!post) throw new AppError('Post not found', 404);
    return res.json({ post });
  };
  hardDelete = async (req: Request, res: Response) => {
    const post = await postModel.findOneAndDelete({ _id: req.params.postId, createdBy: req.user!._id });
    if (!post) throw new AppError('Post not found', 404);
    await commentModel.updateMany({ postId: post._id }, { $set: { deletedAt: new Date() } });
    await deleteFiles({ urls: post.attachments || [] });
    return res.json({ message: 'Post deleted' });
  };
  sendTagNotificationEmails = async (req: Request, res: Response) => {
    const post = await postModel.findOne({ _id: req.params.postId, createdBy: req.user!._id, isFrozen: { $ne: true } });
    if (!post) throw new AppError('Post not found', 404);
    let sent = 0;
    for (const id of post.tags || []) {
      const recipient = await userModel.findOne({ _id: id, confirmed: true, deletedAt: { $exists: false } });
      if (!recipient) continue;
      if (!await postModel.exists({ _id: post._id, ...await visiblePostFilter(recipient) })) continue;
      await sendEmail({ to: recipient.email, subject: 'You were tagged in a post', html: emailTemplate('Open your feed to view the post.', 'Post notification') }); sent++;
    }
    return res.json({ message: 'Notifications sent', sent });
  };
  getPostsGQL = async (_parent: unknown, args: any, context: any) => {
    const user = context?.req?.user;
    if (!user) throw new AppError('Authentication required', 401);
    const { page, limit, skip } = pagination(args), filter = await visiblePostFilter(user);
    const [posts, countDocument] = await Promise.all([postModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit), postModel.countDocuments(filter)]);
    return { posts, currentPage: page, numberOfPages: Math.ceil(countDocument / limit), countDocument };
  };
  likePostGQL = async (_parent: unknown, args: any, context: any) => {
    if (!context?.req?.user) throw new AppError('Authentication required', 401);
    await this.like(args.postId, args.action, context.req.user);
    return 'Post ' + args.action + ' successful';
  };
}
export default new PostService();
