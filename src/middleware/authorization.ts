import { NextFunction, Request, Response } from "express";
import { RoleType } from "../DB/model/user.model";
import { GraphQLError } from "graphql";

export const authorization = (accessRoles: RoleType[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // If no user is authenticated
    if (!req.user) {
      return res.status(401).json({
        error: "Authentication required to access this resource",
      });
    }
    // If no specific roles are required, allow all authenticated users
    if (accessRoles.length === 0) {
      return next();
    }
    // Check if user's role is in the allowed roles
    if (!req.user.role || !accessRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: "You are not authorized to access this resource",
      });
    }

    return next();
  };
};
export const authorizationGQL = async({accessRoles =[] , role} : {accessRoles : RoleType[], role:RoleType})=>{
  if(!accessRoles.includes(role)){
    throw new GraphQLError( "You are not authorized to access this resource",{
      extensions:{
        message:"You are not authorized to access this resource",
        statuscode:401
      }
    })
  }
  return true
}
