import { BbRepository } from "./db.repository";
import { Model } from "mongoose";
import { IComment } from "../model/comment.model";


export class CommentRepository extends BbRepository<IComment>{
    constructor(protected override model:Model<IComment>){
        super(model)
    }

}