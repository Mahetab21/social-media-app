import { HydratedDocument, Model, ProjectionType, RootFilterQuery, UpdateQuery, UpdateWriteOpResult ,QueryOptions, DeleteResult} from "mongoose";


export abstract class BbRepository<TDocument>{
    constructor(protected readonly model:Model <TDocument>){ }

    async create(data: Partial<TDocument>):
     Promise<HydratedDocument<TDocument>> {
        return this.model.create(data);
    }
    async findOne(
        filter:RootFilterQuery<TDocument>,
        select?:ProjectionType<TDocument>) :
         Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOne(filter,select);
    }
    async find(
        filter:RootFilterQuery<TDocument>,
        select?:ProjectionType<TDocument>,
        options?:QueryOptions<TDocument> 
    ):Promise<HydratedDocument<TDocument>[]>{
        return this.model.find(filter,select,options);
    }
    async updateOne(
        filter:RootFilterQuery<TDocument>,
        updated:UpdateQuery<TDocument>): 
        Promise<UpdateWriteOpResult>{
        return await this.model.updateOne(filter,updated);
    }
    async findOneAndUpdate(
        filter:RootFilterQuery<TDocument>,
        updated:UpdateQuery<TDocument>,
        options:QueryOptions<TDocument>| null = {new:true}
    ): Promise<HydratedDocument<TDocument> | null>{
        return await this.model.findOneAndUpdate(filter,updated,options)
    }
    async deleteOne(
        filter:RootFilterQuery<TDocument>):
         Promise<DeleteResult>{
        return await this.model.deleteOne(filter);
    }
    }
    