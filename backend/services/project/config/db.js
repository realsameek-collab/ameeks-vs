import mongoose from "mongoose"
import dns from "dns"
dns.setServers([
    '1.1.1.1',
    '8.8.8.8'
])
export const connectDb = async()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Database connected successfully")
    } catch (error) {
        console.log(error)
    }
}