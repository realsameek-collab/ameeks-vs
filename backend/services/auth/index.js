import express from "express"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import { connectDb } from "./config/db.js"
import router from "./routes/auth.route.js"
dotenv.config()

const port = process.env.PORT || 8001

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use("/",router)

app.get("/",(req,res)=>{
   res.json({"message":"Hello from auth!"})
})

app.listen(port,()=>{
    connectDb()
     console.log(`auth started at ${port}`)
})
