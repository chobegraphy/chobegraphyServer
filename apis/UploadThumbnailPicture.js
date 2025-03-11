const express = require("express");
const axios = require("axios");
const multer = require("multer");
const UploadThumbnailPicture = express.Router();

const upload = multer();

// GitHub settings
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const BASE_REPO_NAME = "ThumbnailStorage";

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
    { name: newRepoName, private: false },
    { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
  );

  return newRepoName;
};

// Upload endpoint
UploadThumbnailPicture.post(
  "/upload-thumbnail-picture",
  upload.single("photo"),
  async (req, res) => {
    try {
      let photo, filename;

      if (req.is("application/json")) {
        // JSON request (Base64 string)
        photo = req.body.photo;
        filename = req.body.filename || "uploaded-image.jpg";
      } else if (req.file) {
        // Form-data request (File upload)
        filename = req.body.filename || req.file.originalname;
        photo = req.file.buffer.toString("base64");
      } else {
        return res.status(400).json({ error: "Unsupported content type" });
      }

      // File size check
      const fileSizeInMB = Buffer.byteLength(photo, "base64") / (1024 * 1024);
      if (fileSizeInMB > 30) {
        return res.status(400).json({ error: "File size exceeds 30MB limit" });
      }

      // Select the repository
      let currentRepo = BASE_REPO_NAME;
      let repoSize = await getRepoSize(currentRepo);

      // If repo exceeds 4.5GB, create a new one
      if (repoSize && repoSize >= 4500) {
        currentRepo = await createNewRepo();
      }

      // Check if file already exists in the repository
      const url = `https://api.github.com/repos/${OWNER}/${currentRepo}/contents/${filename}`;
      const fileExists = await axios
        .get(url, { headers: { Authorization: `token ${GITHUB_TOKEN}` } })
        .then(() => true)
        .catch((err) =>
          err.response?.status === 404 ? false : Promise.reject(err)
        );

      let finalFilename = filename;
      if (fileExists) {
        const fileExtension = filename.split(".").pop();
        const baseName = filename.replace(`.${fileExtension}`, "");
        finalFilename = `${baseName}-${Date.now()}.${fileExtension}`;
      }

      // Upload the file to GitHub
      const uploadUrl = `https://api.github.com/repos/${OWNER}/${currentRepo}/contents/${finalFilename}`;
      await axios.put(
        uploadUrl,
        { message: `Add ${finalFilename}`, content: photo },
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Image URL from GitHub
      const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${currentRepo}/main/${finalFilename}`;

      res.status(200).json({ imageUrl });
    } catch (error) {
      console.error("Error uploading file:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

module.exports = UploadThumbnailPicture;
