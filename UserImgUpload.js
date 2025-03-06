const express = require("express");
const axios = require("axios");
const cors = require("cors");
const multer = require("multer");
const sharp = require("sharp");
const fs = require("fs");
require("dotenv").config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const BASE_REPO_NAME = "UserImgStorage";

const UserImgUploaderRoutes = express.Router();
UserImgUploaderRoutes.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Function to get repository size
const getRepoSize = async (repoName) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repoName}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    return response.data.size / 1024; // Convert KB to MB
  } catch (error) {
    console.error(
      "Error fetching repo size:",
      error.response?.data || error.message
    );
    return null;
  }
};

// Function to create a new private repository
const createNewRepo = async () => {
  let count = 1;
  let newRepoName;

  while (true) {
    newRepoName = `${BASE_REPO_NAME}-${count}`;
    try {
      await axios.get(`https://api.github.com/repos/${OWNER}/${newRepoName}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      });
      count++; // If repo exists, increment count
    } catch (error) {
      if (error.response?.status === 404) break; // Repo doesn't exist, create it
      throw error;
    }
  }

  // Create the private repository
  await axios.post(
    "https://api.github.com/user/repos",
    { name: newRepoName, private: true },
    { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
  );

  return newRepoName;
};

// Route to handle image uploads
UserImgUploaderRoutes.post(
  "/uploadUserPhoto",
  upload.single("photo"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { originalname, buffer } = req.file;

    try {
      // Compress image using sharp (reduce size)
      const compressedBuffer = await sharp(buffer)
        .resize(1024) // Resize width to max 1024px (adjust as needed)
        .jpeg({ quality: 80 }) // Convert to JPEG with 80% quality
        .toBuffer();

      // Convert compressed image to Base64
      const content = compressedBuffer.toString("base64");

      // Check if repo size is over limit (4.5GB), create new repo if needed
      let currentRepo = `${BASE_REPO_NAME}-1`;
      let repoSize = await getRepoSize(currentRepo);
      if (repoSize && repoSize >= 4500) {
        currentRepo = await createNewRepo();
      }

      const url = `https://api.github.com/repos/${OWNER}/${currentRepo}/contents/${originalname}`;

      // Check if file exists, append timestamp if needed
      const fileExists = await axios
        .get(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } })
        .then(() => true)
        .catch((err) => {
          if (err.response?.status === 404) return false;
          throw err;
        });

      let finalFilename = originalname;
      if (fileExists) {
        const fileExtension = originalname.split(".").pop();
        const baseName = originalname.replace(`.${fileExtension}`, "");
        finalFilename = `${baseName}-${Date.now()}.${fileExtension}`;
      }

      // Upload file to GitHub
      const uploadUrl = `https://api.github.com/repos/${OWNER}/${currentRepo}/contents/${finalFilename}`;
      const data = {
        message: `Add ${finalFilename}`,
        content: content,
      };

      await axios.put(uploadUrl, data, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      // Construct image URL
      const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${currentRepo}/main/${finalFilename}`;
      res.status(200).json({ imageUrl });
    } catch (error) {
      console.error(
        "Error uploading file:",
        error.response?.data || error.message
      );
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

module.exports = UserImgUploaderRoutes;
