const faceNetService = require('../services/faceNetService');
const { User, UserFaceProfile } = require('../models');

// Generate embedding from image (for registration or verification)
exports.generateEmbedding = async (req, res) => {
  try {
    const { imageData } = req.body; // Base64 image string

    if (!imageData) {
      return res.status(400).json({ 
        success: false,
        message: 'Image data is required' 
      });
    }

    // Process image with FaceNet to generate embedding
    const result = await faceNetService.processImage(imageData);

    if (!result || !result.faceDetected) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'No face detected in the image. Please ensure your face is clearly visible.',
        faceDetected: false
      });
    }

    // Validate embedding is 128-D
    if (!result.embedding || !Array.isArray(result.embedding) || result.embedding.length !== 128) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate face embedding. Please try again.',
        faceDetected: false
      });
    }

    res.json({
      success: true,
      message: 'Face embedding generated successfully',
      embedding: result.embedding,
      faceCount: result.faceCount
    });
  } catch (error) {
    console.error('Embedding generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating face embedding',
      error: error.message
    });
  }
};

// Verify face against stored user face
exports.verifyFace = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageData } = req.body; // Base64 image string

    if (!imageData) {
      return res.status(400).json({ 
        success: false,
        message: 'Image data is required',
        verified: false
      });
    }

    // Get user's stored face profile
    const faceProfile = await UserFaceProfile.findOne({ 
      where: { 
        userId, 
        isActive: true 
      } 
    });
    
    if (!faceProfile) {
      return res.status(400).json({
        success: false,
        message: 'No face profile found. Please complete face registration first.',
        verified: false
      });
    }

    // Process current image to generate embedding
    const result = await faceNetService.processImage(imageData);

    if (!result || !result.faceDetected) {
      return res.status(400).json({
        success: false,
        message: result?.message || 'No face detected in the image. Please ensure your face is clearly visible.',
        verified: false
      });
    }

    // Validate embedding
    if (!result.embedding || !Array.isArray(result.embedding) || result.embedding.length !== 128) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process face. Please try again.',
        verified: false
      });
    }

    // Parse stored embeddings (now an array of embeddings)
    const storedEmbeddings = JSON.parse(faceProfile.faceEmbedding);
    
    // Validate stored embeddings
    if (!Array.isArray(storedEmbeddings) || storedEmbeddings.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Invalid stored face profile. Please re-register your face.',
        verified: false
      });
    }

    // Validate each stored embedding is 128-D
    const validEmbeddings = storedEmbeddings.filter(emb => 
      Array.isArray(emb) && emb.length === 128
    );

    if (validEmbeddings.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Invalid stored face profile. Please re-register your face.',
        verified: false
      });
    }

    // Compare against all stored embeddings (use Python service)
    const verification = await faceNetService.verifyFaces(
      validEmbeddings,
      result.embedding,
      0.5 // Threshold for face matching (Python service uses 0.5)
    );

    res.json({
      success: true,
      verified: verification.isMatch,
      confidence: Math.round(verification.confidence * 100) / 100,
      distance: Math.round(verification.distance * 1000) / 1000,
      message: verification.isMatch 
        ? 'Face verified successfully' 
        : 'Face verification failed. Please try again.',
      threshold: 1.1
    });
  } catch (error) {
    console.error('Face verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying face',
      error: error.message,
      verified: false
    });
  }
};

// Register face for user (store multiple embeddings in UserFaceProfile)
exports.registerFace = async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageData, imageDataArray } = req.body; // Accept single image or array of images

    // Support both single image and array of images
    const imagesToProcess = imageDataArray || (imageData ? [imageData] : []);

    if (imagesToProcess.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Image data is required. Provide imageData or imageDataArray.' 
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Process all images and generate embeddings
    const embeddings = [];
    const errors = [];

    for (let i = 0; i < imagesToProcess.length; i++) {
      const imageDataItem = imagesToProcess[i];
      
      try {
        const result = await faceNetService.processImage(imageDataItem);

        if (!result || !result.faceDetected) {
          errors.push(`Image ${i + 1}: ${result?.message || 'No face detected'}`);
          continue;
        }

        // Validate embedding is 128-D
        if (!result.embedding || !Array.isArray(result.embedding) || result.embedding.length !== 128) {
          errors.push(`Image ${i + 1}: Invalid embedding generated`);
          continue;
        }

        embeddings.push(result.embedding);
      } catch (error) {
        errors.push(`Image ${i + 1}: ${error.message}`);
      }
    }

    // Require at least 3 successful embeddings
    if (embeddings.length < 3) {
      return res.status(400).json({
        success: false,
        message: `Only ${embeddings.length} valid embeddings generated. Need at least 3. Errors: ${errors.join('; ')}`,
        successfulCount: embeddings.length,
        errors: errors
      });
    }

    // Check if face profile already exists
    let faceProfile = await UserFaceProfile.findOne({ where: { userId } });
    
    if (faceProfile) {
      // Update existing profile with new embeddings
      faceProfile.faceEmbedding = JSON.stringify(embeddings);
      faceProfile.embeddingCount = embeddings.length;
      faceProfile.modelVersion = 'face-recognition-python';
      faceProfile.isActive = true;
      await faceProfile.save();
    } else {
      // Create new profile
      faceProfile = await UserFaceProfile.create({
        userId,
        faceEmbedding: JSON.stringify(embeddings),
        embeddingCount: embeddings.length,
        modelVersion: 'face-recognition-python',
        isActive: true
      });
    }

    res.json({
      success: true,
      message: `Face registered successfully with ${embeddings.length} embeddings`,
      faceProfileId: faceProfile.id,
      embeddingCount: embeddings.length,
      warnings: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Face registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering face',
      error: error.message
    });
  }
};
