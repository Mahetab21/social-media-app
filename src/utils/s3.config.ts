import {DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, ListObjectsV2Command, ObjectCannedACL, PutObjectCommand, S3Client} from "@aws-sdk/client-s3";
import { storageType } from "../middleware/multer.cloud";
import { uuidv4 } from "zod";
import { createReadStream } from "fs";
import { AppError } from "./classError";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
export const s3Client= ()=>{
    return new S3Client({
        region:process.env.AWS_REGION!,
        credentials:{
            accessKeyId:process.env.AWS_ACCESS_KEY_ID!,
            secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY!
        }
    })
}


export const uploadFile = async(
    {
        storeType= storageType.cloud,
        Bucket=process.env.AWS_BUCKET_NAME!,
        ACL = "private" as ObjectCannedACL,
        path="general",
        file

    }:{
        storeType?:storageType,
        Bucket?:string,
        ACL?:ObjectCannedACL,
        path:string,
        file:Express.Multer.File
    }
):Promise<string>=>{
    const command = new PutObjectCommand({
        Bucket,
        Key: `${process.env.APPLICATION_NAME}/${path}/${uuidv4()}_${file.originalname}`,
        ACL,
        Body:storeType=== storageType.cloud ? file.buffer : createReadStream(file.path),
        ContentType: file.mimetype
    })
    await s3Client().send(command);
    if(!command.input.Key){
         throw new AppError ("File upload failed",500);
    }
      return command.input.Key;
}

export const uploadLargeFile =async(
    {
        storeType= storageType.cloud,
        Bucket=process.env.AWS_BUCKET_NAME!,
        ACL = "private" as ObjectCannedACL,
        path="general",
        file

    }:{
        storeType?:storageType,
        Bucket?:string,
        ACL?:ObjectCannedACL,
        path:string,
        file:Express.Multer.File
    }
):Promise<string>=>{
    const upload= new Upload({
        client:s3Client(),
        params:{
            Bucket,
            Key: `${process.env.APPLICATION_NAME}/${path}/${uuidv4()}_${file.originalname}`,
            ACL,
            Body:storeType=== storageType.cloud ? file.buffer : createReadStream(file.path),
            ContentType: file.mimetype
        }
    })
    upload.on("httpUploadProgress",(progress)=>{
        console.log(progress);
    })
    const {Key} = await upload.done();
    if(!Key){
        throw new AppError ("File upload failed",500);
    }
    return Key;
}
export const uploadFiles = async(
    {
        storeType= storageType.cloud,
        Bucket=process.env.AWS_BUCKET_NAME!,
        ACL = "private" as ObjectCannedACL,
        path="general",
        files,
        useLargeFiles=false

    }:{
        storeType?:storageType,
        Bucket?:string,
        ACL?:ObjectCannedACL,
        path:string,
        files:Express.Multer.File[],
        useLargeFiles?:boolean
    }
)=>{
    let urls : string[] = [];
    if(useLargeFiles==true){
        urls = await Promise.all(files.map(file=> uploadLargeFile({storeType,Bucket,ACL,path,file})))
    }else{
       urls = await Promise.all(files.map(file=> uploadFile({storeType,Bucket,ACL,path,file})))
    }
    return urls;
}

export const createUploadFilePreSignedUrl = async(
    {
        Bucket=process.env.AWS_BUCKET_NAME!,
        path="general",
        originalname,
        ContentType,
        expiresIn = 60*60
    }:{
        Bucket?:string,
        path?:string,
        originalname:string,
        ContentType:string,
        expiresIn?:number
    })=>{
        const command = new PutObjectCommand({
            Bucket,
            Key: `${process.env.APPLICATION_NAME}/${path}/${uuidv4()}_${originalname}`,
            ContentType
        })
        const url = await getSignedUrl(s3Client(), command, { expiresIn });
        //return url;
        return { url, Key: command.input.Key! };
}
//=>get file:-
export const getFile= async(
    {
        Bucket=process.env.AWS_BUCKET_NAME!,
        Key
    }:{
        Bucket?:string,
        Key:string
    }
)=>{
    const command = new GetObjectCommand({
        Bucket,
        Key
    })
      return await s3Client().send(command);
   
}
//=>create pre-signed url to get file:-

export const createGetFilePreSignedUrl = async(
    {
        Bucket=process.env.AWS_BUCKET_NAME!,
        Key,
        expiresIn = 60*60,
        downLoadName
    }:{
        Bucket?:string,
        Key:string,
        expiresIn?:number,
        downLoadName?:string | undefined
    }
)=>{
    const command = new GetObjectCommand({
        Bucket,
        Key,
        ResponseContentDisposition: downLoadName ? `attachment; filename="${downLoadName}"` : undefined
    })
    const url = await getSignedUrl(s3Client(), command, { expiresIn });
    return url;

}
//=>delete file:-
export const deleteFile = async(
    {
        Bucket=process.env.AWS_BUCKET_NAME!,
        Key
    }:{
        Bucket?:string,
        Key:string
    }
)=>{
    const command = new DeleteObjectCommand({
        Bucket,
        Key
    })
    return await s3Client().send(command);
}
//=>delete files:-
export const deleteFiles= async(   
     {
        Bucket=process.env.AWS_BUCKET_NAME!,
        urls,
        Quiet=false
    }:{
        Bucket?:string,
        urls:string[],
        Quiet?:boolean
    }
)=>{
    const command = new DeleteObjectsCommand({
        Bucket,
        Delete:{
            Objects: urls.map(urls=>({Key:urls})),
            Quiet
        }
    })
    return await s3Client().send(command);
}
//=>list files
export const listFiles = async(
    {
        Bucket=process.env.AWS_BUCKET_NAME!,
        path
    }:{
        Bucket?:string,
        path:string
    }
)=>{
    const command = new ListObjectsV2Command({
        Bucket,
        Prefix:`${process.env.APPLICATION_NAME}/${path}`
    })
    return await s3Client().send(command)
}
//=>delete folder by prefix
export const deleteFolderByPrefix = async(
    {
        Bucket=process.env.AWS_BUCKET_NAME!,
        path
    }:{
        Bucket?:string,
        path:string
    }
)=>{
    let result = await listFiles({
        Bucket,
        path
    });
    if(!result?.Contents || result.Contents.length === 0){
        throw new AppError("No files found",404);
    }
    const filesToDelete = result?.Contents?.map((item) => item.Key) as string[];
    const deleteResult = await deleteFiles({
        Bucket,
        urls: filesToDelete
    });
    return deleteResult;
}