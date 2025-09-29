import * as z from "zod";
import { AllowCommentEnum, AvailabilityEnum } from "../../DB/model/post.model";
import { generalRules } from "../../utils/generalRules";
export enum ActionEnum{
    like = "like",
    unlike = "unlike"
}

export const createPostSchema = {
    body: z.strictObject({
        content: z.string().min(2).max(5000).optional(),
        attachments: z.array(generalRules.file).max(2).optional(),

        assetFolderId: z.string().optional(),

        allowComments: z.enum(AllowCommentEnum).default(AllowCommentEnum.allow).optional(),
        availability: z.enum(AvailabilityEnum).default(AvailabilityEnum.public).optional(),

        tags:z.array(generalRules.id).refine((value)=>{
            return new Set(value).size===value.length
        },{
            message:"Duplicate tags are not allowed"
        }).optional()
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
export const likePostSchema={
    params: z.strictObject({
        postId:generalRules.id
    }),
    query:z.strictObject({
        action:z.enum(ActionEnum).default(ActionEnum.like)
    })
}
export const updatePostSchema={
    body: z.strictObject({
        content: z.string().min(2).max(5000).optional(),
        attachments: z.array(generalRules.file).max(2).optional(),

        assetFolderId: z.string().optional(),

        allowComments: z.enum(AllowCommentEnum).default(AllowCommentEnum.allow).optional(),
        availability: z.enum(AvailabilityEnum).default(AvailabilityEnum.public).optional(),

        tags:z.array(generalRules.id).refine((value)=>{
            return new Set(value).size===value.length
        },{
            message:"Duplicate tags are not allowed"
        }).optional()
    }).superRefine((data,ctx)=>{
        if(!Object.values(data).length){
            ctx.addIssue({
                code:"custom",
                message:"Either content or attachments is required"
            })
        }
    })

}
export const sendTagEmailSchema = {
    params: z.strictObject({
        postId: generalRules.id
    })
}
export type likePostSchemaType = z.infer<typeof likePostSchema.params>;
export type likePostQueryType = z.infer<typeof likePostSchema.query>;
export type updatePostSchemaType = z.infer<typeof updatePostSchema.body>;
export type sendTagEmailSchemaType = z.infer<typeof sendTagEmailSchema.params>;