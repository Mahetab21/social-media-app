import {
  GraphQLInt,
  GraphQLNonNull,
  GraphQLEnumType,
  GraphQLID,
} from "graphql";
import { ActionEnum } from "../post.validation";

export const getPosts = {
  page: { type: new GraphQLNonNull(GraphQLInt) },
  limit: { type: new GraphQLNonNull(GraphQLInt) },
};

export const likePostGQL = {
  postId: { type: new GraphQLNonNull(GraphQLID) },
  action: {
    type: new GraphQLNonNull(
      new GraphQLEnumType({
        name: "ActionEnum",
        values: {
          like: { value: ActionEnum.like },
          unlike: { value: ActionEnum.unlike },
        },
      })
    ),
  },
};
