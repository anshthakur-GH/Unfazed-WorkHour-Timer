// DOM Elements
const timeDisplay = document.getElementById('time-display');
const playPauseBtn = document.getElementById('play-pause-btn');
const saveBtn = document.getElementById('save-btn');
const toggleHistoryBtn = document.getElementById('toggle-history-btn');
const closeBtn = document.getElementById('close-btn');

const mainView = document.getElementById('main-view');
const historyView = document.getElementById('history-view');
const historyList = document.getElementById('history-list');
const backBtn = document.getElementById('back-btn');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// Timer State
let timerInterval = null;
let secondsElapsed = 0;
let isRunning = false;
let isHovered = false;
let collapseTimeout = null;

const appContainer = document.querySelector('.app-container');

// Custom Dragging Logic
let isDragging = false;
let startX, startY;

appContainer.addEventListener('mousedown', (e) => {
  // Don't drag if clicking buttons
  if (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.closest('.history-list')) return;
  
  isDragging = true;
  startX = e.screenX;
  startY = e.screenY;
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const deltaX = e.screenX - startX;
    const deltaY = e.screenY - startY;
    startX = e.screenX;
    startY = e.screenY;
    window.api.moveWindow(deltaX, deltaY);
  }
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

// Hover Logic
appContainer.addEventListener('mouseenter', () => {
  isHovered = true;
  if (collapseTimeout) {
    clearTimeout(collapseTimeout);
    collapseTimeout = null;
  }
  updateWindowState();
});

appContainer.addEventListener('mousemove', (e) => {
  if (!isHovered) {
    isHovered = true;
    updateWindowState();
  }
});

appContainer.addEventListener('mouseleave', () => {
  isHovered = false;
  if (collapseTimeout) clearTimeout(collapseTimeout);
  
  // Wait 3 seconds before contracting automatically if running
  collapseTimeout = setTimeout(() => {
    updateWindowState();
  }, 3000);
});

function updateWindowState() {
  const isHistoryActive = historyView.classList.contains('active');
  if (isHistoryActive) return;

  if (isRunning && !isHovered) {
    document.body.classList.add('collapsed');
    window.api.resizeWindow(140, 50); 
  } else {
    document.body.classList.remove('collapsed');
    window.api.resizeWindow(140, 115); 
  }
}

// Format seconds into HH:MM:SS
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
}

// Update the DOM
function updateDisplay() {
  timeDisplay.textContent = formatTime(secondsElapsed);
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    secondsElapsed++;
    updateDisplay();
  }, 1000);
  isRunning = true;
  playPauseBtn.textContent = 'Pause';
  playPauseBtn.classList.add('pause');
  saveBtn.disabled = true; // Cannot save while running
  
  isHovered = false; // Force contract
  updateWindowState();
}

function pauseTimer() {
  clearInterval(timerInterval);
  isRunning = false;
  playPauseBtn.textContent = 'Continue';
  playPauseBtn.classList.remove('pause');
  
  // Can only save if we have some time accumulated
  if (secondsElapsed > 0) {
    saveBtn.disabled = false;
  }
  updateWindowState();
}

// Event Listeners
playPauseBtn.addEventListener('click', () => {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
});

saveBtn.addEventListener('click', async () => {
  if (secondsElapsed === 0) return;
  
  const savedData = {
    duration: secondsElapsed,
    formatted: formatTime(secondsElapsed)
  };
  
  await window.api.saveHistory(savedData);
  
  // Reset Timer
  secondsElapsed = 0;
  updateDisplay();
  saveBtn.disabled = true;
  playPauseBtn.textContent = 'Start';
  
  // Optional: show a small notification or flash effect
  const originalColor = timeDisplay.style.color;
  timeDisplay.style.color = '#00f2fe';
  setTimeout(() => { timeDisplay.style.color = originalColor; }, 500);
});

closeBtn.addEventListener('click', () => {
  window.api.closeApp();
});

// View Navigation
toggleHistoryBtn.addEventListener('click', async () => {
  await loadHistory();
  mainView.classList.remove('active');
  historyView.classList.add('active');
  
  // Resize window for history space
  window.api.resizeWindow(160, 260); 
});

backBtn.addEventListener('click', () => {
  historyView.classList.remove('active');
  mainView.classList.add('active');
  
  // Update state properly
  updateWindowState();
});

clearHistoryBtn.addEventListener('click', async () => {
  if(confirm('Are you sure you want to clear all history?')) {
    await window.api.clearHistory();
    await loadHistory();
  }
});

// History Loading
async function loadHistory() {
  const history = await window.api.getHistory();
  historyList.innerHTML = '';
  
  if (!history || history.length === 0) {
    historyList.innerHTML = '<div style="text-align:center; padding: 20px 0; color: rgba(255,255,255,0.4); font-size: 13px;">No history yet.</div>';
    return;
  }
  
  // Sort descending by date
  history.sort((a,b) => new Date(b.date) - new Date(a.date));
  
  history.forEach(session => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    // Format Date beautifully
    const sessionDate = new Date(session.date);
    const dateStr = sessionDate.toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'
    });
    
    item.innerHTML = `
      <div class="date">${dateStr}</div>
      <div class="duration">${session.formatted}</div>
    `;
    historyList.appendChild(item);
  });
}

// Initial
updateDisplay();
