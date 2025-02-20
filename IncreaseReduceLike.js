const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const UpdateLike = express.Router();
UpdateLike.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const REPO = "ChobegraphyPictureApi";
const FILE_PATH = "PictureApi.json";

// Function to update like count
const updateLikeCount = async (pictureId, increment) => {
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
    throw new Error("Picture not found");
  }

  // Update the like count
  pictureData[pictureIndex].react = Math.max(
    0,
    (pictureData[pictureIndex].react || 0) + increment
  );

  // Encode updated data back to base64
  const updatedContent = Buffer.from(
    JSON.stringify(pictureData, null, 2)
  ).toString("base64");

  // Update file on GitHub
  await axios.put(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
    {
      message: `${
        increment > 0 ? "Increased" : "Decreased"
      } like count for ${pictureId}`,
      content: updatedContent,
      sha: getFileResponse.data.sha,
    },
    {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    }
  );

  return pictureData;
};

// POST route to increase like count
UpdateLike.post("/IncreaseLike/:id", async (req, res) => {
  try {
    const pictureId = req.params.id;
    const updatedData = await updateLikeCount(pictureId, 1);
    res.status(200).json({
      success: true,
      message: "Like count increased successfully",
      updatedData,
    });
  } catch (error) {
    console.error("Error increasing like count:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE route to decrease like count
UpdateLike.delete("/DecreaseLike/:id", async (req, res) => {
  try {
    const pictureId = req.params.id;
    const updatedData = await updateLikeCount(pictureId, -1);
    res.status(200).json({
      success: true,
      message: "Like count decreased successfully",
      updatedData,
    });
  } catch (error) {
    console.error("Error decreasing like count:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = UpdateLike;
