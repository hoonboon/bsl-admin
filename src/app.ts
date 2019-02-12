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
import { MONGODB_URI, SESSION_SECRET } from "./util/secrets";

const MongoDbStore = connect(session);

// Load environment variables from .env file, where API keys and passwords are configured
dotenv.config({ path: ".env.example" });

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as userController from "./controllers/user";
import * as jobController from "./controllers/job";
import * as recruiterController from "./controllers/recruiter";

// API keys and Passport configuration
import * as passportConfig from "./config/passport";

// Role Based Access Control configuration
import * as rbacConfig from "./config/accessControl";

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
    console.log("MongoDB connected.");
  },
).catch(err => {
  console.log("MongoDB connection error. Please make sure MongoDB is running. " + err);
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

// Job module
app.get("/jobs", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.getJobs);
app.get("/job/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.getJobCreate);
app.post("/job/create", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.postJobCreate);
app.get("/job/embedFbPost", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.getJobEmbedFbPost);
app.post("/job/embedFbPost", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.postJobEmbedFbPost);
app.get("/job/:id", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.getJobDetail);
app.get("/job/:id/update", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.getJobUpdate);
app.post("/job/:id/update", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.postJobUpdate);
app.get("/job/:id/updateFbPost", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.getJobUpdateFbPost);
app.post("/job/:id/updateFbPost", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.postJobUpdateFbPost);
app.post("/job/:id/delete", passportConfig.isAuthenticated, rbacConfig.hasAccess("admin_job:list"), jobController.postJobDelete);

// Recruiter modules
app.get("/recruiters", passportConfig.isAuthenticated, rbacConfig.hasAccess("recruiter:list"), recruiterController.getRecruiters);

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