const { Joi } = require("express-validation");

const addPostValidation = {
  body: Joi.object({
    title: Joi.string().required().label("Title required"),
    description: Joi.string().required().label("Description required"),
  }),
};

const updatePostValidation = {
  body: Joi.object({
    title: Joi.string().required().label("Title required"),
    description: Joi.string().required().label("Description required"),
  }),
};

module.exports = {
  addPostValidation,
  updatePostValidation
};
