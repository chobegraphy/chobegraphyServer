const express = require("express");
const fetch = require("node-fetch");
const GetPictureData = express.Router();

const GITHUB_USERNAME = "chobegraphy";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_PREFIX = "ChobegraphyPictureApi";

GetPictureData.get("/get-picture-data", async (req, res) => {
  const { filter, page = 1, limit = null } = req.query;
  let pictureData = [];

  try {
    // Fetch all repositories
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
      return res.status(500).json({ message: "Error fetching repositories" });
    }

    // Filter repositories matching ChobegraphyPictureApi
    const filteredRepos = repos.filter(
      (repo) =>
        repo.name.startsWith(REPO_PREFIX) &&
        !isNaN(repo.name.replace(REPO_PREFIX, ""))
    );

    // Fetch PictureApi.json from each repo
    for (const repo of filteredRepos) {
      const fileResponse = await fetch(
        `https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/contents/PictureApi.json`,
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
          pictureData.push(...fileData);
        }
      }
    }

    // Sorting based on filter type
    if (filter === "recent") {
      pictureData.sort(
        (a, b) => new Date(b.uploadedTime) - new Date(a.uploadedTime)
      );
    } else if (filter === "popular") {
      pictureData.sort(
        (a, b) =>
          b.view - a.view || b.download - a.download || b.react - a.react
      );
    } else if (filter === "oldest") {
      pictureData.sort(
        (a, b) => new Date(a.uploadedTime) - new Date(b.uploadedTime)
      );
    }

    // Apply pagination if limit is set
    let paginatedData = pictureData;
    if (limit !== null) {
      const startIndex = (page - 1) * parseInt(limit);
      const endIndex = startIndex + parseInt(limit);
      paginatedData = pictureData.slice(startIndex, endIndex);
    }

    return res.status(200).json({
      pictures: paginatedData,
      total: pictureData.length,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
});

module.exports = GetPictureData;
