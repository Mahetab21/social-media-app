import { BbRepository } from "./db.repository";
import { Model } from "mongoose";
import { IFriendRequest } from "../model/friendRequest.model";


export class FriendRequestRepository extends BbRepository<IFriendRequest>{
    constructor(protected override model:Model<IFriendRequest>){
        super(model)
    }

}