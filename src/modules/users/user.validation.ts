import z, { email } from "zod";
import { GenderType } from "../../DB/model/user.model";

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

export type signUpSchemaType = z.infer<typeof signUpSchema.body>
export type confirmEmailSchemaType = z.infer<typeof confirmEmailSchema.body>
export type signInSchemaType = z.infer<typeof signInSchema.body>