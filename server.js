const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

mongoose
  .connect(process.env.DATABASE_cLOUD, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log("DB Connected"))
  .catch((err) => console.log(err));

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");

// app middlewares
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb", type: "application/json" }));
app.use(cors({ origin: process.env.CLIENT_URL }));

// api middlewares
app.use("/api", authRoutes);
app.use("/api", userRoutes);

const port = process.env.PORT;

app.listen(port, () => {
  console.log("Api running on port anonymous");
});
