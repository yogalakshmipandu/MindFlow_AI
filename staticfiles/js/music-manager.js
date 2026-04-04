// Global Focus Music Manager - Persists across all pages
// Load in base.html <script src="{% static 'js/music-manager.js' %}"></script>

class MusicManager {
  constructor() {
    this.audio = null;
    this.currentType = null;
    this.volume = 0.5;
    this.isPlaying = false;
    this.storageKey = 'focusMusicState';
    this.init();
  }

  init() {
    // Load state from storage
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      const state = JSON.parse(saved);
      this.currentType = state.type;
      this.volume = state.volume || 0.5;
      
      if (state.src) {
        this.audio = new Audio(state.src);
        this.audio.loop = true;
        this.audio.volume = this.volume;
        this.audio.currentTime = state.position || 0;
        
        if (state.isPlaying) {
          this.audio.play().catch(e => console.log('Resume failed:', e));
        }
      }
    }

    // Handle page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.saveState();
        this.audio?.pause();
      } else {
        this.audio?.play().catch(e => console.log('Resume on visible:', e));
      }
    });

    // Save state on unload
    window.addEventListener('beforeunload', () => this.saveState());
    window.addEventListener('pagehide', () => this.saveState());
  }

  play(type) {
const musicFiles = {
      'rain': '{% load static %}{% static "music/rain.mp3" %}',
      'forest': '{% load static %}{% static "music/forest.mp3" %}',
      'ocean': '{% load static %}{% static "music/ocean.mp3" %}',
      'cafe': '{% load static %}{% static "music/cafe.mp3" %}',
      'fire': '{% load static %}{% static "music/fireplace.mp3" %}'
    };

    const src = musicFiles[type];
    if (!src) return;

    // Stop current
    this.stop();

    // Create new audio
    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.volume = this.volume;
    this.currentType = type;
    this.isPlaying = true;

    this.audio.play().then(() => {
      this.saveState();
      document.dispatchEvent(new CustomEvent('focusMusicPlaying', { detail: { type } }));
    }).catch(e => {
      console.log('Play failed:', e);
      this.isPlaying = false;
    });
  }

  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.isPlaying = false;
    this.currentType = null;
    localStorage.removeItem(this.storageKey);
    document.dispatchEvent(new CustomEvent('focusMusicStopped'));
  }

  togglePause() {
    if (!this.audio) return;

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.audio.play().catch(e => console.log('Resume failed:', e));
      this.isPlaying = true;
    }
    this.saveState();
  }

  saveState() {
    if (!this.audio) return;

    const state = {
      src: this.audio.src,
      type: this.currentType,
      volume: this.volume,
      position: this.audio.currentTime,
      isPlaying: this.isPlaying
    };
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }
}

// Global instance
window.musicManager = new MusicManager();

// Focus page controls (override local functions)
function playMusic(type) {
  window.musicManager.play(type);
  if (event?.target) event.target.classList.add('active');
}

function stopMusic() {
  window.musicManager.stop();
  document.querySelectorAll('.music-btn').forEach(btn => btn.classList.remove('active'));
}

