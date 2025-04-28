const express = require("express");
const axios = require("axios");
const GetFixedLink = express.Router();

// Function to fix and sanitize the URL
function fixImageUrl(url) {
  const baseURL = "https://raw.githubusercontent.com/";

  // Check if the URL contains the base URL
  if (url.includes(baseURL)) {
    const pathPart = url.split(baseURL)[1]; // Get the path after the base URL

    // Decode the URL, removing unnecessary encoding
    let decodedPath = decodeURIComponent(pathPart);

    // Ensure we don't encode backslashes, and remove them if necessary
    decodedPath = decodedPath.replace(/\\/g, ""); // Remove any backslashes

    // Then encode the path, but leave any backslashes or slashes untouched
    const encodedPath = encodeURIComponent(decodedPath).replace(/%2F/g, "/"); // Only encode slashes

    // Return the fixed URL
    return baseURL + encodedPath;
  }

  // If the URL doesn't contain the base part, just encode the whole URL (fallback case)
  return encodeURIComponent(url);
}

// Get Fixed URL API endpoint
GetFixedLink.get("/get-fixed-link", async (req, res) => {
  try {
    const { url } = req.query; // Get the URL from query params

    // Check if URL is provided
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Fix the URL by encoding it
    const fixedUrl = fixImageUrl(url);

    // If the URL is successfully fixed, return it
    res.status(200).json({ fixedLink: fixedUrl });
  } catch (error) {
    console.error("Error processing the URL:", error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
});

module.exports = GetFixedLink;
