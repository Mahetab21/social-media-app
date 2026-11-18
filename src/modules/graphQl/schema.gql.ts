import { GraphQLError, GraphQLObjectType, GraphQLSchema } from 'graphql';
import UserFields from '../users/graphql/user.fields';
import PostFields from '../post/graphQl/post.fields';
import { AppError } from '../../utils/classError';
function safe(fields:any) {
 for(const field of Object.values(fields) as any[]) {
  const resolve = field.resolve;
  field.resolve = async (...args:any[]) => {
   try { return await resolve(...args); }
   catch(error:any) { throw new GraphQLError(error instanceof AppError ? error.message : 'Request could not be completed', {extensions:{code:error instanceof AppError ? String(error.statusCode) : 'BAD_REQUEST'}}); }
  };
 }
 return fields;
}
export const schemaGQL = new GraphQLSchema({
 query:new GraphQLObjectType({name:'Query',fields:safe({...UserFields.query(),...PostFields.query()})}),
 mutation:new GraphQLObjectType({name:'Mutation',fields:safe({...UserFields.mutation(),...PostFields.mutation()})})
});
