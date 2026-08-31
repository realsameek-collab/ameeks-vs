import express from "express"
import dotenv from "dotenv"
import { connectDb } from "./config/db.js"
dotenv.config()

const port = process.env.PORT || 8002

const app = express()
app.use(express.json())

app.get("/",(req,res)=>{
   res.json({"message":"Hello from project service!"})
})

app.listen(port,()=>{
    connectDb()
     console.log(`project service started at ${port}`)
})
