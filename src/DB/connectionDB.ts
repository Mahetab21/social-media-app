import mongoose from "mongoose";
const connectionDB=async()=>{
    mongoose.connect(process.env.DB_URL as unknown as  string)
    .then(()=>{
        console.log("DB connected successfully...");
    }).catch((error)=>{
        console.log("DB connection failed",error);
    })
}
export default connectionDB;