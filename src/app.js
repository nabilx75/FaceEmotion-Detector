/**
 * MoodLens Client-Side Application Script
 * Smooth client-side controllers for Camera, Drag & Drop uploads, and beautiful animations.
 */

// Configuration and Constants
const EMOTIONS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise'];

const EMOJI_MAP = {
  happy: '😄',
  sad: '😢',
  angry: '😠',
  fear: '😨',
  disgust: '🤢',
  surprise: '😲',
  neutral: '😐'
};

const COLOR_MAP = {
  happy: '#FFD166',
  sad: '#74B9FF',
  angry: '#FF6B6B',
  fear: '#A29BFE',
  disgust: '#55EFC4',
  surprise: '#FD79A8',
  neutral: '#B2BEC3'
};

// State Variables
let activeTab = 'camera'; // 'camera' or 'upload'
let videoStream = null;
let uploadedImageBase64 = null;

// DOM Elements
const tabCameraBtn = document.getElementById('tab-camera-btn');
const tabUploadBtn = document.getElementById('tab-upload-btn');
const cameraArea = document.getElementById('camera-area');
const uploadArea = document.getElementById('upload-area');

// Camera elements
const videoEl = document.getElementById('webcam-video');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const cameraErrorMessage = document.getElementById('camera-error-message');
const btnStartCamera = document.getElementById('btn-start-camera');
const btnDetectCamera = document.getElementById('btn-detect-camera');

// Upload elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadPreviewContainer = document.getElementById('upload-preview-container');
const uploadPreviewImg = document.getElementById('upload-preview-img');
const dropzonePrompt = document.getElementById('dropzone-prompt');
const btnDetectUpload = document.getElementById('btn-detect-upload');
const btnClearUpload = document.getElementById('btn-clear-upload');

// Results elements
const resultsPlaceholder = document.getElementById('results-placeholder');
const resultsContent = document.getElementById('results-content');
const resultsLoader = document.getElementById('results-loader');
const resultsError = document.getElementById('results-error');
const errorDetails = document.getElementById('error-details');

const resEmoji = document.getElementById('res-emoji');
const resLabel = document.getElementById('res-label');
const resConfidence = document.getElementById('res-confidence');
const barsContainer = document.getElementById('bar-charts-container');

// Tab Switching Mechanism
function switchTab(tab, autoStartCamera = false) {
  activeTab = tab;
  
  if (tab === 'camera') {
    // Buttons
    tabCameraBtn.classList.add('bg-white', 'text-slate-900', 'shadow-md');
    tabCameraBtn.classList.remove('text-slate-600', 'hover:text-slate-900');
    tabUploadBtn.classList.remove('bg-white', 'text-slate-900', 'shadow-md');
    tabUploadBtn.classList.add('text-slate-600', 'hover:text-slate-900');
    
    // Areas
    cameraArea.classList.remove('hidden');
    uploadArea.classList.add('hidden');
    
    // Switch camera setup based on explicit activation
    if (autoStartCamera) {
      initWebcam();
    } else {
      stopWebcam();
      cameraPlaceholder.classList.remove('hidden');
      cameraErrorMessage.classList.add('hidden');
      videoEl.classList.add('hidden');
      btnDetectCamera.setAttribute('disabled', 'true');
      btnDetectCamera.classList.add('opacity-50', 'cursor-not-allowed');
    }
  } else {
    // Buttons
    tabUploadBtn.classList.add('bg-white', 'text-slate-900', 'shadow-md');
    tabUploadBtn.classList.remove('text-slate-600', 'hover:text-slate-900');
    tabCameraBtn.classList.remove('bg-white', 'text-slate-900', 'shadow-md');
    tabCameraBtn.classList.add('text-slate-600', 'hover:text-slate-900');
    
    // Areas
    uploadArea.classList.remove('hidden');
    cameraArea.classList.add('hidden');
    
    // Stop camera
    stopWebcam();
  }
}

