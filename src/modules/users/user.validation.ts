import z, { email } from "zod";
import { GenderType } from "../../DB/model/user.model";

export enum flagType {
    all="all",
    current="current"
}
export const signInSchema={
    body:z.strictObject({
        email: z.email(),
        password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    }).required()
}
 export const signUpSchema = {
    body:signInSchema.body.extend({
    lName: z.string().min(2).max(100).trim(),
    fName: z.string().min(2).max(100).trim(),
    cPassword: z.string(),
    age: z.number().min(18).max(60),
    address:z.string(),
    phone:z.string(),
    gender:z.enum([GenderType.female,GenderType.male])
}).required().superRefine((data,ctx)=>{
    console.log(data,ctx);
    if(data.password !== data.cPassword){
        ctx.addIssue({
            code:"custom",
            path:["cPassword"],
            message:"Password and confirm password must be the same"
        })
    }
})
}
export const confirmEmailSchema={
    body:z.strictObject({
        email:z.email(),
        otp:z.string().regex(/^\d{6}$/).trim()
    }).required()
}

export const logOutSchema={
    body:z.strictObject({
        flag:z.enum(flagType)
    }).required()
}
export const logInWithGmailSchema={
    body:z.strictObject({
        idToken : z.string()
    }).required()
}
export const forgetPasswordSchema={
    body:z.strictObject({
        email:z.email()
    }).required()
}
export const resetPasswordSchema={
    body:confirmEmailSchema.body.extend({
        password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
        cPassword: z.string()
    }).required().superRefine((value,ctx)=>{
        if(value.password !== value.cPassword){
            ctx.addIssue({
                code:"custom",
                path:["cPassword"],
                message:"Password and confirm password must be the same"
            })
        }
    })
}
export type signUpSchemaType = z.infer<typeof signUpSchema.body>
export type confirmEmailSchemaType = z.infer<typeof confirmEmailSchema.body>
export type signInSchemaType = z.infer<typeof signInSchema.body>
export type logOutSchemaType = z.infer<typeof logOutSchema.body>
export type logInWithGmailSchemaType = z.infer<typeof logInWithGmailSchema.body>
export type forgetPasswordSchemaType = z.infer<typeof forgetPasswordSchema.body>
export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema.body>