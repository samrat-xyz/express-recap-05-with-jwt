const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const uri = process.env.DB_URI;

const port = process.env.PORT;

app.use(express.json());
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const verifyToken = (req, res, next) => {
  try {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: "no token" });
    }

    const decodedData = jwt.verify(token, process.env.SECRET_KEY);
    if (!decodedData) {
      return res.status(400).json({ message: "Unvalid token" });
    }

    req.user = decodedData;
    next();
  } catch (err) {
    return res.status(400).json({ message: "unauthorize user" });
  }
};

app.get("/", (req, res) => {
  res.send("Hello World!");
});
async function run() {
  try {
    await client.connect();

    const db = client.db("jwt-recap");
    const usersCollections = db.collection("users");

    app.post("/register", async (req, res) => {
      const { name, email, password } = req.body;

      const existingUser = await usersCollections.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          message: "User Already Exist!",
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await usersCollections.insertOne({
        email,
        name,
        password: hashedPassword,
      });
      res.status(201).json({
        message: "User Created Successfully",
        result,
      });
    });
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      try {
        const user = await usersCollections.findOne({ email });
        const isMatchedPassword = await bcrypt.compare(password, user.password);
        if (!isMatchedPassword) {
          res.status(400).json({
            message: "invalid password",
          });
        }
        const token = jwt.sign(
          {
            email: user.email,
            _id: user._id,
          },
          process.env.SECRET_KEY,
          { expiresIn: "1h" }
        );

        res.status(200).json({
          message: "Logged in successfull",
          token,
        });
      } catch (err) {
        return res.status(400).json({
          message: "Loggin failed",
        });
      }
    });

    app.get("/me", verifyToken, async (req, res) => {
      try {
        const user = await usersCollections.findOne(
          { _id: new ObjectId(req.user._id) },
          { projection: { password: 0 } }
        );

        res.status(200).json(user);
      } catch (err) {
        return res.status(400).json({ message: "unauthorize user" });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
app.listen(port, () => {
  console.log(`server running on port : ${port}`);
});
