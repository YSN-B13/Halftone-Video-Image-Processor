# Halftone Video/Image Processor

A web-based tool for creating halftone effects on images and videos in real-time. Transform your media into stylized dot patterns with customizable parameters and professional-quality output.

## ✨ Features

- **Dual Media Support**: Process both images and videos
- **Real-time Preview**: See changes instantly as you adjust parameters
- **Professional Controls**: Fine-tune brightness, contrast, gamma, and smoothing
- **Multiple Dithering Options**: Choose from Floyd-Steinberg, Ordered, Noise, or no dithering
- **Video Recording**: Export processed videos directly from the browser
- **High-Quality Export**: Save images at original resolution
- **Responsive Design**: Works on desktop and mobile devices

## 🎯 Use Cases

- **Print Design**: Create newspaper-style halftone effects
- **Digital Art**: Add retro/vintage aesthetics to modern content
- **Web Graphics**: Generate stylized imagery for websites
- **Video Effects**: Create unique visual treatments for video content
- **Educational**: Demonstrate halftone printing concepts

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/halftone-processor.git
   cd halftone-processor
   ```

2. **Open in browser**
   - Simply open `vid.html` in your web browser
   - No build process or dependencies required!

3. **Upload media**
   - Drag and drop or click to upload an image or video
   - Supported formats: Most common image formats (JPG, PNG, WebP, etc.) and video formats (MP4, WebM, etc.)

4. **Adjust parameters**
   - **Grid Size**: Controls the size of halftone dots (5-50)
   - **Brightness**: Adjust overall brightness (-100 to 100)
   - **Contrast**: Enhance or reduce contrast (-100 to 100)
   - **Gamma**: Fine-tune midtone response (0.1 to 3.0)
   - **Smoothing**: Apply Gaussian blur before halftoning (0 to 5)
   - **Dithering**: Choose texture pattern for dot distribution

5. **Export results**
   - **Images**: Click "Export Media" to download PNG
   - **Videos**: Click "Export Media" to start recording, click again to stop and download WebM

## 🛠️ Technical Details

### How It Works

The processor uses HTML5 Canvas API to:
1. Draw source media to canvas
2. Convert to grayscale with adjustments
3. Apply optional smoothing and dithering
4. Generate halftone dots based on pixel brightness
5. Export final result

### Dithering Algorithms

- **Floyd-Steinberg**: Error diffusion for smooth gradients
- **Ordered**: Bayer matrix for consistent patterns
- **Noise**: Random dithering for organic textures
- **None**: Clean halftone without additional texture

### Browser Compatibility

- **Modern browsers** with HTML5 Canvas support
- **Video recording** requires `canvas.captureStream()` support
- **Recommended**: Chrome 51+, Firefox 43+, Safari 11+, Edge 79+

## 📁 Project Structure

```
halftone-processor/
├── vid.html          # Main HTML file
├── vid.css           # Styling and layout
├── vid.js            # Core processing logic
└── README.md         # This file
```

## 🎨 Customization

### Styling
Edit `vid.css` to customize:
- Color scheme (CSS custom properties at top)
- Layout and spacing
- Control panel styling
- Responsive breakpoints

### Functionality
Modify `vid.js` to:
- Add new dithering algorithms
- Implement additional image filters
- Change export formats
- Add new control parameters

## 🐛 Troubleshooting

**Video won't load**: Check browser console for CORS errors. Some video formats may not be supported.

**Export not working**: Ensure your browser supports the required APIs. Try a different browser if issues persist.

**Performance issues**: Reduce grid size or video resolution for better performance on slower devices.

**Recording fails**: Video recording requires HTTPS in some browsers. Use a local server or GitHub Pages for testing.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request.
