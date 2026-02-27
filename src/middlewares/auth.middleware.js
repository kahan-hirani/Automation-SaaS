import asyncHandler from "../utils/asyncHandler.util.js";
import errorHandler from "../utils/errorHandler.util.js";
import jwt from "jsonwebtoken";

const isAuthenticated = asyncHandler(async (req, res, next) => {

    const token = req.cookies.token || req.headers['authorization']?.replace("Bearer ", "");
    if (!token) {
        return next(new errorHandler("Invalid token", 400))
    }
    const tokenData = jwt.verify(token, process.env.JWT_SECRET)
    req.user = tokenData
    next()
});


export default isAuthenticated;