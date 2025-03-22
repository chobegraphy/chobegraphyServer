const express = require("express");
const axios = require("axios");
const UpdatePictureData = express.Router();

// GitHub settings
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const BASE_REPO_PREFIX = "ChobegraphyPictureApi";
const FILE_PATH = "PictureApi.json";

// Function to get all repositories matching the prefix
const getAllPictureRepos = async () => {
  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    });
    return response.data
      .filter((repo) => repo.name.startsWith(BASE_REPO_PREFIX))
      .map((repo) => repo.name);
  } catch (error) {
    console.error(
      "Error fetching repositories:",
      error.response?.data || error.message
    );
    return [];
  }
};

// Function to fetch file content from a repository
const getFileContent = async (repo) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repo}/contents/${FILE_PATH}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    return {
      sha: response.data.sha,
      content: JSON.parse(
        Buffer.from(response.data.content, "base64").toString("utf8")
      ),
    };
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

UpdatePictureData.patch("/update-picture-data", async (req, res) => {
  try {
    const { _id, newData } = req.body;
    if (!_id) {
      return res.status(400).json({ error: "_id is required" });
    }

    const repos = await getAllPictureRepos();
    for (const repo of repos) {
      const fileData = await getFileContent(repo);
      if (fileData) {
        const { sha, content } = fileData;

        // Filter out any picture data that doesn't match the given _id
        const filteredContent = content.filter((item) => item._id !== _id);

        if (filteredContent.length > 0) {
          // Update the existing entry with newData
          const updatedContent = [...filteredContent, newData];

          // Convert the updated content to base64
          const updatedBase64Content = Buffer.from(
            JSON.stringify(updatedContent, null, 2)
          ).toString("base64");

          // Push the updated content to GitHub
          await axios.put(
            `https://api.github.com/repos/${OWNER}/${repo}/contents/${FILE_PATH}`,
            {
              message: `Update picture data for _id: ${_id}`,
              content: updatedBase64Content,
              sha,
            },
            { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
          );

          return res
            .status(200)
            .json({ message: "Picture data updated successfully" });
        }
      }
    }

    res.status(404).json({ error: "Picture with given _id not found" });
  } catch (error) {
    console.error("Error updating picture data:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

module.exports = UpdatePictureData;
