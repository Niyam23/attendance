# 🚀 Run the System NOW - Simple Steps

## ⚡ Quick Start (3 Steps)

### Step 1: Install Python Dependencies (One-time setup)

```bash
# Install system dependencies (macOS)
brew install cmake dlib

# Set up Python service
cd /Users/apple/Attendance/attendance/python-face-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

⏱️ **This takes 10-15 minutes** (compiling dlib takes time)

### Step 2: Start All Services

**Option A - Use the script (macOS)**:
```bash
cd /Users/apple/Attendance/attendance
./START_ALL.sh
```

**Option B - Manual (3 terminals)**:

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

### Step 3: Open Browser

Go to: **http://localhost:3000**

## ✅ What Should Happen

1. **Python Service** shows: `Running on http://0.0.0.0:5001`
2. **Backend** shows: `✓ Face Recognition Service initialized successfully`
3. **Frontend** shows: `ready started server on 0.0.0.0:3000`
4. **Browser** opens the login page

## 🧪 Test It

1. Login with your credentials
2. If onboarding not done → Click "Capture 5 Face Images"
3. Follow instructions to capture 5 images
4. Complete onboarding
5. Try check-in → Face should auto-detect and verify

## ❌ Troubleshooting

### "Python service not available"
- Make sure Python service is running (Terminal 1)
- Check API key matches in both `.env` files
- Wait 5 seconds after starting Python service

### "face_recognition module not found"
- Activate virtual environment: `source venv/bin/activate`
- Reinstall: `pip install -r requirements.txt`

### "dlib installation failed"
- Install cmake: `brew install cmake`
- Then retry: `pip install -r requirements.txt`

### Port already in use
- Change port in `.env` file
- Or stop the service using that port

## 📝 Environment Files Status

✅ Python service `.env` created
✅ Backend `.env` updated with Python service config

**API Key**: `attendance-system-secret-key-2024` (set in both files)

## 🎯 Next Steps After Running

1. Complete onboarding (capture 5 face images)
2. Test check-in (should auto-verify face)
3. Test check-out (should auto-verify face)
4. Test breaks (should work without face scan)

---

**Ready? Start with Step 1!** 🚀
