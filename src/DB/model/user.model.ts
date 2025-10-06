import mongoose, { Schema, model, Types, HydratedDocument } from "mongoose";
import { Hash } from "../../utils/hash";
import { generateOtp } from "../../service/sendEmail";
import { eventEmitter } from "../../utils/event";
export enum GenderType{
    male="male",
    female="female"
}
export enum RoleType{
    admin="admin",
    user="user",
    superAdmin="superAdmin"
}
export enum ProviderType{
    google="google",
    system="system"
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
    changeCredentials?:Date,
    deletedAt?:Date,
    createdAt:Date,
    updatedAt:Date,
    image?:string,
    provider:ProviderType,
    profileImage?:string,
    tempProfileImage?:string,
    coverImage?:string,
    deletedBy?:Types.ObjectId,
    restoredAt?:Date,
    restoredBy?:Types.ObjectId,
    friends?:Types.ObjectId[],
    emailChangeRequested?: Date,
    newEmail:string,
    twoFactorEnabled?: boolean,
    twoFactorOtp?: string,
    twoFactorOtpExpiry?: Date,

    blockedUsers?: Types.ObjectId[]

}
const userSchema = new mongoose.Schema<IUser>({
    fName:{type: String,required: true,minLength: 3,maxLength: 20,trim: true},
    lName:{type: String,required: true,minLength: 3,maxLength: 20,trim: true},
    email:{type: String,required: true,unique: true,trim: true},
    password:{type: String,required: function(){
        return this.provider === ProviderType.google ? false : true;
    }},
    age:{type: Number,min: 18,max: 60,required: function(){
        return this.provider === ProviderType.google ? false : true;
    }},
    phone:{type: String},
    address:{type: String},
    confirmed:{type: Boolean},
    otp:{type: String},
    gender:{type: String,enum: GenderType,required: function(){
        return this.provider === ProviderType.google ? false : true;
    }},
    deletedAt:{type:Date},
    changeCredentials:{type: Date},
    role:{type: String,enum: RoleType,default: RoleType.user},
    image:{type: String},
    provider:{type: String,enum: ProviderType,default: ProviderType.system},
    profileImage:{type: String},
    tempProfileImage:{type: String},
    coverImage:{type: String},
    deletedBy:{ type :Types.ObjectId,ref:"User"},
    restoredAt:{type:Date},
    restoredBy:{type:Types.ObjectId,ref:"User"},
    friends:[{type:Types.ObjectId,ref:"User"}],
    emailChangeRequested:{ type: Date},
    newEmail:{type: String,unique: true},
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorOtp: { type: String },
    twoFactorOtpExpiry: { type: Date },

    blockedUsers:[{  type: mongoose.Schema.Types.ObjectId,ref: 'User'}]
},{
    timestamps: true,
    strictQuery:true,
    toJSON:{ virtuals: true},
    toObject:{ virtuals: true}
})

userSchema.virtual("userName").set(function(value){
    const[fName,lName]= value.split(" ");
    this.set({fName,lName});
}).get(function(){
    return this.fName+" "+this.lName;
})

// mongoose hooks (middleware):--
//decument middleware=>
// userSchema.pre("validate",function(next){
//     console.log("-------------------pre validate hook-----------------");
//     console.log(this);
//     next();
// })
// userSchema.post("validate",function(){
//     console.log("-------------------post validate hook-----------------");
//     console.log(this);
// })

//validate hooks have priority over save hooks and run before them.... 
//validate hooks run when u call validate() or save()=> default of validateBeforeSave is true..... if it false u can disable validate hooks
// userSchema.pre("save",async function(this:HydratedDocument<IUser> & {NEW:boolean},next){
//     console.log("-------------------pre save hook-----------------");
//     console.log({this:this , change: this.isModified(), isNew : this.isNew});
//     this.NEW = this.isNew;
//     if(this.isModified("password")){
//         this.password = await Hash(this.password); 
//     }
// })

// isNew is true only the first time u create the document not when u update it
//isNew alaways in post save hook is false

// userSchema.post("save",async function(){
//     console.log("-------------------post save hook-----------------");
//     console.log({this:this , isNew : this.isNew});
//     const that = this as HydratedDocument<IUser> & {NEW:boolean};
//     if(that.NEW === true){
//         const otp=await generateOtp();
//         eventEmitter.emit("confirmEmail",{email:this.email,otp});
//     }
// })

// userSchema.pre("updateOne",{document:true , query:false},async function(){
//     console.log("-------------------pre updateOne hook-----------------");
//     console.log({this:this});
// })

// userSchema.pre("deleteOne",{document:true , query:false},async function(){
//     console.log("-------------------pre deleteOne hook-----------------");
//     console.log({this:this});
// })

// userSchema.pre(["updateOne","deleteOne"],{document:true , query:false},async function(){
//     console.log("-------------------pre deleteOne || updateOne hook-----------------");
//     console.log({this:this});
// })
// //query middleware=>

// userSchema.pre(["updateOne","findOne"],async function(){
//     console.log("-------------------pre findOne || updateOne hook-----------------");
//     console.log({this:this , query : this.getQuery()});
//     const query = this.getQuery();
//     const {paranoid , ...rest} = query;
//     if(paranoid === false){
//         this.setQuery({...rest})
//     }else{
//         this.setQuery({...rest , deletedAt :{$exists : false}})
//     }
// })
const userModel = mongoose.models.User || model<IUser>("User",userSchema);
export default userModel;