import mongoose from 'mongoose';
export default async function connectionDB() { await mongoose.connect(process.env.DB_URL!); }
