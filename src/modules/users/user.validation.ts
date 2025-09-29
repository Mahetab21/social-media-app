import z, { email } from "zod";
import { GenderType } from "../../DB/model/user.model";
import { Types } from "mongoose";
export enum flagType {
  all = "all",
  current = "current",
}
export const signInSchema = {
  body: z.strictObject({
      email: z.email(),
      password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    }).required(),
};
export const signUpSchema = {
  body: signInSchema.body.extend({
      lName: z.string().min(2).max(100).trim(),
      fName: z.string().min(2).max(100).trim(),
      cPassword: z.string(),
      age: z.number().min(18).max(60),
      address: z.string(),
      phone: z.string(),
      gender: z.enum([GenderType.female, GenderType.male]),
    }).required().superRefine((data, ctx) => {
      console.log(data, ctx);
      if (data.password !== data.cPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["cPassword"],
          message: "Password and confirm password must be the same",
        });
      }
    }),
};
export const confirmEmailSchema = {
  body: z.strictObject({
      email: z.email(),
      otp: z.string().regex(/^\d{6}$/).trim(),
    }).required(),
};

export const logOutSchema = {
  body: z.strictObject({
      flag: z.enum(flagType),
    }).required(),
};
export const logInWithGmailSchema = {
  body: z.strictObject({
      idToken: z.string(),
    }).required(),
};
export const forgetPasswordSchema = {
  body: z.strictObject({
      email: z.email(),
    }).required(),
};
export const resetPasswordSchema = {
  body: confirmEmailSchema.body
    .extend({
      password: z
        .string()
        .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
      cPassword: z.string(),
    })
    .required()
    .superRefine((value, ctx) => {
      if (value.password !== value.cPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["cPassword"],
          message: "Password and confirm password must be the same",
        });
      }
    }),
};
export const freezeSchema = {
  params: z.strictObject({
      userId: z.string().optional(),
    }).required().refine((value) => {
        return value?.userId ? Types.ObjectId.isValid(value.userId) : true;
      },
      {
        message: "Invalid userId",
        path: ["userId"],
      }
    ),
};
export const unFreezeSchema = {
  params: z.strictObject({
      userId: z.string(),
    }).required().refine((value) => {
        return Types.ObjectId.isValid(value.userId);
      },
      {
        message: "Invalid userId",
        path: ["userId"],
      }
    ),
};

export const deleteSchema = {
  params: z.strictObject({
      userId: z.string(),
    }).required().refine((value) => {
        return value?.userId ? Types.ObjectId.isValid(value.userId) : true;
      },
      {
        message: "Invalid userId",
        path: ["userId"],
      }
    ),
};
export const updatePasswordSchema={
  body:z.strictObject({
    currentPassword: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    newPassword: z.string().min(8).max(100).regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    cNewPassword: z.string().min(8).max(100).regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
  }).required().superRefine((data, ctx) => {
    if (data.newPassword !== data.cNewPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["cNewPassword"],
        message: "New password and confirm new password must be the same",
      });
    }
  }),
}
export const updateBasicInfoSchema={
  body:z.strictObject({
    lName: z.string().min(2).max(100).trim().optional(),
    fName: z.string().min(2).max(100).trim().optional(),
    age: z.number().min(18).max(60).optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    gender: z.enum([GenderType.female, GenderType.male]).optional(),
    userName:z.string().min(3).max(30).trim().optional(),
  }).refine((data) => {
    return Object.keys(data).length > 0
  },{
    message:"At least one field is required",

  })
}
export const updateEmailSchema = {
  body: z.object({
    newEmail: z.string().email(),
    password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
  }).required()
}

export const confirmNewEmailSchema = {
  body: z.object({
    otp: z.string().regex(/^\d{6}$/).trim(),
  })}
export const confirmTwoFactorSchema={
  body: z.object({
    otp: z.string().regex(/^\d{6}$/).trim(),
  })
}  
export const loginSchema={
  body: z.object({
    email: z.email(),
    password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
  })
}
export const confirmTwoFactorLoginSchema={
  body: z.object({
    email: z.email(),
    otp: z.string().regex(/^\d{6}$/).trim(),
  })
}
export type signUpSchemaType = z.infer<typeof signUpSchema.body>;
export type confirmEmailSchemaType = z.infer<typeof confirmEmailSchema.body>;
export type signInSchemaType = z.infer<typeof signInSchema.body>;
export type logOutSchemaType = z.infer<typeof logOutSchema.body>;
export type logInWithGmailSchemaType = z.infer<typeof logInWithGmailSchema.body>;
export type forgetPasswordSchemaType = z.infer<typeof forgetPasswordSchema.body>;
export type resetPasswordSchemaType = z.infer<typeof resetPasswordSchema.body>;
export type freezeSchemaType = z.infer<typeof freezeSchema.params>;
export type unFreezeSchemaType = z.infer<typeof unFreezeSchema.params>;
export type deleteSchemaType = z.infer<typeof deleteSchema.params>;
export type updatePasswordSchemaType = z.infer<typeof updatePasswordSchema.body>;
export type updateBasicInfoSchemaType = z.infer<typeof updateBasicInfoSchema.body>;
export type updateEmailSchemaType = z.infer<typeof updateEmailSchema.body>;
export type confirmNewEmailSchemaType = z.infer<typeof confirmNewEmailSchema.body>;
export type confirmTwoFactorSchemaType = z.infer<typeof confirmTwoFactorSchema.body>;
export type loginSchemaType = z.infer<typeof loginSchema.body>;
export type confirmTwoFactorLoginSchemaType = z.infer<typeof confirmTwoFactorLoginSchema.body>;