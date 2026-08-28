import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firebaseUid:{
        type:String,
        require:true,
        unique:true,
        trim:true
    },
    name:{
        type:String,
        require:true,
        trim:true
    },
    email:{
        type:String,
        require:true,
        unique:true,
        trim:true,
        lowercase:true
    },
    avatar:{
        type:String,
        default:""
    }
},{timestamps:true})

const User = mongoose.model("User",userSchema)
export default User