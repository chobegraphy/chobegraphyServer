const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const SinglePicture = express.Router();
SinglePicture.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const REPO = "ChobegraphyPictureApi";
const FILE_PATH = "PictureApi.json";

// GET route to fetch a single picture by _id
SinglePicture.get("/SinglePictureDetails/:id", async (req, res) => {
  try {
    const pictureId = req.params.id;

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

    // Find the picture with the given _id
    const picture = pictureData.find((pic) => pic._id === pictureId);

    if (!picture) {
      return res.status(404).json({ error: "Picture not found" });
    }

    res.status(200).json(picture);
  } catch (error) {
    console.error(
      "Error fetching picture data:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch picture data" });
  }
});

module.exports = SinglePicture;
