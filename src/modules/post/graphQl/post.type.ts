import {
  graphql,
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
} from "graphql";

export const postType = new GraphQLObjectType({
  name: "Post",
  fields: () => ({
    content: { type: GraphQLString },
    attachments: { type: new GraphQLList(GraphQLString) },
    assestFolderId: { type: GraphQLString },
    createdBy: { type: GraphQLID },
    likes: { type: new GraphQLList(GraphQLID) },
    tags: { type: new GraphQLList(GraphQLID) },
  }),
});

export const paginatedPostsType = new GraphQLObjectType({
  name: "PaginatedPosts",
  fields: () => ({
    posts: { type: new GraphQLList(postType) },
    currentPage: { type: GraphQLInt },
    numberOfPages: { type: GraphQLInt },
    countDocument: { type: GraphQLInt },
  }),
});
