const express = require('express');
const router = express.Router();
const faceController = require('../controllers/faceController');
const { authenticate } = require('../middleware/auth');

// Face embedding and verification routes
router.post('/generate-embedding', authenticate, faceController.generateEmbedding);
router.post('/register', authenticate, faceController.registerFace);
router.post('/verify', authenticate, faceController.verifyFace);

module.exports = router;
