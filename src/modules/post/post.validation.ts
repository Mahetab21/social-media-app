import * as z from 'zod';
import { AllowCommentEnum, AvailabilityEnum } from '../../DB/model/post.model';
import { generalRules } from '../../utils/generalRules';
export enum ActionEnum { like = 'like', unlike = 'unlike' }
const params = z.object({ postId: generalRules.id });
const fields = {
  content: z.string().trim().min(3).max(5000).optional(),
  attachments: z.array(generalRules.file).max(2).optional(),
  allowComments: z.enum(AllowCommentEnum).optional(), availability: z.enum(AvailabilityEnum).optional(),
  tags: z.array(generalRules.id).max(20).refine(ids => new Set(ids).size === ids.length, 'Duplicate tags').optional(),
};
export const createPostSchema = { body: z.strictObject(fields).refine(x => !!x.content || !!x.attachments?.length, 'Content or an attachment is required') };
export const updatePostSchema = { params, body: z.strictObject(fields).refine(x => Object.keys(x).length > 0, 'Provide an update') };
export const likePostSchema = { params, query: z.strictObject({ action: z.enum(ActionEnum).default(ActionEnum.like) }) };
export const sendTagEmailSchema = { params };
export const freezePostSchema = { params };
export const hardDeleteSchema = { params };
export const getPostByIdSchema = { params };
