const videoElement = document.getElementById('inputVideo');
const canvasElement = document.getElementById('outputCanvas');
const canvasCtx = canvasElement.getContext('2d');
const statusDiv = document.getElementById('status');
const transcriptBox = document.getElementById('transcriptBox');

// Distance helper
function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

let lastDetected = "";
let lastTime = 0;

// Safety check
if (typeof Camera === 'undefined' || typeof FaceMesh === 'undefined') {
  statusDiv.innerText = 'Status: MediaPipe not loaded.';
} else {
  const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
  });

  faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  faceMesh.onResults(onResults);

  function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      statusDiv.innerText = 'Status: Face detected — tracking lips';
      const lm = results.multiFaceLandmarks[0];

      drawConnectors(canvasCtx, lm, FACEMESH_LIPS, { color: 'black', lineWidth: 1 });

      const topLip = lm[13];
      const bottomLip = lm[14];
      const leftCorner = lm[78];
      const rightCorner = lm[308];
      const mouthOpen = distance(topLip, bottomLip);
      const mouthWidth = distance(leftCorner, rightCorner);

      // Word detection (use your calibrated values)
      let detectedWord = "";

// NO → closed lips
if (mouthOpen > 0.035 && mouthWidth > 0.072) {
  detectedWord = "HELP";
} else if (mouthOpen > 0.045 && mouthWidth > 0.066 && mouthWidth < 0.070) {
  detectedWord = "STOP";
} else if (mouthOpen > 0.025 && mouthOpen < 0.035 && mouthWidth < 0.066) {
  detectedWord = "OK";
} else if (mouthOpen > 0.018 && mouthOpen < 0.030 && mouthWidth > 0.067 && mouthWidth < 0.072) {
  detectedWord = "YES";
} else if (mouthOpen > 0.010 && mouthOpen < 0.018 && mouthWidth < 0.067) {
  detectedWord = "NO";
}


      const now = Date.now();
      if (detectedWord && detectedWord !== lastDetected && now - lastTime > 800) {
        lastDetected = detectedWord;
        lastTime = now;

        // Draw on canvas
        canvasCtx.fillStyle = 'lime';
        canvasCtx.font = '28px Arial';
        canvasCtx.fillText(detectedWord, 20, 60);

        // Add to transcript
        const line = document.createElement('div');
        line.textContent = `${detectedWord} — ${new Date().toLocaleTimeString()}`;
        transcriptBox.appendChild(line);
        transcriptBox.scrollTop = transcriptBox.scrollHeight;
      }
    } else {
      statusDiv.innerText = 'Status: No face detected — center your face';
    }

    canvasCtx.restore();
  }

  // Try to request HD video
  navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
    .then(stream => {
      videoElement.srcObject = stream;
    })
    .catch(err => {
      console.warn('HD camera request failed, using default.', err);
    });

  // Camera start
  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await faceMesh.send({ image: videoElement });
    },
    width: 1280,
    height: 720
  });

  camera.start();
}






