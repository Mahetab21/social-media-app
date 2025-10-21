import {
  graphql,
  GraphQLEnumType,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";
import { postType, paginatedPostsType } from "./post.type";
import PostService from "../post.service";
import { likePostGQL, getPosts } from "./post.args";
class PostFields {
  constructor() {}
  query = () => {
    return {
      getPosts: {
        type: paginatedPostsType,
        args: getPosts,
        resolve: PostService.getPostsGQL,
      },
    };
  };
  mutation = () => {
    return {
      likePost: {
        type: GraphQLString,
        args: likePostGQL,
        resolve: PostService.likePostGQL,
      },
    };
  };
}

export default new PostFields();
