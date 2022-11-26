const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
/* const jwt = require("jsonwebtoken"); */
require("dotenv").config();
/* const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); */

const app = express();

// middleware
app.use(cors());
app.use(express.json());

/* -------------JWT Decode------------  */
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    console.log(decoded);
    req.decoded = decoded;
    next();
  });
}

/* ----------Database Connection---------- */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.j8jry5z.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri);

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const categoriesCollection = client.db("yourmoto").collection("categories");
    const usersCollection = client.db("yourmoto").collection("users");
    const productsCollection = client.db("yourmoto").collection("products");

    /* -----------Verify Admin---------- */
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      console.log(user);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    /* --------- JWT ------ */
    app.put("/jwt", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "5h",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });


    /* ---------Categories------- */
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    /* ----------User Information---------- */
    app.post("/users", async (req, res) => {
      const user = req.body;
      //   console.log(user);
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });
    /* -----------Single User---------- */
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    /* ------------Add Product to Database----------- */
    app.post("/products", async (req, res) => {
      const product = req.body;
      console.log(product);
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });
    /* --------------Get Product by CategoryName------------- */
    app.get("/categories/:categoryName", async (req, res) => {
      const categoryName = req.params.categoryName;
      const query = { bike_type: categoryName };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    // app.get('/add', async(req,res) => {
    //     const filter = {};
    //     const options = {upsert: true};
    //     const updatedDoc = {
    //       $set: {
    //         years_of_use: 2,
    //       },
    //     };
    //     const result =await productsCollection.updateMany(filter, updatedDoc, options)
    //     res.send(result);

    //   })
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Your Moto Server is Running");
});

app.listen(port, () => console.log(`Your Moto Server is Running on ${port}`));
