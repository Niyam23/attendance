import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Server Configuration
    HOST = os.getenv('PYTHON_SERVICE_HOST', '0.0.0.0')
    PORT = int(os.getenv('PYTHON_SERVICE_PORT', 5001))
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
    
    # Face Recognition Configuration
    FACE_RECOGNITION_TOLERANCE = float(os.getenv('FACE_RECOGNITION_TOLERANCE', '0.5'))
    FACE_DETECTION_MODEL = os.getenv('FACE_DETECTION_MODEL', 'hog')  # 'hog' or 'cnn'
    
    # Security Configuration
    API_KEY = os.getenv('PYTHON_SERVICE_API_KEY', 'your-secret-api-key-change-in-production')
    RATE_LIMIT_PER_MINUTE = int(os.getenv('RATE_LIMIT_PER_MINUTE', '60'))
    
    # File Paths
    TEMP_DIR = os.path.join(os.path.dirname(__file__), 'temp')
    MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
    LOGS_DIR = os.path.join(os.path.dirname(__file__), 'logs')
    
    # Image Configuration
    MAX_IMAGE_SIZE = int(os.getenv('MAX_IMAGE_SIZE', '5242880'))  # 5MB
    SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png']
    
    # Ensure directories exist
    @staticmethod
    def ensure_directories():
        os.makedirs(Config.TEMP_DIR, exist_ok=True)
        os.makedirs(Config.MODELS_DIR, exist_ok=True)
        os.makedirs(Config.LOGS_DIR, exist_ok=True)
