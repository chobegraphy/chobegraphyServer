const express = require("express");
const axios = require("axios");
const multer = require("multer");
const UpdateEncodedPicture = express.Router();

const upload = multer();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const BASE_REPO_NAME = "EncodedStorage";

// Function to list all repositories
const listRepos = async () => {
  try {
    const response = await axios.get(
      `https://api.github.com/users/${OWNER}/repos`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );
    return response.data
      .filter((repo) => repo.name.startsWith(BASE_REPO_NAME))
      .map((repo) => repo.name);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return [];
  }
};

// Function to get the file's SHA (required for updating files in GitHub)
const getFileSha = async (repoName, filename) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repoName}/contents/${filename}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    return { sha: response.data.sha, repoName };
  } catch (error) {
    if (error.response?.status === 404) return null;
    throw error;
  }
};

// Patch endpoint to update an existing file
// Update endpoint
UpdatePictureData.patch("/update-picture-data", async (req, res) => {
  try {
    const { _id, ...newData } = req.body;
    if (!_id) {
      return res.status(400).json({ error: "_id is required" });
    }

    const repos = await getAllPictureRepos();
    for (const repo of repos) {
      const fileData = await getFileContent(repo);
      if (fileData) {
        const { sha, content } = fileData;
        const index = content.findIndex((item) => item._id === _id);

        if (index !== -1) {
          // Remove the existing data matching _id
          content.splice(index, 1);

          // Add the new data in the given format
          content.push({
            _id, // use the provided _id
            name: newData.name,
            url: newData.url,
            description: newData.description,
            thumbnail: newData.thumbnail,
            encodedUrl: newData.encodedUrl,
            dimensions: newData.dimensions,
            fileSize: newData.fileSize,
            colors: newData.colors,
            author: newData.author,
            district: newData.district,
            exifData: newData.exifData,
            uploadedTime: newData.uploadedTime,
            status: newData.status,
            copyright: newData.copyright,
            collections: newData.collections,
            view: newData.view,
            download: newData.download,
            react: newData.react,
          });

          const updatedContent = Buffer.from(
            JSON.stringify(content, null, 2)
          ).toString("base64");

          await axios.put(
            `https://api.github.com/repos/${OWNER}/${repo}/contents/${FILE_PATH}`,
            {
              message: `Update picture data for _id: ${_id}`,
              content: updatedContent,
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

module.exports = UpdateEncodedPicture;
