import proxy from "express-http-proxy"

export const proxyWithHeader = (serviceUrl) => {
         return proxy(serviceUrl ,{
             // The AI service receives whole files back from the browser as tool results
             limit:"5mb",
             proxyReqOptDecorator:(proxyReqOpts,req)=>{
                 const userId = req.user?._id
                 if(!userId){
                     throw new Error("invalid session: no user id")
                 }
                 proxyReqOpts.headers["x-user-id"] = String(userId)
                 return proxyReqOpts
             },
             proxyErrorHandler:(err,res,next)=>{
                 if(err.message === "invalid session: no user id"){
                     return res.status(401).json({message:"invalid session, please login again"})
                 }
                 next(err)
             }
         })


}
