import { graphql, GraphQLEnumType, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql';
import { GenderType } from '../../../DB/model/user.model';
import { userType } from './user.type';
import UserService from '../user.service';
import * as userArgs from './user.args';


class UserFields {
    constructor(){}
    query =() =>{
        return{
            getOneUser:{
                type:userType,
                //args:userArgs.getUserArgs,
                resolve:UserService.getOneUser
            },
            getAllUser:{
                type:new GraphQLList(userType),
                resolve:UserService.getAllUser
            }  
        }
    };
    mutation =()=>{
        return{
            createUser:{
                type: userType, 
                args:userArgs.createUserArgs,
                resolve:UserService.createUser
      }

        }
    }

}
export default new UserFields();