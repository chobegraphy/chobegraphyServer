const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const MostViewedAndLovedPicture = express.Router();
MostViewedAndLovedPicture.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const REPO = "ChobegraphyPictureApi";
const FILE_PATH = "PictureApi.json"; // Adjust the file path as needed

// GET route to fetch the top 19 pictures based on views, downloads, and reactions
MostViewedAndLovedPicture.get("/top-pictures", async (req, res) => {
  try {
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

    // Sort by most viewed, downloaded, and reacted
    pictureData.sort((a, b) => {
      const scoreA = (a.view || 0) + (a.download || 0) + (a.react || 0);
      const scoreB = (b.view || 0) + (b.download || 0) + (b.react || 0);
      return scoreB - scoreA; // Descending order
    });

    // Get top 19 pictures
    const topPictures = pictureData.slice(0, 19);

    res.status(200).json(topPictures);
  } catch (error) {
    console.error(
      "Error fetching picture data:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch picture data" });
  }
});

module.exports = MostViewedAndLovedPicture;
