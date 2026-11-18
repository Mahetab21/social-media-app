import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import commentModel, { OnModelEnum } from '../../DB/model/comment.model';
import userModel from '../../DB/model/user.model';
import { AllowCommentEnum } from '../../DB/model/post.model';
import { visiblePost, visibleComment, requireConnection } from '../../utils/privacy';
import { uploadFiles, deleteFiles } from '../../utils/s3.config';
import { pagination } from '../../utils/pagination';
import { AppError } from '../../utils/classError';

class CommentService {
  private async tags(ids: string[] = [], user: any) {
    for (const id of ids) if (String(id) !== String(user._id)) await requireConnection(user, id, false);
  }
  createComment = async (req: Request, res: Response) => {
    const post = await visiblePost(req.params.postId, req.user!);
    if (post.allowComments !== AllowCommentEnum.allow) throw new AppError('Comments are disabled', 403);
    const parent = req.params.commentId ? await visibleComment(req.params.commentId, post._id, req.user!) : null;
    const onModel = parent ? OnModelEnum.Comment : OnModelEnum.post;
    if (req.body.onModel !== onModel) throw new AppError('onModel does not match the target', 400);
    await this.tags(req.body.tags, req.user!);
    const assestFolderId = randomUUID(), attachments = Array.isArray(req.files) && req.files.length ? await uploadFiles({ files: req.files, path: 'users/' + req.user!._id + '/comments/' + assestFolderId }) : [];
    try {
      const comment = await commentModel.create({ content: req.body.content, tags: req.body.tags, attachments, assestFolderId, createdBy: req.user!._id, postId: post._id, refId: parent?._id || post._id, onModel });
      return res.status(201).json({ comment });
    } catch (error) { await deleteFiles({ urls: attachments }); throw error; }
  };
  private async own(req: Request, includeFrozen = false) {
    const comment = includeFrozen ? await commentModel.findOne({ _id: req.params.commentId, createdBy: req.user!._id, postId: req.params.postId }) : await visibleComment(req.params.commentId, req.params.postId, req.user!);
    if (!comment || String(comment.createdBy) !== String(req.user!._id)) throw new AppError('Comment not found', 404);
    return comment;
  }
  freezeComment = async (req: Request, res: Response) => {
    const comment = await this.own(req);
    comment.isFrozen = true; comment.frozenAt = new Date(); comment.frozenBy = req.user!._id as any; await comment.save();
    return res.json({ comment });
  };
  hardDeleteComment = async (req: Request, res: Response) => {
    const comment = await this.own(req, true);
    await commentModel.deleteOne({ _id: comment._id, createdBy: req.user!._id });
    // Replies are inaccessible once their ancestor is removed; retain them for administrative cleanup.
    await deleteFiles({ urls: comment.attachments || [] });
    return res.json({ message: 'Comment deleted' });
  };
  updateComment = async (req: Request, res: Response) => {
    const comment = await this.own(req);
    if (req.body.onModel !== undefined && req.body.onModel !== comment.onModel) throw new AppError('Cannot change a comment target', 400);
    await this.tags(req.body.tags, req.user!);
    const old = comment.attachments || [], uploads = Array.isArray(req.files) && req.files.length ? await uploadFiles({ files: req.files, path: 'users/' + req.user!._id + '/comments/' + comment.assestFolderId }) : [];
    if (req.body.content !== undefined) comment.content = req.body.content;
    if (req.body.tags !== undefined) comment.tags = req.body.tags;
    if (uploads.length) comment.attachments = uploads;
    try { await comment.save(); } catch (error) { await deleteFiles({ urls: uploads }); throw error; }
    if (uploads.length) await deleteFiles({ urls: old });
    return res.json({ comment });
  };
  private async authorFilter(user: any) {
    const excluded = await userModel.find({ $or: [{ blockedUsers: user._id }, { _id: { $in: user.blockedUsers } }] }).distinct('_id');
    const ids = await userModel.find({ _id: { $nin: excluded }, confirmed: true, deletedAt: { $exists: false } }).distinct('_id');
    return { createdBy: { $in: ids }, isFrozen: { $ne: true }, deletedAt: { $exists: false } };
  }
  getCommentsById = async (req: Request, res: Response) => {
    await visiblePost(req.params.postId, req.user!);
    const { skip, limit, page } = pagination(req.query);
    const filter = { refId: req.params.postId, onModel: OnModelEnum.post, ...await this.authorFilter(req.user!) };
    const [comments, total] = await Promise.all([commentModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit), commentModel.countDocuments(filter)]);
    return res.json({ comments, pagination: { page, limit, total } });
  };
  getCommentWithReply = async (req: Request, res: Response) => {
    const comment = await visibleComment(req.params.commentId, req.params.postId, req.user!);
    const { skip, limit, page } = pagination(req.query);
    const filter = { refId: comment._id, onModel: OnModelEnum.Comment, ...await this.authorFilter(req.user!) };
    const [replies, total] = await Promise.all([commentModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit), commentModel.countDocuments(filter)]);
    return res.json({ comment: { ...comment.toObject(), replies }, pagination: { page, limit, total } });
  };
}
export default new CommentService();
