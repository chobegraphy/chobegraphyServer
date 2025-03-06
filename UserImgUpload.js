const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();
const fs = require("fs");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const BASE_REPO_NAME = "UserImgStorage";

const UserImgUploaderRoutes = express.Router();
UserImgUploaderRoutes.use(cors());

// Function to get repository size
const getRepoSize = async (repoName) => {
  try {
    const response = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repoName}`,
      { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
    );
    return response.data.size / 1024; // Convert KB to MB
  } catch (error) {
    console.error(
      "Error fetching repo size:",
      error.response?.data || error.message
    );
    return null;
  }
};

// Function to create a new private repository
const createNewRepo = async () => {
  let count = 1;
  let newRepoName;

  while (true) {
    newRepoName = `${BASE_REPO_NAME}-${count}`;
    try {
      await axios.get(`https://api.github.com/repos/${OWNER}/${newRepoName}`, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      });
      count++; // If repo exists, increment count
    } catch (error) {
      if (error.response?.status === 404) break; // Repo doesn't exist, create it
      throw error;
    }
  }

  // Create the private repository
  await axios.post(
    "https://api.github.com/user/repos",
    { name: newRepoName, private: false },
    { headers: { Authorization: `token ${GITHUB_TOKEN}` } }
  );

  return newRepoName;
};

UserImgUploaderRoutes.post("/uploadUserPhoto", async (req, res) => {
  const { photo, filename } = req.body;
  console.log(req.body);
  // Convert base64 size to bytes
  const fileSizeInBytes = Buffer.byteLength(photo, "base64");
  const fileSizeInMB = fileSizeInBytes / (1024 * 1024);

  if (fileSizeInMB > 30) {
    return res.status(400).send("File size exceeds 30MB limit");
  }

  let currentRepo = BASE_REPO_NAME;
  let repoSize = await getRepoSize(currentRepo);

  // If repo exceeds 4.5GB, create a new one
  if (repoSize && repoSize >= 4500) {
    currentRepo = await createNewRepo();
  }

  const content = Buffer.from(photo, "base64").toString("base64");
  const url = `https://api.github.com/repos/${OWNER}/${currentRepo}/contents/${filename}`;

  try {
    // Check if the file already exists
    const fileExists = await axios
      .get(url, {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      })
      .then(() => true)
      .catch((err) => {
        if (err.response?.status === 404) return false;
        throw err;
      });

    let finalFilename = filename;
    if (fileExists) {
      const fileExtension = filename.split(".").pop();
      const baseName = filename.replace(`.${fileExtension}`, "");
      finalFilename = `${baseName}-${Date.now()}.${fileExtension}`;
    }

    // Upload the file
    const uploadUrl = `https://api.github.com/repos/${OWNER}/${currentRepo}/contents/${finalFilename}`;
    const data = {
      message: `Add ${finalFilename}`,
      content: content,
    };

    await axios.put(uploadUrl, data, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${currentRepo}/main/${finalFilename}`;
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

UserImgUploaderRoutes.post("/uploadImgByImgBB", async (req, res) => {
  const { imgUrl, filename } = req.body;
  console.log(imgUrl);
  if (!imgUrl) {
    return res.status(400).send({ message: "Image URL is required" });
  }

  try {
    // Extract filename from URL

    const tempFilePath = `./temp/${filename}`;

    // Download the image
    const response = await axios({ url: imgUrl, responseType: "arraybuffer" });
    fs.writeFileSync(tempFilePath, response.data);

    // Convert image to Base64
    const content = fs.readFileSync(tempFilePath).toString("base64");

    // Check and get current repo
    let currentRepo = BASE_REPO_NAME;
    let repoSize = await getRepoSize(currentRepo);
    if (repoSize && repoSize >= 4500) {
      currentRepo = await createNewRepo();
    }

    // Check if file already exists on GitHub
    const uploadUrl = `https://api.github.com/repos/${OWNER}/${currentRepo}/contents/${filename}`;
    const fileExists = await axios
      .get(uploadUrl, { headers: { Authorization: `token ${GITHUB_TOKEN}` } })
      .then(() => true)
      .catch((err) => {
        if (err.response?.status === 404) return false;
        throw err;
      });

    let finalFilename = filename;
    if (fileExists) {
      const fileExtension = filename.split(".").pop();
      const baseName = filename.replace(`.${fileExtension}`, "");
      finalFilename = `${baseName}-${Date.now()}.${fileExtension}`;
    }

    // Upload the file to GitHub
    const data = { message: `Add ${finalFilename}`, content: content };
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${currentRepo}/contents/${finalFilename}`,
      data,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    const imageUrl = `https://raw.githubusercontent.com/${OWNER}/${currentRepo}/main/${finalFilename}`;
    res.status(200).send({ imageUrl, filename: finalFilename });
  } catch (error) {
    console.error(
      "Error processing image:",
      error.response?.data || error.message
    );
    res.status(500).send({
      message: "Internal server error",
      error: error.response?.data || error.message,
    });
  }
});
module.exports = UserImgUploaderRoutes;
