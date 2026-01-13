from flask import Flask, request, jsonify
from flask_cors import CORS
from face_service import face_service
from config import Config
import logging
import time
from functools import wraps
from collections import defaultdict
from datetime import datetime, timedelta

# Ensure directories exist
Config.ensure_directories()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"{Config.LOGS_DIR}/app.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Rate limiting storage
rate_limit_storage = defaultdict(list)

def rate_limit(max_per_minute=60):
    """Simple rate limiting decorator"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client IP
            client_ip = request.remote_addr
            
            # Clean old entries (older than 1 minute)
            now = time.time()
            rate_limit_storage[client_ip] = [
                timestamp for timestamp in rate_limit_storage[client_ip]
                if now - timestamp < 60
            ]
            
            # Check rate limit
            if len(rate_limit_storage[client_ip]) >= max_per_minute:
                logger.warning(f"Rate limit exceeded for IP: {client_ip}")
                return jsonify({
                    'success': False,
                    'message': 'Rate limit exceeded. Please try again later.'
                }), 429
            
            # Add current request
            rate_limit_storage[client_ip].append(now)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_api_key(f):
    """API key authentication decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        api_key = request.headers.get('X-API-Key') or request.args.get('api_key')
        
        if not api_key or api_key != Config.API_KEY:
            logger.warning(f"Unauthorized API access attempt from IP: {request.remote_addr}")
            return jsonify({
                'success': False,
                'message': 'Unauthorized. Invalid API key.'
            }), 401
        
        return f(*args, **kwargs)
    return decorated_function

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint - no authentication required"""
    return jsonify({
        'success': True,
        'message': 'Python Face Recognition Service is running',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/generate-embedding', methods=['POST'])
@rate_limit(max_per_minute=Config.RATE_LIMIT_PER_MINUTE)
@require_api_key
def generate_embedding():
    """Generate face embedding from base64 image"""
    try:
        data = request.get_json()
        
        if not data or 'imageData' not in data:
            return jsonify({
                'success': False,
                'message': 'imageData is required'
            }), 400
        
        image_data = data['imageData']
        
        # Validate image
        is_valid, error_message = face_service.validate_image(image_data)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': error_message
            }), 400
        
        # Generate embedding
        embedding, error = face_service.generate_embedding(image_data)
        
        if error:
            return jsonify({
                'success': False,
                'message': error,
                'faceDetected': False
            }), 400
        
        return jsonify({
            'success': True,
            'message': 'Face embedding generated successfully',
            'embedding': embedding,
            'embeddingLength': len(embedding),
            'faceDetected': True
        })
        
    except Exception as e:
        logger.error(f"Error in generate-embedding: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/compare-faces', methods=['POST'])
@rate_limit(max_per_minute=Config.RATE_LIMIT_PER_MINUTE)
@require_api_key
def compare_faces():
    """Compare face embeddings"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'message': 'Request body is required'
            }), 400
        
        known_embeddings = data.get('knownEmbeddings', [])
        unknown_embedding = data.get('unknownEmbedding')
        
        if not known_embeddings:
            return jsonify({
                'success': False,
                'message': 'knownEmbeddings is required'
            }), 400
        
        if not unknown_embedding:
            return jsonify({
                'success': False,
                'message': 'unknownEmbedding is required'
            }), 400
        
        # Compare faces
        result = face_service.compare_faces(known_embeddings, unknown_embedding)
        
        return jsonify({
            'success': True,
            **result
        })
        
    except Exception as e:
        logger.error(f"Error in compare-faces: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/detect-face', methods=['POST'])
@rate_limit(max_per_minute=Config.RATE_LIMIT_PER_MINUTE)
@require_api_key
def detect_face():
    """Detect if face exists in image"""
    try:
        data = request.get_json()
        
        if not data or 'imageData' not in data:
            return jsonify({
                'success': False,
                'message': 'imageData is required'
            }), 400
        
        image_data = data['imageData']
        
        # Validate image
        is_valid, error_message = face_service.validate_image(image_data)
        if not is_valid:
            return jsonify({
                'success': False,
                'message': error_message,
                'faceDetected': False
            }), 400
        
        # Convert to image
        image = face_service.base64_to_image(image_data)
        image_array = face_service.image_to_numpy(image)
        
        # Detect face
        face_location, error = face_service.detect_face(image_array)
        
        if error:
            return jsonify({
                'success': False,
                'message': error,
                'faceDetected': False
            }), 400
        
        return jsonify({
            'success': True,
            'message': 'Face detected successfully',
            'faceDetected': True,
            'faceLocation': face_location
        })
        
    except Exception as e:
        logger.error(f"Error in detect-face: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}',
            'faceDetected': False
        }), 500

if __name__ == '__main__':
    logger.info(f"Starting Python Face Recognition Service on {Config.HOST}:{Config.PORT}")
    logger.info(f"Face recognition tolerance: {Config.FACE_RECOGNITION_TOLERANCE}")
    logger.info(f"Detection model: {Config.FACE_DETECTION_MODEL}")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
