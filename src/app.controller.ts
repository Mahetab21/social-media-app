import { resolve } from "path";
import { config } from "dotenv";
config({ path: resolve("./config/.env") });
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { AppError } from "./utils/classError";
import userRouter from "./modules/users/user.controller";
import connectionDB from "./DB/connectionDB";
import { email, uuid } from "zod";
import userModel from "./DB/model/user.model";
import { UserRepository } from "./DB/repositories/user.repository";
import { promisify } from "node:util";
import {pipeline} from "node:stream";
import { createGetFilePreSignedUrl, deleteFile, getFile,deleteFiles,listFiles,deleteFolderByPrefix } from "./utils/s3.config";
import { ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import path from "node:path";
import postRouter from "./modules/post/post.controller";
const writePipeLine = promisify(pipeline);
const app: express.Application = express();
const port: string | number = process.env.PORT || 5000;
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  legacyHeaders: false, // Disable the `X-RateLimit -*` headers.
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes",
  },
  statusCode: 429,
});

const bootstrap = async () => {
  app.use(express.json());
  app.use(cors());
  app.use(helmet());
  app.use(limiter);

  app.get("/", (req: Request, res: Response, next: NextFunction) => {
    return res
      .status(200)
      .json({
        message: "Server is up and running... welcome to my social media app!",
      });
  });
//===========delete folder by prefix=======
app.get("/upload/delete-folder/*path", async(req:Request,res:Response,next:NextFunction)=>{
  let result = await deleteFolderByPrefix({
    path:"users"
  })
  return res.status(200).json({message:"success",result})
})  
//============list files========  
app.get("/upload/", async(req:Request,res:Response,next:NextFunction)=>{
  let result = await listFiles({
    path:"users"
  })
   if(!result?.Contents){
    throw new AppError("No files found",404)
  }
   result=result?.Contents?.map((item)=>item.Key) as unknown as ListObjectsV2CommandOutput
   await deleteFiles({
    urls:result as unknown as string[]
   })
  return res.status(200).json({message:"success",result})
})
//============delete files========
app.get("/upload/deletes", async(req:Request,res:Response,next:NextFunction)=>{
   const result = await deleteFiles({
    urls:[
       "https://your-bucket-name.s3.amazonaws.com/path/to/your/file1.jpg",
       "https://your-bucket-name.s3.amazonaws.com/path/to/your/file2.png"
    ]
   })
   return res.status(200).json({message:"success",result})
})  
//============delete file==========
app.get("/upload/delete/*path", async(req:Request,res:Response,next:NextFunction)=>{
  const {path} = req.params as unknown as {path:string[]};
  const Key = path.join("/");
  const result=await deleteFile ({
    Key
  })
  return res.status(200).json({message:"success",result})
})
//====createGetFilePreSignedUrl=====
app.get("/upload/pre-signed-url/*path", async(req:Request,res:Response,next:NextFunction)=>{
  const {path} = req.params as unknown as {path:string[]};
  const {downLoadName} = req.query as  {downLoadName:string};
  const Key = path.join("/");
  const url = await createGetFilePreSignedUrl ({
    Key,
    downLoadName: downLoadName? downLoadName : undefined
  })
  return res.status(200).json({message:"success",url})
})
//==============getFile==============
app.get("/upload/*path", async(req:Request,res:Response,next:NextFunction)=>{
  const {path} = req.params as unknown as {path:string[]};
  const {downLoadName} = req.query as  {downLoadName:string};
  const Key = path.join("/");
  const result = await getFile ({
    Key
  })
  const stream = result.Body as NodeJS.ReadableStream;
  res.setHeader("Content-Type", result?.ContentType!);
  if(downLoadName){
    res.setHeader("Content-Disposition", `attachment; filename="${downLoadName || path.join("/").split("/").pop()}"`);
  }
  await writePipeLine(stream,res)
})  
  app.use("/users", userRouter);
  app.use("/posts", postRouter);
  // async function test(){
    // const user = new userModel({
    //   fName:"test user",
      // email:`${uuid()}mmm.@gmail.com`,
      // password:"123",
      // age:25,
      // gender:"male"
    //})
    //await user.save({validateBeforeSave:true});
    //  await user.updateOne({age:26})
  // const _userModel = new UserRepository(userModel)
  // const user= await _userModel.findOne({fName:"test user" , paranoid:true} , {age:27})
  // console.log(user);
  // }
  // test()
  
  await connectionDB();
  app.use("{/*demo}", (req: Request, res: Response, next: NextFunction) => {
    throw new AppError(`Invalid Url ${req.originalUrl}`, 404);
  });
  app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
    return res
      .status((err.statusCode as unknown as number) || 500)
      .json({ error: err.message, stack: err.stack });
  });
  app.listen(port, () => {
    console.log(`Server is running on port ${port}...`);
  });
};
export default bootstrap;
