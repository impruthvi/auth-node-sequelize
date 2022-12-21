const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

// Express App
const app = express();

// Database
const sequelize = require("./database/database");

// Import the Table
require("./models/userModel");

//Parse Body Content Coming From Every Requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Local Imports
const userRoutes = require("./routes/userRoute");

// Route for app
app.use("/user", userRoutes);

app.use((err, req, res, next) => {
  if (err) {
    err.statusCode = err.statusCode || 500;
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }
});
const port = process.env.PORT || 3000;

sequelize
  .sync()
  .then((result) => {
    app.listen(port, () => {
      console.log(`App is listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });

module.exports = app;
