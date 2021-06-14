const User = require("../models/user");
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken"); // used for signing, verifying & decoding
// express-jwt is used to check the validity of *token from headers* by performing series of validations & the decoded info will be available to us in *req.user* by default
const { registerEmailParams } = require("../helpers/email");
const { default: ShortUniqueId } = require("short-unique-id");
const uuid = new ShortUniqueId();
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
          // console.log("SES email error on register", error);
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
      facebookAuth: false,
      googleAuth: false,
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

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({
      error: "User with that email does not exist. Please register",
    });
  }

  // so users won't take advantage of process.env.PASSWORD_OF_NO_USE
  if (user) {
    if (user.facebookAuth === true) {
      return res.status(403).json({
        error: "Please Log In Using Facebook !",
      });
    }
    if (user.googleAuth === true) {
      return res.status(403).json({
        error: "Please Sign In Using Google !",
      });
    }
  }

  // authenticate method of User Schema
  if (!user.authenticate(password)) {
    return res.status(400).json({
      error: "Invalid Credentials !",
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
    hobbies,
    bannerimg,
    profileimg,
    facebookAuth,
    googleAuth,
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
      hobbies,
      bannerimg,
      profileimg,
      facebookAuth,
      googleAuth,
    },
  });
};

// looks for token in the headers & decodes and adds the decodedInfo(payload passed during signing in) in *req.user*
exports.requireSignIn = expressJWT({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
}); // gives -> req.user._id

exports.authMiddleware = (req, res, next) => {
  const authUserId = req.user._id;
  console.log(req.user);
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

exports.signinFacebook = async (req, res) => {
  const { email, name, image_url } = req.body;

  const user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({
      error: "User with that email already exists !",
    });
  }

  let names = name.split(" ");
  let firstname = names[0];
  let lastname = names[1];
  let username = firstname + "_" + lastname + "_" + uuid();
  // this password is of no use while authenticating as authentication will be done by fb giving us the data
  let password = process.env.PASSWORD_OF_NO_USE;
  const newUser = new User({
    firstname,
    lastname,
    username,
    email,
    password,
    profileimg: image_url,
    facebookAuth: true,
    googleAuth: false,
  }); // already checked in above function if mail is taken
  newUser.save((err, user) => {
    if (err) {
      return res.status(401).json({
        error: "Error saving user as user already exists. Try again !",
      });
    }

    // success
    // generate token and send to client
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d", // expire after 7 days
    });

    const {
      _id,
      firstname,
      lastname,
      username,
      email,
      bio,
      hobbies,
      bannerimg,
      profileimg,
      facebookAuth,
      googleAuth,
    } = user;

    return res.status(200).json({
      token,
      user: {
        _id,
        firstname,
        lastname,
        username,
        email,
        bio,
        hobbies,
        bannerimg,
        profileimg,
        facebookAuth,
        googleAuth,
      },
    });
  });
};

exports.refreshSignInFacebook = async (req, res) => {
  const { email, name, image_url, _id } = req.body;

  const usr = User.findOne({ _id });

  if (usr.email !== email) {
    return res.status(400).json({
      error: "Impersonating other users is forbidden !",
    });
  }

  const user = await User.findOne({ email });
  if (user) {
    return res.status(400).json({
      error: "User with that email already exists !",
    });
  }

  let names = name.split(" ");
  let firstname = names[0];
  let lastname = names[1];
  let username = firstname + "_" + lastname + "_" + uuid();
  // this password is of no use while authenticating as authentication will be done by fb giving us the data
  let password = process.env.PASSWORD_OF_NO_USE;
  const newUser = new User({
    firstname,
    lastname,
    username,
    email,
    password,
    profileimg: image_url,
    facebookAuth: true,
    googleAuth: false,
  }); // already checked in above function if mail is taken
  newUser.save((err, user) => {
    if (err) {
      return res.status(401).json({
        error: "Error saving user as user already exists. Try again !",
      });
    }

    // success
    // generate token and send to client
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d", // expire after 7 days
    });

    const {
      _id,
      firstname,
      lastname,
      username,
      email,
      bio,
      hobbies,
      bannerimg,
      profileimg,
      facebookAuth,
      googleAuth,
    } = user;

    return res.status(200).json({
      token,
      user: {
        _id,
        firstname,
        lastname,
        username,
        email,
        bio,
        hobbies,
        bannerimg,
        profileimg,
        facebookAuth,
        googleAuth,
      },
    });
  });
};
