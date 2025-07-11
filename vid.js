document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const fileUpload        = document.getElementById('fileUpload');
    const gridSize          = document.getElementById('gridSize');
    const brightness        = document.getElementById('brightness');
    const contrast          = document.getElementById('contrast');
    const gamma             = document.getElementById('gamma');
    const smoothing         = document.getElementById('smoothing');
    const ditherType        = document.getElementById('ditherType');
    const resetButton       = document.getElementById('resetButton');
    const saveButton        = document.getElementById('saveButton');

    const gridSizeVal       = document.getElementById('gridSizeVal');
    const brightnessVal     = document.getElementById('brightnessVal');
    const contrastVal       = document.getElementById('contrastVal');
    const gammaVal          = document.getElementById('gammaVal');
    const smoothingVal      = document.getElementById('smoothingVal');

    const halftoneCanvas    = document.getElementById('halftoneCanvas');
    const ctx               = halftoneCanvas.getContext('2d');

    let imageElement = null;
    let videoElement = null;
    let isVideo = false;
    let animationFrameId;
    let mediaRecorder;
    let recordedChunks = [];

    // Update value displays
    function updateValueDisplays() {
        gridSizeVal.textContent = gridSize.value;
        brightnessVal.textContent = brightness.value;
        contrastVal.textContent = contrast.value;
        gammaVal.textContent = gamma.value;
        smoothingVal.textContent = smoothing.value;
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function updateAndProcess() {
        updateValueDisplays();
        if (imageElement || (videoElement && !videoElement.paused)) { // Only process if video is active
            processFrame();
        }
    }

    const debouncedUpdate = debounce(updateAndProcess, 150);

    // Event listeners
    gridSize.addEventListener('input', debouncedUpdate);
    brightness.addEventListener('input', debouncedUpdate);
    contrast.addEventListener('input', debouncedUpdate);
    gamma.addEventListener('input', debouncedUpdate);
    smoothing.addEventListener('input', debouncedUpdate);
    ditherType.addEventListener('change', debouncedUpdate);
    fileUpload.addEventListener('change', handleFileUpload);

    function handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (videoElement) {
            videoElement.pause();
            videoElement.src = ""; // Release previous video object
            videoElement = null;
        }
        imageElement = null;

        const fileURL = URL.createObjectURL(file);
        if (file.type.startsWith('video/')) {
            isVideo = true;
            videoElement = document.createElement('video');
            videoElement.crossOrigin = "anonymous";
            videoElement.src = fileURL;
            videoElement.autoplay = true;
            videoElement.loop = true;
            videoElement.muted = true;
            videoElement.playsInline = true;
            videoElement.addEventListener('loadeddata', () => {
                if (!videoElement) return; // Check if element still exists
                setupCanvasDimensions(videoElement.videoWidth, videoElement.videoHeight);
                videoElement.play().then(() => {
                    processVideoFrame();
                }).catch(err => console.error("Video play error:", err));
            });
            videoElement.addEventListener('error', (err) => {
                console.error('Error loading video:', err);
                alert('Error loading video file. It might be corrupt or an unsupported format.');
            });
        } else if (file.type.startsWith('image/')) {
            isVideo = false;
            imageElement = new Image();
            imageElement.crossOrigin = "anonymous"; // For potential future use if loading from other origins
            imageElement.src = fileURL;
            imageElement.addEventListener('load', () => {
                if(!imageElement) return;
                setupCanvasDimensions(imageElement.width, imageElement.height);
                processFrame();
            });
            imageElement.addEventListener('error', (err) => {
                console.error('Error loading image:', err);
                alert('Error loading image file. It might be corrupt or an unsupported format.');
            });
        } else {
            alert('Unsupported file type. Please upload an image or video.');
        }
    }

    function setupCanvasDimensions(width, height) {
        if (width > 0 && height > 0) {
            const aspectRatio = width / height;
            const container = document.querySelector('.canvas-container');
            const maxWidth = container.clientWidth;
            const maxHeight = container.clientHeight;

            let newWidth = maxWidth;
            let newHeight = newWidth / aspectRatio;

            if (newHeight > maxHeight) {
                newHeight = maxHeight;
                newWidth = newHeight * aspectRatio;
            }
            // For the actual processing, use original media dimensions
            halftoneCanvas.width = width;
            halftoneCanvas.height = height;

            // For display, you might want to scale the canvas style
            halftoneCanvas.style.width = `${newWidth}px`;
            halftoneCanvas.style.height = `${newHeight}px`;

        } else {
            console.warn("Invalid dimensions for canvas setup:", width, height);
            // Fallback or error display
            halftoneCanvas.width = 300;
            halftoneCanvas.height = 150;
            ctx.clearRect(0,0,300,150);
            ctx.fillStyle = "grey";
            ctx.fillRect(0,0,300,150);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.fillText("Error: Could not load media dimensions.", 150, 75);

        }
    }

    function processFrame() {
        if (!imageElement && !(videoElement && videoElement.readyState >= videoElement.HAVE_METADATA)) {
             // Ensure video has metadata (dimensions) before processing
            return;
        }
        generateHalftone(halftoneCanvas);
    }

    function processVideoFrame() {
        if (!isVideo || !videoElement || videoElement.paused || videoElement.ended) {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            return;
        }
        processFrame();
        animationFrameId = requestAnimationFrame(processVideoFrame);
    }

    function applyImageAdjustments(imageData) {
        const data = imageData.data;
        const brightnessValue = parseInt(brightness.value) / 100; // Normalize to -1 to 1
        const contrastValue = parseInt(contrast.value) / 100;   // Normalize to -1 to 1
        const gammaValue = parseFloat(gamma.value);

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i], g = data[i+1], b = data[i+2];

            // Convert to grayscale
            let gray = (r * 0.299 + g * 0.587 + b * 0.114);

            // Apply brightness: (color + 255 * brightness)
            gray += 255 * brightnessValue;

            // Apply contrast: factor = (1 + contrast); ((color/255 - 0.5) * factor + 0.5) * 255
            // Or simplified: ((value - 128) * factor) + 128
            const contrastFactor = 1 + contrastValue;
            gray = (gray - 128) * contrastFactor + 128;

            // Clamp before gamma to avoid Math.pow(negative, fraction) -> NaN
            gray = Math.max(0, gray);

            // Apply gamma
            if (gray > 0) { // Apply gamma only if gray is positive
                gray = 255 * Math.pow(gray / 255, 1 / gammaValue);
            }
            
            // Final clamp
            gray = Math.max(0, Math.min(255, gray));

            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
        return imageData; // Modifies imageData in place, but returning is fine
    }

    function applyDithering(imageData, width, height) { // Added height for consistency
        const selectedDither = ditherType.value;
        if (selectedDither === 'None') return imageData;

        const data = imageData.data; // Operate directly on Uint8ClampedArray

        if (selectedDither === 'FloydSteinberg') {
            // Create a copy for grayscale values because dithering modifies neighbors
            const grayLevels = new Float32Array(width * height);
            for(let i=0; i<width*height; i++) {
                grayLevels[i] = data[i*4]; // Assuming already grayscale
            }

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const currentIndex = y * width + x;
                    const oldPixel = grayLevels[currentIndex];
                    const newPixel = oldPixel < 128 ? 0 : 255;
                    const error = oldPixel - newPixel;

                    data[currentIndex * 4] = newPixel;
                    data[currentIndex * 4 + 1] = newPixel;
                    data[currentIndex * 4 + 2] = newPixel;

                    // Spread error (check bounds carefully)
                    if (x + 1 < width) { // Right
                        grayLevels[currentIndex + 1] += error * 7/16;
                    }
                    if (y + 1 < height) {
                        if (x - 1 >= 0) { // Left-Down
                           grayLevels[currentIndex + width - 1] += error * 3/16;
                        }
                        grayLevels[currentIndex + width] += error * 5/16; // Down
                        if (x + 1 < width) { // Right-Down
                           grayLevels[currentIndex + width + 1] += error * 1/16;
                        }
                    }
                }
            }
        } else if (selectedDither === 'Ordered') {
            const matrix = [
                [ 0, 48, 12, 60,  3, 51, 15, 63],
                [32, 16, 44, 28, 35, 19, 47, 31],
                [ 8, 56,  4, 52, 11, 59,  7, 55],
                [40, 24, 36, 20, 43, 27, 39, 23],
                [ 2, 50, 14, 62,  1, 49, 13, 61],
                [34, 18, 46, 30, 33, 17, 45, 29],
                [10, 58,  6, 54,  9, 57,  5, 53],
                [42, 26, 38, 22, 41, 25, 37, 21]
            ];
            const matrixSize = 8; // Bayer matrix size (8x8)
            const scaleFactor = 255 / (matrixSize * matrixSize); // Scale threshold to 0-255 range

            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const idx = (y * width + x) * 4;
                    // Normalize pixel value to 0-63 for comparison with matrix
                    const threshold = matrix[y % matrixSize][x % matrixSize] * scaleFactor;
                    const newPixel = data[idx] < threshold ? 0 : 255;
                    data[idx] = newPixel;
                    data[idx + 1] = newPixel;
                    data[idx + 2] = newPixel;
                }
            }
        } else if (selectedDither === 'Noise') {
            for (let i = 0; i < data.length; i += 4) {
                const noise = (Math.random() - 0.5) * 64; // Noise range -32 to 32
                const newPixel = (data[i] + noise) < 128 ? 0 : 255;
                data[i] = newPixel;
                data[i + 1] = newPixel;
                data[i + 2] = newPixel;
            }
        }
        // imageData.data is already modified, no need to set again if data is a reference
        return imageData;
    }

    function generateHalftone(targetCanvas) { // scaleFactor removed as it was only used for export canvas sizing
        const currentCtx = targetCanvas.getContext('2d');
        const width = targetCanvas.width;
        const height = targetCanvas.height;

        if (width === 0 || height === 0) return; // Avoid processing on zero-sized canvas


        // Draw source image/video to the target canvas (could be display or export canvas)
        currentCtx.fillStyle = 'white'; // Ensure background for transparent images
        currentCtx.fillRect(0, 0, width, height);

        if (isVideo && videoElement && videoElement.readyState >= videoElement.HAVE_ENOUGH_DATA) {
            currentCtx.drawImage(videoElement, 0, 0, width, height);
        } else if (imageElement && imageElement.complete) {
            currentCtx.drawImage(imageElement, 0, 0, width, height);
        } else {
            return; // No valid source to draw
        }

        // Get image data
        let imageData = currentCtx.getImageData(0, 0, width, height);

        // Apply adjustments
        imageData = applyImageAdjustments(imageData);

        // Apply smoothing if needed
        const smoothingValue = parseFloat(smoothing.value);
        if (smoothingValue > 0) {
            const kernel = getGaussianKernel(smoothingValue);
            imageData = applyConvolution(imageData, kernel, width, height);
        }

        // Apply dithering
        imageData = applyDithering(imageData, width, height);

        // Create a temporary canvas to hold the processed (grayscale/dithered) image data
        // This is because we read pixel data from it to draw dots, and we don't want
        // to read from the same canvas we are drawing dots onto in the loop.
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.putImageData(imageData, 0, 0);

        // Now, clear the target canvas and draw halftone dots
        currentCtx.fillStyle = 'white';
        currentCtx.fillRect(0, 0, width, height);
        currentCtx.fillStyle = 'black';

        const dotSize = parseInt(gridSize.value);
        if (dotSize <= 0) return; // Avoid infinite loop or zero division

        for (let y = 0; y < height; y += dotSize) {
            for (let x = 0; x < width; x += dotSize) {
                // Get average color from the center of the cell in the temp (processed) canvas
                const sampleX = Math.min(x + dotSize / 2, width - 1);
                const sampleY = Math.min(y + dotSize / 2, height - 1);

                const pixelData = tempCtx.getImageData(sampleX, sampleY, 1, 1).data;
                // Brightness is based on the (now dithered or grayscale) pixel.
                // Since it's grayscale, R=G=B.
                const brightness = pixelData[0] / 255; // Value from 0 (black) to 1 (white)

                // Radius: larger for darker areas (smaller brightness value), smaller for lighter areas
                const radius = (dotSize / 2) * (1 - brightness);

                if (radius > 0.1) { // Only draw if radius is somewhat visible
                    currentCtx.beginPath();
                    // Draw dot at the center of the current grid cell
                    currentCtx.arc(x + dotSize / 2, y + dotSize / 2, radius, 0, Math.PI * 2);
                    currentCtx.fill();
                }
            }
        }
    }

    function getGaussianKernel(sigma) {
        const size = Math.ceil(sigma * 2.5) * 2 + 1; // Kernel size, e.g., for sigma 1, size is 5.
        const kernel = Array(size).fill(null).map(() => Array(size).fill(0));
        const center = Math.floor(size / 2);
        let sum = 0;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const exponent = -(( (x - center) ** 2 + (y - center) ** 2 ) / (2 * sigma ** 2));
                const value = (1 / (2 * Math.PI * sigma ** 2)) * Math.exp(exponent); // Gaussian formula
                kernel[y][x] = value;
                sum += value;
            }
        }
        // Normalize kernel
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                kernel[y][x] /= sum;
            }
        }
        return kernel;
    }

    function applyConvolution(imageData, kernel, width, height) {
        const srcData = new Uint8ClampedArray(imageData.data); // Work on a copy
        const dstData = imageData.data; // Modify original data array

        const kernelSize = kernel.length;
        const halfKernel = Math.floor(kernelSize / 2);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let sumR = 0, sumG = 0, sumB = 0; // Though it's grayscale, keep structure

                for (let ky = 0; ky < kernelSize; ky++) {
                    for (let kx = 0; kx < kernelSize; kx++) {
                        const sy = Math.min(height - 1, Math.max(0, y + ky - halfKernel));
                        const sx = Math.min(width - 1, Math.max(0, x + kx - halfKernel));
                        const srcIdx = (sy * width + sx) * 4;
                        const weight = kernel[ky][kx];

                        sumR += srcData[srcIdx] * weight;
                        // sumG += srcData[srcIdx + 1] * weight; // For grayscale, R=G=B
                        // sumB += srcData[srcIdx + 2] * weight;
                    }
                }
                const dstIdx = (y * width + x) * 4;
                dstData[dstIdx] = sumR;
                dstData[dstIdx + 1] = sumR; // Store grayscale result
                dstData[dstIdx + 2] = sumR;
                // Alpha (dstData[dstIdx + 3]) remains unchanged
            }
        }
        return imageData; // imageData.data was modified
    }

    resetButton.addEventListener('click', () => {
        gridSize.value = 20;
        brightness.value = 0; // Reset to 0
        contrast.value = 0;
        gamma.value = 1.0;
        smoothing.value = 0;
        ditherType.value = 'None';
        updateAndProcess(); // This will call processFrame if media is loaded
    });

    saveButton.addEventListener('click', async () => {
        if (!imageElement && !videoElement) {
            alert("Please upload an image or video first.");
            return;
        }

        if (isVideo) {
            if (mediaRecorder && mediaRecorder.state === "recording") {
                stopVideoRecording();
            } else {
                startVideoRecording();
            }
        } else { // It's an image
            const exportCanvas = document.createElement('canvas');
            // Determine export scale (e.g., 2x the display canvas size, or original image size)
            // For simplicity, using original image dimensions for highest quality export.
            if (imageElement) {
                exportCanvas.width = imageElement.naturalWidth;
                exportCanvas.height = imageElement.naturalHeight;
                generateHalftone(exportCanvas); // Process with original dimensions
                const dataURL = exportCanvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataURL;
                link.download = 'halftone_image.png';
                link.click();
            } else {
                 alert("No image loaded to export.");
            }
        }
    });

    function startVideoRecording() {
        if (!videoElement) {
            alert("No video loaded to record.");
            return;
        }
        if (typeof halftoneCanvas.captureStream !== 'function') {
            alert("Video recording (canvas.captureStream) is not supported in this browser.");
            return;
        }

        recordedChunks = [];
        const stream = halftoneCanvas.captureStream(25); // 25 FPS
        
        const options = { mimeType: 'video/webm; codecs=vp9' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.warn(`${options.mimeType} not supported, trying vp8`);
            options.mimeType = 'video/webm; codecs=vp8';
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.warn(`${options.mimeType} not supported, trying default webm`);
                options.mimeType = 'video/webm';
                 if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    alert("No suitable webm video format supported for recording.");
                    return;
                }
            }
        }
        
        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.error("Error creating MediaRecorder:", e);
            alert("Could not start video recording. Check console for errors.");
            return;
        }

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: options.mimeType });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'halftone_video.webm';
            document.body.appendChild(link); // Firefox requires the link to be in the body
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            saveButton.textContent = 'Export Media';
            saveButton.classList.remove('btn-recording'); // Optional: style for recording state
            alert("Video recording stopped. Download should begin.");
        };
        
        mediaRecorder.onerror = (event) => {
            console.error("MediaRecorder error:", event.error);
            alert(`Video recording error: ${event.error.name}`);
            saveButton.textContent = 'Export Media';
            saveButton.classList.remove('btn-recording');
        };

        mediaRecorder.start();
        saveButton.textContent = 'Stop Recording';
        saveButton.classList.add('btn-recording'); // Optional
        alert("Video recording started. Click 'Stop Recording' to finish.");
    }

    function stopVideoRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
        }
        // Text and class changes are handled in mediaRecorder.onstop and onerror
    }

    // Initialize display values on load
    updateValueDisplays();
});