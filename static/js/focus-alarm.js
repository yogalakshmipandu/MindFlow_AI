class FocusNotificationManager {
  constructor() {
    this.storageKey = 'focusNotifications';
    this.toastTimeout = null;
    this.init();
  }

  init() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        this.showNotification(JSON.parse(event.newValue));
      }
    });
  }

  showNotification(data) {
    if (data.type === 'alarm') {
      if ('Notification' in window && Notification.permission === 'granted') {
        this.showSystemNotification(data.title, data.message);
      }
      this.showPopup(data.title, data.message);
    } else if (data.type === 'motivation') {
      if ('Notification' in window && Notification.permission === 'granted') {
        this.showSystemNotification('Motivation', data.message);
      }
      this.showMotivationToast(data.message);
    }
  }

  showSystemNotification(title, message) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    try {
      const notification = new Notification(title, {
        body: message,
        icon: '/static/images/logo.jpeg'
      });
      notification.onclick = function() {
        window.focus();
        this.close();
      };
    } catch (err) {
      console.warn('System notification failed:', err);
    }
  }

  showPopup(title, message) {
    let popup = document.getElementById('globalFocusAlarmPopup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'globalFocusAlarmPopup';
      popup.className = 'popup show';
      popup.innerHTML = `
        <div class="popup-box" style="
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: white; padding: 40px; border-radius: 20px; text-align: center;
          box-shadow: 0 10px 50px rgba(0,0,0,0.5); z-index: 9999; max-width: 400px;
        ">
          <h3 id="globalFocusAlarmTitle" style="color: #000;"></h3>
          <p id="globalFocusAlarmMessage" style="color: #333;"></p>
          <button onclick="document.getElementById('globalFocusAlarmPopup').remove()" 
                  style="padding: 12px 30px; background: #000; border: none; color: white; border-radius: 8px; cursor: pointer;">
            OK
          </button>
        </div>
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9998;"></div>
      `;
      document.body.appendChild(popup);
    }
    document.getElementById('globalFocusAlarmTitle').textContent = title;
    document.getElementById('globalFocusAlarmMessage').textContent = message;
  }

  showMotivationToast(message) {
    let toast = document.getElementById('globalMotivationToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalMotivationToast';
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #111;
        color: white; padding: 18px 20px 18px 16px; border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4); z-index: 10000;
        font-family: Poppins, sans-serif; max-width: 360px; display: flex;
        align-items: center; gap: 12px; opacity: 0.98;
      `;

      const messageSpan = document.createElement('span');
      messageSpan.id = 'globalMotivationMessage';
      messageSpan.style.cssText = 'flex: 1; font-size: 14px; line-height: 1.4;';
      toast.appendChild(messageSpan);

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = `
        background: transparent; border: none; color: white; font-size: 16px;
        cursor: pointer; padding: 0; opacity: 0.8;
      `;
      closeBtn.onclick = () => {
        toast.style.display = 'none';
        clearTimeout(this.toastTimeout);
      };
      toast.appendChild(closeBtn);
      document.body.appendChild(toast);
    }

    document.getElementById('globalMotivationMessage').textContent = message;
    toast.style.display = 'flex';
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 60000);
  }
}

if (!window.notificationManager) {
  window.notificationManager = new FocusNotificationManager();
}

class FocusSessionAlarm {
  constructor() {
    this.storageKey = 'focusAlarmState';
    this.notificationKey = 'focusNotifications';
    this.state = {
      isActive: false,
      isPaused: false,
      phase: 'study',
      remainingStudySeconds: 0,
      remainingBlockSeconds: 0,
      blockStudySeconds: 0,
      breakSeconds: 0,
      lastUpdate: Date.now()
    };
    this.timer = null;
    this.toastTimeout = null;
    this.sounds = {
      break: new Audio('/static/sounds/break.mp3'),
      study: new Audio('/static/sounds/study.mp3'),
      complete: new Audio('/static/sounds/complete.mp3'),
      notification: new Audio('/static/sounds/notification.mp3')
    };
    Object.values(this.sounds).forEach((audio) => { audio.preload = 'auto'; });
    this.init();
  }

  init() {
    this.loadState();
    if (this.state.isActive && !this.state.isPaused) {
      this.startTimer();
    }
    this.renderStatus();

    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        this.loadStateFromString(event.newValue);
      }
      if (event.key === this.notificationKey) {
        this.displayNotification(event.newValue);
      }
    });

    window.addEventListener('beforeunload', () => this.saveState());
    window.addEventListener('pagehide', () => this.saveState());
    this.ensureGlobalNotificationElement();
  }

  loadState() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      this.loadStateFromString(saved);
    }
  }

  loadStateFromString(value) {
    if (!value) {
      this.resetInternalState();
      return;
    }
    try {
      const state = JSON.parse(value);
      this.state = Object.assign(this.state, state);
      if (this.state.isActive && !this.state.isPaused && !this.timer) {
        this.startTimer();
      }
      this.renderStatus();
    } catch (error) {
      console.error('Failed to parse alarm state:', error);
    }
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.state));
  }

  resetInternalState() {
    this.state = {
      isActive: false,
      isPaused: false,
      phase: 'study',
      remainingStudySeconds: 0,
      remainingBlockSeconds: 0,
      blockStudySeconds: 0,
      breakSeconds: 0,
      lastUpdate: Date.now()
    };
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.saveState();
    this.renderStatus();
  }

  startSession(totalStudySeconds, blockSeconds, breakSeconds) {
    this.state.isActive = true;
    this.state.isPaused = false;
    this.state.phase = 'study';
    this.state.remainingStudySeconds = totalStudySeconds;
    this.state.blockStudySeconds = blockSeconds;
    this.state.breakSeconds = breakSeconds;
    this.state.remainingBlockSeconds = Math.min(blockSeconds, totalStudySeconds);
    this.state.lastUpdate = Date.now();
    this.saveState();
    this.startTimer();
    this.renderStatus();
    this.broadcastNotification({ type: 'alarm', title: '📚 Study Started', message: 'Your focus session is now running.' });
  }

  startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => this.tick(), 1000);
    this.tick();
  }

  tick() {
    if (!this.state.isActive) {
      return;
    }

    const now = Date.now();
    let elapsedSeconds = Math.floor((now - this.state.lastUpdate) / 1000);
    if (elapsedSeconds <= 0) {
      this.renderStatus();
      return;
    }
    this.state.lastUpdate = now;

    if (this.state.isPaused) {
      this.renderStatus();
      return;
    }

    this.processElapsed(elapsedSeconds);
    this.saveState();
    this.renderStatus();
  }

  processElapsed(elapsedSeconds) {
    while (elapsedSeconds > 0 && this.state.isActive) {
      if (this.state.phase === 'study') {
        const step = Math.min(elapsedSeconds, this.state.remainingBlockSeconds);
        this.state.remainingBlockSeconds -= step;
        this.state.remainingStudySeconds -= step;
        elapsedSeconds -= step;

        if (this.state.remainingStudySeconds <= 0) {
          this.completeSession();
          return;
        }

        if (this.state.remainingBlockSeconds <= 0) {
          this.startBreakPhase();
        }
      } else if (this.state.phase === 'break') {
        if (this.state.remainingBreakSeconds === undefined) {
          this.state.remainingBreakSeconds = this.state.breakSeconds;
        }
        const step = Math.min(elapsedSeconds, this.state.remainingBreakSeconds);
        this.state.remainingBreakSeconds -= step;
        elapsedSeconds -= step;

        if (this.state.remainingBreakSeconds <= 0) {
          this.startStudyPhase();
        }
      } else {
        break;
      }
    }
  }

  startBreakPhase() {
    this.state.phase = 'break';
    this.state.remainingBreakSeconds = this.state.breakSeconds;
    this.state.lastUpdate = Date.now();
    this.broadcastAlert('break');
  }

  startStudyPhase() {
    this.state.phase = 'study';
    this.state.remainingBlockSeconds = Math.min(this.state.blockStudySeconds, this.state.remainingStudySeconds);
    this.state.lastUpdate = Date.now();
    this.broadcastAlert('study');
  }

  completeSession() {
    this.state.isActive = false;
    this.state.isPaused = false;
    this.state.phase = 'study';
    this.state.remainingBlockSeconds = 0;
    this.state.remainingStudySeconds = 0;
    this.state.lastUpdate = Date.now();
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.broadcastAlert('complete');
  }

  broadcastAlert(type) {
    const notification = {
      type: 'alarm',
      title: type === 'break' ? '🛑 Break Time' : type === 'study' ? '📚 Resume Study' : '🎉 Session Completed',
      message: type === 'break' ? 'Take a short break 😌' : type === 'study' ? 'Focus again and keep the momentum!' : 'Great job! Keep going!',
      sound: type
    };
    this.playSound(type);
    this.broadcastNotification(notification);
  }

  playSound(type) {
    const sound = this.sounds[type] || this.sounds.notification;
    if (!sound) return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
  }

  pauseSession() {
    if (!this.state.isActive) {
      return;
    }
    this.state.isPaused = !this.state.isPaused;
    this.state.lastUpdate = Date.now();
    this.saveState();
    this.renderStatus();
  }

  resetSession() {
    this.resetInternalState();
    this.broadcastNotification({ type: 'alarm', title: '⏹️ Session Reset', message: 'Your focus session has been reset.' });
  }

  broadcastNotification(data) {
    this.displayNotification(JSON.stringify(data));
    localStorage.setItem(this.notificationKey, JSON.stringify(Object.assign({}, data, { timestamp: Date.now() })));
  }

  displayNotification(newValue) {
    if (!newValue) {
      return;
    }
    const data = typeof newValue === 'string' ? JSON.parse(newValue) : newValue;
    if (window.notificationManager) {
      window.notificationManager.showNotification(data);
      return;
    }

    this.showFallbackToast(data.message || data.title || 'Alarm notification');
  }

  ensureGlobalNotificationElement() {
    if (document.getElementById('globalFocusAlarmToast')) {
      return;
    }
    const toast = document.createElement('div');
    toast.id = 'globalFocusAlarmToast';
    toast.style.cssText = 'position: fixed; bottom: 90px; right: 20px; background: rgba(0,0,0,0.85); color: #fff; padding: 16px 20px; border-radius: 14px; box-shadow: 0 8px 30px rgba(0,0,0,0.3); z-index: 10001; display: none; max-width: 320px; font-family: Poppins, sans-serif; font-size: 14px;';
    document.body.appendChild(toast);
  }

  showFallbackToast(message) {
    this.ensureGlobalNotificationElement();
    const toast = document.getElementById('globalFocusAlarmToast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.display = 'block';
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 5000);
  }

  renderStatus() {
    const statusEl = document.getElementById('alarmStatus');
    const timerEl = document.getElementById('timerDisplay');
    const circle = document.querySelector('.progress-ring__circle');
    const total = this.state.phase === 'break' ? this.state.breakSeconds : Math.max(this.state.remainingStudySeconds, this.state.remainingBlockSeconds);
    const remaining = this.state.phase === 'break' ? this.state.remainingBreakSeconds : this.state.remainingBlockSeconds;

    if (statusEl) {
      if (!this.state.isActive) {
        statusEl.textContent = 'Ready to start';
      } else if (this.state.isPaused) {
        statusEl.textContent = '⏸ Paused';
      } else if (this.state.phase === 'study') {
        statusEl.textContent = '📚 Studying...';
      } else {
        statusEl.textContent = '🛑 Break Time';
      }
    }

    if (timerEl) {
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      timerEl.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
    }

    if (circle && total > 0) {
      const radius = circle.r.baseVal.value;
      const circumference = 2 * Math.PI * radius;
      circle.style.strokeDasharray = circumference;
      const percent = remaining / total;
      circle.style.strokeDashoffset = circumference - percent * circumference;
    }
  }
}

window.focusSessionAlarm = new FocusSessionAlarm();

function startSession() {
  const totalTime = Number(document.getElementById('totalTime')?.value || 30);
  const totalUnit = document.getElementById('totalUnit')?.value || 'minutes';
  const blockTime = Number(document.getElementById('blockTime')?.value || 10);
  const blockUnit = document.getElementById('blockUnit')?.value || 'minutes';
  const breakTime = Number(document.getElementById('breakDuration')?.value || 2);
  const totalSeconds = totalUnit === 'hours' ? totalTime * 3600 : totalTime * 60;
  const blockSeconds = blockUnit === 'hours' ? blockTime * 3600 : blockTime * 60;
  window.focusSessionAlarm.startSession(totalSeconds, blockSeconds, breakTime * 60);
}

function pauseSession() {
  window.focusSessionAlarm.pauseSession();
}

function resetSession() {
  window.focusSessionAlarm.resetSession();
}

class MotivationManager {
  constructor() {
    this.storageKey = 'motivationState';
    this.notificationKey = 'focusNotifications';
    this.messages = [
      '🔥 Stay focused! Success is built one step at a time.',
      '💡 Small progress daily leads to big results.',
      '🚀 Your future self will thank you for this effort.',
      '📚 Discipline today, freedom tomorrow.',
      '🎯 Focus beats motivation. Keep going!',
      '🏆 Consistency is the real superpower.',
      '💪 You’re stronger than you think!',
      '🌟 Every study session counts!',
      '📖 Knowledge is power!',
      '⏰ Time is precious - use it wisely!',
      '📝 Keep pushing, you’re doing great!',
      '💯 One more page, one more problem!',
      '🎓 Your dreams are waiting - keep studying!',
      '⭐ Believe in yourself and your abilities!',
      '🔥 You’re on fire! Keep the momentum!'
    ];
    this.interval = 5;
    this.isActive = false;
    this.endTime = null;
    this.lastMessageIndex = -1;
    this.timer = null;
    this.toastTimeout = null;
    this.init();
  }

  init() {
    this.requestPermission();
    this.restoreState();

    window.addEventListener('storage', (event) => {
      if (event.key === this.storageKey) {
        this.restoreState();
      }
      if (event.key === this.notificationKey) {
        const data = JSON.parse(event.newValue);
        this.handleNotification(data);
      }
    });

    window.addEventListener('beforeunload', () => this.saveState());
    window.addEventListener('pagehide', () => this.saveState());
  }

  requestPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  restoreState() {
    const saved = localStorage.getItem(this.storageKey);
    if (!saved) {
      this.resetState(true);
      return;
    }
    try {
      const state = JSON.parse(saved);
      this.isActive = state.isActive;
      this.interval = state.interval || 5;
      this.lastMessageIndex = state.lastIndex || -1;
      this.endTime = state.endTime || (Date.now() + this.interval * 60 * 1000);
      if (this.isActive) {
        this.startTimer();
      }
      this.updateTimerDisplay();
    } catch (error) {
      console.error('Failed to restore motivation state:', error);
      this.resetState(true);
    }
  }

  saveState() {
    localStorage.setItem(this.storageKey, JSON.stringify({
      isActive: this.isActive,
      interval: this.interval,
      lastIndex: this.lastMessageIndex,
      endTime: this.endTime
    }));
  }

  resetState(silent = false) {
    this.isActive = false;
    this.endTime = null;
    this.lastMessageIndex = -1;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (!silent) {
      localStorage.removeItem(this.storageKey);
    }
    this.updateTimerDisplay();
  }

  startMotivation(intervalMinutes) {
    this.interval = Number(intervalMinutes) || this.interval || 5;
    this.isActive = true;
    this.endTime = Date.now() + this.interval * 60 * 1000;
    this.saveState();
    this.startTimer();
    this.updateTimerDisplay();
    this.broadcastMotivation({
      type: 'motivation',
      message: `Motivational alerts every ${this.interval} minute(s) are active.`
    });
  }

  stopMotivation() {
    this.resetState();
    this.updateTimerDisplay();
    this.broadcastMotivation({
      type: 'motivation',
      message: 'Motivational alerts have been stopped.'
    });
  }

  toggleMotivation() {
    const toggle = document.getElementById('motivationToggle');
    if (toggle) {
      toggle.classList.toggle('active');
    }
  }

  startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => this.tick(), 1000);
    this.tick();
  }

  tick() {
    if (!this.isActive || !this.endTime) {
      this.updateTimerDisplay();
      return;
    }

    const now = Date.now();
    if (now >= this.endTime) {
      this.showMotivationMessage();
      this.endTime = Date.now() + this.interval * 60 * 1000;
      this.saveState();
    }

    this.updateTimerDisplay();
  }

  updateTimerDisplay() {
    const el = document.getElementById('motivationTimer');
    if (!el) return;
    if (!this.isActive || !this.endTime) {
      el.textContent = '--:--';
      return;
    }
    const timeLeft = Math.max(0, Math.floor((this.endTime - Date.now()) / 1000));
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    el.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  showMotivationMessage() {
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * this.messages.length);
    } while (randomIndex === this.lastMessageIndex && this.messages.length > 1);

    this.lastMessageIndex = randomIndex;
    this.saveState();

    const message = this.messages[randomIndex];
    const sound = new Audio('/static/sounds/notification.mp3');
    sound.play().catch(() => {});

    this.broadcastMotivation({
      type: 'motivation',
      message: message
    });
  }

  broadcastMotivation(data) {
    if (window.notificationManager) {
      window.notificationManager.showNotification(data);
    }
    localStorage.setItem(this.notificationKey, JSON.stringify(Object.assign({}, data, { timestamp: Date.now() })));
  }

  handleNotification(data) {
    if (data.type === 'motivation') {
      if (window.notificationManager) {
        window.notificationManager.showNotification(data);
      } else {
        this.showMotivationToast(data.message);
      }
    }
  }

  showMotivationToast(message) {
    let toast = document.getElementById('globalMotivationToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'globalMotivationToast';
      toast.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #111;
        color: white; padding: 18px 20px 18px 16px; border-radius: 14px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.4); z-index: 10001;
        font-family: Poppins, sans-serif; max-width: 360px; display: flex;
        align-items: center; gap: 14px; opacity: 0.98;
      `;

      const messageSpan = document.createElement('span');
      messageSpan.id = 'globalMotivationMessage';
      messageSpan.style.cssText = 'flex: 1; font-size: 14px; line-height: 1.4;';
      toast.appendChild(messageSpan);

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕';
      closeBtn.style.cssText = `
        background: transparent; border: none; color: white; font-size: 16px;
        cursor: pointer; padding: 0; opacity: 0.8;
      `;
      closeBtn.onclick = () => {
        toast.style.display = 'none';
        clearTimeout(this.toastTimeout);
      };
      toast.appendChild(closeBtn);
      document.body.appendChild(toast);
    }

    document.getElementById('globalMotivationMessage').textContent = message;
    toast.style.display = 'flex';
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.style.display = 'none';
    }, 60000);
  }
}

window.motivationManager = new MotivationManager();

function toggleMotivation() {
  window.motivationManager.toggleMotivation();
}

function startMotivation() {
  const interval = Number(document.getElementById('motivationInterval')?.value || 5);
  window.motivationManager.startMotivation(interval);
}

function stopMotivation() {
  window.motivationManager.stopMotivation();
}
