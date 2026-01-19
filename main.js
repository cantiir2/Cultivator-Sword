import './style.css'
import * as THREE from 'three';
import { SwordSwarm } from './src/SwordSwarm.js';
import { SpiritualSense } from './src/SpiritualSense.js';
import Stats from 'stats.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050510); // Deep dark blue/black
scene.fog = new THREE.FogExp2(0x050510, 0.02);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 10); // Moved back a bit

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// --- Stats ---
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms
document.body.appendChild(stats.dom);

// --- Sword Swarm ---
const swordSwarm = new SwordSwarm(scene, 50);

// --- Spiritual Sense (Vision) ---
const spiritualSense = new SpiritualSense();
const videoElement = document.getElementById('input-video');
spiritualSense.init(videoElement);

spiritualSense.onGestureDetected = (gesture, position) => {
    // Pass raw gesture/position to swarm, logic handled there
    swordSwarm.updateState(gesture, position);
};

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffcc00, 2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);


// --- Post Processing --- //
const renderScene = new RenderPass(scene, camera);

// Resolution, strength, radius, threshold
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.strength = 1.0; // Glow intensity
bloomPass.radius = 0.5;
bloomPass.threshold = 0.6; // Only bright things glow (Gold Swords)

const outputPass = new OutputPass();

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(outputPass);

// --- Event Listeners ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    stats.begin();

    const delta = clock.getDelta();
    const time = clock.getElapsedTime();

    // Continuously update target if hand is tracked
    if (spiritualSense.isReady) {
        swordSwarm.updateTarget(spiritualSense.handPosition);
    }

    swordSwarm.update(time, delta);

    // renderer.render(scene, camera); // Replaced by composer
    composer.render();

    stats.end();
    requestAnimationFrame(animate);
}

animate();
