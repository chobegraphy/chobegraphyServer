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

// Function to fetch image count from PictureApi.json
async function fetchImageCount(repoName) {
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
    const newData = fileData.filter((image) => image.status === "approved");

    return newData.length;
  } catch (error) {
    console.error(
      `Error fetching PictureApi.json from ${repoName}:`,
      error.response?.data || error.message
    );
    return 0; // Return 0 if fetching fails
  }
}

// GET route to count images across repositories
GetImgCount.get("/get-img-count", async (req, res) => {
  try {
    const repos = await fetchRepositories();
    let totalDataCount = 0;

    // Fetch image count from each filtered repo
    for (const repo of repos) {
      totalDataCount += await fetchImageCount(repo.name);
    }

    res.status(200).json({ totalDataCount });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = GetImgCount;
