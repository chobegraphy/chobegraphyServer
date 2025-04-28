const express = require("express");
const axios = require("axios");
const cors = require("cors");

const createRepoSizeRoutes = ({
  githubToken,
  repoOwner,
  PhotoUploadRepoName,
}) => {
  const RepoSizeRoutes = express.Router();

  // Apply CORS middleware
  RepoSizeRoutes.use(cors());

  // Endpoint to get repository size
  RepoSizeRoutes.get("/repo-size", async (req, res) => {
    const url = `https://api.github.com/repos/${repoOwner}/${PhotoUploadRepoName}`;

    try {
      // Fetch repository details
      const response = await axios.get(url, {
        headers: {
          Authorization: `token ${githubToken}`,
        },
      });

      // Extract the size (in kilobytes)
      const sizeInKB = response.data.size;

      // Convert size to GB
      const sizeInGB = (sizeInKB / 1024 / 1024).toFixed(3); // rounding to 3 decimal places

      // Return the size of the repository in GB
      res.status(200).send({ sizeInGB });
    } catch (error) {
      console.error(
        "Error fetching repository size:",
        error.response?.data || error.message
      );
      res
        .status(500)
        .send(error.response?.data || { message: "Internal server error" });
    }
  });

  return RepoSizeRoutes;
};

module.exports = createRepoSizeRoutes;
