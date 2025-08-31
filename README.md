# Stereo Point Cloud Demo

A demo webapp to capture stereo video from two smartphones (left & right), stream them to a host, and generate a real-time dense point cloud in 3D using OpenCV.js and Three.js.

## Usage
1. Deploy this repo (Render, Railway, Replit, etc).
2. Open the URL on:
   - Phone 1 → select **Left Camera**
   - Phone 2 → select **Right Camera**
   - Laptop/PC → select **Host**
3. The host will show the two video feeds and render the real-time point cloud.

## Notes
- Uses Node.js + WebSockets for signaling.
- Dense depth from StereoSGBM (OpenCV.js).
- Visualization with Three.js.
- For proper scaling, calibrate cameras and set intrinsic/extrinsic params.
