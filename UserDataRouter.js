const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const UserDataRouter = express.Router();
UserDataRouter.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy"; // GitHub username
const REPO = "ChobegraphyUser"; // Private repository name
const FILE_PATH = "UserData.json"; // JSON file path in repo

// Function to generate a MongoDB-like 24-character hex ID
const generateMongoLikeId = () => {
  return [...Array(24)]
    .map(() => Math.floor(Math.random() * 16).toString(16))
    .join("");
};

// POST route to add user data
UserDataRouter.post("/add-user", async (req, res) => {
  const newUser = req.body;

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

    // Check if user with the same email already exists
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
        sha: getFileResponse.data.sha, // Required for updates
      },
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    res.status(200).json({ message: "User added successfully", data: newUser });
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to update user data" });
  }
});

// GET route to fetch all users
UserDataRouter.get("/get-users", async (req, res) => {
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

module.exports = UserDataRouter;
