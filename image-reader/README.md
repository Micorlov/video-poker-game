# Image Reader

A simple web app that uploads images to the DeepSeek Vision API for analysis.

## Usage

1. Open `index.html` in any browser
2. An API key is pre-filled — or paste your own [DeepSeek API key](https://platform.deepseek.com/)
3. Drag & drop, click to browse, or paste (`Cmd+V`) an image
4. Type a question (or use the default "What do you see?")
5. Click **Ask**

## Features

- Drag & drop, click to browse, or paste from clipboard
- DeepSeek Chat (V3) and DeepSeek Reasoner (R1) models
- Conversation-style results
- API key saved locally in your browser
- Token usage tracking
- Dark theme

## Deployment

Just serve the folder — any static host works:

```bash
python3 -m http.server 8080
# Open http://localhost:8080
```
