import { HydratedDocument } from "mongoose"
import { Socket } from "socket.io"
import { IUser } from "../../DB/model/user.model"
import { JwtPayload } from "jsonwebtoken"
export interface socketWithUserId extends Socket {
  user?:Partial<HydratedDocument<IUser>>,
  decoded?: JwtPayload
}
