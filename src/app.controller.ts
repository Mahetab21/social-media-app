import './config/environment';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { resolve } from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { createHandler } from 'graphql-http/lib/use/express';
import userRouter from './modules/users/user.controller';
import postRouter from './modules/post/post.controller';
import chatRouter from './modules/chat/chat.controller';
import { schemaGQL } from './modules/graphQl/schema.gql';
import { Authentication } from './middleware/Authentication';
import { initializationIo } from './modules/gateway/gateway';
import connectionDB from './DB/connectionDB';
import { corsOrigins, validateEnvironment } from './config/environment';
import { swaggerSpec } from './config/swagger.config';
import { AppError } from './utils/classError';
export function createApp() {
 const app = express();
 app.disable('x-powered-by');
 app.use(helmet());
 app.use(cors({origin:corsOrigins()}));
 app.use(express.json({limit:'64kb'}));
 app.use(rateLimit({windowMs:900000,limit:1000,standardHeaders:'draft-8',legacyHeaders:false}));
 app.get('/', (_req,res)=>res.json({service:'Social Media API',status:'ok'}));
 app.get('/openapi.json', (_req,res)=>res.json(swaggerSpec));
 app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
 app.use('/socket-demo', express.static(resolve(__dirname,'../FE')));
 app.all('/graphql', Authentication(), createHandler({schema:schemaGQL,context:(req)=>({req:req.raw})}));
 app.use('/users',userRouter); app.use('/posts',postRouter); app.use('/chat',chatRouter);
 app.use((_req,_res,next)=>next(new AppError('Route not found',404)));
 app.use((error:any,_req:Request,res:Response,_next:NextFunction)=>{
  const code = error.code === 11000 ? 409 : ['ValidationError','CastError','ZodError'].includes(error.name) || error.type === 'entity.parse.failed' ? 400 : error.name === 'MulterError' || error.type === 'entity.too.large' ? 413 : error.statusCode || 500;
  const message = error.code === 11000 ? 'A conflicting record already exists' : code === 500 ? 'Internal server error' : error instanceof AppError ? error.message : code === 413 ? 'Upload or request exceeds the allowed limits' : 'Invalid request';
  res.status(code).json({error:message});
 });
 return app;
}
export default async function bootstrap() {
 validateEnvironment(); await connectionDB();
 const app=createApp(), server=app.listen(Number(process.env.PORT || 5000));
 initializationIo(server);
 return server;
}
