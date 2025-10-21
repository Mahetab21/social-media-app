import * as z from "zod";
import { generalRules } from "../../utils/generalRules";
import { Types } from "mongoose";
export const sendMessageSchema = {
  body: z
    .strictObject({
      content: z
        .string()
        .min(1, "Message content is required")
        .max(1000, "Message content cannot exceed 1000 characters"),
      sendTo: generalRules.id,
    })
    .refine(
      (data) => {
        return Types.ObjectId.isValid(data.sendTo);
      },
      {
        message: "Invalid recipient ID",
        path: ["sendTo"],
      }
    ),
};
export const getChatSchema = {
  params: z
    .strictObject({
      userId: generalRules.id,
    })
    .refine(
      (value) => {
        return Types.ObjectId.isValid(value.userId);
      },
      {
        message: "Invalid user ID",
        path: ["userId"],
      }
    ),
};
export const createGroupChatSchema = {
  body: z
    .strictObject({
      group: z
        .string()
        .min(1, "Group name is required")
        .max(100, "Group name cannot exceed 100 characters"),
      participants: z
        .array(generalRules.id)
        .min(1, "At least one participant is required")
        .max(50, "Cannot have more than 50 participants"),
      groupImage: z.string().optional(),
    })
    .refine(
      (data) => {
        return data.participants.every((id) => Types.ObjectId.isValid(id));
      },
      {
        message: "Invalid participant ID(s)",
        path: ["participants"],
      }
    ),
};
export const getGroupChatSchema = {
  params: z.strictObject({
      groupId: generalRules.id,
    }).refine((value) => {
        return Types.ObjectId.isValid(value.groupId);
      },{
        message: "Invalid group ID",
        path: ["groupId"],
      }
    ),
};

export type SendMessageInput = z.infer<typeof sendMessageSchema.body>;
export type GetChatInput = z.infer<typeof getChatSchema.params>;
export type CreateGroupChatInput = z.infer<typeof createGroupChatSchema.body>;
export type GetGroupChatInput = z.infer<typeof getGroupChatSchema.params>;
