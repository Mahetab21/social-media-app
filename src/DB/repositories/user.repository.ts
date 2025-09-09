import { BbRepository } from "./db.repository";
import { IUser } from "../model/user.model";
import { Model } from "mongoose";
import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/classError";


export class UserRepository extends BbRepository<IUser>{
    constructor(protected readonly model:Model<IUser>){
        super(model)
    }
    async createOneUser(data:Partial<IUser>):Promise<HydratedDocument<IUser>>{
        const user : HydratedDocument<IUser> = await this.create(data);
        if(!user){
            throw new AppError("Failed to create user",400);
        }
        return user;
    }
}