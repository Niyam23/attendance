# Fix for Python 3.12 Installation Issue

## Problem
Python 3.12 removed `distutils`, causing numpy installation to fail.

## Solution

### Option 1: Install dlib First (Recommended)

```bash
cd /Users/apple/Attendance/attendance/python-face-service
source venv/bin/activate

# Install dlib first (this compiles from source)
pip install dlib

# Then install other requirements
pip install -r requirements.txt
```

### Option 2: Use Pre-built Wheels

```bash
cd /Users/apple/Attendance/attendance/python-face-service
source venv/bin/activate

# Upgrade pip and build tools
pip install --upgrade pip setuptools wheel

# Install numpy first (use newer version with Python 3.12 wheels)
pip install "numpy>=1.26.0"

# Install other packages
pip install -r requirements.txt
```

### Option 3: Install Packages One by One

```bash
cd /Users/apple/Attendance/attendance/python-face-service
source venv/bin/activate

pip install flask flask-cors
pip install "numpy>=1.26.0"
pip install opencv-python
pip install Pillow python-dotenv werkzeug
pip install face-recognition
```

## If dlib Installation Fails

Make sure you have cmake installed:
```bash
brew install cmake
```

Then retry dlib installation:
```bash
pip install dlib
```

## Verify Installation

```bash
python -c "import face_recognition; print('✓ face_recognition OK')"
python -c "import flask; print('✓ flask OK')"
python -c "import cv2; print('✓ opencv OK')"
```
