const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();

const GetPictureDataByEmailForProfile = express.Router();

const GITHUB_USERNAME = "chobegraphy";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_PREFIX = "ChobegraphyPictureApi";

GetPictureDataByEmailForProfile.get(
  "/get-picture-by-email-for-profile",
  async (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    let allImages = [];

    try {
      // Fetch all repositories
      const repoResponse = await fetch(
        `https://api.github.com/user/repos?per_page=100&type=all`,
        {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      const repos = await repoResponse.json();

      if (!Array.isArray(repos)) {
        return res
          .status(500)
          .json({ message: "Error fetching repositories", error: repos });
      }

      // Filter repositories that match "ChobegraphyPictureApi-*" pattern
      const filteredRepos = repos.filter(
        (repo) =>
          repo.name.startsWith(REPO_PREFIX) &&
          !isNaN(repo.name.replace(REPO_PREFIX, ""))
      );

      // Fetch PictureApi.json from each repo and combine data
      for (const repo of filteredRepos) {
        const fileResponse = await fetch(
          `https://api.github.com/repos/${GITHUB_USERNAME}/${repo.name}/contents/PictureApi.json`,
          {
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              Accept: "application/vnd.github.v3.raw",
            },
          }
        );

        if (fileResponse.ok) {
          const fileData = await fileResponse.json();
          if (Array.isArray(fileData)) {
            allImages = [...allImages, ...fileData];
          }
        }
      }

      // Filter images by author's email
      let filteredImages = allImages.filter(
        (image) => image.author && image.author.email === email
      );

      // Calculate statistics
      const totalUploaded = filteredImages.length;
      const totalApproved = filteredImages.filter(
        (img) => img.status === "approved"
      ).length;
      const totalRejected = filteredImages.filter(
        (img) => img.status === "rejected"
      ).length;
      const totalPending = filteredImages.filter(
        (img) => img.status === "pending"
      ).length;
      const totalDownloads = filteredImages.reduce(
        (sum, img) => sum + (img.download || 0),
        0
      );
      const totalReacts = filteredImages.reduce(
        (sum, img) => sum + (img.react || 0),
        0
      );
      const totalViews = filteredImages.reduce(
        (sum, img) => sum + (img.view || 0),
        0
      );

      res.status(200).json({
        totalUploaded,
        totalApproved,
        totalRejected,
        totalPending,
        totalDownloads,
        totalReacts,
        totalViews,
        email,
        data: filteredImages,
      });
    } catch (error) {
      res.status(500).json({ message: "Server Error", error: error.message });
    }
  }
);

module.exports = GetPictureDataByEmailForProfile;
