const express = require("express");
const axios = require("axios");
const cors = require("cors");

const createUploaderRoutes = ({
  githubToken,
  repoOwner,
  PhotoUploadRepoName,
}) => {
  const UploaderRoutes = express.Router();

  // Apply CORS middleware
  UploaderRoutes.use(cors());

  UploaderRoutes.post("/upload", async (req, res) => {
    const { photo, filename } = req.body;

    if (!photo || !filename) {
      return res.status(400).send("Photo and filename are required");
    }

    const content = Buffer.from(photo, "base64").toString("base64");
    const url = `https://api.github.com/repos/${repoOwner}/${PhotoUploadRepoName}/contents/${filename}`;

    try {
      // Check if the file already exists
      const fileExists = await axios
        .get(url, {
          headers: {
            Authorization: `token ${githubToken}`,
          },
        })
        .then(() => true)
        .catch((err) => {
          if (err.response?.status === 404) {
            return false; // File does not exist
          }
          throw err; // Rethrow other errors
        });

      let finalFilename = filename;

      // If file exists, generate a new unique name
      if (fileExists) {
        const fileExtension = filename.split(".").pop(); // Extract file extension
        const baseName = filename.replace(`.${fileExtension}`, ""); // Get filename without extension
        const timestamp = Date.now(); // Generate a unique timestamp
        finalFilename = `${baseName}-${timestamp}.${fileExtension}`;
      }

      // Upload the file with the unique name
      const uploadUrl = `https://api.github.com/repos/${repoOwner}/${PhotoUploadRepoName}/contents/${finalFilename}`;
      const data = {
        message: `Add ${finalFilename}`,
        content: content,
      };

      const response = await axios.put(uploadUrl, data, {
        headers: {
          Authorization: `token ${githubToken}`,
          "Content-Type": "application/json",
        },
      });

      // Construct the image URL (raw GitHub URL for direct access)
      const imageUrl = `https://raw.githubusercontent.com/${repoOwner}/${PhotoUploadRepoName}/main/${finalFilename}`;

      // Return the image URL in the response
      res.status(200).send({ imageUrl });
    } catch (error) {
      console.error(
        "Error uploading file:",
        error.response?.data || error.message
      );
      res
        .status(500)
        .send(error.response?.data || { message: "Internal server error" });
    }
  });

  return UploaderRoutes;
};

module.exports = createUploaderRoutes;
