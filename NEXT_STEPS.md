# 🚀 Next Steps - Start the System

## ✅ Step 1: Verify Python Installation

In your terminal (with venv activated), run:

```bash
cd /Users/apple/Attendance/attendance/python-face-service
source venv/bin/activate

# Check if packages are installed
python -c "import face_recognition; print('✓ face_recognition OK')"
python -c "import flask; print('✓ flask OK')"
python -c "import cv2; print('✓ opencv OK')"
```

If you see errors, run:
```bash
pip install -r requirements.txt
```

## 🚀 Step 2: Start All Services

You need **3 terminal windows** open:

### Terminal 1 - Python Service

```bash
cd /Users/apple/Attendance/attendance/python-face-service
source venv/bin/activate
python app.py
```

**Expected output:**
```
Starting Python Face Recognition Service on 0.0.0.0:5001
Face Recognition service initialized successfully
 * Running on http://0.0.0.0:5001
```

**✅ Keep this terminal open!**

### Terminal 2 - Backend

Open a **NEW terminal**:

```bash
cd /Users/apple/Attendance/attendance/backend
npm start
```

**Expected output:**
```
Database connection established successfully.
✓ Face Recognition Service initialized successfully
Server is running on port 5000
```

**✅ Keep this terminal open!**

### Terminal 3 - Frontend

Open **ANOTHER new terminal**:

```bash
cd /Users/apple/Attendance/attendance/frontend
npm run dev
```

**Expected output:**
```
- ready started server on 0.0.0.0:3000
```

**✅ Keep this terminal open!**

## 🌐 Step 3: Open Browser

Go to: **http://localhost:3000**

## 🧪 Step 4: Test the System

1. **Login** with your credentials
2. **If onboarding not done:**
   - Click "Capture 5 Face Images"
   - Follow instructions for each image:
     - Image 1: Look straight ahead
     - Image 2: Turn head slightly left
     - Image 3: Turn head slightly right
     - Image 4: Neutral expression
     - Image 5: Slight smile
   - Wait for auto-capture (2 seconds after face detected)
   - Complete onboarding

3. **Test Check-in:**
   - Click "Check In"
   - Face should auto-detect and verify
   - Should see "Checked in successfully!"

4. **Test Breaks:**
   - Click "Break" button
   - Start/End breaks (no face scan needed)

## ✅ Verification Checklist

- [ ] Python service running (Terminal 1 shows "Running on port 5001")
- [ ] Backend running (Terminal 2 shows "Server is running on port 5000")
- [ ] Frontend running (Terminal 3 shows "ready started server")
- [ ] Can access http://localhost:3000
- [ ] Can login
- [ ] Onboarding captures 5 images successfully
- [ ] Check-in verifies face automatically

## ❌ Troubleshooting

### "Python service not available"
- **Fix**: Wait 5 seconds after starting Python service, then restart backend
- **Check**: Python service terminal shows "Running on port 5001"

### "face_recognition module not found"
- **Fix**: Make sure venv is activated: `source venv/bin/activate`
- **Fix**: Install: `pip install face-recognition`

### Port already in use
- **Fix**: Stop the service using that port, or change port in `.env` file

### Face detection not working
- **Fix**: Check browser console (F12) for errors
- **Fix**: Make sure camera permissions are granted

## 📊 Service Status

Check if services are running:

```bash
# Check Python service
curl http://localhost:5001/health

# Check Backend
curl http://localhost:5000/api/health
```

## 🎯 Quick Reference

| Service | Port | URL | Status Check |
|---------|------|-----|--------------|
| Python Service | 5001 | http://localhost:5001 | `curl http://localhost:5001/health` |
| Backend | 5000 | http://localhost:5000 | `curl http://localhost:5000/api/health` |
| Frontend | 3000 | http://localhost:3000 | Open in browser |

---

**Ready? Start with Terminal 1 (Python Service)!** 🚀
