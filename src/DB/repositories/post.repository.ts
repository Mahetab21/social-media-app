import { BbRepository } from "./db.repository";
import { Model } from "mongoose";
import { IPost } from "../model/post.model";


export class PostRepository extends BbRepository<IPost>{
    constructor(protected override model:Model<IPost>){
        super(model)
    }

}