import face_recognition
import numpy as np
import cv2
from PIL import Image
import io
import base64
import os
import logging
from config import Config

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(Config.LOGS_DIR, 'face_service.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class FaceService:
    def __init__(self):
        self.tolerance = Config.FACE_RECOGNITION_TOLERANCE
        self.model = Config.FACE_DETECTION_MODEL
        logger.info(f"FaceService initialized with tolerance: {self.tolerance}, model: {self.model}")
    
    def base64_to_image(self, base64_string):
        """Convert base64 string to PIL Image"""
        try:
            # Remove data URL prefix if present
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            # Decode base64
            image_data = base64.b64decode(base64_string)
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            return image
        except Exception as e:
            logger.error(f"Error converting base64 to image: {str(e)}")
            raise ValueError(f"Invalid image data: {str(e)}")
    
    def image_to_numpy(self, image):
        """Convert PIL Image to numpy array for face_recognition"""
        return np.array(image)
    
    def detect_face(self, image_array):
        """Detect faces in image using face_recognition"""
        try:
            # Find face locations
            face_locations = face_recognition.face_locations(image_array, model=self.model)
            
            if len(face_locations) == 0:
                return None, "No face detected in image"
            
            if len(face_locations) > 1:
                return None, "Multiple faces detected. Please ensure only one face is visible."
            
            return face_locations[0], None
        except Exception as e:
            logger.error(f"Error detecting face: {str(e)}")
            return None, f"Face detection error: {str(e)}"
    
    def generate_embedding(self, base64_string):
        """Generate 128-D face embedding from base64 image"""
        try:
            # Convert base64 to image
            image = self.base64_to_image(base64_string)
            
            # Convert to numpy array
            image_array = self.image_to_numpy(image)
            
            # Detect face
            face_location, error = self.detect_face(image_array)
            if error:
                return None, error
            
            # Generate face encoding (128-D embedding)
            face_encodings = face_recognition.face_encodings(image_array, [face_location])
            
            if len(face_encodings) == 0:
                return None, "Failed to generate face embedding"
            
            # Convert numpy array to list
            embedding = face_encodings[0].tolist()
            
            logger.info(f"Successfully generated embedding of length: {len(embedding)}")
            return embedding, None
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return None, f"Embedding generation error: {str(e)}"
    
    def compare_faces(self, known_embeddings, unknown_embedding):
        """Compare unknown embedding with known embeddings"""
        try:
            if not known_embeddings or len(known_embeddings) == 0:
                return {
                    'match': False,
                    'distance': None,
                    'confidence': 0,
                    'message': 'No stored embeddings found'
                }
            
            # Convert lists to numpy arrays
            known_embeddings_array = np.array(known_embeddings)
            unknown_embedding_array = np.array(unknown_embedding)
            
            # Calculate face distances
            face_distances = face_recognition.face_distance(
                known_embeddings_array,
                unknown_embedding_array
            )
            
            # Find best match (lowest distance)
            best_match_index = np.argmin(face_distances)
            best_distance = float(face_distances[best_match_index])
            
            # Check if match (distance < tolerance)
            is_match = best_distance < self.tolerance
            
            # Calculate confidence (0-100)
            if is_match:
                # Confidence increases as distance decreases
                confidence = max(0, min(100, (1 - (best_distance / self.tolerance)) * 100))
            else:
                confidence = 0
            
            result = {
                'match': is_match,
                'distance': round(best_distance, 4),
                'confidence': round(confidence, 2),
                'best_match_index': int(best_match_index),
                'message': 'Match found' if is_match else 'No match found'
            }
            
            logger.info(f"Face comparison: match={is_match}, distance={best_distance:.4f}, confidence={confidence:.2f}%")
            return result
            
        except Exception as e:
            logger.error(f"Error comparing faces: {str(e)}")
            return {
                'match': False,
                'distance': None,
                'confidence': 0,
                'message': f'Comparison error: {str(e)}'
            }
    
    def validate_image(self, base64_string):
        """Validate image before processing"""
        try:
            # Check size
            if len(base64_string) > Config.MAX_IMAGE_SIZE:
                return False, f"Image too large. Maximum size: {Config.MAX_IMAGE_SIZE / 1024 / 1024}MB"
            
            # Try to decode and validate
            image = self.base64_to_image(base64_string)
            
            # Check dimensions
            width, height = image.size
            if width < 100 or height < 100:
                return False, "Image too small. Minimum size: 100x100 pixels"
            
            if width > 5000 or height > 5000:
                return False, "Image too large. Maximum size: 5000x5000 pixels"
            
            return True, None
            
        except Exception as e:
            return False, f"Invalid image: {str(e)}"

# Create singleton instance
face_service = FaceService()
