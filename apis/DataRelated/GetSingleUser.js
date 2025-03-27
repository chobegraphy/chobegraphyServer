const express = require("express");
const axios = require("axios");
const cors = require("cors");
const jwt = require("jsonwebtoken"); // Import JWT
require("dotenv").config();

const GetSingleUser = express.Router();
GetSingleUser.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const REPO = "ChobegraphyUser";
const FILE_PATH = "UserData.json";
const JWT_SECRET = process.env.DB_KEY || "your_secret_key"; // Secret key for signing JWT

// GET single user
GetSingleUser.get("/get-single-user", async (req, res) => {
  const email = req.query.email;
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

module.exports = GetSingleUser;
