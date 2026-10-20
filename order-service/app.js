const express = require("express");

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({
        status: "ok", service: "product-service"
    })
})
const orders = [];
let nextOrderId = 1;
class AppError extends Error {
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
//call another service and handle its HTTP errors.
async function getServiceData(url, serviceName) {
    let response;
    try {
        response = await fetch(url, {
            signal: AbortSignal.timeout(3000)
        });
    } catch (error) {
        console.log(`${serviceName} request failed:`, error.message);
        throw new AppError(
            503,
            "SERVICE_UNAVAILABLE",
            `${serviceName} is unavailable`
        )
    }
    let body;
    try {
        body = await response.json();
    } catch {
        throw new AppError(
            502,
            "INVALID_SERVICE_RESPONSE",
            `${serviceName} returned invalid JSON`
        )
    }
    if (!response.ok) {
        const code = body?.error?.code;
        // These errors are meaningful to the order request.
        if (response.status === 404 && ["USER_NOT_FOUND", "PRODUCT_NOT_FOUND"].includes(code)) {
            throw new AppError(404, code, body.error.message);
        }
        //The downstream service may have its own internal failure.
        if (response.status >= 500) {
            throw new AppError(
                503,
                "DEPENDENCY_FAILURE",
                `${serviceName} could not complete the request`
            )
        }
        throw new AppError(
            502,
            "DEPENDENCY_ERROR",
            `${serviceName} rejected the request`
        );
    }
    if (!body || !body.data) {
        throw new AppError(
            502,
            "INVALID_SERVICE_RESPONSE",
            `${serviceName} returned unexpected data`
        )
    }
    return body.data;
}
app.post("/orders", async (req, res, next) => {
    try {
        const { userId, productID, quantity } = req.body;
        if (
            typeof userId !== "string" ||
            typeof productID !== "string" ||
            !Number.isSafeInteger(quantity) ||
            quantity < 1 ||
            quantity > 100
        ) {
            throw new AppError(
                400,
                "INVALID_ORDER",
                "Valid userId, productId and quantity are required"
            );
        }
        //1. Verify the user.
        const user = await getServiceData(
            `http://localhost:3001/users/${encodeURIComponent(userId)}`,
            "User Service"
        );
        // 2. Verify the product.
        const product = await getServiceData(
            `http://localhost:3002/products/${encodeURIComponent(productID)}`,
            "Product Service"
        );
        //3. Validate the product and calculate the total
        if (
            !Number.isSafeInteger(product.price) ||
            product.price < 0
        ) {
            throw new AppError(
                502,
                "INVALID_PRODUCT_PRICE",
                "Product Service returned an invalid price"
            );
        }
        if (product.stock < quantity) {
            throw new AppError(
                409,
                "INSUFFICIENT_STOCK",
                "Not enough stock available"
            )
        }
        const total = product.price * quantity;
        //4. Create an order in the Order Service's own store
        const order = {
            id: String(nextOrderId++),
            userId: user.id,
            productID: product.id,
            productName: product.name,
            unitPrice: product.price,
            quantity,
            total,
            status: "PENDING"
        };
        orders.push(order);
        res.status(201).json({
            data: {
                ...order,
                userName: user.name
            }
        })
    } catch (error) {
        next(error)
    }
})
app.get("/orders", (req, res) => {
    res.json({ data: orders });
})
//Centeral error handler
app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const status = err.status || 500;
    if (status >= 500) {
        console.log(err);
    }
    res.status(status).json({
        error: {
            code: err.code || "INTERNAL_SERVER_ERROR",
            message: status === 500 ? "Something went wrong" : err.message
        }
    })
})

app.listen(3003, () => console.log("Order service running on port 3003"));