'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react';
import axiosInstance from '../utils/axios';
import { Camera, X, CheckCircle, AlertCircle } from 'lucide-react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

interface FaceCaptureProps {
  onFaceCaptured: (imageData: string) => void;
  onClose: () => void;
  isOpen?: boolean;
  currentImageIndex?: number;
  totalImages?: number;
}

const FaceCapture: React.FC<FaceCaptureProps> = ({ 
  onFaceCaptured, 
  onClose, 
  isOpen = true,
  currentImageIndex = 0,
  totalImages = 1
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<FaceDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const stableDetectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDetectionResultRef = useRef<boolean>(false);
  const consecutiveFailuresRef = useRef<number>(0);
  const autoCapturedRef = useRef<boolean>(false);

  // Initialize MediaPipe Face Detector
  const initializeDetector = useCallback(async () => {
    if (detectorRef.current) return detectorRef.current;

    try {
      console.log('Initializing MediaPipe Face Detector...');
      
      // Use local WASM files from public folder to avoid CORS issues
      const wasmPath = '/wasm';
      
      let vision;
      try {
        console.log(`Loading WASM from local path: ${wasmPath}`);
        vision = await FilesetResolver.forVisionTasks(wasmPath);
        console.log('Successfully loaded WASM files from local path');
      } catch (localError: any) {
        console.warn('Failed to load local WASM files, trying CDN:', localError.message);
        
        // Fallback to CDN if local files don't work
        const cdnSources = [
          'https://unpkg.com/@mediapipe/tasks-vision@0.10.22/wasm',
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm'
        ];

        let lastError = localError;
        for (const cdn of cdnSources) {
          try {
            console.log(`Trying to load WASM from CDN: ${cdn}`);
            vision = await FilesetResolver.forVisionTasks(cdn);
            console.log('Successfully loaded WASM files from CDN');
            break;
          } catch (err: any) {
            lastError = err;
            console.warn(`Failed to load from ${cdn}:`, err.message);
            continue;
          }
        }

        if (!vision) {
          throw lastError || new Error('Could not load MediaPipe WASM files from local or CDN sources.');
        }
      }
      
      console.log('Creating FaceDetector...');
      
      // Try GPU first, fallback to CPU if GPU fails
      let faceDetector;
      try {
        faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: 'GPU'
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
          minSuppressionThreshold: 0.3
        });
        console.log('FaceDetector initialized with GPU');
      } catch (gpuError: any) {
        console.warn('GPU initialization failed, falling back to CPU:', gpuError.message);
        faceDetector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: 'CPU'
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
          minSuppressionThreshold: 0.3
        });
        console.log('FaceDetector initialized with CPU');
      }

      detectorRef.current = faceDetector;
      return faceDetector;
    } catch (err: any) {
      console.error('Error initializing MediaPipe:', err);
      const errorMessage = err.message || 'Unknown error';
      setError(`Failed to initialize face detection: ${errorMessage}. Please ensure you have internet connection and restart the dev server if you just updated next.config.js`);
      return null;
    }
  }, []);

  // Stable face detection - requires consistent detection for 2 seconds, then auto-capture
  const confirmFaceDetected = useCallback(() => {
    if (stableDetectionTimeoutRef.current) {
      clearTimeout(stableDetectionTimeoutRef.current);
    }

    stableDetectionTimeoutRef.current = setTimeout(() => {
      if (lastDetectionResultRef.current && videoRef.current && canvasRef.current && !autoCapturedRef.current) {
        setFaceDetected(true);
        setError(null);
        
        // Auto-capture after face is confirmed
        setTimeout(() => {
          if (videoRef.current && canvasRef.current && !isCapturing && !autoCapturedRef.current) {
            autoCapturedRef.current = true;
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            
            if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = canvas.toDataURL('image/jpeg', 0.9);
              onFaceCaptured(imageData);
            }
          }
        }, 500); // Small delay to ensure UI updates
      }
    }, 2000); // 2 seconds of consistent detection
  }, [onFaceCaptured, isCapturing]);

  const resetFaceDetection = useCallback(() => {
    if (stableDetectionTimeoutRef.current) {
      clearTimeout(stableDetectionTimeoutRef.current);
      stableDetectionTimeoutRef.current = null;
    }
    lastDetectionResultRef.current = false;
    setFaceDetected(false);
  }, []);

  // Detect face using MediaPipe
  const detectFace = useCallback(async (video: HTMLVideoElement, detector: FaceDetector) => {
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA || !detector) {
      return;
    }

    try {
      const startTimeMs = performance.now();
      const detections = detector.detectForVideo(video, startTimeMs);

      if (detections && detections.detections && detections.detections.length > 0) {
        // Face detected
        lastDetectionResultRef.current = true;
        consecutiveFailuresRef.current = 0;
        confirmFaceDetected();

        // Draw bounding box on canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            const detection = detections.detections[0];
            const bbox = detection.boundingBox;
            
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Draw green bounding box
            if (bbox) {
              ctx.strokeStyle = '#10b981';
              ctx.lineWidth = 4;
              ctx.strokeRect(bbox.originX, bbox.originY, bbox.width, bbox.height);
            }
          }
        }
      } else {
        // No face detected
        lastDetectionResultRef.current = false;
        consecutiveFailuresRef.current += 1;

        if (consecutiveFailuresRef.current >= 3) {
          resetFaceDetection();
        }

        // Clear canvas
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(video, 0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      }
    } catch (err) {
      console.error('Face detection error:', err);
      lastDetectionResultRef.current = false;
      consecutiveFailuresRef.current += 1;
      
      if (consecutiveFailuresRef.current >= 3) {
        resetFaceDetection();
      }
    }
  }, [confirmFaceDetected, resetFaceDetection]);

  // Start camera and face detection when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Reset all state
    setFaceDetected(false);
    setError(null);
    setIsCapturing(false);
    lastDetectionResultRef.current = false;
    consecutiveFailuresRef.current = 0;
    autoCapturedRef.current = false;

    // Clear any existing timeouts
    if (stableDetectionTimeoutRef.current) {
      clearTimeout(stableDetectionTimeoutRef.current);
      stableDetectionTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const startCamera = async () => {
      try {
        // Stop any existing stream first
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Initialize detector
        const detector = await initializeDetector();
        if (!detector) {
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          }
        });
        
        if (videoRef.current && canvasRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          
          videoRef.current.onloadedmetadata = () => {
            if (videoRef.current && canvasRef.current) {
              const video = videoRef.current;
              canvasRef.current.width = video.videoWidth;
              canvasRef.current.height = video.videoHeight;
              
              video.play().catch(console.error);
              
              // Start face detection loop
              const detectLoop = async () => {
                if (video.readyState === video.HAVE_ENOUGH_DATA && detector) {
                  await detectFace(video, detector);
                }
                if (isOpen) {
                  animationFrameRef.current = requestAnimationFrame(detectLoop);
                }
              };
              
              // Wait a bit before starting detection to let camera stabilize
              setTimeout(() => {
                detectLoop();
              }, 500);
            }
          };
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
        setError('Camera access denied. Please allow camera permissions.');
      }
    };

    startCamera();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (stableDetectionTimeoutRef.current) {
        clearTimeout(stableDetectionTimeoutRef.current);
        stableDetectionTimeoutRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, initializeDetector, detectFace]);

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !faceDetected) {
      if (!faceDetected) {
        setError('No face detected. Please ensure your face is clearly visible in the frame.');
      }
      return;
    }

    setIsCapturing(true);
    setError(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      setError('Camera not ready. Please wait a moment and try again.');
      setIsCapturing(false);
      return;
    }

    // Capture current frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.9);

    // Send captured image to parent component
    onFaceCaptured(imageData);
    setIsCapturing(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Capture Your Face</h2>
            {totalImages > 1 && (
              <p className="text-sm text-gray-600 mt-1">
                Image {currentImageIndex + 1} of {totalImages}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isCapturing}
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          ) : (
            <>
              <div className="relative bg-gray-900 rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
                
                {faceDetected && (
                  <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full flex items-center gap-2 z-10 animate-pulse">
                    <CheckCircle size={18} />
                    <span className="font-semibold">Face Detected - Ready!</span>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Instructions:</strong> {totalImages > 1 
                    ? `Position your face in the center. For image ${currentImageIndex + 1}, ${currentImageIndex === 0 ? 'look straight ahead' : currentImageIndex === 1 ? 'turn your head slightly left' : currentImageIndex === 2 ? 'turn your head slightly right' : currentImageIndex === 3 ? 'look straight with a neutral expression' : 'look straight with a slight smile'}.`
                    : 'Position your face in the center of the frame. Make sure your face is clearly visible and well-lit.'}
                </p>
                <p className="text-xs text-blue-600">
                  {faceDetected 
                    ? '✓ Face detected - Capturing automatically...' 
                    : 'Position your face in the center and look at the camera'}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isCapturing}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                {!faceDetected && (
                  <div className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 font-semibold rounded-lg flex items-center justify-center gap-2">
                    <Camera size={20} />
                    Waiting for face detection...
                  </div>
                )}
                {faceDetected && (
                  <div className="flex-1 px-4 py-3 bg-teal-600 text-white font-semibold rounded-lg flex items-center justify-center gap-2">
                    <CheckCircle size={20} />
                    Processing...
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FaceCapture;
