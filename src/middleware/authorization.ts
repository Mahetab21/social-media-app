import { NextFunction, Request, Response } from "express";
import { RoleType } from "../DB/model/user.model";

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
