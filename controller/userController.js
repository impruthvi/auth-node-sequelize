const User = require("../models/userModel");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const multer = require("multer");
const { promisify } = require("util");

const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const SendEmail = require("../utils/email");
const sendOtp = require("../utils/twillio");

// ------------------------------------------------Image Upload-----------------------------------------------------------//

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `photo-${Date.now()}.${ext}`);
  },
});

var upload = multer({ storage: multerStorage });
const uploadImage = upload.single("image");

// --------------------------------------------signTokenfun------------------------------------------------------------------//

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET_KEY, {
    expiresIn: "2h",
  });
};

//------------------------------------------------- Protected middleware----------------------------------------------------//

const protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(
      new AppError("You are not logged in ! Please log in to get access.", 401)
    );
  }

  // 2) Verification token
  //  promisify() function that converts callback-based functions to promise-based functions.
  // This lets you use promise chaining and async/await with callback-based APIs.
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET_KEY
  );

  // 3) Check it user still exists
  const currentUser = await User.findByPk(decoded.id);
  if (!currentUser) {
    return next("The user belonging to this token does no longer exist.", 401);
  }
  // GRANT ACCESS TO PROTECTED ROUTES
  req.user = currentUser;
  next();
});

// ----------------------------------------------Signup----------------------------------------------------------------------//

const userSignup = catchAsync(async (req, res) => {
  try {
    // if (!req.file.mimetype.startsWith("image")) {
    //   res.status(400).json({
    //     status: "fail",
    //     message: "Not an image! Please upload only images",
    //   });
    // } else {
    // iamge is database field name
    if (req.file) req.body.image = req.file.filename;
    req.body.password = await bcrypt.hash(req.body.password, 12);

    const newUser = await User.create(req.body);
    newUser.password = undefined;
    res.status(201).json({
      status: "success",
      data: {
        user: newUser,
      },
    });
    // }
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error,
    });
  }
});

// ----------------------------------------------Login----------------------------------------------------------------------//

const userLogin = catchAsync(async (req, res, next) => {
  const { email, password, phone } = req.body;

  console.log(req.body);

  // 1) Check if email and password are exist
  if (!email && !password && !phone) {
    return next(new AppError("Please provide email,phone and password ", 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email: email, phone: phone });

  console.log(user);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError("Incorrect email or phone or password"), 401);
  }

  user.password = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;

  const token = signToken(user.id);

  res.status(200).json({
    status: "success",
    token: token,
    data: {
      user: user,
    },
  });
});

// ----------------------------------------------------------Change Password--------------------------------------------------//

const changePassword = catchAsync(async (req, res, next) => {
  const user = await User.findByPk(req.user.id);

  const password = user.password;
  const current_password = req.body.currentPassword;

  if (!(await bcrypt.compare(current_password, password))) {
    return next(new AppError("Current Password is incorrect"), 401);
  }

  user.password = await bcrypt.hash(req.body.newPassword, 12);

  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;

  await user.save();

  const token = signToken(user.id);

  res.status(200).json({
    status: "success",
    token: token,
    data: {
      user: user,
    },
  });
});

// --------------------------------------------------------------forgotPassword------------------------------------------------//

const forgotPassword = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    email: req.body.email,
  });
  if (!user) {
    return next(new AppError("This is no user with this email address", 404));
  }
  const resetToken = user.createResetToken();
  await user.save();

  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/user/resetPassword/${resetToken}`;

  const message = `Forgot your password?Submit a PATCH request with your new password and passwordConfirm to:${resetURL}`;
  try {
    await SendEmail({
      email: user.email,
      subject: "Your Password reset token (valid for 10 min only)",
      message,
    });
    res.status(200).json({
      status: "success",
      message: "token send sucessfully via email",
    });
  } catch (error) {
    // it will not display in response
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();
    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

// ---------------------------------------------------------Reset Password--------------------------------------------------//

const resetPassword = catchAsync(async (req, res, next) => {
  const hashToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new AppError("Token is invalid or expired", 400));
  }
  user.password = await bcrypt.hash(req.body.password, 12);
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  res.status(200).json({
    status: "success",
    message: "Password reset sucessfully",
  });
});

// ---------------------------------------send otp --------------------------------------------------------------//

const sendOTP = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    phone: req.body.phone,
  });

  if (!user) {
    return next(new AppError("This User is not exists", 404));
  }
  const otp = Math.floor(Math.random() * 1000000 + 1);

  const message = `Forgot your password? Otp is ${otp}. Please enter password and confirm password :${otp}`;
  try {
    await sendOtp(user.phone, message);
    res.status(200).json({
      status: "success",
      message: "Otp send sucessfully via phone",
    });

    user.otp = otp;

    await user.save();
  } catch (error) {
    // it will not display in response
    user.otp = undefined;
    await user.save({ validateBeforeSave: false });
    return next(
      AppError("There was an error sending the otp. Try again later!", 500)
    );
  }
});

// ---------------------------------------------Verify otp-----------------------------------------------//

const verifyOTP = catchAsync(async (req, res, next) => {
  const { phone, otp, password, passwordConfirm } = req.body;

  const user = await User.findOne({
    phone: phone,
  });

  if (!user) {
    return next(new AppError("This User is not exists", 404));
  }

  if (otp != user.otp) {
    return next(new AppError("otp does not match", 404));
  }

  user.password = await bcrypt.hash(password, 12);
  user.passwordConfirm = passwordConfirm;
  user.otp = undefined;

  await user.save();

  res.status(200).json({
    status: "success",
    message: "password updated successfully",
  });
});

module.exports = {
  protect,
  userSignup,
  uploadImage,
  userLogin,
  changePassword,
  resetPassword,
  forgotPassword,
  sendOTP,
  verifyOTP,
};
