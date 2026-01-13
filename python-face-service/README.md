# Python Face Recognition Service

This is a separate Python microservice for face recognition processing. It provides face embedding generation and comparison capabilities for the attendance system.

## Setup Instructions

### 1. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python3 -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Install System Dependencies

The `face_recognition` library requires `dlib`, which needs system dependencies:

**macOS:**
```bash
brew install cmake
brew install dlib
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install cmake
sudo apt-get install libdlib-dev
```

**Windows:**
- Install Visual Studio Build Tools
- Install CMake

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env file with your settings
# Important: Change PYTHON_SERVICE_API_KEY to a secure value
```

### 4. Start the Service

```bash
python app.py
```

The service will start on `http://localhost:5001` (or port specified in .env)

## API Endpoints

All endpoints require `X-API-Key` header or `api_key` query parameter.

### Health Check
- `GET /health` - Check if service is running

### Generate Embedding
- `POST /generate-embedding`
- Body: `{ "imageData": "base64_image_string" }`
- Returns: `{ "success": true, "embedding": [128-D array], ... }`

### Compare Faces
- `POST /compare-faces`
- Body: `{ "knownEmbeddings": [[...], [...]], "unknownEmbedding": [...] }`
- Returns: `{ "success": true, "match": true/false, "distance": 0.xx, "confidence": 95.5, ... }`

### Detect Face
- `POST /detect-face`
- Body: `{ "imageData": "base64_image_string" }`
- Returns: `{ "success": true, "faceDetected": true, ... }`

## Integration with Node.js Backend

The Node.js backend will call this Python service via HTTP requests. Make sure:

1. Python service is running before starting Node.js backend
2. API key matches in both services
3. Port is accessible (check firewall if needed)

## Troubleshooting

### face_recognition installation fails
- Make sure system dependencies (dlib, cmake) are installed
- On macOS, you may need Xcode Command Line Tools

### Service won't start
- Check if port 5001 is already in use
- Check logs in `logs/app.log`

### Import errors
- Make sure virtual environment is activated
- Reinstall dependencies: `pip install -r requirements.txt --force-reinstall`

## Logs

Logs are stored in:
- `logs/app.log` - Application logs
- `logs/face_service.log` - Face recognition service logs
