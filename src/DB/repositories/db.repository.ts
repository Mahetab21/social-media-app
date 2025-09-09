import { HydratedDocument, Model, ProjectionType, RootFilterQuery, UpdateQuery, UpdateWriteOpResult } from "mongoose";


export abstract class BbRepository<TDocument>{
    constructor(protected readonly model:Model <TDocument>){ }

    async create(data: Partial<TDocument>): Promise<HydratedDocument<TDocument>> {
        return this.model.create(data);
    }
    async findOne(filter:RootFilterQuery<TDocument>,select?:ProjectionType<TDocument>) : Promise<HydratedDocument<TDocument> | null> {
        return this.model.findOne(filter);
    }
    async updateOne(filter:RootFilterQuery<TDocument>,updated:UpdateQuery<TDocument>): Promise<UpdateWriteOpResult>{
        return await this.model.updateOne(filter,updated);

    }
}