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
    // Fetch all user repositories
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

    // Filter repos that match your pattern
    const filteredRepos = repos.filter(
      (repo) =>
        repo.name.startsWith(REPO_PREFIX) &&
        !isNaN(repo.name.replace(REPO_PREFIX, ""))
    );

    // Fetch image data from each repo
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

    // Filter and collect images matching any of the requested collections
    let matchedImages = new Map();
    collectionsParsed.forEach((collection) => {
      const filtered = allPictures.filter((image) =>
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

    // Convert to array and apply filters
    let uniqueImages = Array.from(matchedImages.values());

    // ✅ Only include images with status: "approved"
    uniqueImages = uniqueImages.filter((image) => image.status === "approved");

    // Optional: Shuffle the result
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
