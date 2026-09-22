import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
      owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
      },
      name:{
          type:String,
          required:true        
      },
      description:{
        type:String
      },
      // Name of the folder on the user's device, set when it was chosen in the browser.
      // Browsers never reveal the full path; the folder itself is remembered by that browser.
      folderName:{
        type:String
      },
      starred:{
        type:Boolean,
        default:false
      },
      lastOpenedAt:{
          type:Date,
          default:Date.now
      }


},{
    timestamps:true,

})

const project = mongoose.model("Project",projectSchema)
export default project