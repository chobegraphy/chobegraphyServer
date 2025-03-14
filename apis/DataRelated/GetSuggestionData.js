const express = require("express");
const fetch = require("node-fetch");
const GetSuggestionData = express.Router();

// Function to fetch suggestion data
const getSuggestionData = async (req, res) => {
  const { collections } = req.query;
  if (!collections) {
    return res.status(400).json({ message: "Collections array is required" });
  }

  let collectionsParsed;
  try {
    collectionsParsed = JSON.parse(collections);
  } catch (err) {
    return res.status(400).json({ message: "Invalid collections array" });
  }

  if (!Array.isArray(collectionsParsed) || collectionsParsed.length === 0) {
    return res.status(400).json({ message: "Invalid collections array" });
  }

  const GITHUB_USERNAME = "chobegraphy";
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO_PREFIX = "ChobegraphyPictureApi";
  let allPictures = [];

  try {
    const repoResponse = await fetch(
      "https://api.github.com/user/repos?per_page=100&type=all",
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const repos = await repoResponse.json();
    if (!Array.isArray(repos)) {
      return res.status(500).json({
        message: "Error fetching repositories",
        error: repos,
      });
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
          allPictures.push(...fileData);
        }
      }
    }

    let matchedImages = new Map();
    collectionsParsed.forEach((collection) => {
      let filtered = allPictures.filter((image) =>
        image.collections.some(
          (col) =>
            col.label === collection.label || col.value === collection.value
        )
      );

      filtered.slice(0, 5).forEach((image) => {
        if (!matchedImages.has(image._id)) {
          matchedImages.set(image._id, image);
        }
      });
    });

    let uniqueImages = Array.from(matchedImages.values());
    uniqueImages = uniqueImages.sort(() => Math.random() - 0.5);

    return res.status(200).json(uniqueImages);
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};

// Define the route
GetSuggestionData.get("/get-suggestion-data", getSuggestionData);

module.exports = GetSuggestionData;
