const express = require("express");

const app = express();
app.use(express.json());

const products = [
  { id:1, name: "Laptop", price: 60000 },
  { id:2, name: "Mouse", price: 800 },
  { id:3, name: "Keyboard", price: 1500 },
];

app.get("/health",(req,res)=>{
    res.json({status:"ok",service:"product-service"})
})
app.get("/products",(req,res)=>{
    res.json({data:products})
})

app.get("/products/:id",(req,res)=>{
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id<=0){
        return res.status(400).json({
            error:{
                code:"INVALID_PRODUCT_ID",
                message:"Product ID must be a positive integer",
            },
        });
    }
    const product = products.find((item)=>item.id===id);
    if(!product){
        return res.status(404).json({
            error:{
                code:"PRODUCT_NOT_FOUND",
                message:"Product not found",
            }
        })
    }
    res.json({data:product});
})

app.use((err,req,res,next)=>{
    console.log(err);
    res.status(500).json({
        error:{
            code:"INTERNAL_ERROR",
            message:"Something went wrong",
        },
    });
});
app.listen(3002,()=>console.log("product service running on port 3002"))