const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");

const AddUploadPictureData = express.Router();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const REPO_PREFIX = "ChobegraphyPictureApi";
const FILE_PATH = "PictureApi.json";
const MAX_REPO_SIZE = 4.5 * 1024 * 1024 * 1024;

// Function to get repo size
async function getRepoSize(repoName) {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repoName}`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );
    return response.data.size * 1024; // Convert KB to bytes
  } catch (error) {
    console.error(
      "Error fetching repo size:",
      error.response?.data || error.message
    );
    return 0; // Assume repo doesn't exist or is empty
  }
}

// Function to create a new repo when max size is exceeded
async function createNewRepo() {
  try {
    const newRepoName = `${REPO_PREFIX}-${Date.now()}`;
    await axios.post(
      `https://api.github.com/user/repos`,
      { name: newRepoName, private: true },
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    return newRepoName;
  } catch (error) {
    console.error(
      "Error creating new repo:",
      error.response?.data || error.message
    );
    throw new Error("Failed to create a new repository");
  }
}

// POST route to add picture data
AddUploadPictureData.post("/add-upload-picture-data", async (req, res) => {
  try {
    const newPicture = req.body;

    // Validate description
    if (!newPicture.description || newPicture.description.trim() === "") {
      return res.status(400).json({ error: "Description is required" });
    }

    newPicture._id = uuidv4();

    // Check repo size
    let repoName = REPO_PREFIX;
    let repoSize = await getRepoSize(repoName);

    // If repo exceeds max size, create a new repo
    let selectedRepo = repoName;
    if (repoSize > MAX_REPO_SIZE) {
      selectedRepo = await createNewRepo();
    }

    // Fetch existing file content
    const getFileResponse = await axios.get(
      `https://api.github.com/repos/${OWNER}/${selectedRepo}/contents/${FILE_PATH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );

    const fileContent = Buffer.from(
      getFileResponse.data.content,
      "base64"
    ).toString("utf8");
    const pictureApiData = JSON.parse(fileContent);

    // Check for duplicate picture URL
    const isDuplicate = pictureApiData.some(
      (picture) => picture.url === newPicture.url
    );
    if (isDuplicate) {
      return res.status(400).json({ error: "Picture already exists" });
    }

    // Add new picture to the beginning
    pictureApiData.unshift(newPicture);

    // Encode updated content
    const updatedContent = Buffer.from(
      JSON.stringify(pictureApiData, null, 2)
    ).toString("base64");

    // Commit updated file to GitHub
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${selectedRepo}/contents/${FILE_PATH}`,
      {
        message: "Update PictureApi.json with new data",
        content: updatedContent,
        sha: getFileResponse.data.sha, // Required for updating an existing file
      },
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );

    // Respond with updated data
    return res.status(200).json({
      message: "Picture added and file updated on GitHub",
      data: pictureApiData[0], // Return the newly added picture
    });
  } catch (error) {
    console.error("Error:", error.response?.data || error.message);
    return res
      .status(500)
      .json({ error: "Failed to update the file on GitHub" });
  }
});

module.exports = AddUploadPictureData;
