const mongoose = require("mongoose");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      trim: true, // trim the spaces before and after the fullname
      required: true,
      max: 12,
      unique: true,
      index: true, // creating index
      lowercase: true,
    },
    firstname: {
      type: String,
      trim: true,
      required: true,
      max: 30,
    },
    lastname: {
      type: String,
      trim: true,
      required: true,
      max: 30,
    },

    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },
    bio: {
      type: String,
      default: "",
    },
    // base64 images
    bannerimg: {
      type: String,
      default: "",
    },
    // base 64 images
    profileimg: {
      type: String,
      default: "",
    },
    hashed_password: {
      type: String,
      required: true,
    },
    salt: String, // salt is the strength of the password
    resetPasswordLink: {
      data: String,
      default: "",
    },
    facebookAuth: {
      type: Boolean,
      required: true,
    },
    googleAuth: {
      type: Boolean,
      required: true,
    },
    hobbies: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
); // will automatically get **createdAt & updatedAt** fields in the db

// virtual fields
// We get some data from the FrontEnd we perform some Operations On It & Save it in the data or check with the database

userSchema
  .virtual("password")
  .set(function (password) {
    // temporary
    this._password = password;

    // generate salt

    this.salt = this.makeSalt();

    // encrypt password

    this.hashed_password = this.encryptPassword(password);
  })
  .get(function () {
    return this._password;
  });

// methods > authenticate, encryptPassword, makeSalt

userSchema.methods = {
  authenticate: function (plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  },

  encryptPassword: function (password) {
    if (!password) return "";

    try {
      return crypto
        .createHmac("sha1", this.salt)
        .update(password)
        .digest("hex");
    } catch (err) {
      return "";
    }
  },

  makeSalt: function () {
    return Math.round(new Date().valueOf() * Math.random()) + "";
  },
};

module.exports = mongoose.model("User", userSchema);
