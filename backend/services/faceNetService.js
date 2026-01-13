// Face recognition service using Python microservice
const axios = require('axios');
const path = require('path');

class FaceNetService {
  constructor() {
    this.initialized = false;
    this.pythonServiceUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';
    this.apiKey = process.env.PYTHON_SERVICE_API_KEY || 'your-secret-api-key-change-in-production';
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      console.log('Initializing Face Recognition service (Python microservice)...');
      
      // Check if Python service is available
      try {
        const response = await axios.get(`${this.pythonServiceUrl}/health`, {
          timeout: 5000,
          validateStatus: function (status) {
            return status < 500; // Don't throw for 4xx errors
          }
        });
        
        if (response.status === 200 && response.data && response.data.success) {
          console.log('Python Face Recognition Service is available');
          this.initialized = true;
        } else {
          console.warn('Python service health check returned:', response.status, response.data);
          // Still initialize - service might be starting up
          this.initialized = true;
          console.log('Proceeding with initialization (service may be starting up)');
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          console.error('Python Face Recognition Service is not running on', this.pythonServiceUrl);
          console.error('Please start the Python service first: cd python-face-service && python app.py');
        } else {
          console.error('Python Face Recognition Service connection error:', error.message);
        }
        this.initialized = false;
        throw new Error('Python Face Recognition Service is not available. Please start the Python service.');
      }
    } catch (error) {
      console.error('Error initializing Face Recognition:', error);
      this.initialized = false;
      throw error;
    }
  }

  // Call Python service to generate embedding
  async generateEmbeddingFromPython(imageData) {
    try {
      const response = await axios.post(
        `${this.pythonServiceUrl}/generate-embedding`,
        { imageData },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      if (response.data.success && response.data.embedding) {
        return {
          success: true,
          embedding: response.data.embedding,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          message: response.data.message || 'Failed to generate embedding'
        };
      }
    } catch (error) {
      console.error('Error calling Python service:', error.message);
      if (error.response) {
        return {
          success: false,
          message: error.response.data?.message || 'Python service error'
        };
      } else if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          message: 'Python Face Recognition Service is not running. Please start the service.'
        };
      } else {
        return {
          success: false,
          message: `Network error: ${error.message}`
        };
      }
    }
  }

  // Call Python service to compare faces
  async compareFacesWithPython(knownEmbeddings, unknownEmbedding) {
    try {
      const response = await axios.post(
        `${this.pythonServiceUrl}/compare-faces`,
        {
          knownEmbeddings,
          unknownEmbedding
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.apiKey
          },
          timeout: 30000
        }
      );

      if (response.data.success) {
        return {
          success: true,
          match: response.data.match,
          distance: response.data.distance,
          confidence: response.data.confidence,
          message: response.data.message
        };
      } else {
        return {
          success: false,
          match: false,
          message: response.data.message || 'Comparison failed'
        };
      }
    } catch (error) {
      console.error('Error calling Python service for comparison:', error.message);
      if (error.response) {
        return {
          success: false,
          match: false,
          message: error.response.data?.message || 'Python service error'
        };
      } else {
        return {
          success: false,
          match: false,
          message: `Network error: ${error.message}`
        };
      }
    }
  }

  // Process base64 image and generate embedding
  async processImage(base64String) {
    try {
      // Initialize if not already done
      if (!this.initialized) {
        await this.initialize();
      }

      // Validate base64 image data
      if (!base64String || base64String.length < 100) {
        return {
          faceDetected: false,
          message: 'Invalid image data'
        };
      }

      // Call Python service to generate embedding
      const result = await this.generateEmbeddingFromPython(base64String);

      if (!result.success) {
        return {
          faceDetected: false,
          message: result.message || 'Failed to process image'
        };
      }

      // Validate embedding
      if (!result.embedding || !Array.isArray(result.embedding) || result.embedding.length !== 128) {
        return {
          faceDetected: false,
          message: 'Failed to generate valid face embedding. Please try again.'
        };
      }

      return {
        faceDetected: true,
        faceCount: 1,
        embedding: result.embedding,
        boundingBox: null
      };
    } catch (error) {
      console.error('Error processing image:', error);
      return {
        faceDetected: false,
        message: error.message || 'Error processing image. Please ensure your face is clearly visible.'
      };
    }
  }

  // Calculate distance between two face embeddings (fallback, but Python service handles this)
  calculateDistance(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }

    let sum = 0;
    for (let i = 0; i < embedding1.length; i++) {
      const diff = embedding1[i] - embedding2[i];
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }

  // Verify if two faces match using Python service
  async verifyFaces(knownEmbeddings, unknownEmbedding, threshold = 0.5) {
    try {
      // Use Python service for comparison
      const result = await this.compareFacesWithPython(knownEmbeddings, unknownEmbedding);

      if (!result.success) {
        return {
          isMatch: false,
          distance: null,
          confidence: 0,
          message: result.message
        };
      }

      return {
        isMatch: result.match,
        distance: result.distance,
        confidence: result.confidence,
        message: result.message
      };
    } catch (error) {
      console.error('Error verifying faces:', error);
      // Fallback to local calculation if Python service fails
      if (knownEmbeddings.length > 0 && unknownEmbedding) {
        const distances = knownEmbeddings.map(known => this.calculateDistance(known, unknownEmbedding));
        const minDistance = Math.min(...distances);
        const isMatch = minDistance < threshold;
        
        return {
          isMatch,
          distance: minDistance,
          confidence: isMatch ? (1 - Math.min(minDistance / threshold, 1)) * 100 : 0,
          message: isMatch ? 'Match found' : 'No match found'
        };
      }
      
      return {
        isMatch: false,
        distance: null,
        confidence: 0,
        message: 'Verification error'
      };
    }
  }
}

// Export singleton instance
const faceNetService = new FaceNetService();

module.exports = faceNetService;
