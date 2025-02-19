const express = require("express");
const cors = require("cors");
const createUploaderRoutes = require("./UploadPhotoToRepo"); // Import the uploader routes
const createRepoSizeRoutes = require("./repoSize"); // Import repoSize API
const UserDataRouter = require("./UserDataRouter");

const addDataRoutes = require("./createUploaderRoutes"); // Import the addData routes

const MostViewedAndLovedPicture = require("./MostViewedAndLovedPicture");
const SinglePictureImgDetails = require("./GetSingleImgData");
const Suggestions = require("./Suggestions");
require("dotenv").config();
const UpdateView = require("./UpdateViewCount");
const UpdateDownload = require("./UpdateDownloadCount");
const PictureLike = require("./PictureLikeGetDelete");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(cors());

// Environment variables
const githubToken = process.env.GITHUB_TOKEN;
const repoOwner = process.env.REPO_OWNER;

// picture storage repo name
const PhotoUploadRepoName = "PictureStorage-1";

// Routes
app.get("/", (req, res) => {
  res.send("Chobegraphy is running");
});

const repoSizeRoutes = createRepoSizeRoutes({
  githubToken,
  repoOwner,
  PhotoUploadRepoName,
});

app.use(
  "/api",
  createUploaderRoutes,
  repoSizeRoutes,
  addDataRoutes,
  UserDataRouter,
  MostViewedAndLovedPicture,
  SinglePictureImgDetails,
  Suggestions,
  UpdateView,
  UpdateDownload,
  PictureLike
);

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

// Export the app for Vercel
module.exports = app;
