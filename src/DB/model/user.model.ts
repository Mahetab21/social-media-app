import mongoose, { Schema, model, Types } from "mongoose";
export enum GenderType{
    male="male",
    female="female"
}
export enum RoleType{
    admin="admin",
    user="user"
}
export interface IUser{
    _id:Types.ObjectId,
    fName:string,
    lName:string,
    userName?:string,
    email:string,
    password:string,  
    age:number,
    phone?:string,
    address?:string,
    gender:GenderType,
    role?:RoleType,
    otp?:string,
    confirmed?:boolean,
    chandeCredentials?:Date,
    createdAt:Date,
    updatedAt:Date
}
const userSchema = new mongoose.Schema<IUser>({
    fName:{type: String,required: true,minLength: 3,maxLength: 20,trim: true},
    lName:{type: String,required: true,minLength: 3,maxLength: 20,trim: true},
    email:{type: String,required: true,unique: true,trim: true},
    password:{type: String,required: true},
    age:{type: Number,required: true,min: 18,max: 60},
    phone:{type: String},
    address:{type: String},
    confirmed:{type: Boolean},
    otp:{type: String},
    gender:{type: String,enum: GenderType,required: true},
    chandeCredentials:{type: Date},
    role:{type: String,enum: RoleType,default: RoleType.user},
},{
    timestamps: true,
    toJSON:{ virtuals: true},
    toObject:{ virtuals: true}
})

userSchema.virtual("userName").set(function(value){
    const[fName,lName]= value.split(" ");
    this.set({fName,lName});
}).get(function(){
    return this.fName+" "+this.lName;
})

const userModel = mongoose.models.User || model<IUser>("User",userSchema);
export default userModel;