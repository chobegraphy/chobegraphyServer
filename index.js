const express = require("express");
const bodyParser = require("body-parser");

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

// file related
const UploadMainPicture = require("./apis/FileRelated/UploadMainPicture");
const UpdateMainPicture = require("./apis/FileRelated/UpdateMainPicture");
const UploadThumbnailPicture = require("./apis/FileRelated/UploadThumbnailPicture");
const UpdateThumbnailPicture = require("./apis/FileRelated/UpdateThumbnailPicture");
const UploadEncodedPicture = require("./apis/FileRelated/UploadEncodedPicture");
const UploadUserPicture = require("./apis/FileRelated/UploadUserPicture");
const UpdateEncodedPicture = require("./apis/FileRelated/UpdateEncodedPicture");
// data related
const GetFixedLink = require("./apis/DataRelated/GetFixedLink");
const AddNewCollection = require("./apis/DataRelated/AddNewCollection");
const AddUploadPictureData = require("./apis/DataRelated/AddUploadPictureData");
const UpdatePictureData = require("./apis/DataRelated/UpdatePictureData");
const GetCollectionsData = require("./apis/DataRelated/GetCollectionsData");
const GetImgCount = require("./apis/DataRelated/GetImgCount");
const GetPictureData = require("./apis/DataRelated/GetPictureData");
const GetSuggestionData = require("./apis/DataRelated/GetSuggestionData");
const GetUserCount = require("./apis/DataRelated/GetUserCount");
const PictureLikeGetDelete = require("./apis/DataRelated/PictureLikeGetDelete");
const GetPictureDataByEmail = require("./apis/DataRelated/GetDataByEmail");
const GetPictureStatusCount = require("./apis/DataRelated/GetPictureStatusCount");
const GetCollectionDataWithPicture = require("./apis/DataRelated/GetCollectionDataWithPicture");

const TeamGetPictureDataByStatus = require("./apis/DataRelated/TeamGetDataByStatus");
const TeamApprovePicture = require("./apis/DataRelated/TeamApprovePicture");
const TeamRejectPicture = require("./apis/DataRelated/TeamRejectPicture");
const GetTeamMembers = require("./apis/DataRelated/GetTeamMembers");
const GetPictureDataByEmailForProfile = require("./apis/DataRelated/GetPictureDataForProfile");
const UpdateUserData = require("./apis/DataRelated/UpdateUserData");
const GetSingleUser = require("./apis/DataRelated/GetSingleUser");
//
const IncreaseDecreasePictureLike = require("./apis/DataRelated/IncreaseDecreasePictureLike");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" })); // Adjust as needed
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
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
  UploadMainPicture,
  UpdateMainPicture,
  UploadThumbnailPicture,
  UpdateThumbnailPicture,
  UploadEncodedPicture,
  UpdateEncodedPicture,
  UploadUserPicture,
  AddNewCollection,
  AddUploadPictureData,
  UpdatePictureData,
  GetCollectionsData,
  GetImgCount,
  GetPictureData,
  GetSuggestionData,
  GetUserCount,
  PictureLikeGetDelete,
  IncreaseDecreasePictureLike,
  GetPictureDataByEmail,
  TeamGetPictureDataByStatus,
  TeamApprovePicture,
  TeamRejectPicture,
  GetTeamMembers,
  GetPictureDataByEmailForProfile,
  UpdateUserData,
  GetSingleUser,
  GetFixedLink,
  GetPictureStatusCount,
  GetCollectionDataWithPicture,
  //
  createUploaderRoutes,
  repoSizeRoutes,
  addDataRoutes,
  UserDataRouter,
  MostViewedAndLovedPicture,
  SinglePictureImgDetails,
  Suggestions,
  UpdateView,
  UpdateDownload
);

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

// Export the app for Vercel
module.exports = app;
