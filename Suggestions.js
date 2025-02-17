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

// GET route to fetch picture suggestions based on categories
Suggestions.get("/suggestions", async (req, res) => {
  try {
    const { categories, excludedId } = req.query; // categories array and excluded _id from FE

    // Fetch picture data from GitHub
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
    let pictureData = JSON.parse(fileContent);

    // Filter out pictures that match the provided categories and exclude the picture with the given _id
    const filteredPictures = pictureData.filter((pic) => {
      const hasMatchingCategory = categories.some((category) =>
        pic.collections.includes(category)
      );
      return hasMatchingCategory && pic._id !== excludedId; // Only include if the category matches and _id is not excluded
    });

    // Sort the filtered pictures by the highest views, downloads, and reactions (in descending order)
    const sortedPictures = filteredPictures.sort((a, b) => {
      // Prioritize views > downloads > react count
      return b.view - a.view || b.download - a.download || b.react - a.react;
    });

    // Limit the response to a maximum of 10 items
    const suggestions = sortedPictures
      .slice(0, 10)
      .map(({ _id, ...rest }) => rest); // Exclude _id from the response

    res.status(200).json(suggestions); // Send the suggestions
  } catch (error) {
    console.error(
      "Error fetching picture data:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch picture data" });
  }
});

module.exports = Suggestions;
