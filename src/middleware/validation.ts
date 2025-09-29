import { Request, Response ,NextFunction} from "express";
import z, { ZodType } from "zod";
import { AppError } from "./../utils/classError";

type ReqType= keyof Request;
type SchemaType = Partial<Record<ReqType,ZodType>>

export const Validation =(schema:SchemaType)=>{
    return (req:Request,res:Response,next:NextFunction)=>{
        const validationError = [];
        for (const key of Object.keys(schema) as ReqType[]) {
            if(!schema[key]) continue;
            if(req?.file){
                req.body.attachments=req.file;
            }
            if(req?.files){
                req.body.attachments=req.files;
            }
            const result = schema[key].safeParse(req[key]);
            if (!result.success) {
                validationError.push(result.error);
            }
        }
        if (validationError.length) {
            throw new AppError(JSON.parse(validationError as unknown as string), 400);
        }
        next()
    }
}