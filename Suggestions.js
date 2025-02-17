const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const Suggestions = express.Router();
Suggestions.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const REPO = "ChobegraphyPictureApi";
const FILE_PATH = "PictureApi.json";

// Helper function to fetch picture data from GitHub
const fetchPictureData = async () => {
  const getFileResponse = await axios.get(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
    {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    }
  );
  const fileContent = Buffer.from(
    getFileResponse.data.content,
    "base64"
  ).toString("utf8");
  return JSON.parse(fileContent);
};

// GET route to fetch picture suggestions based on categories
Suggestions.get("/suggestions", async (req, res) => {
  try {
    const { categories, excludedId } = req.query;

    // Validate categories
    if (!categories || !Array.isArray(categories)) {
      return res
        .status(400)
        .json({
          error: "Categories parameter is required and should be an array",
        });
    }

    // Fetch picture data from GitHub
    const pictureData = await fetchPictureData();

    // Filter out pictures that match the provided categories and exclude the picture with the given _id
    const filteredPictures = pictureData.filter((pic) => {
      const hasMatchingCategory = categories.some(
        (category) =>
          Array.isArray(pic.collections) && pic.collections.includes(category)
      );
      return hasMatchingCategory && pic._id !== excludedId;
    });

    // Sort the filtered pictures by the highest views, downloads, and reactions (in descending order)
    const sortedPictures = filteredPictures.sort((a, b) => {
      return b.view - a.view || b.download - a.download || b.react - a.react;
    });

    // Limit the response to a maximum of 10 items
    const suggestions = sortedPictures
      .slice(0, 10)
      .map(({ _id, ...rest }) => rest);

    // If no suggestions were found, return a 404 error
    if (suggestions.length === 0) {
      return res.status(404).json({ message: "No data available" });
    }

    // Send the suggestions
    res.status(200).json(suggestions);
  } catch (error) {
    console.error(
      "Error fetching picture data:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch picture data" });
  }
});

module.exports = Suggestions;
