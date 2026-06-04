# FaceMood AI

FaceMood AI is a local web app that detects facial emotions from uploaded images or live camera input. The frontend runs in the browser, while a lightweight Python Flask backend loads an EfficientNet-B3 PyTorch model to predict emotions.

## Features

- Upload an image and predict the visible facial emotion
- Use a live camera feed for real-time scanning
- Local Flask prediction API
- EfficientNet-B3 PyTorch model support
- Emotion classes: angry, disgust, fear, happy, neutral, sad, surprise

## Project Structure

```text
.
├── index.html
├── app.py
├── start.bat
├── best_efficientnet_b3.pth
├── src/
└── assets/
```

## Requirements

- Python 3.10 or newer
- A browser such as Chrome, Edge, or Firefox
- The model file:

```text
best_efficientnet_b3.pth
```

## Install Dependencies

Run this once inside the project folder:

```bash
pip install flask flask-cors torch torchvision timm pillow numpy
```

## Run The App

On Windows, start everything with one command:

```bash
start.bat
```

Then open:

```text
http://localhost:8000
```

## Manual Startup

If you prefer starting each server yourself, open two terminals.

Terminal 1:

```bash
python app.py
```

Terminal 2:

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## How It Works

The browser captures or uploads an image and sends it to the local Flask API at:

```text
http://127.0.0.1:5000/predict
```

The backend preprocesses the image, runs it through the PyTorch model, and returns the predicted emotion with confidence scores.

## Troubleshooting

If the page says `Failed to fetch`, the backend is not running. Start it with:

```bash
python app.py
```

Or simply run:

```bash
start.bat
```

If Python says a module is missing, install the dependencies again:

```bash
pip install flask flask-cors torch torchvision timm pillow numpy
```
