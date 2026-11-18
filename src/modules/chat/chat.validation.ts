import { z } from 'zod';
import { generalRules } from '../../utils/generalRules';
export const getChatSchema = { params: z.object({ userId: generalRules.id }) };
export const createGroupChatSchema = { body: z.strictObject({
  group: z.string().trim().min(1).max(100),
  participants: z.array(generalRules.id).min(1).max(50).refine(ids => new Set(ids).size === ids.length, 'Duplicate participants'),
}) };
export const getGroupChatSchema = { params: z.object({ groupId: generalRules.id }) };
