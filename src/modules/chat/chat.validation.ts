import * as z from "zod";
import { generalRules } from "../../utils/generalRules";
import { Types } from "mongoose";
export const sendMessageSchema = {
    body: z.strictObject({
        content: z.string().min(1, "Message content is required").max(1000, "Message content cannot exceed 1000 characters"),
        sendTo: generalRules.id
    }).refine((data) => {
        return Types.ObjectId.isValid(data.sendTo);
    }, {
        message: "Invalid recipient ID",
        path: ["sendTo"]
    })
};
export const getChatSchema = {
    params: z.strictObject({
        userId: generalRules.id
    }).refine((value) => {
        return Types.ObjectId.isValid(value.userId);
    }, {
        message: "Invalid user ID",
        path: ["userId"]
    })
};

export type SendMessageInput = z.infer<typeof sendMessageSchema.body>;
export type GetChatInput = z.infer<typeof getChatSchema.params>;
