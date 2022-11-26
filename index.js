const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
/* const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY); */

const app = express();

// middleware
app.use(cors());
app.use(express.json());

/* -------------JWT Decode------------  */
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log("token inside verifyJWT", req.headers.authorization);
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
console.log(token);
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden Access" });
    }
    req.decoded = decoded;
    next();
  });
}

/* ----------Database Connection---------- */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.j8jry5z.mongodb.net/?retryWrites=true&w=majority`;

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
    const bookedItemsCollection = client.db("yourmoto").collection("booked-items");

    /* -----------Verify Admin---------- */
    // const verifyAdmin = async (req, res, next) => {
    //   const decodedEmail = req.decoded.email;
    //   const query = { email: decodedEmail };
    //   const user = await usersCollection.findOne(query);
    //   if (user?.role !== "admin") {
    //     return res.status(403).send({ message: "forbidden access" });
    //   }
    //   console.log('admin true')
    //   next();
    // };
    /* -----------Verify Seller---------- */
    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      console.log(decodedEmail);
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      console.log('seller true')
      next();
    };

    /* --------- JWT ------ */
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body
      const filter = {email: email}
      const options = { upsert: true }
      const updateDoc = {
        $set: user,
      }
      const result = await usersCollection.updateOne(filter, updateDoc, options)
        const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
          expiresIn: "5h",})
          res.send({ result, token });
    });

  

    /* ---------Categories------- */
    app.get("/categories",verifyJWT, verifySeller,  async (req, res) => {
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


    /* -------------Booked Items-------------- */
    app.post("/booked-items", async(req, res) => {
      const bookedItem = req.body;
      const result = await bookedItemsCollection.insertOne(bookedItem);
      res.send(result);
    })
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
