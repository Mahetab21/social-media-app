import { BbRepository } from "./db.repository";
import { Model } from "mongoose";
import { IChat } from "../model/chat.model";
import {
  RootFilterQuery,
  QueryOptions,
  ProjectionType,
  HydratedDocument,
} from "mongoose";

export class ChatRepository extends BbRepository<IChat> {
  constructor(protected override model: Model<IChat>) {
    super(model);
  }

  async paginateChat({
    filter,
    query,
    select,
    options,
  }: {
    filter: RootFilterQuery<IChat>;
    query: { page: number; limit: number };
    select?: ProjectionType<IChat>;
    options?: QueryOptions<IChat>;
  }): Promise<{
    docs: HydratedDocument<IChat>[];
    currentPage: number;
    countDocument: number;
    numberOfPages: number;
  }> {
    let { page, limit } = query;

    // Handle page validation like in the service
    if (page < 0 || !page) page = 1;
    page = page * 1 || 1;
    limit = limit * 1 || 5;

    // Create the select object with message slicing
    const selectWithSlice = select
      ? Object.assign({}, select, {
          message: {
            $slice: [-(page * limit), limit],
          },
        })
      : {
          message: {
            $slice: [-(page * limit), limit],
          },
        };

    // Get total count for pagination calculation
    const count = await this.model.countDocuments({
      ...filter,
      deletedAt: { $exists: false },
    });

    const numberOfPages = Math.ceil(count / limit);

    // Find documents with message slicing and options
    const docs = await this.model.find(filter, selectWithSlice, options);

    return {
      docs,
      currentPage: page,
      countDocument: count,
      numberOfPages,
    };
  }
}
