import mongoose from "mongoose";
import * as z from "zod";

export const generalRules = {
    id: z.string().refine((value)=>{
        return mongoose.Types.ObjectId.isValid(value);
    },{message:"Invalid id",}),
    email:z.email(),
    password:z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    otp:z.string().regex(/^[0-9]{6}$/),
    file:z.object({
        fieldname: z.string(),
        originalname: z.string(),
        encoding: z.string(),
        mimetype: z.string(),
        buffer:z.any().optional(),
        path:z.string().optional(),
        size: z.number(),
        })
}