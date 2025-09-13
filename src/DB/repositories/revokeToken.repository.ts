import { BbRepository } from "./db.repository";
import { IRevokeToken } from "../model/revokeToken.model";
import {  Model } from "mongoose";


export class RevokeTokenRepository extends BbRepository<IRevokeToken>{
    constructor(protected model : Model<IRevokeToken>){
        super(model)
    }

}
