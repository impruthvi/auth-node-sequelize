const express = require("express");
const authController = require("../controller/userController");

const AuthRouter = express.Router();

AuthRouter.route("/register").post(authController.uploadImage,authController.userSignup);

AuthRouter.route("/login").post(authController.userLogin);

AuthRouter.route("/update-password").patch(authController.protect,authController.changePassword);

AuthRouter.post("/forgotPassword", authController.forgotPassword);

AuthRouter.patch("/resetPassword/:token", authController.resetPassword);

AuthRouter.post("/send-otp",authController.sendOTP);

AuthRouter.post("/verify-otp",authController.verifyOTP);


module.exports = AuthRouter;
