const User = require("../models/user");
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken"); // used for signing, verifying & decoding
// express-jwt is used to check the validity of *token from headers* by performing series of validations & the decoded info will be available to us in *req.user* by default
const {
  registerEmailParams,
  forgotPasswordEmailParams,
} = require("../helpers/email");
const { default: ShortUniqueId } = require("short-unique-id");
const uid = new ShortUniqueId();
const expressJWT = require("express-jwt");
const _ = require("lodash");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const ses = new AWS.SES({ apiVersion: "2010-12-01" });

exports.register = (req, res) => {
  const { firstname, lastname, username, email, password } = req.body;

  // check if user exists in the db

  User.findOne({ email: email }).exec((err, user) => {
    if (user) {
      return res.status(400).json({
        error: "User with that email already exists !",
      });
    }

    User.findOne({ username: username }).exec((err, user) => {
      if (user) {
        return res.status(400).json({
          error: "Username is already taken !",
        });
      }

      // Generate JWT with firstname, username, lastname, email, password

      const token = jwt.sign(
        { firstname, username, lastname, email, password },
        process.env.JWT_ACCOUNT_ACTIVATION, // secret key while creating account
        {
          expiresIn: "10m", // acccount should be activated in 10 mins before token expires
        }
      );

      // CREATE A TEMPLATE FOR THE EMAIL
      const params = registerEmailParams(email, token);

      // SEND THE EMAIL
      const sendEmailOnRegister = ses.sendEmail(params).promise();

      sendEmailOnRegister
        .then((data) => {
          // console.log("email submitted fo SES", data);
          res.status(200).json({
            message: `Email has been sent to ${email}, Click on the link in the email to complete your registration`,
          });
        })
        .catch((error) => {
          console.log("SES email error on register", error);
          res.status(406).json({
            error: `Cannot Verify Your Email plz try again`,
          });
        });
      // SEND EMAIL END
    });
  });
};

exports.registerActivate = (req, res) => {
  const { token } = req.body;

  jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, (err, decodedInfo) => {
    if (err) {
      return res.status(401).json({ error: "Token has expired, Try again !" });
    }
    // console.log("decoded info", decodedInfo);

    const { firstname, lastname, username, email, password } = decodedInfo;

    const newUser = new User({
      firstname,
      lastname,
      username,
      email,
      password,
    }); // already checked in above function if mail is taken
    newUser.save((err, user) => {
      if (err) {
        return res.status(401).json({
          error: "Error saving user as user already exists. Try again !",
        });
      }

      return res.status(201).json({
        message: "Registered successfully. Please Login",
      });
    });
  });
};

exports.login = async (req, res) => {
  // destructuring *email* and naming it *rEmail*
  const { email, password } = req.body;

  // User.findOne({email: email}).exec((err, user)=>{/* All the stuff */})//Promise way

  const user = await User.findOne({ email });
  console.log(user);
  // user is null if not present & !null -> true
  if (!user) {
    return res.status(400).json({
      error: "User with that email does not exist. Please register",
    });
  }

  // authenticate method of User Schema
  if (!user.authenticate(password)) {
    return res.status(400).json({
      error: "Email and password do not match",
    });
  }

  // generate token and send to client
  const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
    // as the payload is *id only* when the token decoded by *express-jwt* , *id* will be available to us as *req.user.id*
    expiresIn: "7d", // expire after 7 days
  });

  const {
    _id,
    firstname,
    lastname,
    username,
    email: rEmail,
    bio,
    social_media_links,
  } = user;

  return res.status(200).json({
    token,
    user: {
      _id,
      firstname,
      lastname,
      username,
      email: rEmail,
      bio,
      social_media_links,
    },
  });
};

// looks for token in the headers & decodes and adds the decodedInfo(payload passed during signing in) in *req.user*
exports.requireSignIn = expressJWT({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
}); // gives -> req.user._id

// we can Create our middlewares directory and add this there
exports.authMiddleware = (req, res, next) => {
  const authUserId = req.user._id;
  User.findOne({ _id: authUserId }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    req.profile = user; // adding in the request
    next();
  });
};

exports.adminMiddleware = (req, res, next) => {
  const adminUserId = req.user._id;
  User.findOne({ _id: adminUserId }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User not found",
      });
    }

    if (user.role !== "admin") {
      return res.status(400).json({ error: "Admin resource. Access Denied" });
    }

    req.profile = user; // adding in the request
    next();
  });
};

exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  // check if user exists in the db
  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: "User with that email doesn't exist",
      });
    }

    // generate the token
    const token = jwt.sign(
      { name: user.name },
      process.env.JWT_RESET_PASSWORD,
      { expiresIn: "10m" }
    );

    // CREATE A TEMPLATE FOR THE EMAIL
    const params = forgotPasswordEmailParams(email, token);

    // save the resetPasswordLink in the db
    return user.updateOne({ resetPasswordLink: token }, (err, success) => {
      if (err) {
        return res.status(400).json({
          error: "Password Reset failed Try again",
        });
      }

      // SEND THE EMAIL
      const sendResetEmail = ses.sendEmail(params).promise();

      sendResetEmail
        .then((data) => {
          console.log("email submitted fo SES", data);
          res.json({
            message: `Email has been sent to ${email}, Click on the link in the email to reset your password`,
          });
        })
        .catch((error) => {
          console.log("SES email error on reset password", error);
          res.status(406).json({
            error: `Cannot Verify Your Email plz try again`,
          });
        });
    });
  });
};

exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  if (resetPasswordLink) {
    // check expiry
    jwt.verify(
      resetPasswordLink,
      process.env.JWT_RESET_PASSWORD,
      (err, success) => {
        if (err) {
          return res.status(400).json({
            error: "Expired link try again",
          });
        }

        User.findOne({ resetPasswordLink }).exec((err, user) => {
          if (err || !user) {
            return res.status(400).json({
              error: "Invalid link try again",
            });
          }

          const updatedFields = {
            password: newPassword,
            resetPasswordLink: "",
          };

          // extend or merge with the existing user object

          user = _.extend(user, updatedFields);

          user.save((err, result) => {
            if (err) {
              return res.status(400).json({
                error: "Password reset failed, try again",
              });
            }

            return res.json({
              message: "Great login with your new password",
            });
          });
        });
      }
    );
  }
};