// Webcam Stream Controllers
async function initWebcam() {
  stopWebcam();
  cameraPlaceholder.classList.remove('hidden');
  cameraErrorMessage.classList.add('hidden');
  videoEl.classList.add('hidden');
  btnDetectCamera.setAttribute('disabled', 'true');
  btnDetectCamera.classList.add('opacity-50', 'cursor-not-allowed');

  try {
    const constraints = {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    };
    
    videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = videoStream;
    
    videoEl.onloadedmetadata = () => {
      cameraPlaceholder.classList.add('hidden');
      videoEl.classList.remove('hidden');
      btnDetectCamera.removeAttribute('disabled');
      btnDetectCamera.classList.remove('opacity-50', 'cursor-not-allowed');
    };
  } catch (err) {
    console.error('Camera connection failed:', err);
    cameraPlaceholder.classList.add('hidden');
    cameraErrorMessage.classList.remove('hidden');
    
    let helpMsg = 'Could not access camera. If you are inside an embedded frame, please click the "Open in New Tab" button in the top-right to grant camera permissions. Alternatively, you can use the "Upload Image" tab to test with any photo!';
    if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
      helpMsg = 'Camera access was denied. If you are inside an embedded preview frame, please open the application in a new tab using the button in the top right to grant permissions, or use "Upload Image" instead!';
    } else if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
      helpMsg = 'Webcam streams require a secure connection (HTTPS or localhost). Please run the app inside a secure context, or try uploading an image instead!';
    }
    
    document.getElementById('camera-error-txt').innerText = helpMsg;
  }
}

function stopWebcam() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  videoEl.srcObject = null;
}

// Frame Cap Action
function captureFrame() {
  if (!videoStream || videoEl.paused || videoEl.ended) return null;
  
  const canvas = document.createElement('canvas');
  // Capture at 400x300 to minimize base64 payload size while keeping facial clarity
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  
  // Flip the video horizontally to match mirrored preview
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  
  return canvas.toDataURL('image/jpeg', 0.85);
}

// Drag and Drop Controllers
function handleFileSelect(file) {
  if (!file || !file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    uploadedImageBase64 = e.target.result;
    uploadPreviewImg.src = uploadedImageBase64;
    
    dropzonePrompt.classList.add('hidden');
    uploadPreviewContainer.classList.remove('hidden');
    
    btnDetectUpload.removeAttribute('disabled');
    btnDetectUpload.classList.remove('opacity-50', 'cursor-not-allowed');
  };
  reader.readAsDataURL(file);
}

function clearUpload() {
  uploadedImageBase64 = null;
  uploadPreviewImg.src = '';
  dropzonePrompt.classList.remove('hidden');
  uploadPreviewContainer.classList.add('hidden');
  fileInput.value = '';
  
  btnDetectUpload.setAttribute('disabled', 'true');
  btnDetectUpload.classList.add('opacity-50', 'cursor-not-allowed');
  resetResults();
}

// Event Listeners for Upload Zone
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('border-indigo-400', 'bg-indigo-50/50');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('border-indigo-400', 'bg-indigo-50/50');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('border-indigo-400', 'bg-indigo-50/50');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFileSelect(files[0]);
  }
});

dropzone.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    handleFileSelect(e.target.files[0]);
  }
});

// API predict communication
async function requestPrediction(base64Image) {
  // Reset results view to loader
  resultsPlaceholder.classList.add('hidden');
  resultsContent.classList.add('hidden');
  resultsError.classList.add('hidden');
  resultsLoader.classList.remove('hidden');
  
  // Clean prefix 'data:image/...;base64,' if present (let's keep the whole base64 string or let server strip it)
  // Let's pass the raw base64 string including header, the node server and flask backend can both easily handle it!
  // Auto-detect prediction API endpoint:
  // - If running in the production/sandbox console proxy environment, use the local route proxy path.
  // - If running locally (using double-clicked index.html, file protocol, or flat static server), try hitting Flask directly.
  let targetUrl = '/api/predict.php';
  if (
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '' || 
    window.location.protocol === 'file:'
  ) {
    targetUrl = 'http://127.0.0.1:5000/predict';
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ image: base64Image })
    });
    
    if (!response.ok) {
      const textErr = await response.text();
      throw new Error(`Server returned status ${response.status}: ${textErr || 'Unknown error'}`);
    }
    
    const data = await response.json();
    displayPredictionResult(data);
  } catch (err) {
    console.error('Prediction request failed:', err);
    resultsLoader.classList.add('hidden');
    resultsError.classList.remove('hidden');
    
    let instructions = `Error: ${err.message || 'Failed to fetch prediction'}\n\n`;
    instructions += `💡 Quick Setup for Your Local Python Backend:\n`;
    instructions += `1. Make sure Python is installed on your computer.\n`;
    instructions += `2. Open your terminal in this project folder and install dependencies:\n`;
    instructions += `   pip install flask flask-cors torch torchvision timm pillow numpy\n`;
    instructions += `3. Place your model file 'best_efficientnet_b3.pth' in this folder.\n`;
    instructions += `4. Start your local prediction engine:\n`;
    instructions += `   python app.py\n`;
    instructions += `5. Refresh this webpage and test again!`;
    
    errorDetails.innerText = instructions;
  }
}

