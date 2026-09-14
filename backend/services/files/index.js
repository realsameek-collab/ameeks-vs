import express from "express"
import dotenv from "dotenv"
import { connectDb } from "./config/db.js"
dotenv.config()

const port = process.env.PORT || 8003

const app = express()
app.use(express.json())
app.use("/", router)
app.get("/",(req,res)=>{
   res.json({"message":"Hello from file service!"})
})

app.listen(port,()=>{
    connectDb()
     console.log(`file service started at ${port}`)
})
