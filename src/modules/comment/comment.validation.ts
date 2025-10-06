import * as z from "zod";
import { generalRules } from "../../utils/generalRules";
import { OnModelEnum } from "../../DB/model/comment.model";
import { Types } from "mongoose";

export const createCommentSchema = {
    params:z.strictObject({
        postId: generalRules.id,
        commentId: generalRules.id.optional()
    }),
    body: z.strictObject({
       content: z.string().min(2).max(5000).optional(),
       attachments: z.array(generalRules.file).max(2).optional(),
       assetFolderId: z.string().optional(),
        tags:z.array(generalRules.id).refine((value)=>{
            return new Set(value).size===value.length
        },{
            message:"Duplicate tags are not allowed"
        }).optional(),
        onModel:z.enum(OnModelEnum),
    }).superRefine((data,ctx)=>{
        if(!data?.content && !data.attachments?.length){
            ctx.addIssue({
                code:"custom",
                path:["content"],
                message:"Either content or attachments is required"
            })
        }
    })
}
export const freezeCommentSchema = {
      params: z.strictObject({
          commentId: generalRules.id,
        }).required().refine((value) => {
            return value?.commentId ? Types.ObjectId.isValid(value.commentId) : true;
          },
          {
            message: "Invalid commentId",
            path: ["commentId"],
          }
        ),
    
}
export const hardDeleteCommentSchema={
          params: z.strictObject({
          commentId: generalRules.id,
        }).required().refine((value) => {
            return value?.commentId ? Types.ObjectId.isValid(value.commentId) : true;
          },
          {
            message: "Invalid commentId",
            path: ["commentId"],
          }
        ),

}
export const updateCommentSchema={
    params: z.strictObject({
        commentId: generalRules.id,
    }).required().refine((value) => {
        return value?.commentId ? Types.ObjectId.isValid(value.commentId) : true;
      },
      {
        message: "Invalid commentId",
        path: ["commentId"],
      }
    ),
    body: z.strictObject({
        content: z.string().min(2).max(5000).optional(),
        attachments: z.array(generalRules.file).max(2).optional(),
        assetFolderId: z.string().optional(),
        tags: z.array(generalRules.id).refine((value) => {
            return new Set(value).size === value.length
        }, {
            message: "Duplicate tags are not allowed"
        }).optional(),
        onModel: z.enum(OnModelEnum),
    }).superRefine((data, ctx) => {
        if (!data?.content && !data.attachments?.length) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "Either content or attachments is required"
            })
        }
    })
}
export const getCommentsByIdSchema = {
    params: z.strictObject({
        commentId: generalRules.id,
    }).required().refine((value) => {
        return value?.commentId ? Types.ObjectId.isValid(value.commentId) : true;
      },
      {
        message: "Invalid commentId",
        path: ["commentId"],
      }
    )
}
export const getCommentWithReplySchema = {
    params: z.strictObject({
        commentId: generalRules.id,
    }).required().refine((value) => {
        return value?.commentId ? Types.ObjectId.isValid(value.commentId) : true;
      },
      {
        message: "Invalid commentId",
        path: ["commentId"],
      }
    )      
}
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type FreezeCommentInput = z.infer<typeof freezeCommentSchema.params>;
export type HardDeleteCommentInput = z.infer<typeof hardDeleteCommentSchema.params>;
export type UpdateCommentInput = {
  params: z.infer<typeof updateCommentSchema.params>;
  body: z.infer<typeof updateCommentSchema.body>;
};
export type GetCommentsByIdInput = z.infer<typeof getCommentsByIdSchema.params>;
export type GetCommentWithReplyInput = z.infer<typeof getCommentWithReplySchema.params>;