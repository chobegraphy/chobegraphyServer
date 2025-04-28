const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const GetPictureDataByStatus = express.Router();

const GITHUB_USERNAME = "chobegraphy";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_PREFIX = "ChobegraphyPictureApi";

GetPictureDataByStatus.get("/team-get-picture-by-status", async (req, res) => {
  const { status, limit = 10, page = 1 } = req.query;

  let allImages = [];

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
      return res
        .status(500)
        .json({ message: "Error fetching repositories", error: repos });
    }

    // Filter repositories that match "ChobegraphyPictureApi-*" pattern
    const filteredRepos = repos.filter(
      (repo) =>
        repo.name.startsWith(REPO_PREFIX) &&
        !isNaN(repo.name.replace(REPO_PREFIX, ""))
    );

    // Fetch PictureApi.json from each repo and combine data
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
          allImages = [...allImages, ...fileData];
        }
      }
    }

    // Filter images by status if provided
    let filteredImages = allImages;
    if (status) {
      filteredImages = filteredImages.filter(
        (image) => image.status === status
      );
    }

    // Pagination logic
    const startIndex = (page - 1) * limit;
    const paginatedImages = filteredImages.slice(
      startIndex,
      startIndex + parseInt(limit)
    );

    res.status(200).json({
      total: filteredImages.length,
      page: parseInt(page),
      limit: parseInt(limit),
      status: status || "all",
      data: paginatedImages,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = GetPictureDataByStatus;
