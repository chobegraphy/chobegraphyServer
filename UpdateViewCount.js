const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const UpdateView = express.Router();
UpdateView.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const REPO = "ChobegraphyPictureApi";
const FILE_PATH = "PictureApi.json";

// POST route to increase view count of a picture
UpdateView.post("/IncreaseView/:id", async (req, res) => {
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
    const pictureIndex = pictureData.findIndex((pic) => pic._id === pictureId);
    if (pictureIndex === -1) {
      return res.status(404).json({ error: "Picture not found" });
    }

    // Increase the view count
    pictureData[pictureIndex].view += 1;

    // Encode updated data back to base64
    const updatedContent = Buffer.from(
      JSON.stringify(pictureData, null, 2)
    ).toString("base64");

    // Update file on GitHub
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        message: `Increased view count for ${pictureId}`,
        content: updatedContent,
        sha: getFileResponse.data.sha,
      },
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    res.status(200).json({
      success: true,
      message: "View count updated successfully",
      updatedData: pictureData[pictureIndex], // Send updated picture data
    });
  } catch (error) {
    console.error(
      "Error updating view count:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to update view count" });
  }
});

module.exports = UpdateView;
