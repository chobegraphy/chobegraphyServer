const express = require("express");
const axios = require("axios");

const GetImgCount = express.Router();

const GITHUB_USERNAME = "chobegraphy";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_PREFIX = "ChobegraphyPictureApi";

// Function to fetch repositories
async function fetchRepositories() {
  try {
    const response = await axios.get(
      "https://api.github.com/user/repos?per_page=100&type=all",
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    return response.data.filter(
      (repo) =>
        repo.name.startsWith(REPO_PREFIX) &&
        !isNaN(repo.name.replace(REPO_PREFIX, ""))
    );
  } catch (error) {
    console.error(
      "Error fetching repositories:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch repositories");
  }
}

// Function to fetch image count from PictureApi.json// Function to fetch image count from PictureApi.json
async function fetchImageCount(repoName, collectionLabel) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/contents/PictureApi.json`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3.raw",
        },
      }
    );

    const fileData = Array.isArray(response.data) ? response.data : [];
    let approvedImages = fileData.filter(
      (image) => image.status === "approved"
    );

    if (collectionLabel && collectionLabel.toLowerCase() !== "all") {
      const lowerCaseLabel = collectionLabel.toLowerCase();
      approvedImages = approvedImages.filter(
        (img) =>
          Array.isArray(img.collections) &&
          img.collections.some(
            (col) => col.label?.toLowerCase() === lowerCaseLabel
          )
      );
    }

    return approvedImages.length;
  } catch (error) {
    console.error(
      `Error fetching PictureApi.json from ${repoName}:`,
      error.response?.data || error.message
    );
    return 0;
  }
}

// GET route to count images across repositories
GetImgCount.get("/get-img-count", async (req, res) => {
  const collection = req.query.collection || "all";

  try {
    const repos = await fetchRepositories();
    let totalDataCount = 0;

    for (const repo of repos) {
      totalDataCount += await fetchImageCount(repo.name, collection);
    }

    res.status(200).json({ totalDataCount });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = GetImgCount;
