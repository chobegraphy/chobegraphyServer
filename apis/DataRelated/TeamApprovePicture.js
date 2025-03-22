const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const UpdatePictureStatusToApprove = express.Router();
UpdatePictureStatusToApprove.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const REPO = "ChobegraphyPictureApi";
const FILE_PATH = "PictureApi.json";

// PATCH route to update picture status to 'approved'
UpdatePictureStatusToApprove.patch(
  "/UpdatePictureStatusToApprove",
  async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: "Picture ID is required" });
      }

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
      const pictureIndex = pictureData.findIndex((pic) => pic._id === id);
      if (pictureIndex === -1) {
        return res.status(404).json({ error: "Picture not found" });
      }

      // Update status to 'approved'
      pictureData[pictureIndex].status = "approved";

      // Encode the updated data to base64
      const updatedContent = Buffer.from(
        JSON.stringify(pictureData, null, 2)
      ).toString("base64");

      // Commit the updated data to GitHub
      await axios.put(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
        {
          message: `Updated status to approved for picture ID: ${id}`,
          content: updatedContent,
          sha: getFileResponse.data.sha,
        },
        {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        }
      );

      res.status(200).json({ message: "Picture status updated to approved" });
    } catch (error) {
      console.error(
        "Error updating picture status:",
        error.response?.data || error.message
      );
      res.status(500).json({ error: "Failed to update picture status" });
    }
  }
);

module.exports = UpdatePictureStatusToApprove;
