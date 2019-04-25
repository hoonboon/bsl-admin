import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import bodyParser from "body-parser";
import helmet from "helmet";
import lusca from "lusca";
import dotenv from "dotenv";
import connect from "connect-mongodb-session";
import flash from "express-flash";
import path from "path";
import mongoose from "mongoose";
import passport from "passport";
import expressValidator from "express-validator";

const MongoDbStore = connect(session);

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env" });

import { Logger } from "./util/logger";
import { MONGODB_URI, SESSION_SECRET } from "./util/secrets";

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as userController from "./controllers/user";
import * as adminJobController from "./controllers/adminJob";
import * as recruiterController from "./controllers/recruiter";
import * as creditAccountController from "./controllers/creditAccount";
import * as offlineJobController from "./controllers/offlineJob";

// API keys and Passport configuration
import * as passportConfig from "./config/passport";

// Role Based Access Control configuration
import * as rbacConfig from "./config/accessControl";

const logger = new Logger("app");

// Create Express server
const app = express();

app.locals.fbAppId = process.env.FACEBOOK_APP_ID || "";

// Connect to MongoDB
const mongoUrl = MONGODB_URI;

const mongoConnectOpts = {
  useNewUrlParser: true,
  useCreateIndex: true,
  autoReconnect: true,
  poolSize: 20,
};

mongoose.connect(mongoUrl, mongoConnectOpts).then(
  () => {
    /** ready to use. The `mongoose.connect()` promise resolves to undefined. */
    logger.info("MongoDB connected.");
  },
).catch(err => {
  logger.error("MongoDB connection error. Please make sure MongoDB is running. " + err);
  // process.exit();
});

 // Session store
const sessionStore = new MongoDbStore({
  uri: mongoUrl,
  collection: "sessions",
  connectionOptions: mongoConnectOpts
});


// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: SESSION_SECRET,
  store: sessionStore,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(helmet());
app.use(helmet.noCache());
app.use(lusca.csrf());
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
    req.path !== "/login" &&
    req.path !== "/signup" &&
    !req.path.match(/^\/auth/) &&
    !req.path.match(/\./)) {
    req.session.returnTo = req.path;
  } else if (req.user &&
    req.path == "/account") {
    req.session.returnTo = req.path;
  }
  next();
});

