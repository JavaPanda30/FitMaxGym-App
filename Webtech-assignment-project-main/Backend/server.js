const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

app.use(
  session({
    secret: "abab",
    resave: false,
    saveUninitialized: false,
  })
);

mongoose.connect("mongodb://localhost:27017/mygym", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const querySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  query: { type: String, required: true },
});

const Query = mongoose.model("Query", querySchema);

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

const PlanSchema = new mongoose.Schema({
  email: { type: String, required: true },
  plan: { type: String, required: true },
});

const Plan = mongoose.model("Plan", PlanSchema);

app.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide username, email, and password" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    const newUser = await User.create({ username, email, password });
    res
      .status(201)
      .json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.password !== password) {
      return res.status(401).json({ message: "Incorrect password" });
    }
    res.status(200).json({ message: "Login successful", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add/Edit User Profile API endpoint
app.put("/profile/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    const { username, email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(updatedUser);
  } catch (error) {
    if (
      error.code === 11000 &&
      error.keyPattern &&
      error.keyPattern.email === 1
    ) {
      console.error("Email already exists in the database.");
      return res.status(409).json({ alreadyExists: true });
    } else {
      console.error("An error occurred:", error);
      return res.status(500).json({ error: "An internal server error occurred" });
    }
  }
});


app.get("/plan/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const plan = await Plan.findOne({ email });
    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }
    res.json(plan);
  } catch (error) {
    console.error("Error fetching plan:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/profile/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// route to submit a query
app.post("/submitQuery", async (req, res) => {
  const { name, email, query } = req.body;
  try {
    const existingQuery = await Query.findOne({ email });
    if (existingQuery) {
      return res
        .status(400)
        .json({ message: "Query with this email already exists" });
    }
    const newQuery = await Query.create({ name, email, query });
    res
      .status(201)
      .json({ message: "Query submitted successfully", query: newQuery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/queries/:queryId", async (req, res) => {
  const queryId = req.params.queryId;
  try {
    const deletedQuery = await Query.findByIdAndDelete(queryId);
    if (!deletedQuery) {
      return res.status(404).json({ message: "Query not found" });
    }
    res
      .status(200)
      .json({ message: "Query deleted successfully", deletedQuery });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/queries", async (req, res) => {
  try {
    const queries = await Query.find();
    res.status(200).json(queries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/checkEmail/:email", async (req, res) => {
  const email = req.params.email;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(200).json({ ok: true });
  } else {
    res.status(200).json({ ok: false });
  }
});

// Route to add a plan
app.post("/addPlan", async (req, res) => {
  const { name, email, plan } = req.body;
  try {
    const existingCustomer = await Plan.findOne({ email });
    if (!existingCustomer) {
      // If customer doesn't exist, create a new customer with the plan
      const newCustomer = await Plan.create({ name, email, plan });
      return res.status(201).json({
        message: "Plan created successfully with plan",
        customer: newCustomer,
      });
    } else {
      // If customer already exists, update the plan
      existingCustomer.plan = plan;
      await existingCustomer.save();
      return res.status(200).json({
        message:
          "Plan updated successfully for existing customer!! You Will be charged accordingly",
        customer: existingCustomer,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
