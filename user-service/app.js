const express = require("express");
const app = express();
const users = [
    {id:1,name:"Rahul",email:"rahul@gmail.com"},
    {id:2,name:"Ram",email:"ram@gmail.com"}
]

app.get("/health",(req,res)=>{
    res.json({status:"ok",service:"user-service"})
})
//Get one user
app.get("/users/:id",(req,res)=>{
    //const id = Number(res.params.id);
   const id = Number(req.params.id);
    if(!Number.isInteger(id)||id<=0){
        return res.status(400).json({
            error:{
                code:"INVALID_USER_ID",
                message:"User ID must be a positive integer"
            },
        })
    }
    const user = users.find((item)=>item.id===id);
    console.log(user);
    if(!user){
        return res.status(404).json({
            error:{
                code:"USER_NOT_FOUND",
                message:"USer not found"
            },
        });
    }
    res.json({data:user});
})
app.use ((err,req,res,next)=>{
    console.log(err);
    res.status(500).json({
        error:{
            code:"INTERNAL_ERROR",
            message:"Something went wrong",
        },
    });
});
app.listen(3001,()=>{
    console.log("User Service running on port 3001")
})