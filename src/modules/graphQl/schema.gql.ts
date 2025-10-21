
import { graphql, GraphQLEnumType, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { GenderType } from '../../DB/model/user.model';
import { AppError } from '../../utils/classError';
import UserFields from '../users/graphql/user.fields';
import PostFields from '../post/graphQl/post.fields';
const users =[
  {id:"1",name:"John Doe",email:"john@example.com",gender:GenderType.male,password:"12345"},
  {id:"2",name:"Jane Smith",email:"jane@example.com",gender:GenderType.female,password:"67890"}
]
const userType = new GraphQLObjectType({
  name:"User",
  fields:{
    id:{type: new GraphQLNonNull(GraphQLID)},
    name:{type: new GraphQLNonNull(GraphQLString)},
    email:{type: new GraphQLNonNull(GraphQLString)},
    password:{type: new GraphQLNonNull(GraphQLString)},
    gender:{
      type: new GraphQLNonNull(new GraphQLEnumType({
            name:"Gender",
            values:{
              male:{value:GenderType.male},
              female:{value:GenderType.female}
            }
          }))}
  }
})

export const schemaGQL = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
      ...UserFields.query(),
      ...PostFields.query()
    },
  }),
  mutation: new GraphQLObjectType({
    name:"mutation",
    fields:{
      ...UserFields.mutation(),
      ...PostFields.mutation()
    }
  })
});