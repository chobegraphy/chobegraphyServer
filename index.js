const express = require("express");
const cors = require("cors");
const createUploaderRoutes = require("./postPhotoToRepo"); // Import the uploader routes
const createRepoSizeRoutes = require("./repoSize"); // Import repoSize API
const UserDataRouter = require("./UserDataRouter");

const addDataRoutes = require("./createUploaderRoutes"); // Import the addData routes
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(cors());

// Environment variables
const githubToken = process.env.GITHUB_TOKEN;
const repoOwner = process.env.REPO_OWNER;
const PhotoUploadRepoName = process.env.PHOTO_UPLOAD_REPO_NAME;

// Routes
app.get("/", (req, res) => {
  res.send("Chobegraphy is running");
});

// Add GitHub uploader routes
const uploaderRoutes = createUploaderRoutes({
  githubToken,
  repoOwner,
  PhotoUploadRepoName,
});

const repoSizeRoutes = createRepoSizeRoutes({
  githubToken,
  repoOwner,
  PhotoUploadRepoName,
});

app.use("/api", uploaderRoutes, repoSizeRoutes, addDataRoutes, UserDataRouter);

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

// Export the app for Vercel
module.exports = app;
