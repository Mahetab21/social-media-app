import { GraphQLID, GraphQLInt, GraphQLObjectType, GraphQLString } from 'graphql';
export const userType = new GraphQLObjectType({ name:'User', fields:{
 _id:{type:GraphQLID}, fName:{type:GraphQLString}, lName:{type:GraphQLString}, userName:{type:GraphQLString},
 email:{type:GraphQLString}, gender:{type:GraphQLString}, age:{type:GraphQLInt}
} });
