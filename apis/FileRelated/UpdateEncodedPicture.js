const express = require("express");
const axios = require("axios");
const multer = require("multer");
const UpdateEncodedPicture = express.Router();

const upload = multer();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const BASE_REPO_NAME = "EncodedStorage";

// Function to list all repositories
const listRepos = async () => {
  try {
    const response = await axios.get(
      `https://api.github.com/users/${OWNER}/repos`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );
    return response.data
      .filter((repo) => repo.name.startsWith(BASE_REPO_NAME))
      .map((repo) => repo.name);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return [];
  }
};

// Function to get the file's SHA (required for updating files in GitHub)
const getFileSha = async (repoName, filename) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repoName}/contents/${filename}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    return { sha: response.data.sha, repoName };
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

// Patch endpoint to update an existing file
UpdateEncodedPicture.patch(
  "/update-encoded-picture",
  upload.single("photo"),
  async (req, res) => {
    try {
      let photo, filename;

      if (req.is("application/json")) {
        photo = req.body.photo;
        filename = req.body.filename;
      } else if (req.file) {
        filename = req.body.filename || req.file.originalname;
        photo = req.file.buffer.toString("base64");
      } else {
        return res.status(400).json({ error: "Unsupported content type" });
      }

      if (!filename) {
        return res.status(400).json({ error: "Filename is required" });
      }

      // Get all repositories matching the base name
      const repositories = await listRepos();
      let fileData = null;

      // Search for the file in all repositories
      for (const repo of repositories) {
        fileData = await getFileSha(repo, filename);
        if (fileData) break;
      }

      if (!fileData) {
        return res
          .status(404)
          .json({ error: "File not found in any repository" });
      }

      const { sha, repoName } = fileData;

      // Upload the updated file to GitHub
      const uploadUrl = `https://api.github.com/repos/${OWNER}/${repoName}/contents/${filename}`;
      await axios.put(
        uploadUrl,
        {
          message: `Update ${filename}`,
          content: photo,
          sha: sha, // Required for updating an existing file
        },
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${repoName}/main/${filename}`;

      res.status(200).json({ message: "File updated successfully", imageUrl });
    } catch (error) {
      console.error("Error updating file:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  }
);

module.exports = UpdateEncodedPicture;
