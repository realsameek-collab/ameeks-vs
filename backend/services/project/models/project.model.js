import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
      owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        required:true
      },
      name:{
          type:String,
          required:true        
      },
      description:{
        type:String
      },
      starred:{
        typr:Boolean,
        default:false
      },
      lastOpenedAt:{
          type:Date,
          default:Date.now()
      }


},{
    timestamps:true,

})

const project = mongoose.model("Project",projectSchema)
export default project