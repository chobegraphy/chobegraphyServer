const express = require("express");
const axios = require("axios");

const GetPictureStatusCount = express.Router();

const GITHUB_USERNAME = "chobegraphy";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_PREFIX = "ChobegraphyPictureApi";

// Fetch repositories that match naming pattern
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

// Fetch data from PictureApi.json and count by status
async function fetchImageStatusCount(repoName) {
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

    const statusCount = {
      approved: 0,
      pending: 0,
      rejected: 0,
    };

    for (const image of fileData) {
      if (image.status === "approved") statusCount.approved++;
      else if (image.status === "pending") statusCount.pending++;
      else if (image.status === "rejected") statusCount.rejected++;
    }

    return statusCount;
  } catch (error) {
    console.error(
      `Error fetching PictureApi.json from ${repoName}:`,
      error.response?.data || error.message
    );
    return { approved: 0, pending: 0, rejected: 0 };
  }
}

// GET route to return total status count
GetPictureStatusCount.get("/get-img-status-count", async (req, res) => {
  try {
    const repos = await fetchRepositories();

    let totalStatusCount = {
      approved: 0,
      pending: 0,
      rejected: 0,
    };

    for (const repo of repos) {
      const repoCount = await fetchImageStatusCount(repo.name);
      totalStatusCount.approved += repoCount.approved;
      totalStatusCount.pending += repoCount.pending;
      totalStatusCount.rejected += repoCount.rejected;
    }

    res.status(200).json(totalStatusCount);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = GetPictureStatusCount;
