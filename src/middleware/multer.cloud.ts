import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import { AppError } from "../utils/classError";
import os from "os";
import { uuidv4 } from "zod";


export  enum storageType {
    disk="disk",
    cloud="cloud"
}
export const fileValidation ={
    image: ['image/jpeg', 'image/png', 'image/jpg'],
    pdf: ['application/pdf'],
    doc: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    video: ['video/mp4', 'video/mpeg', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg','audio/mp3'],
}
export const multerCloud =(
    {
        fileTypes=fileValidation.image,
        storeType=storageType.cloud,
        mazSize=5
    }:
    {
    fileTypes?: string[],
    storeType?: storageType,
    mazSize?: number
})=>{
    const storage = storeType=== storageType.cloud? multer.memoryStorage(): multer.diskStorage({
        destination: os.tmpdir(),
        filename(req: Request, file: Express.Multer.File, cb){
            cb(null , `${uuidv4()}_${file.originalname}`);
        }
    });
    const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        if (fileTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
           return cb(new AppError('Invalid file type',400));
        }
    };
    const upload = multer({ storage, limits: { fileSize: mazSize * 1024 * 1024 }, fileFilter });
    return upload;
}