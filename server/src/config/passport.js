import { ExtractJwt } from "passport-jwt";
import passportJWT from "passport-jwt";
import dotenv from "dotenv";
import passport from "passport";

import User from "../models/User.js";
const JWTStrategy = passportJWT.Strategy;
dotenv.config();

passport.use(
  new JWTStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || "mysecretkey",
    },
    function (jwtPayload, done) {
      return User
        .findOne({ _id: jwtPayload.id })
        .then((user) => {
          return done(null, user);
        })
        .catch((err) => {
          return done(err);
        });
    }
  )
);
