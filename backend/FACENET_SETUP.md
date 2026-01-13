# FaceNet Setup Guide

This guide explains how to set up FaceNet for face detection and verification in the attendance system.

## Installation

### 1. Install FaceNet Package

```bash
cd attendance/backend
npm install facenet
```

### 2. Install Python Dependencies (Required for TensorFlow)

FaceNet requires TensorFlow which needs Python. Make sure Python 3.7+ is installed:

```bash
# Check Python version
python3 --version

# Install Python dependencies (if needed)
pip3 install tensorflow
```

### 3. Download FaceNet Models

FaceNet requires model files. The package should download them automatically, but if not:

1. Models will be downloaded to `node_modules/facenet/models/` on first run
2. If download fails, manually download from: https://github.com/huan/node-facenet/releases
3. Extract to `node_modules/facenet/models/`

## Usage

The FaceNet service is automatically initialized when the server starts. It provides:

- **Face Detection**: Detects faces in images
- **Face Embedding**: Generates 128-dimensional face vectors
- **Face Verification**: Compares faces for matching

## API Endpoints

### POST /api/face/detect
Detect face in an image (base64 encoded)

**Request:**
```json
{
  "imageData": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "faceDetected": true,
  "faceCount": 1,
  "boundingBox": {...}
}
```

### POST /api/face/verify
Verify face against stored user face

**Request:**
```json
{
  "imageData": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "verified": true,
  "confidence": 95.5,
  "distance": 0.8
}
```

### POST /api/face/register
Register face for user (store embedding)

**Request:**
```json
{
  "imageData": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Face registered successfully"
}
```

## Troubleshooting

### Error: Cannot find module 'facenet'
- Run `npm install facenet` in the backend directory

### Error: TensorFlow not found
- Install Python 3.7+ and TensorFlow: `pip3 install tensorflow`

### Error: Model files not found
- Models should download automatically on first run
- Check `node_modules/facenet/models/` directory
- Manually download from GitHub releases if needed

### Performance Issues
- FaceNet processing happens on the backend
- First initialization may take 10-30 seconds
- Subsequent requests are faster due to caching

## Notes

- Face embeddings are stored in the `Users.faceEmbedding` column as JSON
- Face verification threshold is set to 1.1 (adjustable in `faceController.js`)
- Lower threshold = stricter matching, Higher threshold = more lenient matching
