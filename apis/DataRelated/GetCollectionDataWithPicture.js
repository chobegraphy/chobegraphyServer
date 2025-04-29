const express = require("express");
const axios = require("axios");
require("dotenv").config();

const GetCollectionDataWithPicture = express.Router();

const GITHUB_USERNAME = "chobegraphy";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const COLLECTION_REPO_PREFIX = "Collections";
const PICTURE_REPO_PREFIX = "ChobegraphyPictureApi";

// Headers for GitHub API
const headers = {
  Authorization: `token ${GITHUB_TOKEN}`,
  Accept: "application/vnd.github.v3.raw",
};

// Fetch all repositories
async function fetchRepos() {
  const res = await axios.get(
    "https://api.github.com/user/repos?per_page=100&type=all",
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  return res.data;
}

// Fetch collection data from repo
async function fetchCollectionsFromRepo(repoName) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/contents/Collections.json`,
      { headers }
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

// Fetch picture data from repo
async function fetchPicturesFromRepo(repoName) {
  try {
    const res = await axios.get(
      `https://api.github.com/repos/${GITHUB_USERNAME}/${repoName}/contents/PictureApi.json`,
      { headers }
    );
    return Array.isArray(res.data) ? res.data : [];
  } catch {
    return [];
  }
}

// GET route
GetCollectionDataWithPicture.get(
  "/get-collections-with-picture",
  async (req, res) => {
    try {
      const allRepos = await fetchRepos();

      const collectionRepos = allRepos.filter((repo) =>
        repo.name.startsWith(COLLECTION_REPO_PREFIX)
      );

      const pictureRepos = allRepos.filter(
        (repo) =>
          repo.name.startsWith(PICTURE_REPO_PREFIX) &&
          !isNaN(repo.name.replace(PICTURE_REPO_PREFIX, ""))
      );

      // Fetch and merge all collections
      let allCollections = [];
      for (const repo of collectionRepos) {
        const collections = await fetchCollectionsFromRepo(repo.name);
        allCollections.push(...collections);
      }

      // Fetch and merge all approved pictures
      let allApprovedPictures = [];
      for (const repo of pictureRepos) {
        const pictures = await fetchPicturesFromRepo(repo.name);
        allApprovedPictures.push(
          ...pictures.filter((pic) => pic.status === "approved")
        );
      }

      // Group latest picture for each collection
      const collectionMap = {};

      for (const picture of allApprovedPictures) {
        if (!Array.isArray(picture.collections)) continue;

        for (const col of picture.collections) {
          const key = `${col.label}|${col.value}`;
          const current = collectionMap[key];

          if (
            !current ||
            new Date(picture.uploadedTime) > new Date(current.uploadedTime)
          ) {
            collectionMap[key] = {
              label: col.label,
              value: col.value,
              uploadedTime: picture.uploadedTime,
              examplePicture: {
                encodedUrl: picture.encodedUrl,
                url: picture.url,
                thumbnail: picture.thumbnail,
              },
            };
          }
        }
      }

      // Filter collections that have matching pictures
      const collectionsWithPictures = allCollections
        .map((col) => {
          const key = `${col.label}|${col.value}`;
          const matched = collectionMap[key];
          if (matched) {
            return {
              ...col,
              examplePicture: matched.examplePicture,
            };
          }
          return null;
        })
        .filter(Boolean); // Remove nulls

      res.status(200).json(collectionsWithPictures);
    } catch (error) {
      console.error("Error:", error.message);
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  }
);

module.exports = GetCollectionDataWithPicture;
