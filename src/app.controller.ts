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
  app.use("/users", userRouter);

  async function test(){
    // const user = new userModel({
    //   fName:"test user",
      // email:`${uuid()}mmm.@gmail.com`,
      // password:"123",
      // age:25,
      // gender:"male"
    //})
    //await user.save({validateBeforeSave:true});
    //  await user.updateOne({age:26})
  const _userModel = new UserRepository(userModel)
  const user= await _userModel.findOne({fName:"test user" , paranoid:true} , {age:27})
  console.log(user);
  }
  test()
  
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
