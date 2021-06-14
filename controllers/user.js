const User = require("../models/user");
const AWS = require("aws-sdk");
const jwt = require("jsonwebtoken");

exports.getProfile = (req, res) => {
  req.profile.hashed_password = undefined; // undefined value's property *Only* is not returned by res.json
  // null & false will be returned
  req.profile.salt = undefined;

  return res.status(200).json({ user: req.profile });
};

exports.updateProfile = (req, res) => {
  const { firstname, lastname, username, bio, hobbies, profileimg, bannerimg } =
    req.body;

  User.findOneAndUpdate(
    { _id: req.user._id },
    { firstname, lastname, username, bio, hobbies, profileimg, bannerimg },
    { new: true }
  ).exec((err, updatedUser) => {
    if (err) {
      return res.status(400).json({ error: "Could not find user to update" });
    }
    updatedUser.hashed_password = undefined;
    updatedUser.salt = undefined;

    res
      .status(200)
      .json({ user: updatedUser, message: "Sucessfully updated user profile" });
  });
};

exports.deleteProfile = (req, res) => {
  User.findOneAndRemove({ _id: req.user._id }, (err, user) => {
    if (err) {
      return res.status(400).json({ error: "Could not find user" });
    }

    return res
      .status(200)
      .json({ message: "Deleted the profile successfully" });
  });
};
