const express = require("express");
const fetch = require("node-fetch");
const GetUserCount = express.Router();

// Function to get user count
const getUserCount = async (req, res) => {
  const GITHUB_USERNAME = "chobegraphy";
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_PREFIX = "ChobegraphyUser";
  let totalDataCount = 0;

  try {
    const repoResponse = await fetch(
      `https://api.github.com/user/repos?per_page=100&type=all`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const repos = await repoResponse.json();
    if (!Array.isArray(repos)) {
      return res
        .status(500)
        .json({ message: "Error fetching repositories", error: repos });
    }

    const filteredRepos = repos.filter(
      (repo) =>
        repo.name.startsWith(REPO_PREFIX) &&
        !isNaN(repo.name.replace(REPO_PREFIX, ""))
    );

    for (const repo of filteredRepos) {
      const fileResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/contents/UserData.json`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3.raw",
          },
        }
      );

      if (fileResponse.ok) {
        const fileData = await fileResponse.json();
        if (Array.isArray(fileData)) {
          totalDataCount += fileData.length;
        }
      }
    }

    return res.status(200).json({ totalDataCount });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

// Define the route
GetUserCount.get("/get-user-count", getUserCount);

module.exports = GetUserCount;
