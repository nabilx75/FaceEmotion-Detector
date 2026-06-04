#!/usr/bin/env python3
"""
MoodLens Python Flask Inference Server
Loads EfficientNet-B3 model and runs facial expression emotion detection.

To run:
1. Install dependencies:
   pip install flask flask-cors torch torchvision timm pillow numpy

2. Ensure 'best_efficientnet_b3.pth' is in the same directory.
3. Start the server:
   python app.py
"""

import os
import base64
import logging
from io import BytesIO
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MoodLensPredictor")

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from the browser

# Global variables for PyTorch model
model = None
device = "cpu"
CLASSES = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

def init_model():
    global model, device
    import torch
    import timm

    device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Using device: {device}")

    model_path = os.path.join(os.path.dirname(__file__), "best_efficientnet_b3.pth")
    
    # Load model structure with timm
    logger.info("Initializing EfficientNet-B3 architecture via timm...")
    model = timm.create_model('efficientnet_b3', pretrained=False, num_classes=len(CLASSES))

    if os.path.exists(model_path):
        logger.info(f"Loading weights from {model_path}...")
        try:
            # Map storage safely
            state_dict = torch.load(model_path, map_location=device)
            model.load_state_dict(state_dict)
            logger.info("Model weights loaded successfully!")
        except Exception as e:
            logger.error(f"Error loading model weights: {e}")
            logger.warning("Starting Flask app with uninitialized random weights.")
    else:
        logger.warning(f"File '{model_path}' not found. Please upload/place model weights to enable correct prediction scores.")

    model.to(device)
    model.eval()

# Lazy-load torch/timm on first predict request so Flask boots instantly
def get_model():
    global model
    if model is None:
        init_model()
    return model

def preprocess_image(base64_str):
    """
    Transforms base64 string image to preprocessed PyTorch Tensor:
    Convert to Grayscale -> Resize 48x48 -> Convert to RGB -> Normalize -> Unsqueeze
    """
    # Strip metadata header if present (e.g. "data:image/jpeg;base64,")
    if "base64," in base64_str:
        base64_str = base64_str.split("base64,")[1]

    # Decode base64 bytes and open with Pillow
    image_bytes = base64.b64decode(base64_str)
    image = Image.open(BytesIO(image_bytes))

    # Preprocessing operations requested:
    # 1. Convert to grayscale
    image = image.convert('L')
    # 2. Resize to 48x48
    image = image.resize((48, 48))
    # 3. Convert to RGB
    image = image.convert('RGB')

    # Convert to Numpy Array and rescale to [0.0, 1.0] (ToTensor equivalent)
    img_np = np.array(image, dtype=np.float32) / 255.0

    # ImageNet mean and std normalization
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    img_np = (img_np - mean) / std

    # Transpose layout from HWC to CHW (Channels-First)
    img_np = img_np.transpose(2, 0, 1)

    import torch
    # Convert numpy array to pytorch tensor and add Batch Dimension (unsqueeze(0))
    tensor = torch.tensor(img_np, dtype=torch.float32).unsqueeze(0)
    return tensor

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json(force=True)
        if not data or "image" not in data:
            return jsonify({"error": "No image field found in request JSON"}), 400

        base64_img = data["image"]
        import torch

        # Preprocess incoming expression image
        input_tensor = preprocess_image(base64_img).to(device)

        # Retrieve model & execute forward pass
        active_model = get_model()
        with torch.no_grad():
            outputs = active_model(input_tensor)
            # Apply softmax to calculate probabilities
            probabilities = torch.softmax(outputs, dim=1).squeeze(0).cpu().numpy()

        # Map scores to respective emotion outputs
        scores = {}
        for idx, cls in enumerate(CLASSES):
            scores[cls] = float(probabilities[idx])

        # Find highest classification prediction
        top_idx = np.argmax(probabilities)
        pred_class = CLASSES[top_idx]
        confidence = float(probabilities[top_idx])

        response_payload = {
            "emotion": pred_class,
            "confidence": confidence,
            "scores": scores
        }
        
        logger.info(f"Predicted emotion: '{pred_class}' with confidence {confidence:.2f}")
        return jsonify(response_payload)

    except Exception as e:
        logger.exception("Prediction failed:")
        return jsonify({"error": f"Internal Server Error: {str(e)}"}), 500

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "classes": CLASSES})

if __name__ == "__main__":
    logger.info("Starting MoodLens Flask Prediction Server...")
    # Run on all network interfaces on port 5000
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)
