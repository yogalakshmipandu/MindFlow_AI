// Global Focus Music Manager - Persists across all pages
// Load in base.html <script src="{% static 'js/music-manager.js' %}"></script>

class MusicManager {
  constructor() {
    this.audio = null;
    this.currentType = null;
    this.volume = 0.5;
    this.isPlaying = false;
    this.storageKey = 'focusMusicState';
    this.isAuthenticatedUser = this.checkAuthentication();
    this.musicFiles = {
      rain: '/static/music/rain.mp3',
      forest: '/static/music/forest.mp3',
      ocean: '/static/music/ocean.mp3',
      cafe: '/static/music/cafe.mp3',
      fire: '/static/music/fireplace.mp3'
    };
    this.init();
  }

  checkAuthentication() {
    if (typeof window !== 'undefined' && typeof window.isAuthenticated !== 'undefined') {
      return window.isAuthenticated === true || window.isAuthenticated === 'true';
    }
    // Fallback: check whether the music control bar exists in the DOM
    return document.getElementById('musicControlBar') !== null;
  }

  init() {
    // Only initialize music features for authenticated users
    if (!this.isAuthenticatedUser) {
      // Clear localStorage for non-authenticated users
      localStorage.removeItem(this.storageKey);
      return;
    }

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
          this.audio.play().catch((e) => console.log('Resume failed:', e));
          this.isPlaying = true;
        }
      }
    }

    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        this.syncFromStorage(event.newValue);
      }
    });

    window.addEventListener('beforeunload', () => this.saveState());
    window.addEventListener('pagehide', () => this.saveState());
    this.updateControlBar();
  }

  syncFromStorage(value) {
    if (!value) {
      this.stop(false);
      return;
    }
    const state = JSON.parse(value);
    if (state.isPlaying && (!this.isPlaying || this.currentType !== state.type)) {
      this.play(state.type, false);
    } else if (!state.isPlaying) {
      this.stop(false);
    }
  }

  play(type, save = true) {
    if (!this.isAuthenticatedUser) return;
    
    const src = this.musicFiles[type];
    if (!src) return;

    this.stop(false);

    this.audio = new Audio(src);
    this.audio.loop = true;
    this.audio.volume = this.volume;
    this.currentType = type;
    this.isPlaying = true;

    this.audio.play().then(() => {
      this.updateControlBar();
      if (save) this.saveState();
      document.dispatchEvent(new CustomEvent('focusMusicPlaying', { detail: { type } }));
    }).catch((e) => {
      console.log('Play failed:', e);
      this.isPlaying = false;
      this.updateControlBar();
    });
  }

  stop(removeStorage = true) {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.isPlaying = false;
    this.currentType = null;
    if (removeStorage) localStorage.removeItem(this.storageKey);
    this.updateControlBar();
    document.dispatchEvent(new CustomEvent('focusMusicStopped'));
  }

  togglePause() {
    if (!this.audio || !this.isAuthenticatedUser) return;

    if (this.isPlaying) {
      this.audio.pause();
      this.isPlaying = false;
    } else {
      this.audio.play().catch((e) => console.log('Resume failed:', e));
      this.isPlaying = true;
    }
    this.saveState();
    this.updateControlBar();
  }

  saveState() {
    if (!this.audio || !this.isAuthenticatedUser) return;

    const state = {
      src: this.audio.src,
      type: this.currentType,
      volume: this.volume,
      position: this.audio.currentTime,
      isPlaying: this.isPlaying
    };
    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  updateControlBar() {
    const bar = document.getElementById('musicControlBar');
    const label = document.getElementById('musicCurrentType');
    if (!bar || !label) return;

    if (this.isPlaying && this.currentType && this.isAuthenticatedUser) {
      label.textContent = `🎵 ${this.currentType.charAt(0).toUpperCase() + this.currentType.slice(1)}`;
      bar.classList.add('show');
    } else {
      bar.classList.remove('show');
    }
  }
}

window.musicManager = new MusicManager();

function playMusic(type) {
  window.musicManager.play(type);
  document.querySelectorAll('.music-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-music') === type);
  });
}

function stopMusic() {
  window.musicManager.stop();
  document.querySelectorAll('.music-btn').forEach((btn) => btn.classList.remove('active'));
}

function syncMusicButtons() {
  const saved = localStorage.getItem(window.musicManager.storageKey);
  if (!saved) return;
  const state = JSON.parse(saved);
  document.querySelectorAll('.music-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-music') === state.type);
  });
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', syncMusicButtons);
} else {
  syncMusicButtons();
}

