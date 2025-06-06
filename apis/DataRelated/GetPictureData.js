const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const GetPictureData = express.Router();

const GITHUB_USERNAME = "chobegraphy";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_PREFIX = "ChobegraphyPictureApi";

GetPictureData.get("/get-picture-data", async (req, res) => {
  const {
    filter = "popular",
    limit = 10,
    page = 1,
    collection = "all",
  } = req.query;

  let allImages = [];

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

    // Only approved
    allImages = allImages.filter((image) => image.status === "approved");

    // Case-insensitive filter by collection label
    if (collection.toLowerCase() !== "all") {
      const collectionLower = collection.toLowerCase();
      allImages = allImages.filter((image) =>
        image.collections?.some(
          (col) => col.label?.toLowerCase() === collectionLower
        )
      );
    }

    // Sorting logic
    switch (filter) {
      case "popular":
        allImages.sort((a, b) => (b.view || 0) - (a.view || 0));
        break;
      case "recent":
        allImages.sort(
          (a, b) => new Date(b.uploadedTime) - new Date(a.uploadedTime)
        );
        break;
      case "oldest":
        allImages.sort(
          (a, b) => new Date(a.uploadedTime) - new Date(b.uploadedTime)
        );
        break;
      default:
        return res.status(400).json({ message: "Invalid filter type" });
    }

    const startIndex = (page - 1) * limit;
    const paginatedImages = allImages.slice(
      startIndex,
      startIndex + parseInt(limit)
    );

    res.status(200).json({
      total: allImages.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: paginatedImages,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = GetPictureData;
