const express = require("express");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken"); // Import JWT
require("dotenv").config();

const UserDataRouter = express.Router();
UserDataRouter.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const REPO = "ChobegraphyUser";
const FILE_PATH = "UserData.json";
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key"; // Secret key for signing JWT

// Function to generate a MongoDB-like 24-character hex ID
const generateMongoLikeId = () => {
  return [...Array(24)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
};

// Function to generate a JWT token
const generateToken = (user) => {
  return jwt.sign({ email: user.email, id: user._id }, JWT_SECRET, {
    expiresIn: "7d", // Token expires in 7 days
  });
};

// Middleware to verify JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from headers
  if (!token)
    return res.status(401).json({ error: "Unauthorized - No token provided" });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = decoded; // Store decoded user info in request
    next();
  });
};

// POST route to add user data and return a JWT token
UserDataRouter.post("/add-user", async (req, res) => {
  const newUser = req.body;
  console.log(newUser);
  try {
    // Fetch existing users
    const getFileResponse = await axios.get(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    const fileContent = Buffer.from(
      getFileResponse.data.content,
      "base64"
    ).toString("utf8");
    const userData = JSON.parse(fileContent);

    // Check if user already exists
    const existingUser = userData.find((user) => user.email === newUser.email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Assign a MongoDB-like ID
    newUser._id = generateMongoLikeId();

    // Add new user
    userData.unshift(newUser);

    // Convert updated data to base64
    const updatedContent = Buffer.from(
      JSON.stringify(userData, null, 2)
    ).toString("base64");

    // Commit changes to GitHub
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        message: "Added new user to UserData.json",
        content: updatedContent,
        sha: getFileResponse.data.sha,
      },
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    // Generate JWT token
    const token = generateToken(newUser);

    res.status(200).json({
      message: "User added successfully",
      data: newUser,
      token, // Send JWT token to frontend
    });
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to update user data" });
  }
});

// GET route to fetch all users (protected route)
UserDataRouter.get("/get-users", verifyToken, async (req, res) => {
  try {
    const getFileResponse = await axios.get(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    const fileContent = Buffer.from(
      getFileResponse.data.content,
      "base64"
    ).toString("utf8");
    const userData = JSON.parse(fileContent);

    res.status(200).json(userData);
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

// get single user
UserDataRouter.get("/get-user", verifyToken, async (req, res) => {
  const email = req.query.email; // Get email from query params
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const getFileResponse = await axios.get(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    const fileContent = Buffer.from(
      getFileResponse.data.content,
      "base64"
    ).toString("utf8");
    const userData = JSON.parse(fileContent);

    const user = userData.find((u) => u.email === email);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Failed to fetch user data" });
  }
});

module.exports = UserDataRouter;
