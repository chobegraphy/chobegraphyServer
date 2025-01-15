const express = require("express");
const axios = require("axios"); // Use axios for HTTP requests
const cors = require("cors");
const { v4: uuidv4 } = require("uuid"); // UUID library for generating unique IDs
require("dotenv").config();

const AddDataRouter = express.Router();
AddDataRouter.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy"; // GitHub username
const REPO = "ChobegraphyApp"; // Repository name
const FILE_PATH = "PictureApi.json"; // Path to the file in the repo

// POST route to add data
AddDataRouter.post("/add-data", async (req, res) => {
  const newPicture = req.body;

  // Add a unique ID to the new picture
  newPicture._id = uuidv4();

  try {
    // Get the file content from GitHub
    const getFileResponse = await axios.get(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    const fileContent = Buffer.from(
      getFileResponse.data.content,
      "base64"
    ).toString("utf8");
    const pictureApiData = JSON.parse(fileContent);

    // Add new data at the beginning of the array
    pictureApiData.unshift(newPicture);

    // Update the file content
    const updatedContent = Buffer.from(
      JSON.stringify(pictureApiData, null, 2)
    ).toString("base64");

    // Commit the updated file to GitHub
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        message: "Update PictureApi.json with new data",
        content: updatedContent,
        sha: getFileResponse.data.sha, // File SHA is required for updates
      },
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
        },
      }
    );

    // Respond with the full updated data
    res.status(200).json({
      message: "Picture added and file updated on GitHub",
      data: pictureApiData[0], // Send the full updated data in response
    });
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to update the file on GitHub" });
  }
});

module.exports = AddDataRouter;
