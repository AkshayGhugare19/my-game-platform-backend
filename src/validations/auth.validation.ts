import Joi from "joi";

export const registerSchema = Joi.object({
  first_name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "First name is required",
    "any.required": "First name is required",
  }),
  last_name: Joi.string().min(2).max(100).required().messages({
    "string.empty": "Last name is required",
    "any.required": "Last name is required",
  }),
  email: Joi.string().email().lowercase().required().messages({
    "string.email": "Please enter a valid email",
    "any.required": "Email is required",
  }),
  mobile: Joi.string()
    .pattern(/^[0-9]{10,15}$/)
    .required()
    .messages({
      "string.pattern.base": "Mobile must be 10–15 digits",
      "any.required": "Mobile is required",
    }),
  password: Joi.string().min(6).max(100).required().messages({
    "string.min": "Password must be at least 6 characters",
    "any.required": "Password is required",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  password: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().required(),
  token: Joi.string().optional().allow(null, ""),
  new_password: Joi.string().min(6).max(100).required(),
});
