import { NextFunction, Request, Response } from "express";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
require("dotenv").config();

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import User from "../models/user.model";
import path from "path";
import sendMail from "../utils/sendMail";

export interface IUserRegister {
  name: string;
  email: string;
  password: string;
  avatar?: string;
}

export const register = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;

      const isEmailExists = await User.findOne({ email });

      if (isEmailExists)
        return next(new ErrorHandler("Email already exists", 400));

      const user: IUserRegister = {
        name,
        email,
        password,
      };

      const activationToken = createActivationtoken(user);
      const activationCode = activationToken.activationCode;

      const data = { user: { name: user.name }, activationCode };

      const html = await ejs.renderFile(
        path.join(__dirname, "../mails/activation-mail.ejs"),
        data
      );

      try {
        // await sendMail({
        //   email: user.email,
        //   subject: "Activate your account",
        //   template: "activation-mail.ejs",
        //   data,
        // });

        // res.status(201).json({
        //   success: true,
        //   message: `Please check your email: ${user.email} to activate your account`,
        //   activationToken: activationToken.token,
        // });

        const user = await User.create({
          name,
          email,
          password,
        });

        res.status(201).json({ success: true });
      } catch (error) {
        return next(new ErrorHandler(error.message, 400));
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 400));
    }
  }
);

interface IActivationToken {
  token: string;
  activationCode: string;
}

export const createActivationtoken = (user: any): IActivationToken => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

  const token = jwt.sign(
    { user, activationCode },
    process.env.ACTIVATION_SECRET as Secret,
    { expiresIn: "5m" }
  );

  return { token, activationCode };
};
