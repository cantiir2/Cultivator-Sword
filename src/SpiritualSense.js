import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export class SpiritualSense {
    constructor() {
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.onGestureDetected = null; // Callback

        // State
        this.currentGesture = 'NONE';
        this.handPosition = { x: 0, y: 0, z: 0 };
        this.isReady = false;
    }

    init(videoElement) {
        this.videoElement = videoElement;

        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(this.onResults.bind(this));

        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 1280,
            height: 720
        });

        this.camera.start();
        console.log("Spiritual Sense (MediaPipe) Initialized");
    }

    onResults(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            this.currentGesture = 'IDLE';
            return;
        }

        let totalX = 0;
        let totalY = 0;
        let totalZ = 0;
        let handCount = 0;

        // Process all detected hands
        for (const landmarks of results.multiHandLandmarks) {
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];

            // Accumulate positions (Average of Index and Middle for "Two Finger" center)
            const handX = (indexTip.x + middleTip.x) / 2;
            const handY = (indexTip.y + middleTip.y) / 2;
            const handZ = (indexTip.z + middleTip.z) / 2;

            totalX += (0.5 - handX) * 20;
            totalY += (0.5 - handY) * 10 + 5;
            totalZ += -handZ * 20;

            handCount++;
            const gesture = this.detectGestureFromLandmarks(landmarks);
            if (gesture !== 'IDLE') {
                this.detectAndSetGesture(gesture);
            }
        }

        if (handCount > 0) {
            this.handPosition.x = totalX / handCount;
            this.handPosition.y = totalY / handCount;
            this.handPosition.z = totalZ / handCount;
            this.isReady = true;
        }
    }

    detectGestureFromLandmarks(landmarks) {
        // ... (Same logic as detectGesture but returns string)
        const dist = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
        const wrist = landmarks[0];
        const isFingerExtended = (tipIdx, pipIdx) => {
            return dist(landmarks[tipIdx], wrist) > dist(landmarks[pipIdx], wrist);
        };

        const indexExt = isFingerExtended(8, 6);
        const middleExt = isFingerExtended(12, 10);
        const ringExt = isFingerExtended(16, 14);
        const pinkyExt = isFingerExtended(20, 18);

        if (!indexExt && !middleExt && !ringExt && !pinkyExt) return 'SHIELD';
        if (indexExt && middleExt && !ringExt && !pinkyExt) return 'PIERCE';
        if (indexExt && middleExt && ringExt && pinkyExt) return 'SUMMON';
        return 'IDLE';
    }

    detectAndSetGesture(gesture) {
        this.setGesture(gesture);
    }

    detectGesture(landmarks) {
    }

    setGesture(gesture) {
        if (this.currentGesture !== gesture) {
            this.currentGesture = gesture;
            console.log("Gesture Detected:", gesture);
            if (this.onGestureDetected) {
                this.onGestureDetected(gesture, this.handPosition);
            }

            // Update UI
            const el = document.getElementById('state-display');
            if (el) el.innerText = `State: ${gesture}`;
        }
    }
}
