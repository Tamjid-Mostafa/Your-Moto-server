const express = require("express");
const cors = require("cors");
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();

// middleware
app.use(cors());
app.use(express.json());

/* -------------JWT middleware------------  */
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "Unauthorized Access" });
  }
  const token = authHeader.split(" ")[1];
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
    const bookedItemsCollection = client
      .db("yourmoto")
      .collection("booked-items");

    /* -----------Verify Admin---------- */
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };
    /* -----------Verify Seller---------- */
    const verifySeller = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    /* --------- JWT ------ */
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "5h",
      });
      res.send({ result, token });
    });

    /* _____________________________GET___________________________________ */

    /* ---------Categories------- */
    app.get("/categories", async (req, res) => {
      const query = {};
      const result = await categoriesCollection.find(query).toArray();
      res.send(result);
    });

    /* -----------Single User (Get)---------- */
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });
    /* --------------Get Product by CategoryName (Get)---------- */
    app.get("/categories/:categoryName", async (req, res) => {
      const categoryName = req.params.categoryName;
      const query = { bike_type: categoryName };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    /* --------------Get My Products Email Query (Get)---------- */
    app.get("/myproducts",verifyJWT, verifySeller, async (req, res) => {
      const email = req.query.email;
      const query = { sellerEmail: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    /* --------------Get Buyer Booked Items Email Query (Get)---------- */
    app.get("/bookedItems", async (req, res) => {
      const email = req.query.email;
      const query = { user_email: email };
      const result = await bookedItemsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const user = await bookedItemsCollection.findOne(query);
      res.send(user);
    });
    /* _____________________________POST___________________________________ */

    /* ----------User Information---------- */
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    /* ------------Add Product to Database----------- */
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    /* -------------Booked Items-------------- */
    app.post("/booked-items", async (req, res) => {
      const bookedItem = req.body;
      const result = await bookedItemsCollection.insertOne(bookedItem);
      res.send(result);
    });

    /* ---------------Create Payment Intent----------- */
    app.post('/create-payment-intent', async(req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        currency: 'usd',
        amount: amount,
        "payment_method_types": [
          "card"
        ],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })


    /* __________________PUT_______________ */

    /* ---------------Make Item Advertise----------- */
    app.put("/myproduct/advertise/:id", verifyJWT, verifySeller, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const options = { upsert: true };
        const updatedDoc = {
          $set: {
            advertise: true,
          },
        };
        const result = await productsCollection.updateOne(
          filter,
          updatedDoc,
          options
        );
        console.log(result);
        res.send(result);
      });



      /* __________________DELETE_______________ */

      app.delete("/delete_product/:id", verifyJWT, verifySeller, async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const result = await productsCollection.deleteOne(filter);
        res.send(result);
      });
      app.delete("/deletebooked/:id", async (req, res) => {
        const id = req.params.id;
        const filter = { _id: ObjectId(id) };
        const result = await bookedItemsCollection.deleteOne(filter);
        res.send(result);
      });


    // app.get('/add', async(req,res) => {
    //     const filter = {};
    //     const options = {upsert: true};
    //     const updatedDoc = {
    //       $set: {
    //         advertise: false,
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
