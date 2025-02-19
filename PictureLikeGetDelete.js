const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const PictureLike = express.Router();
PictureLike.use(cors());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OWNER = "chobegraphy";
const LIKED_REPO_BASE = "PictureLikedStorage";
const LIKED_FILE_PATH = "Storage.json";
const MAX_REPO_SIZE = 4.5 * 1024 * 1024 * 1024; // 4.5 GB in bytes

// Function to check repo size
async function getRepoSize(repo) {
  const response = await axios.get(
    `https://api.github.com/repos/${OWNER}/${repo}`,
    {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    }
  );
  return response.data.size * 1024; // size is in KB, convert to bytes
}

// Function to create a new repository
async function createNewRepo(baseRepoName) {
  const newRepoName = `${baseRepoName}-${Date.now()}`;
  await axios.post(
    "https://api.github.com/user/repos",
    {
      name: newRepoName,
      private: true, // All repositories are private
    },
    {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    }
  );

  // Initialize the Storage.json file in the new repository
  await axios.put(
    `https://api.github.com/repos/${OWNER}/${newRepoName}/contents/${LIKED_FILE_PATH}`,
    {
      message: "Initialize Storage.json",
      content: Buffer.from(JSON.stringify([])).toString("base64"),
    },
    {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    }
  );

  return newRepoName;
}

// Function to find the next available repo name
async function findAvailableRepoName() {
  let repoIndex = 1;
  let newRepoName;

  while (true) {
    newRepoName = `${LIKED_REPO_BASE}-${repoIndex}`;
    const size = await getRepoSize(newRepoName).catch(() => 0); // Handle not found errors
    if (size < MAX_REPO_SIZE) {
      return newRepoName;
    }
    repoIndex++;
  }
}

// POST route to add a liked picture for a user
PictureLike.post("/LikePicture", async (req, res) => {
  try {
    const { UserId, PictureId } = req.body;

    // Determine the appropriate repository to use
    let repoName = await findAvailableRepoName();

    // Check if the Storage.json file exists, if not, create it
    try {
      await axios.get(
        `https://api.github.com/repos/${OWNER}/${repoName}/contents/${LIKED_FILE_PATH}`,
        {
          headers: { Authorization: `token ${GITHUB_TOKEN}` },
        }
      );
    } catch (error) {
      if (error.response.status === 404) {
        // File does not exist, create it
        await createNewRepo(repoName);
      }
    }

    // Fetch storage data from GitHub
    const getFileResponse = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repoName}/contents/${LIKED_FILE_PATH}`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    const fileContent = Buffer.from(
      getFileResponse.data.content,
      "base64"
    ).toString("utf8");
    const storageData = JSON.parse(fileContent);

    // Find the user data by UserId
    let userData = storageData.find((user) => user.UserId === UserId);
    if (!userData) {
      // If user doesn't exist, create a new one
      userData = { UserId, PictureLiked: [] };
      storageData.push(userData);
    }

    // Check if the PictureId already exists in the liked array
    if (!userData.PictureLiked.includes(PictureId)) {
      userData.PictureLiked.push(PictureId);
    }

    // Encode updated data back to base64
    const updatedContent = Buffer.from(
      JSON.stringify(storageData, null, 2)
    ).toString("base64");

    // Update file on GitHub
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${repoName}/contents/${LIKED_FILE_PATH}`,
      {
        message: `Liked picture ${PictureId} for user ${UserId}`,
        content: updatedContent,
        sha: getFileResponse.data.sha,
      },
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    res.status(200).json({
      success: true,
      message: "Picture liked successfully",
      updatedData: userData, // Send updated user data
    });
  } catch (error) {
    console.error(
      "Error liking picture:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to like picture" });
  }
});

// GET route to fetch liked pictures for a user
// GET route to fetch liked pictures for a user
PictureLike.get("/LikedPictures/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Get all repositories that belong to the owner and include private ones
    const reposResponse = await axios.get(
      `https://api.github.com/user/repos?per_page=100`, // use /user/repos for authenticated user
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    const likedRepos = reposResponse.data
      .filter((repo) => repo.name.startsWith(LIKED_REPO_BASE))
      .map((repo) => repo.name);

    console.log("Liked Repositories:", likedRepos);

    let likedPictures = [];

    // Fetch liked pictures from each repository
    for (const repo of likedRepos) {
      try {
        const getFileResponse = await axios.get(
          `https://api.github.com/repos/${OWNER}/${repo}/contents/${LIKED_FILE_PATH}`,
          {
            headers: { Authorization: `token ${GITHUB_TOKEN}` },
          }
        );

        const fileContent = Buffer.from(
          getFileResponse.data.content,
          "base64"
        ).toString("utf8");
        const storageData = JSON.parse(fileContent);

        // Find the user data by userId
        const userData = storageData.find((user) => user.UserId === userId);
        if (userData) {
          likedPictures = likedPictures.concat(userData.PictureLiked || []);
        } else {
          console.log(`User ${userId} not found in repo ${repo}`);
        }
      } catch (error) {
        console.error(
          `Error fetching liked pictures from ${repo}:`,
          error.response?.data || error.message
        );
      }
    }

    res.status(200).json({
      success: true,
      likedPictures,
    });
  } catch (error) {
    console.error(
      "Error fetching liked pictures:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch liked pictures" });
  }
});

// DELETE route to remove a liked picture for a user
PictureLike.delete("/UnlikePicture", async (req, res) => {
  try {
    const { UserId, PictureId } = req.body;

    // Get the appropriate repository
    const repoName = await findAvailableRepoName();

    // Fetch storage data from GitHub
    const getFileResponse = await axios.get(
      `https://api.github.com/repos/${OWNER}/${repoName}/contents/${LIKED_FILE_PATH}`,
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    const fileContent = Buffer.from(
      getFileResponse.data.content,
      "base64"
    ).toString("utf8");
    const storageData = JSON.parse(fileContent);

    // Find the user data by UserId
    const userData = storageData.find((user) => user.UserId === UserId);
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    // Remove PictureId from the liked array
    userData.PictureLiked = userData.PictureLiked.filter(
      (id) => id !== PictureId
    );

    // Encode updated data back to base64
    const updatedContent = Buffer.from(
      JSON.stringify(storageData, null, 2)
    ).toString("base64");

    // Update file on GitHub
    await axios.put(
      `https://api.github.com/repos/${OWNER}/${repoName}/contents/${LIKED_FILE_PATH}`,
      {
        message: `Unliked picture ${PictureId} for user ${UserId}`,
        content: updatedContent,
        sha: getFileResponse.data.sha,
      },
      {
        headers: { Authorization: `token ${GITHUB_TOKEN}` },
      }
    );

    res.status(200).json({
      success: true,
      message: "Picture unliked successfully",
      updatedData: userData, // Send updated user data
    });
  } catch (error) {
    console.error(
      "Error unliking picture:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to unlike picture" });
  }
});

module.exports = PictureLike;
