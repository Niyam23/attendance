#!/bin/bash

echo "🔧 Installing Python Face Recognition Service Dependencies..."
echo ""

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip setuptools wheel

# Install numpy first (compatible with Python 3.12)
echo "📦 Installing numpy..."
pip install "numpy>=1.26.0"

# Install other dependencies
echo "📦 Installing other dependencies..."
pip install flask flask-cors opencv-python Pillow python-dotenv werkzeug

# Install face-recognition (this will install dlib as dependency)
echo "📦 Installing face-recognition (this may take 5-10 minutes)..."
pip install face-recognition

echo ""
echo "✅ Installation complete!"
echo ""
echo "Verify installation:"
python -c "import face_recognition; print('✓ face_recognition OK')" 2>/dev/null && echo "✓ All packages installed successfully!" || echo "⚠ Some packages may need manual installation"
