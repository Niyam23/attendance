# Quick Start Guide - Run the System

Follow these steps to get everything running.

## Prerequisites Check

1. **Python 3.8+** installed
   ```bash
   python3 --version
   ```

2. **Node.js** installed (you already have this)
   ```bash
   node --version
   ```

3. **MySQL** running (you already have this)

## Step-by-Step Setup

### Step 1: Install Python System Dependencies (macOS)

```bash
# Install Homebrew if you don't have it
# Then run:
brew install cmake
brew install dlib
```

**Note**: This may take 10-15 minutes. Be patient!

### Step 2: Set Up Python Service

```bash
# Navigate to Python service folder
cd /Users/apple/Attendance/attendance/python-face-service

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

**Important**: The `face_recognition` library installation may take 5-10 minutes as it compiles C++ code.

### Step 3: Configure Environment Variables

#### Python Service (.env)
```bash
cd /Users/apple/Attendance/attendance/python-face-service

# Edit .env file (or create from .env.example)
# Set a secure API key:
PYTHON_SERVICE_API_KEY=your-secret-key-12345-change-this
```

#### Node.js Backend (.env)
```bash
cd /Users/apple/Attendance/attendance/backend

# Add these lines to your existing .env file:
PYTHON_SERVICE_URL=http://localhost:5001
PYTHON_SERVICE_API_KEY=your-secret-key-12345-change-this
```

**CRITICAL**: Use the SAME API key in both files!

### Step 4: Start Python Service

```bash
cd /Users/apple/Attendance/attendance/python-face-service

# Make sure virtual environment is activated
source venv/bin/activate

# Start the service
python app.py
```

**Expected output**:
```
Starting Python Face Recognition Service on 0.0.0.0:5001
Face Recognition service initialized successfully
 * Running on http://0.0.0.0:5001
```

**Keep this terminal open!**

### Step 5: Start Node.js Backend (New Terminal)

Open a **NEW terminal window**:

```bash
cd /Users/apple/Attendance/attendance/backend

# Start backend
npm start
```

**Expected output**:
```
Database connection established successfully.
✓ Face Recognition Service initialized successfully
✓ UserFaceProfiles table already exists
Server is running on port 5000
```

**Keep this terminal open!**

### Step 6: Start Frontend (New Terminal)

Open **ANOTHER new terminal window**:

```bash
cd /Users/apple/Attendance/attendance/frontend

# Start frontend
npm run dev
```

**Expected output**:
```
- ready started server on 0.0.0.0:3000
```

### Step 7: Test the System

1. **Open browser**: http://localhost:3000
2. **Login** with your credentials
3. **Go to onboarding** (if not completed)
4. **Click "Capture 5 Face Images"**
5. **Follow instructions** - capture 5 images
6. **Complete onboarding**
7. **Try check-in** - should verify your face automatically

## Troubleshooting

### Python service won't start

**Error**: `ModuleNotFoundError: No module named 'face_recognition'`
- **Fix**: Make sure virtual environment is activated: `source venv/bin/activate`

**Error**: `dlib installation failed`
- **Fix**: Install cmake first: `brew install cmake`, then retry `pip install -r requirements.txt`

**Error**: Port 5001 already in use
- **Fix**: Change port in `.env` file: `PYTHON_SERVICE_PORT=5002`

### Backend can't connect to Python service

**Error**: `Python Face Recognition Service is not available`
- **Fix**: 
  1. Check Python service is running (Step 4)
  2. Check API key matches in both `.env` files
  3. Check Python service URL is correct: `http://localhost:5001`

### Face detection not working

**Error**: MediaPipe WASM files not loading
- **Fix**: 
  1. Check `public/wasm/` folder exists
  2. Run: `cd frontend && npm run postinstall`
  3. Restart frontend

## Quick Commands Reference

### Start Everything (3 terminals needed)

**Terminal 1 - Python Service**:
```bash
cd /Users/apple/Attendance/attendance/python-face-service
source venv/bin/activate
python app.py
```

**Terminal 2 - Backend**:
```bash
cd /Users/apple/Attendance/attendance/backend
npm start
```

**Terminal 3 - Frontend**:
```bash
cd /Users/apple/Attendance/attendance/frontend
npm run dev
```

### Stop Everything

- Press `Ctrl+C` in each terminal
- Or close terminal windows

## Verification Checklist

- [ ] Python service running on port 5001
- [ ] Backend running on port 5000
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000
- [ ] Can login
- [ ] Onboarding captures 5 images
- [ ] Check-in verifies face

## Need Help?

Check logs:
- Python: `python-face-service/logs/app.log`
- Backend: Check terminal output
- Frontend: Check browser console (F12)
