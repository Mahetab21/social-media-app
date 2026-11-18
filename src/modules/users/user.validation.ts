import { z } from 'zod';
import { GenderType, RoleType } from '../../DB/model/user.model';
import { generalRules } from '../../utils/generalRules';
export enum flagType { all = 'all', current = 'current' }
const email = z.email().trim().toLowerCase(), password = z.string().min(8).max(72).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/);
const otp = z.string().regex(/^[0-9]{6}$/);
export const signInSchema = { body: z.strictObject({ email, password: z.string().min(1).max(72) }) };
export const loginSchema = signInSchema;
export const signUpSchema = { body: z.strictObject({
 fName:z.string().trim().min(2).max(100), lName:z.string().trim().min(2).max(100), email, password, cPassword:z.string(),
 age:z.number().int().min(18).max(60), gender:z.enum(GenderType), address:z.string().max(250).optional(), phone:z.string().max(30).optional()
}).refine(x=>x.password===x.cPassword,{path:['cPassword'],message:'Passwords must match'}) };
export const confirmEmailSchema = { body:z.strictObject({email,otp}) };
export const confirmTwoFactorLoginSchema = confirmEmailSchema;
export const forgetPasswordSchema = { body:z.strictObject({email}) };
export const resetPasswordSchema = { body:confirmEmailSchema.body.extend({password,cPassword:z.string()}).refine(x=>x.password===x.cPassword,{path:['cPassword'],message:'Passwords must match'}) };
export const logOutSchema = { body:z.strictObject({flag:z.enum(flagType).default(flagType.current)}) };
export const logInWithGmailSchema = { body:z.strictObject({idToken:z.string().min(1).max(10000)}) };
export const freezeSchema = { params:z.object({userId:generalRules.id.optional()}) };
export const unFreezeSchema = { params:z.object({userId:generalRules.id}) };
export const deleteSchema = unFreezeSchema;
export const blockUserSchema = unFreezeSchema;
export const updatePasswordSchema = { body:z.strictObject({currentPassword:z.string().min(1).max(72),newPassword:password,cNewPassword:z.string()}).refine(x=>x.newPassword===x.cNewPassword,{path:['cNewPassword'],message:'Passwords must match'}) };
export const updateBasicInfoSchema = { body:z.strictObject({
 fName:z.string().trim().min(2).max(100).optional(),lName:z.string().trim().min(2).max(100).optional(),age:z.number().int().min(18).max(60).optional(),
 gender:z.enum(GenderType).optional(),address:z.string().max(250).optional(),phone:z.string().max(30).optional()
}).refine(x=>Object.keys(x).length>0,'Provide an update') };
export const updateEmailSchema = { body:z.strictObject({newEmail:email,password:z.string().min(1).max(72)}) };
export const confirmNewEmailSchema = { body:z.strictObject({otp}) };
export const confirmTwoFactorSchema = confirmNewEmailSchema;
export const changeRoleSchema = { ...unFreezeSchema, body:z.strictObject({role:z.enum([RoleType.user,RoleType.admin])}) };
export const uploadImagesSchema = { body:z.strictObject({originalname:z.string().min(1).max(150),ContentType:z.enum(['image/jpeg','image/png'])}) };
export const getOneUserSchemaType = z.strictObject({id:generalRules.id});
export const idParams = (key:string) => ({params:z.object({[key]:generalRules.id})});
