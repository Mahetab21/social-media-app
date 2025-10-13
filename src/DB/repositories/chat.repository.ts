import { BbRepository } from "./db.repository";
import { Model } from "mongoose";
import { IChat } from "../model/chat.model";


export class ChatRepository extends BbRepository<IChat>{
    constructor(protected override model:Model<IChat>){
        super(model)
    }

}