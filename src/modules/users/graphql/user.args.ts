import { graphql, GraphQLEnumType, GraphQLID, GraphQLInt, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { GenderType } from '../../../DB/model/user.model';


export const getUserArgs ={
    id:{type:new GraphQLNonNull(GraphQLID)}
}

export const createUserArgs ={
    fName:{type: new GraphQLNonNull(GraphQLString)},
    lName:{type: new GraphQLNonNull(GraphQLString)},

    email:{type: new GraphQLNonNull(GraphQLString)},
    password:{type: new GraphQLNonNull(GraphQLString)},
    gender:
    {type: new GraphQLNonNull(new GraphQLEnumType({
        name:"gender",
        values:{
            male:{value:GenderType.male},
            female:{value:GenderType.female}
        }
    }))},
    age:{type: new GraphQLNonNull(GraphQLInt)}      
    }