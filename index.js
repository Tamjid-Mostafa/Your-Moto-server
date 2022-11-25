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


    /* ------------Add Product to Database----------- */
    app.post("/products", async(req, res) => {
        const product = req.body;
        console.log(product);
        const result = await productsCollection.insertOne(product);
        res.send(result);
    })
    /* --------------Get Product by CategoryName------------- */
     app.get("/categories/:categoryName", async(req, res) => {
        const categoryName = req.params.categoryName;
        const query = {bike_type:categoryName}
        const result = await productsCollection.find(query).toArray();
        res.send(result);
    })
    
  } finally {
  }
}
run().catch(console.log);

app.get("/", async (req, res) => {
  res.send("Your Moto Server is Running");
});

app.listen(port, () => console.log(`Your Moto Server is Running on ${port}`));
