# Python Face Recognition Service Setup Guide

This guide explains how to set up and run the Python Face Recognition Service for the attendance system.

## 📁 Project Structure

```
attendance/
├── frontend/          (React/Next.js - no changes)
├── backend/           (Node.js - updated to call Python service)
└── python-face-service/  (NEW - Python microservice)
    ├── app.py
    ├── face_service.py
    ├── config.py
    ├── requirements.txt
    ├── .env
    └── README.md
```

## 🚀 Quick Start

### Step 1: Install Python Dependencies

```bash
cd attendance/python-face-service

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Install System Dependencies

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
- Install CMake from https://cmake.org/

### Step 3: Configure Environment

Edit `python-face-service/.env`:
```env
PYTHON_SERVICE_HOST=0.0.0.0
PYTHON_SERVICE_PORT=5001
PYTHON_SERVICE_API_KEY=your-secret-api-key-change-in-production
FACE_RECOGNITION_TOLERANCE=0.5
```

### Step 4: Update Backend Environment

Add to `backend/.env`:
```env
PYTHON_SERVICE_URL=http://localhost:5001
PYTHON_SERVICE_API_KEY=your-secret-api-key-change-in-production
```

**Important:** Use the same API key in both `.env` files!

### Step 5: Start Python Service

```bash
cd attendance/python-face-service
python app.py
```

You should see:
```
Starting Python Face Recognition Service on 0.0.0.0:5001
Face Recognition service initialized successfully
```

### Step 6: Start Node.js Backend

In a new terminal:
```bash
cd attendance/backend
npm start
```

The backend will automatically connect to the Python service.

## ✅ Verification

1. Check Python service health:
   ```bash
   curl http://localhost:5001/health
   ```

2. Check Node.js backend:
   ```bash
   curl http://localhost:5000/api/health
   ```

## 🔧 Troubleshooting

### Python service won't start
- Check if port 5001 is available
- Check logs in `python-face-service/logs/app.log`
- Verify all dependencies are installed

### face_recognition installation fails
- Make sure cmake and dlib system dependencies are installed
- On macOS, install Xcode Command Line Tools: `xcode-select --install`

### Backend can't connect to Python service
- Verify Python service is running on port 5001
- Check API key matches in both `.env` files
- Check firewall settings

### Import errors
- Make sure virtual environment is activated
- Reinstall: `pip install -r requirements.txt --force-reinstall`

## 📝 Features Implemented

✅ Real face recognition using Python face_recognition library
✅ Multiple embeddings per user (5 images during onboarding)
✅ Face comparison with confidence scoring
✅ Rate limiting and security
✅ Comprehensive logging
✅ Auto-capture on face detection
✅ Multiple image capture during onboarding

## 🎯 Next Steps

1. Start Python service: `cd python-face-service && python app.py`
2. Start Node.js backend: `cd backend && npm start`
3. Start frontend: `cd frontend && npm run dev`
4. Test onboarding flow - should capture 5 face images
5. Test check-in flow - should verify against all stored embeddings

## 📚 API Endpoints

### Python Service (Port 5001)
- `GET /health` - Health check
- `POST /generate-embedding` - Generate face embedding
- `POST /compare-faces` - Compare face embeddings
- `POST /detect-face` - Detect face in image

All endpoints require `X-API-Key` header.

## 🔐 Security

- API key authentication required
- Rate limiting (60 requests/minute by default)
- Input validation
- Error handling
- Comprehensive logging

## 📊 Database Changes

- `UserFaceProfile.faceEmbedding` now stores JSON array of embeddings
- `UserFaceProfile.embeddingCount` tracks number of embeddings
- Database automatically migrates on server start
