class DrowsyManager {
  constructor() {
    this.storageKey = 'drowsyState';
    this.authenticated = this.checkAuthentication();
    this.windowId = 'drowsyWindow';
    this.state = {
      active: false,
      minimized: false,
      closed: false,
      blinkCount: 0,
      alertCount: 0,
      motionLevel: '--',
      sessionScore: 100,
      lastUpdated: Date.now()
    };
    this.counter = 0;
    this.isDrowsy = false;
    this.faceMesh = null;
    this.camera = null;
    this.video = null;
    this.canvas = null;
    this.ctx = null;
    this.alertSound = new Audio('/static/sounds/notification.mp3');
    this.alertSound.loop = true;
    this.init();
  }

  checkAuthentication() {
    if (typeof window !== 'undefined' && typeof window.isAuthenticated !== 'undefined') {
      return window.isAuthenticated === true || window.isAuthenticated === 'true';
    }
    return false;
  }

  init() {
    if (!this.authenticated) {
      this.stopDetection();
      this.clearState();
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.doInit());
    } else {
      this.doInit();
    }
  }

  doInit() {
    this.createStyles();
    this.createWindow();
    this.bindControls();
    this.loadState();
    this.syncUI();

    if (this.state.closed) {
      const windowEl = document.getElementById(this.windowId);
      if (windowEl) windowEl.classList.add('hidden');
    } else if (this.state.active) {
      this.openWindow();
      setTimeout(() => this.startDetection().catch(() => {}), 100);
    }
    // Don't show window if not active and not closed

    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        this.loadState();
        this.syncUI();
      }
    });

    document.addEventListener('visibilitychange', () => this.onVisibilityChange());
    window.addEventListener('beforeunload', () => this.saveState());
    window.addEventListener('pagehide', () => this.saveState());
  }

  createStyles() {
    if (document.getElementById('drowsy-manager-styles')) return;
    const style = document.createElement('style');
    style.id = 'drowsy-manager-styles';
    style.textContent = `
      .drowsy-window {
        position: fixed;
        top: 50px;
        right: 20px;
        width: 300px;
        background: white;
        border-radius: 15px;
        box-shadow: 0 0 20px rgba(0,0,0,0.2);
        z-index: 9999;
        transition: width 0.3s ease, height 0.3s ease;
        overflow: hidden;
        font-family: Poppins, sans-serif;
      }
      .drowsy-window.minimized {
        width: 200px;
        height: auto;
      }
      .drowsy-window.hidden {
        display: none;
      }
      .drowsy-header {
        background: #111;
        color: white;
        padding: 6px 10px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .drowsy-header button {
        background: rgba(255,255,255,0.1);
        border: none;
        color: white;
        width: 26px;
        height: 26px;
        border-radius: 8px;
        cursor: pointer;
      }
      .drowsy-body {
        padding: 10px;
        text-align: center;
      }
      .drowsy-video-wrapper {
        position: relative;
        width: 100%;
        height: 160px;
        margin-bottom: 10px;
        border-radius: 12px;
        overflow: hidden;
        background: #000;
      }
      .drowsy-video-wrapper video,
      .drowsy-video-wrapper canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .drowsy-metrics {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        margin: 10px 0 15px;
      }
      .drowsy-metric {
        flex: 1 1 45%;
        min-width: 120px;
        background: #f7f7f7;
        border-radius: 10px;
        padding: 6px 8px;
        font-size: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #333;
      }
      .drowsy-metric span {
        color: #666;
        font-size: 11px;
      }
      .drowsy-metric strong {
        font-weight: 700;
      }
      #status {
        margin: 10px 0 8px;
        font-weight: bold;
      }
      .drowsy-window.minimized .drowsy-video-wrapper {
        visibility: hidden;
        height: 0;
        margin: 0;
      }
      .drowsy-window.minimized .drowsy-metrics {
        flex-direction: column;
        align-items: stretch;
        gap: 6px;
      }
      .drowsy-window.minimized .drowsy-metric {
        flex: 1 1 100%;
        min-width: auto;
        font-size: 12px;
        padding: 8px;
      }
      .drowsy-alert-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      .drowsy-alert-overlay.hidden {
        display: none;
      }
      .drowsy-alert-box {
        background: #fff;
        border-radius: 16px;
        padding: 24px;
        width: min(420px, 90%);
        box-shadow: 0 12px 40px rgba(0,0,0,0.25);
        text-align: center;
      }
      .drowsy-alert-box h2 {
        margin-bottom: 14px;
        font-size: 22px;
      }
      .drowsy-alert-box p {
        margin-bottom: 18px;
        color: #333;
        line-height: 1.5;
      }
      .drowsy-alert-box button {
        padding: 12px 24px;
        background: #111;
        border: none;
        color: #fff;
        border-radius: 10px;
        cursor: pointer;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  createWindow() {
    if (document.getElementById(this.windowId)) return;

    const html = `
      <div id="${this.windowId}" class="drowsy-window hidden">
        <div class="drowsy-header">
          <span>👁️ Drowsy Detection</span>
          <div>
            <button id="drowsyMinimizeBtn">—</button>
            <button id="drowsyCloseBtn">✕</button>
          </div>
        </div>
        <div class="drowsy-body">
          <div class="drowsy-video-wrapper">
            <video id="drowsyVideo" autoplay playsinline muted></video>
            <canvas id="drowsyCanvas"></canvas>
          </div>
          <div id="status">✅ Ready</div>
          <div class="drowsy-metrics">
            <div class="drowsy-metric"><span>Motion Level</span><strong id="motionLevel">--</strong></div>
            <div class="drowsy-metric"><span>Blinks</span><strong id="blinkCount">0</strong></div>
            <div class="drowsy-metric"><span>Drowsy Alerts</span><strong id="alertCount">0</strong></div>
            <div class="drowsy-metric"><span>Sleep Score</span><strong id="sessionTime">100%</strong></div>
          </div>
          <button id="drowsyStartBtn" type="button">Start</button>
          <button id="drowsyStopBtn" type="button" disabled>Stop</button>
        </div>
      </div>
      <div id="drowsyAlertOverlay" class="drowsy-alert-overlay hidden">
        <div class="drowsy-alert-box">
          <h2>⚠️ Drowsy Alert</h2>
          <p>You appear drowsy. The alert sound will continue until you acknowledge it.</p>
          <button id="drowsyAlertOkBtn" type="button">OK</button>
        </div>
      </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = html;
    Array.from(container.children).forEach((child) => document.body.appendChild(child));
  }

  bindControls() {
    const openFn = () => this.openWindow();
    const closeBtn = document.getElementById('drowsyCloseBtn');
    const minimizeBtn = document.getElementById('drowsyMinimizeBtn');
    const startBtn = document.getElementById('drowsyStartBtn');
    const stopBtn = document.getElementById('drowsyStopBtn');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeWindow());
    if (minimizeBtn) minimizeBtn.addEventListener('click', () => this.toggleMinimize());
    if (startBtn) startBtn.addEventListener('click', () => this.startDetection());
    if (stopBtn) stopBtn.addEventListener('click', () => this.stopDetection());

    window.openDrowsy = () => this.openWindow();
    window.closeDrowsy = () => this.closeWindow();
    window.minimizeDrowsy = () => this.toggleMinimize();
    window.startDetection = () => this.startDetection();
    window.stopDetection = () => this.stopDetection();

    const okBtn = document.getElementById('drowsyAlertOkBtn');
    if (okBtn) okBtn.addEventListener('click', () => this.acknowledgeAlert());

    // Listen for state changes from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey) {
        console.log('Storage event detected, reloading state');
        this.loadState();
        this.syncUI();
        if (this.state.active && !this.camera) {
          console.log('Starting detection from storage event');
          this.startDetection().catch((err) => console.error('Failed to start from storage:', err));
        }
      }
    });
  }

  loadState() {
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      this.state = Object.assign(this.state, saved, { closed: saved.closed || false });
      this.counter = saved.counter || 0;
      this.isDrowsy = saved.isDrowsy || false;
    } catch (error) {
      console.error('Invalid drowsy state:', error);
    }
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(Object.assign({}, this.state, {
      counter: this.counter,
      isDrowsy: this.isDrowsy
    })));
  }

  clearState() {
    localStorage.removeItem(this.storageKey);
    const windowEl = document.getElementById(this.windowId);
    if (windowEl) {
      windowEl.classList.add('hidden');
    }
  }

  syncUI() {
    const windowEl = document.getElementById(this.windowId);
    if (!windowEl) return;

    const statusEl = document.getElementById('status');
    const startBtn = document.getElementById('drowsyStartBtn');
    const stopBtn = document.getElementById('drowsyStopBtn');

    if (this.state.minimized) {
      windowEl.classList.add('minimized');
    } else {
      windowEl.classList.remove('minimized');
    }

    if (!this.state.active) {
      statusEl.textContent = '✅ Ready';
      startBtn.disabled = false;
      stopBtn.disabled = true;
    } else {
      statusEl.textContent = this.isDrowsy ? '⚠️ DROWSY!' : '✅ AWAKE';
      startBtn.disabled = true;
      stopBtn.disabled = false;
    }

    this.updateMetrics();
  }

  updateMetrics(ear) {
    if (typeof ear === 'number') {
      this.state.motionLevel = ear.toFixed(2);
    }
    const motionEl = document.getElementById('motionLevel');
    const blinkEl = document.getElementById('blinkCount');
    const alertEl = document.getElementById('alertCount');
    const scoreEl = document.getElementById('sessionTime');
    if (motionEl) motionEl.textContent = this.state.motionLevel || '--';
    if (blinkEl) blinkEl.textContent = this.state.blinkCount;
    if (alertEl) alertEl.textContent = this.state.alertCount;
    if (scoreEl) scoreEl.textContent = `${this.state.sessionScore}%`;
  }

  openWindow() {
    const windowEl = document.getElementById(this.windowId);
    if (!windowEl) return;
    windowEl.classList.remove('hidden');
    this.state.minimized = false;
    this.state.closed = false;
    this.state.lastUpdated = Date.now();
    this.saveState();
  }

  closeWindow() {
    this.stopDetection();
    const windowEl = document.getElementById(this.windowId);
    if (windowEl) {
      windowEl.classList.add('hidden');
    }
    this.state.active = false;
    this.state.closed = true;
    this.state.lastUpdated = Date.now();
    this.saveState();
  }

  toggleMinimize() {
    const windowEl = document.getElementById(this.windowId);
    if (!windowEl) return;
    this.state.minimized = !this.state.minimized;
    if (this.state.minimized) {
      windowEl.classList.add('minimized');
    } else {
      windowEl.classList.remove('minimized');
    }
    this.saveState();
  }

  async loadMediapipe() {
    if (window.FaceMesh && window.Camera) return;
    await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
    await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async startDetection() {
    console.log('startDetection called, authenticated:', this.authenticated, 'active:', this.state.active, 'camera:', !!this.camera);
    if (!this.authenticated) return;
    if (this.state.active && this.camera) return;
    console.log('Loading MediaPipe');
    await this.loadMediapipe();
    this.video = document.getElementById('drowsyVideo');
    this.canvas = document.getElementById('drowsyCanvas');
    if (!this.video || !this.canvas) {
      console.error('Drowsy video elements not found');
      return;
    }
    this.ctx = this.canvas.getContext('2d');

    try {
      console.log('Requesting camera access');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.video.srcObject = stream;
      await new Promise(resolve => {
        this.video.onloadedmetadata = resolve;
      });
      console.log('Video metadata loaded');
    } catch (error) {
      console.error('Could not access webcam:', error);
      // Try to request permission again
      if (error.name === 'NotAllowedError') {
        alert('Camera permission denied. Please allow camera access and try again.');
      }
      return;
    }

    this.faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    this.faceMesh.onResults((results) => this.onResults(results));

    this.camera = new Camera(this.video, {
      onFrame: async () => {
        if (this.state.active && this.video.readyState >= 2) {
          await this.faceMesh.send({ image: this.video });
        }
      },
      width: 400,
      height: 300
    });

    this.state.active = true;
    this.state.minimized = false;
    this.state.lastUpdated = Date.now();
    this.saveState();
    this.openWindow();
    this.camera.start();
    console.log('Camera started');
    this.updateUI();
  }

  stopDetection() {
    if (this.camera) {
      try { this.camera.stop(); } catch (e) {}
    }
    if (this.video && this.video.srcObject) {
      this.video.srcObject.getTracks().forEach((track) => track.stop());
      this.video.srcObject = null;
    }
    this.hideAlertOverlay();
    this.alertSound.pause();
    this.alertSound.currentTime = 0;
    this.state.active = false;
    this.isDrowsy = false;
    this.counter = 0;
    this.state.lastUpdated = Date.now();
    this.saveState();
    this.updateUI();
  }

  onResults(results) {
    console.log('onResults called');
    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
      document.getElementById('status').textContent = '👀 No face detected';
      this.updateMetrics();
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    const leftEye = [33, 160, 158, 133, 153, 144].map(i => landmarks[i]);
    const rightEye = [362, 385, 387, 263, 373, 380].map(i => landmarks[i]);
    const ear = (this.getEAR(leftEye) + this.getEAR(rightEye)) / 2;

    console.log(`EAR: ${ear.toFixed(3)}, Counter: ${this.counter}`);

    if (ear < 0.2) {  // Lowered threshold
      this.counter++;
    } else {
      if (this.counter >= 2) {
        this.state.blinkCount += 1;
      }
      this.counter = 0;
    }

    this.state.motionLevel = ear.toFixed(2);
    this.refreshSessionScore(ear);
    this.updateMetrics(ear);

    if (this.counter > 5) {  // Reduced from 10 to 5
      this.state.alertCount += 1;
      this.triggerAlert();
      this.counter = 0;  // Reset counter after alert
    } else {
      if (!this.isDrowsy) {
        document.getElementById('status').textContent = '✅ AWAKE';
      }
    }

    this.state.lastUpdated = Date.now();
    this.saveState();
  }

  refreshSessionScore(ear) {
    let score = 100;
    if (typeof ear === 'number' && ear < 0.25) score -= 30;
    score -= Math.min(this.state.alertCount * 5, 45);
    score = Math.max(0, score);
    this.state.sessionScore = score;
  }

  triggerAlert() {
    document.getElementById('status').textContent = '⚠️ DROWSY!';
    if (!this.isDrowsy) {
      this.alertSound.currentTime = 0;
      this.alertSound.play().catch(() => {});
      this.showAlertOverlay();
      if (Notification.permission === 'granted') {
        new Notification('Drowsy Alert!', { body: 'You appear drowsy. Take a break!' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Drowsy Alert!', { body: 'You appear drowsy. Take a break!' });
          }
        });
      }
      this.isDrowsy = true;
    }
    this.updateMetrics();
  }

  showAlertOverlay() {
    const overlay = document.getElementById('drowsyAlertOverlay');
    if (overlay) {
      overlay.classList.remove('hidden');
    }
  }

  hideAlertOverlay() {
    const overlay = document.getElementById('drowsyAlertOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }

  acknowledgeAlert() {
    this.hideAlertOverlay();
    this.alertSound.pause();
    this.alertSound.currentTime = 0;
    this.isDrowsy = false;
    document.getElementById('status').textContent = '✅ AWAKE';
    this.saveState();
  }

  getEAR(eye) {
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const A = dist(eye[1], eye[5]);
    const B = dist(eye[2], eye[4]);
    const C = dist(eye[0], eye[3]);
    return (A + B) / (2.0 * C);
  }

  onVisibilityChange() {
    if (!this.state.active) return;
    if (!document.hidden) {
      if (this.video && this.video.srcObject) {
        try { this.camera.start(); } catch (e) {}
      } else {
        // Restart detection if needed
        this.startDetection().catch(() => {});
      }
    }
  }

  updateUI() {
    this.syncUI();
  }
}

window.drowsyManager = new DrowsyManager();