function resetResults() {
  resultsPlaceholder.classList.remove('hidden');
  resultsContent.classList.add('hidden');
  resultsLoader.classList.add('hidden');
  resultsError.classList.add('hidden');
}

// UI prediction formatter
function displayPredictionResult(data) {
  resultsLoader.classList.add('hidden');
  resultsContent.classList.remove('hidden');
  
  const emotion = (data.emotion || 'neutral').toLowerCase();
  const confidence = data.confidence || 0.0;
  
  // Map predictions cleanly
  resEmoji.innerText = EMOJI_MAP[emotion] || '🤷';
  resLabel.innerText = emotion.charAt(0).toUpperCase() + emotion.slice(1);
  resConfidence.innerText = `${Math.round(confidence * 100)}% Confident`;
  
  // Set glow shadow for top emotion
  const themeColor = COLOR_MAP[emotion] || '#B2BEC3';
  resEmoji.style.textShadow = `0px 10px 30px ${themeColor}AA`;
  
  // Clear the existing bar scales and rebuild safely
  barsContainer.innerHTML = '';
  
  const scores = data.scores || {};
  
  // Ensure we sort scores or display them in a standard visual hierarchy
  // Let's list all 7 classes in the requested order (Happy, Sad, Angry, Fear, Disgust, Surprise, Neutral) or by score weight!
  // Sizable display: list Happy, Sad, Angry, Fear, Disgust, Surprise, Neutral in order so it is structured
  const sortedClasses = ['happy', 'sad', 'angry', 'fear', 'disgust', 'surprise', 'neutral'];
  
  sortedClasses.forEach(cls => {
    const scoreVal = scores[cls] !== undefined ? scores[cls] : 0.0;
    const percentage = Math.round(scoreVal * 100);
    const accentCol = COLOR_MAP[cls] || '#B2BEC3';
    
    const targetEmotionName = cls.charAt(0).toUpperCase() + cls.slice(1);
    
    const wrapper = document.createElement('div');
    wrapper.className = 'space-y-1.5';
    
    wrapper.innerHTML = `
      <div class="flex items-center justify-between text-sm">
        <span class="font-semibold text-slate-800 flex items-center gap-1.5">
          <span>${EMOJI_MAP[cls]}</span>
          <span>${targetEmotionName}</span>
        </span>
        <span class="font-bold text-slate-500">${percentage}%</span>
      </div>
      <div class="w-full bg-slate-150/60 rounded-full h-2 overflow-hidden">
        <div class="h-full rounded-full transition-all duration-1000 ease-out-bounce" 
             style="width: 0%; background-color: ${accentCol}; box-shadow: 0 0 12px ${accentCol}66;">
        </div>
      </div>
    `;
    
    barsContainer.appendChild(wrapper);
    
    // Delayed trigger for progress bar loading animation
    setTimeout(() => {
      const fillBar = wrapper.querySelector('div > div');
      if (fillBar) {
        fillBar.style.width = `${percentage}%`;
      }
    }, 50);
  });
}

// Bind Global Actions
tabCameraBtn.addEventListener('click', () => switchTab('camera', false));
tabUploadBtn.addEventListener('click', () => switchTab('upload'));

btnStartCamera.addEventListener('click', () => initWebcam());

btnDetectCamera.addEventListener('click', () => {
  const base64Data = captureFrame();
  if (base64Data) {
    requestPrediction(base64Data);
  } else {
    alert('Failed to capture framework from camera stream. Please try again.');
  }
});

btnDetectUpload.addEventListener('click', () => {
  if (uploadedImageBase64) {
    requestPrediction(uploadedImageBase64);
  }
});

btnClearUpload.addEventListener('click', () => {
  clearUpload();
});

// Initialization Flow
document.addEventListener('DOMContentLoaded', () => {
  switchTab('camera', false);
});

// Clean up webcam stream when page unload to save browser CPU
window.addEventListener('beforeunload', () => {
  stopWebcam();
});
