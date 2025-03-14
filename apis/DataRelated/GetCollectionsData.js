const express = require("express");
const axios = require("axios");

const GetCollectionsData = express.Router();

const GITHUB_USERNAME = "chobegraphy";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_PREFIX = "Collections";

// Function to fetch repositories containing "Collections" in their name
async function fetchCollectionRepos() {
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

    return response.data.filter((repo) => repo.name.includes(REPO_PREFIX));
  } catch (error) {
    console.error(
      "Error fetching repositories:",
      error.response?.data || error.message
    );
    throw new Error("Failed to fetch repositories");
  }
}

// Function to fetch collection data from each repository
async function fetchCollectionData(repoName) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/contents/Collections.json`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3.raw",
        },
      }
    );

    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    console.error(
      `Error fetching collections from ${repoName}:`,
      error.response?.data || error.message
    );
    return []; // Return an empty array if fetching fails
  }
}

// GET route to fetch collections data
GetCollectionsData.get("/get-collections-data", async (req, res) => {
  try {
    const repos = await fetchCollectionRepos();
    let allCollections = [];

    // Fetch collections from each filtered repo
    for (const repo of repos) {
      const collections = await fetchCollectionData(repo.name);
      allCollections.push(...collections);
    }

    res.status(200).json(allCollections);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = GetCollectionsData;
