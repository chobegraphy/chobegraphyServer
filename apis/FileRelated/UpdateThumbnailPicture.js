const express = require("express");
const axios = require("axios");
const multer = require("multer");
const UpdateThumbnailPicture = express.Router();

const upload = multer();

// GitHub settings
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const BASE_REPO_PREFIX = "ThumbnailStorage";

// Function to get all repositories matching the prefix
const getAllThumbnailRepos = async () => {
  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });
    return response.data
      .filter((repo) => repo.name.startsWith(BASE_REPO_PREFIX))
      .map((repo) => repo.name);
  } catch (error) {
    console.error(
      "Error fetching repositories:",
      error.response?.data || error.message
    );
    return [];
  }
};

// Function to check if a file exists in a repository
const getFileSha = async (repo, filename) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repo}/contents/${filename}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    return response.data.sha; // Return file SHA
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

// Update endpoint
UpdateThumbnailPicture.patch(
  "/update-thumbnail-picture",
  upload.single("photo"),
  async (req, res) => {
    try {
      let photo, filename;

      if (req.is("application/json")) {
        photo = req.body.photo;
        filename = req.body.filename;
      } else if (req.file) {
        filename = req.body.filename;
        photo = req.file.buffer.toString("base64");
      } else {
        return res.status(400).json({ error: "Invalid request format" });
      }

      if (!filename) {
        return res.status(400).json({ error: "Filename is required" });
      }

      const repos = await getAllThumbnailRepos();

      for (const repo of repos) {
        const fileSha = await getFileSha(repo, filename);

        if (fileSha) {
          const uploadUrl = `https://api.github.com/repos/${OWNER}/${repo}/contents/${filename}`;
          await axios.put(
            uploadUrl,
            {
              message: `Update ${filename}`,
              content: photo,
              sha: fileSha,
            },
            {
              headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );

          const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${repo}/main/${filename}`;
          return res.status(200).json({ imageUrl });
        }
      }

      res.status(404).json({ error: "File not found in any repository" });
    } catch (error) {
      console.error("Error updating file:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

module.exports = UpdateThumbnailPicture;