app.use(
  express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 */
app.get("/", homeController.index);
app.get("/login", userController.getLogin);
app.post("/login", userController.postLogin);
app.get("/logout", userController.logout);
app.get("/forgot", userController.getForgot);
app.post("/forgot", userController.postForgot);
app.get("/reset/:token", userController.getReset);
app.post("/reset/:token", userController.postReset);

// ** open for local development use only ***
app.get("/signup", passportConfig.isAuthenticated, rbacConfig.hasAccess("user:signup"), userController.getSignup);
app.post("/signup", passportConfig.isAuthenticated, rbacConfig.hasAccess("user:signup"), userController.postSignup);


// app.get("/contact", contactController.getContact);
// app.post("/contact", contactController.postContact);

app.get("/account", passportConfig.isAuthenticated, userController.getAccount);
app.post("/account/profile", passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post("/account/password", passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post("/account/delete", passportConfig.isAuthenticated, userController.postDeleteAccount);
app.get("/account/unlink/:provider", passportConfig.isAuthenticated, userController.getOauthUnlink);

// Admin Job module
app.get("/adminJobs", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.getJobs);
app.get("/adminJob/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.getJobCreate);
app.post("/adminJob/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.postJobCreate);
app.get("/adminJob/embedFbPost", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.getJobEmbedFbPost);
app.post("/adminJob/embedFbPost", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.postJobEmbedFbPost);
app.get("/adminJob/:id", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.getJobDetail);
app.get("/adminJob/:id/update", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.getJobUpdate);
app.post("/adminJob/:id/update", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.postJobUpdate);
app.get("/adminJob/:id/updateFbPost", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.getJobUpdateFbPost);
app.post("/adminJob/:id/updateFbPost", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.postJobUpdateFbPost);
app.post("/adminJob/:id/delete", passportConfig.isAuthenticated, rbacConfig.hasAccess("adminJob:list"), adminJobController.postJobDelete);

// Recruiter modules
app.get("/recruiters", passportConfig.isAuthenticated, rbacConfig.hasAccess("recruiter:list"), recruiterController.getRecruiters);
app.get("/recruiter/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("recruiter:list"), recruiterController.getRecruiterCreate);
app.post("/recruiter/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("recruiter:list"), recruiterController.postRecruiterCreate);
app.get("/recruiter/:id", passportConfig.isAuthenticated, rbacConfig.hasAccess("recruiter:list"), recruiterController.getRecruiterDetail);
app.get("/recruiter/:id/update", passportConfig.isAuthenticated, rbacConfig.hasAccess("recruiter:list"), recruiterController.getRecruiterUpdate);
app.post("/recruiter/:id/update", passportConfig.isAuthenticated, rbacConfig.hasAccess("recruiter:list"), recruiterController.postRecruiterUpdate);
app.post("/recruiter/:id/terminate", passportConfig.isAuthenticated, rbacConfig.hasAccess("recruiter:list"), recruiterController.postRecruiterTerminate);

// Credit Account modules
app.get("/creditAccounts", passportConfig.isAuthenticated, rbacConfig.hasAccess("creditAccount:list"), creditAccountController.getCreditAccounts);
app.get("/creditAccount/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("creditAccount:list"), creditAccountController.getCreditAccountCreate);
app.post("/creditAccount/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("creditAccount:list"), creditAccountController.postCreditAccountCreate);
app.get("/creditAccount/:id", passportConfig.isAuthenticated, rbacConfig.hasAccess("creditAccount:list"), creditAccountController.getCreditAccountDetail);
app.get("/creditAccount/:id/addCredit", passportConfig.isAuthenticated, rbacConfig.hasAccess("creditAccount:list"), creditAccountController.getCreditAccountAddCredit);
app.post("/creditAccount/:id/addCredit", passportConfig.isAuthenticated, rbacConfig.hasAccess("creditAccount:list"), creditAccountController.postCreditAccountAddCredit);

// Offline Job modules
app.get("/offlineJobs", passportConfig.isAuthenticated, rbacConfig.hasAccess("offlineJob:list"), offlineJobController.getJobs);
app.get("/offlineJob/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("offlineJob:list"), offlineJobController.getJobCreate);
app.post("/offlineJob/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("offlineJob:list"), offlineJobController.postJobCreate);
app.get("/offlineJob/:id", passportConfig.isAuthenticated, rbacConfig.hasAccess("offlineJob:list"), offlineJobController.getJobDetail);
app.get("/offlineJob/:id/update", passportConfig.isAuthenticated, rbacConfig.hasAccess("offlineJob:list"), offlineJobController.getJobUpdate);
app.post("/offlineJob/:id/update", passportConfig.isAuthenticated, rbacConfig.hasAccess("offlineJob:list"), offlineJobController.postJobUpdate);
app.post("/offlineJob/:id/publish", passportConfig.isAuthenticated, rbacConfig.hasAccess("offlineJob:list"), offlineJobController.postJobPublish);
app.post("/offlineJob/:id/delete", passportConfig.isAuthenticated, rbacConfig.hasAccess("offlineJob:list"), offlineJobController.postJobDelete);

/**
 * API examples routes.
 */
// app.get("/api", apiController.getApi);
// app.get("/api/facebook", passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFacebook);

/**
 * OAuth authentication routes. (Sign in)
 */
// app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email", "public_profile"] }));
// app.get("/auth/facebook/callback", passport.authenticate("facebook", { failureRedirect: "/login" }), (req, res) => {
//   res.redirect(req.session.returnTo || "/");
// });
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err: any = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err: any, req: any, res: any, next: any) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export default app;