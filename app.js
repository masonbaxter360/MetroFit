(function () {
  'use strict';

  var DB_NAME = 'gym_bxtr_db_v1';
  var STORE_NAME = 'app_state';
  var LOCAL_FALLBACK_KEY = 'gym_bxtr_fallback_v1';

  var CATEGORIES = [
    'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs',
    'Calves', 'Abs', 'Cardio', 'Forearms', 'Neck', 'Jammer Legs', 'Lower Back'
  ];

  var NEXT_UP_EXCLUDED = {
    'Calves': true,
    'Abs': true,
    'Cardio': true,
    'Forearms': true,
    'Neck': true,
    'Jammer Legs': true,
    'Lower Back': true
  };

  var STRENGTH_DETAIL_METRICS = [
    { key: 'maxWeight', label: 'Max Weight' },
    { key: 'volume', label: 'Volume' },
    { key: 'est1rm', label: 'Est. 1RM' },
    { key: 'reps', label: 'Total Reps' }
  ];

  var CARDIO_DETAIL_METRICS = [
    { key: 'durationMin', label: 'Duration (min)' },
    { key: 'distance', label: 'Distance' },
    { key: 'calories', label: 'Calories' }
  ];

  var DEFAULT_EXERCISES = [
    { id: 'ex_bench', name: 'Barbell Bench Press', category: 'Chest', type: 'strength' },
    { id: 'ex_incline_db', name: 'Incline Dumbbell Press', category: 'Chest', type: 'strength' },
    { id: 'ex_chest_fly', name: 'Seated Machine Fly', category: 'Chest', type: 'strength' },
    { id: 'ex_lat_pull', name: 'Cable Lat Pulldown', category: 'Back', type: 'strength' },
    { id: 'ex_cable_row', name: 'Seated Cable Row', category: 'Back', type: 'strength' },
    { id: 'ex_ohp', name: 'Hammer Strength Shoulder Press', category: 'Shoulders', type: 'strength' },
    { id: 'ex_lat_raise', name: 'Side Raise Machine', category: 'Shoulders', type: 'strength' },
    { id: 'ex_ez_curl', name: 'EZ-Bar Bicep Curl', category: 'Biceps', type: 'strength' },
    { id: 'ex_tri_ext', name: 'Dumbbell Overhead Triceps Extension', category: 'Triceps', type: 'strength' },
    { id: 'ex_tri_press', name: 'Tricep Pressdown', category: 'Triceps', type: 'strength' },
    { id: 'ex_squat', name: 'Barbell Back Squat', category: 'Legs', type: 'strength' },
    { id: 'ex_leg_press', name: 'Leg Press', category: 'Legs', type: 'strength' },
    { id: 'ex_calf', name: 'Seated Calf Extension', category: 'Calves', type: 'strength' },
    { id: 'ex_plank', name: 'Weighted Plank', category: 'Abs', type: 'strength' },
    { id: 'ex_elliptical', name: 'Elliptical Trainer', category: 'Cardio', type: 'cardio' },
    { id: 'ex_treadmill', name: 'Treadmill Run', category: 'Cardio', type: 'cardio' }
  ];

  function toISODate(d) {
    var yr = d.getFullYear();
    var mo = String(d.getMonth() + 1).padStart(2, '0');
    var da = String(d.getDate()).padStart(2, '0');
    return yr + '-' + mo + '-' + da;
  }

  function parseISODate(iso) {
    var p = iso.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function addDaysISO(iso, delta) {
    var d = parseISODate(iso);
    d.setDate(d.getDate() + delta);
    return toISODate(d);
  }

  var state = {
    activePane: 0,
    selectedDate: toISODate(new Date()),
    theme: 'amoled',
    accent: '#ff007f,#ff6a00',
    weightUnit: 'lb',
    exercises: DEFAULT_EXERCISES.slice(),
    workouts: {},
    exerciseFilterCat: 'All',
    exerciseSearch: '',
    chart: {
      timeframe: 'week',
      scope: 'all',
      scopeValue: '',
      metric: 'volume',
      range: 'all',
      selectedIdx: -1
    },
    rollingWeek: {
      offset: 0,
      metric: 'volume',
      selectedDayIdx: -1
    },
    detail: {
      exerciseId: null,
      tab: 'track',
      metric: 'maxWeight'
    },
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  };

  /* -------------------- HAPTICS -------------------- */
  var audioCtx = null;
  window.triggerHaptic = function (style) {
    try {
      if (navigator.vibrate) {
        navigator.vibrate(style === 'heavy' ? 24 : style === 'medium' ? 14 : 7);
      }
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === 'suspended') audioCtx.resume();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.frequency.value = style === 'heavy' ? 110 : 180;
        gain.gain.setValueAtTime(0.018, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.025);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.026);
      }
    } catch (e) {}
  };

  /* -------------------- //-// ICON & MANIFEST GENERATOR -------------------- */
  function drawBrandLogoCanvas(size) {
    var c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    var ctx = c.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    var s = size / 512;
    var grad = ctx.createLinearGradient(54 * s, 0, 458 * s, 0);
    grad.addColorStop(0, '#ff007f');
    grad.addColorStop(0.5, '#ff3d3d');
    grad.addColorStop(1, '#ff6a00');
    ctx.fillStyle = grad;

    function poly(pts) {
      ctx.beginPath();
      ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0] * s, pts[i][1] * s);
      ctx.closePath();
      ctx.fill();
    }

    poly([[108, 160], [146, 160], [92, 352], [54, 352]]);
    poly([[176, 160], [214, 160], [160, 352], [122, 352]]);
    poly([[212, 238], [308, 238], [298, 274], [202, 274]]);
    poly([[352, 160], [390, 160], [336, 352], [298, 352]]);
    poly([[420, 160], [458, 160], [404, 352], [366, 352]]);

    return c.toDataURL('image/png');
  }

  function initBrandAssets() {
    try {
      var icon180 = drawBrandLogoCanvas(180);
      var icon512 = drawBrandLogoCanvas(512);
      document.getElementById('appleTouchIcon').href = icon180;
      document.getElementById('faviconIcon').href = icon512;

      var manifest = {
        name: 'GYM // BXTR',
        short_name: 'GYM // BXTR',
        start_url: './index.html',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#000000',
        icons: [
          { src: icon180, sizes: '180x180', type: 'image/png' },
          { src: icon512, sizes: '512x512', type: 'image/png' }
        ]
      };
      var blob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
      document.getElementById('manifestLink').href = URL.createObjectURL(blob);
    } catch (e) {}
  }

  /* -------------------- PERSISTENCE (INDEXEDDB + LOCALSTORAGE) -------------------- */
  function openDB() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('No IndexedDB'));
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function saveDB() {
    var payload = {
      theme: state.theme,
      accent: state.accent,
      weightUnit: state.weightUnit,
      exercises: state.exercises,
      workouts: state.workouts
    };
    try { localStorage.setItem(LOCAL_FALLBACK_KEY, JSON.stringify(payload)); } catch (e) {}
    openDB().then(function (db) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(payload, 'singleton');
    }).catch(function () {});
  }

  function loadDB() {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx = db.transaction(STORE_NAME, 'readonly');
        var req = tx.objectStore(STORE_NAME).get('singleton');
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { resolve(null); };
      });
    }).catch(function () {
      return null;
    }).then(function (data) {
      if (!data) {
        try {
          var raw = localStorage.getItem(LOCAL_FALLBACK_KEY);
          if (raw) data = JSON.parse(raw);
        } catch (e) {}
      }
      if (data) {
        if (data.theme) state.theme = data.theme;
        if (data.accent) state.accent = data.accent;
        if (data.weightUnit === 'kg' || data.weightUnit === 'lb') state.weightUnit = data.weightUnit;
        if (Array.isArray(data.exercises) && data.exercises.length) state.exercises = data.exercises;
        if (data.workouts && typeof data.workouts === 'object') state.workouts = data.workouts;
      }
      applyThemeAndAccent();
    });
  }

  function applyThemeAndAccent() {
    document.documentElement.setAttribute('data-theme', state.theme);
    var parts = (state.accent || '#ff007f,#ff6a00').split(',');
    document.documentElement.style.setProperty('--accent-1', parts[0]);
    document.documentElement.style.setProperty('--accent-2', parts[1] || parts[0]);
    document.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-theme-choice') === state.theme);
    });
    document.querySelectorAll('#accentSwatches .swatch-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-accent') === state.accent);
    });
  }


  /* -------------------- WEIGHT UNIT CONVERSION (LB <-> KG) -------------------- */
  var KG_TO_LB = 2.20462262;
  function getWeightUnitLabel() {
    return state.weightUnit === 'kg' ? 'KG' : 'LB';
  }
  function formatWeightForDisplay(storedLbVal) {
    var val = Number(storedLbVal) || 0;
    if (state.weightUnit === 'kg') {
      return Math.round((val / KG_TO_LB) * 100) / 100;
    }
    return Math.round(val * 10) / 10;
  }
  function parseWeightInputToStoredLb(inputVal) {
    var num = parseFloat(inputVal);
    if (isNaN(num)) return 0;
    if (state.weightUnit === 'kg') {
      return Math.round((num * KG_TO_LB) * 100) / 100;
    }
    return Math.round(num * 100) / 100;
  }
  function convertCSVWeightColumnToLb(rawWeight) {
    var num = parseFloat(rawWeight);
    if (isNaN(num) || num === 0) return 0;
    // Detect FitNotes kg-in-lbs-column exports: most rows match kg * 2.20462262 to a 0.5 lb increment
    var asLbFromKg = Math.round(num * KG_TO_LB * 10) / 10;
    var isHalfLb = Math.abs((asLbFromKg * 2) - Math.round(asLbFromKg * 2)) < 0.02;
    return isHalfLb ? asLbFromKg : (Math.round(num * 100) / 100);
  }

  /* -------------------- CARDIO COLON TIME HELPERS (00:00) -------------------- */
  function sanitizeCardioTimeInput(val) {
    var cleaned = String(val || '').replace(/[^0-9:]/g, '');
    var parts = cleaned.split(':');
    if (parts.length > 3) cleaned = parts.slice(0, 3).join(':');
    return cleaned;
  }

  function parseCardioTimeToSeconds(str) {
    var s = String(str || '').trim();
    if (!s) return 0;
    if (s.indexOf(':') === -1) {
      var mins = parseFloat(s);
      return isNaN(mins) ? 0 : Math.round(mins * 60);
    }
    var parts = s.split(':').map(function (p) { return parseInt(p, 10) || 0; });
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  }

  function formatCardioSecondsToClock(totalSec) {
    var sec = Math.max(0, Math.round(Number(totalSec) || 0));
    var hrs = Math.floor(sec / 3600);
    var mins = Math.floor((sec % 3600) / 60);
    var rem = sec % 60;
    if (hrs > 0) {
      return hrs + ':' + String(mins).padStart(2, '0') + ':' + String(rem).padStart(2, '0');
    }
    return String(mins).padStart(2, '0') + ':' + String(rem).padStart(2, '0');
  }

  /* -------------------- PROGRESSIVE +5 LB & HISTORY LOOKUPS -------------------- */
  function getExerciseById(id) {
    return state.exercises.find(function (e) { return e.id === id; }) || null;
  }

  function getLastSessionForExercise(exId, beforeDateISO) {
    var dates = Object.keys(state.workouts).sort().reverse();
    for (var i = 0; i < dates.length; i++) {
      var d = dates[i];
      if (beforeDateISO && d >= beforeDateISO) continue;
      var entries = state.workouts[d] || [];
      var found = entries.find(function (en) { return en.exerciseId === exId && en.sets && en.sets.length; });
      if (found) return { date: d, sets: found.sets };
    }
    return null;
  }

  function getSuggestedStartValues(ex, currentSets) {
    if (currentSets && currentSets.length) {
      var last = currentSets[currentSets.length - 1];
      if (ex.type === 'cardio') {
        return {
          timeStr: formatCardioSecondsToClock(last.durationSec || 1200),
          distance: last.distance || 1.5,
          calories: last.calories || 0
        };
      }
      return { weight: formatWeightForDisplay(last.weight || 45), reps: last.reps || 10 };
    }
    var prev = getLastSessionForExercise(ex.id, state.selectedDate);
    if (prev && prev.sets.length) {
      if (ex.type === 'cardio') {
        var lastC = prev.sets[prev.sets.length - 1];
        return {
          timeStr: formatCardioSecondsToClock(lastC.durationSec || 1200),
          distance: lastC.distance || 1.5,
          calories: lastC.calories || 0
        };
      }
      var minW = prev.sets.reduce(function (m, s) {
        var w = Number(s.weight) || 0;
        return w > 0 && w < m ? w : m;
      }, Infinity);
      var startW = isFinite(minW) ? minW + 5 : 45;
      return { weight: formatWeightForDisplay(startW), reps: prev.sets[0].reps || 10 };
    }
    return ex.type === 'cardio' ? { timeStr: '20:00', distance: 1.5, calories: 0 } : { weight: formatWeightForDisplay(45), reps: 10 };
  }

  function getNextUpMuscles() {
    var eligible = CATEGORIES.filter(function (c) { return !NEXT_UP_EXCLUDED[c]; });
    var lastTrained = {};
    eligible.forEach(function (c) { lastTrained[c] = null; });

    var dates = Object.keys(state.workouts).sort().reverse();
    dates.forEach(function (d) {
      (state.workouts[d] || []).forEach(function (en) {
        if (!en.sets || !en.sets.length) return;
        var ex = getExerciseById(en.exerciseId);
        if (ex && eligible.indexOf(ex.category) !== -1 && !lastTrained[ex.category]) {
          lastTrained[ex.category] = d;
        }
      });
    });

    var today = parseISODate(toISODate(new Date()));
    return eligible.map(function (cat) {
      var dStr = lastTrained[cat];
      var daysAgo = dStr ? Math.max(0, Math.round((today - parseISODate(dStr)) / 86400000)) : 999;
      return { category: cat, daysAgo: daysAgo };
    }).sort(function (a, b) {
      return b.daysAgo - a.daysAgo;
    }).slice(0, 3);
  }

  /* -------------------- NAVIGATION & DATE SUB-BAR -------------------- */
  function setActivePane(idx) {
    state.activePane = Math.max(0, Math.min(3, idx));
    document.getElementById('panesTrack').style.transform = 'translateX(-' + (state.activePane * 25) + '%)';

    document.querySelectorAll('#pivotStrip .pivot-btn').forEach(function (btn) {
      btn.classList.toggle('active', Number(btn.getAttribute('data-pane')) === state.activePane);
    });

    document.querySelectorAll('.appbar-btn').forEach(function (btn) {
      var act = btn.getAttribute('data-action');
      btn.classList.toggle('active', act === 'pane-' + state.activePane);
    });

    document.getElementById('dateSubBar').classList.toggle('hidden', state.activePane !== 0);

    if (state.activePane === 0) renderWorkoutPane();
    if (state.activePane === 1) renderExercisesPane();
    if (state.activePane === 2) renderChartsPane();
  }

  function updateDateHeader() {
    var todayISO = toISODate(new Date());
    var yestISO = addDaysISO(todayISO, -1);
    var tomISO = addDaysISO(todayISO, 1);
    var d = parseISODate(state.selectedDate);

    var primary = state.selectedDate === todayISO ? 'Today'
      : state.selectedDate === yestISO ? 'Yesterday'
      : state.selectedDate === tomISO ? 'Tomorrow'
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    var secondary = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    document.getElementById('datePrimaryLabel').textContent = primary;
    document.getElementById('dateSecondaryLabel').textContent = secondary;
  }

  /* -------------------- WORKOUT PANE & DRAG/SWIPE SET GESTURES -------------------- */
  function ensureWorkoutEntry(dateISO, exId) {
    if (!state.workouts[dateISO]) state.workouts[dateISO] = [];
    var entry = state.workouts[dateISO].find(function (e) { return e.exerciseId === exId; });
    if (!entry) {
      entry = { exerciseId: exId, sets: [] };
      state.workouts[dateISO].push(entry);
    }
    return entry;
  }


  function scrollToExerciseBottom(exId, opts) {
    if (!exId) return;
    var options = opts || {};
    var focusInput = Boolean(options.focusInput);
    var behavior = options.behavior || 'auto';

    function performScroll() {
      var pane = document.getElementById('pane-0');
      var card = document.querySelector('#workoutList .workout-card[data-ex-id="' + exId + '"]');
      if (!pane || !card) return;

      var appBar = document.querySelector('.app-bar');
      var barHeight = appBar ? appBar.getBoundingClientRect().height : 56;
      var visibleBottom = window.visualViewport
        ? (window.visualViewport.offsetTop + window.visualViewport.height)
        : window.innerHeight;

      // Keep clear of the bottom bar and any open keyboard
      var safeBottom = Math.min(pane.getBoundingClientRect().bottom, visibleBottom - barHeight);
      var cardRect = card.getBoundingClientRect();
      var quickLog = card.querySelector('.quick-log-row');
      var anchorRect = quickLog ? quickLog.getBoundingClientRect() : cardRect;

      var delta = anchorRect.bottom - safeBottom + 14;
      if (delta > 2 || delta < -120) {
        pane.scrollTo({
          top: Math.max(0, pane.scrollTop + delta),
          behavior: behavior
        });
      }

      if (focusInput && quickLog) {
        var firstInp = quickLog.querySelector('input');
        if (firstInp) {
          try { firstInp.focus({ preventScroll: true }); } catch (e) {}
        }
      }
    }

    requestAnimationFrame(function () {
      requestAnimationFrame(performScroll);
    });
  }

  function renderWorkoutPane() {
    updateDateHeader();
    var nextUpBox = document.getElementById('nextUpContainer');
    var next3 = getNextUpMuscles();
    nextUpBox.innerHTML =
      '<div class="metro-card">' +
        '<div class="card-kicker">NEXT UP ROTATION</div>' +
        '<div class="nextup-grid">' +
          next3.map(function (item) {
            var sub = item.daysAgo >= 999 ? 'Not logged yet' : item.daysAgo === 0 ? 'Trained today' : item.daysAgo + 'd ago';
            return '<button type="button" class="nextup-tile" data-next-cat="' + item.category + '">' +
              '<div class="nextup-muscle">' + item.category + '</div>' +
              '<div class="nextup-days">' + sub + '</div>' +
            '</button>';
          }).join('') +
        '</div>' +
      '</div>';

    nextUpBox.querySelectorAll('[data-next-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.triggerHaptic('light');
        state.exerciseFilterCat = btn.getAttribute('data-next-cat');
        setActivePane(1);
      });
    });

    var list = document.getElementById('workoutList');
    var entries = state.workouts[state.selectedDate] || [];
    if (!entries.length) {
      list.innerHTML =
        '<div class="empty-state">' +
          '<p style="margin-bottom:14px;">No exercises logged for this day.</p>' +
          '<button type="button" id="emptyAddExBtn" class="metro-btn-accent">+ ADD EXERCISE</button>' +
        '</div>';
      document.getElementById('emptyAddExBtn').addEventListener('click', function () {
        window.triggerHaptic('light');
        setActivePane(1);
      });
      return;
    }

    list.innerHTML = entries.map(function (entry) {
      var ex = getExerciseById(entry.exerciseId) || { id: entry.exerciseId, name: entry.exerciseId, category: 'Strength', type: 'strength' };
      var prev = getLastSessionForExercise(ex.id, state.selectedDate);
      var prevNote = 'NO PRIOR RECORD';
      if (prev && prev.sets.length) {
        if (ex.type === 'cardio') {
          var maxSec = Math.max.apply(null, prev.sets.map(function (s) { return s.durationSec || 0; }));
          prevNote = 'PREV MAX: ' + formatCardioSecondsToClock(maxSec);
        } else {
          var maxW = Math.max.apply(null, prev.sets.map(function (s) { return s.weight || 0; }));
          prevNote = 'PREV MAX: ' + formatWeightForDisplay(maxW) + ' ' + getWeightUnitLabel();
        }
      }

      var startVals = getSuggestedStartValues(ex, entry.sets);
      var setsHtml = entry.sets.map(function (s, idx) {
        var kcalHtml = (Number(s.calories) || 0) > 0
          ? '<span class="set-val">' + (Number(s.calories) || 0) + '<span class="set-unit">KCAL</span></span>'
          : '';
        var metricsHtml = ex.type === 'cardio'
          ? '<span class="set-val">' + formatCardioSecondsToClock(s.durationSec) + '<span class="set-unit">TIME</span></span>' +
            '<span class="set-val">' + (s.distance || 0) + '<span class="set-unit">MI</span></span>' +
            kcalHtml
          : '<span class="set-val">' + formatWeightForDisplay(s.weight) + '<span class="set-unit">' + getWeightUnitLabel() + '</span></span>' +
            '<span class="set-val">' + (s.reps || 0) + '<span class="set-unit">REPS</span></span>';

        return '<div class="set-row-wrap" data-set-idx="' + idx + '">' +
          '<div class="set-swipe-bg">DELETE</div>' +
          '<div class="set-row">' +
            '<span class="drag-grip" aria-label="Drag to reorder">⋮⋮</span>' +
            '<span class="set-num">' + (idx + 1) + '</span>' +
            metricsHtml +
          '</div>' +
        '</div>';
      }).join('');

      var inputsHtml = ex.type === 'cardio'
        ? '<input type="text" inputmode="text" class="metro-input ql-time" placeholder="00:00" value="' + startVals.timeStr + '" />' +
          '<input type="number" step="0.1" inputmode="decimal" class="metro-input ql-dist" placeholder="mi" value="' + startVals.distance + '" />' +
          '<input type="number" step="1" min="0" inputmode="numeric" class="metro-input ql-kcal" placeholder="kcal" value="' + (startVals.calories || '') + '" />'
        : '<input type="number" step="0.5" inputmode="decimal" class="metro-input ql-weight" placeholder="' + getWeightUnitLabel().toLowerCase() + '" value="' + startVals.weight + '" />' +
          '<input type="number" inputmode="numeric" class="metro-input ql-reps" placeholder="reps" value="' + startVals.reps + '" />';

      return '<div class="workout-card" data-ex-id="' + ex.id + '">' +
        '<div class="card-head-row">' +
          '<div class="ex-title-tap" style="cursor:pointer;">' +
            '<div class="card-title">' + ex.name + '</div>' +
            '<div class="card-kicker" style="margin-top:4px;">' + ex.category + ' • ' + prevNote + '</div>' +
          '</div>' +
          '<button type="button" class="delete-ex-btn">DELETE</button>' +
        '</div>' +
        '<div class="sets-list">' + setsHtml + '</div>' +
        '<div class="quick-log-row' + (ex.type === 'cardio' ? ' cardio-row' : '') + '">' +
          inputsHtml +
          '<button type="button" class="metro-btn-accent ql-log-btn">LOG</button>' +
        '</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.workout-card').forEach(function (card) {
      var exId = card.getAttribute('data-ex-id');
      var ex = getExerciseById(exId);

      card.querySelector('.ex-title-tap').addEventListener('click', function () {
        window.triggerHaptic('light');
        openExerciseDetail(exId);
      });

      card.querySelector('.delete-ex-btn').addEventListener('click', function () {
        window.triggerHaptic('heavy');
        openConfirm('Remove Exercise', 'Remove ' + (ex ? ex.name : 'exercise') + ' from this workout?', function () {
          state.workouts[state.selectedDate] = (state.workouts[state.selectedDate] || []).filter(function (e) {
            return e.exerciseId !== exId;
          });
          saveDB();
          renderWorkoutPane();
        });
      });

      var timeInp = card.querySelector('.ql-time');
      if (timeInp) {
        timeInp.addEventListener('input', function () {
          timeInp.value = sanitizeCardioTimeInput(timeInp.value);
        });
        timeInp.addEventListener('blur', function () {
          timeInp.value = formatCardioSecondsToClock(parseCardioTimeToSeconds(timeInp.value));
        });
      }

      card.querySelector('.ql-log-btn').addEventListener('click', function () {
        window.triggerHaptic('medium');
        var entry = ensureWorkoutEntry(state.selectedDate, exId);
        if (ex && ex.type === 'cardio') {
          var sec = parseCardioTimeToSeconds(card.querySelector('.ql-time').value);
          var dist = parseFloat(card.querySelector('.ql-dist').value) || 0;
          var kcalEl = card.querySelector('.ql-kcal');
          var kcal = kcalEl ? (Math.round((parseFloat(kcalEl.value) || 0) * 10) / 10) : 0;
          entry.sets.push({ id: 's_' + Date.now(), durationSec: sec, distance: dist, calories: kcal });
        } else {
          var w = parseWeightInputToStoredLb(card.querySelector('.ql-weight').value);
          var r = parseInt(card.querySelector('.ql-reps').value, 10) || 0;
          entry.sets.push({ id: 's_' + Date.now(), weight: w, reps: r });
        }
        saveDB();
        renderWorkoutPane();
        scrollToExerciseBottom(exId, { behavior: 'auto' });
      });

      bindSetRowGestures(card.querySelector('.sets-list'), state.selectedDate, exId, renderWorkoutPane);
    });
  }

  function bindSetRowGestures(container, dateISO, exId, onUpdate) {
    if (!container) return;
    var wraps = Array.prototype.slice.call(container.querySelectorAll('.set-row-wrap'));

    wraps.forEach(function (wrap, idx) {
      var row = wrap.querySelector('.set-row');
      var grip = wrap.querySelector('.drag-grip');
      var startX = 0;
      var startY = 0;
      var currentX = 0;
      var holdTimer = null;
      var isDraggingOrder = false;
      var isSwiping = false;
      var ghost = null;
      var targetIdx = idx;

      wrap.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      function startOrderDrag(clientY) {
        if (isDraggingOrder) return;
        isDraggingOrder = true;
        window.triggerHaptic('heavy');
        var rect = wrap.getBoundingClientRect();
        ghost = document.createElement('div');
        ghost.className = 'set-drag-ghost';
        ghost.style.left = rect.left + 'px';
        ghost.style.top = rect.top + 'px';
        ghost.style.width = rect.width + 'px';
        ghost.innerHTML = row.innerHTML;
        document.body.appendChild(ghost);
        wrap.classList.add('dragging-placeholder');
      }

      function moveOrderDrag(clientY) {
        if (!ghost) return;
        ghost.style.top = (clientY - 22) + 'px';
        var allWraps = Array.prototype.slice.call(container.querySelectorAll('.set-row-wrap'));
        targetIdx = idx;
        for (var i = 0; i < allWraps.length; i++) {
          var r = allWraps[i].getBoundingClientRect();
          if (clientY > r.top + r.height / 2) targetIdx = i;
        }
      }

      function finishOrderDrag() {
        if (ghost) {
          ghost.remove();
          ghost = null;
        }
        wrap.classList.remove('dragging-placeholder');
        if (isDraggingOrder && targetIdx !== idx) {
          var entry = ensureWorkoutEntry(dateISO, exId);
          var moved = entry.sets.splice(idx, 1)[0];
          entry.sets.splice(targetIdx, 0, moved);
          saveDB();
          onUpdate();
        }
        isDraggingOrder = false;
      }

      function onStart(clientX, clientY, fromGrip) {
        startX = clientX;
        startY = clientY;
        currentX = 0;
        isSwiping = false;
        if (fromGrip) {
          startOrderDrag(clientY);
        } else {
          holdTimer = setTimeout(function () {
            startOrderDrag(clientY);
          }, 240);
        }
      }

      function onMove(clientX, clientY, e) {
        var dx = clientX - startX;
        var dy = clientY - startY;
        if (isDraggingOrder) {
          if (e && e.cancelable) e.preventDefault();
          moveOrderDrag(clientY);
          return;
        }
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          clearTimeout(holdTimer);
        }
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
          isSwiping = true;
          currentX = Math.min(0, dx);
          row.style.transform = 'translateX(' + currentX + 'px)';
        }
      }

      function onEnd() {
        clearTimeout(holdTimer);
        if (isDraggingOrder) {
          finishOrderDrag();
          return;
        }
        if (isSwiping) {
          if (currentX < -78) {
            window.triggerHaptic('heavy');
            var entry = ensureWorkoutEntry(dateISO, exId);
            entry.sets.splice(idx, 1);
            saveDB();
            onUpdate();
          } else {
            row.style.transform = 'translateX(0)';
          }
          isSwiping = false;
        }
      }

      wrap.addEventListener('touchstart', function (e) {
        var t = e.touches[0];
        onStart(t.clientX, t.clientY, e.target === grip);
      }, { passive: true });

      wrap.addEventListener('touchmove', function (e) {
        var t = e.touches[0];
        onMove(t.clientX, t.clientY, e);
      }, { passive: false });

      wrap.addEventListener('touchend', onEnd);

      wrap.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        onStart(e.clientX, e.clientY, e.target === grip);
        function mm(ev) { onMove(ev.clientX, ev.clientY, ev); }
        function mu() {
          window.removeEventListener('mousemove', mm);
          window.removeEventListener('mouseup', mu);
          onEnd();
        }
        window.addEventListener('mousemove', mm);
        window.addEventListener('mouseup', mu);
      });
    });
  }

  /* -------------------- EXERCISES PANE -------------------- */
  function getLastUsedDateForExercise(exId) {
    var dates = Object.keys(state.workouts).sort().reverse();
    for (var i = 0; i < dates.length; i++) {
      var found = (state.workouts[dates[i]] || []).some(function (en) {
        return en.exerciseId === exId && en.sets && en.sets.length;
      });
      if (found) return dates[i];
    }
    return '';
  }

  function renderExercisesPane() {
    var chips = document.getElementById('categoryChips');
    var allCats = ['All'].concat(CATEGORIES);
    chips.innerHTML = allCats.map(function (c) {
      return '<button type="button" class="chip-btn' + (state.exerciseFilterCat === c ? ' active' : '') + '" data-cat="' + c + '">' + c + '</button>';
    }).join('');

    chips.querySelectorAll('.chip-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.triggerHaptic('light');
        state.exerciseFilterCat = btn.getAttribute('data-cat');
        renderExercisesPane();
      });
    });

    var q = state.exerciseSearch.trim().toLowerCase();
    var filtered = state.exercises.filter(function (ex) {
      var catOk = state.exerciseFilterCat === 'All' || ex.category === state.exerciseFilterCat;
      var qOk = !q || ex.name.toLowerCase().indexOf(q) !== -1 || ex.category.toLowerCase().indexOf(q) !== -1;
      return catOk && qOk;
    }).map(function (ex) {
      return { ex: ex, lastUsed: getLastUsedDateForExercise(ex.id) };
    }).sort(function (a, b) {
      if (a.lastUsed !== b.lastUsed) return b.lastUsed.localeCompare(a.lastUsed);
      return a.ex.name.localeCompare(b.ex.name);
    });

    var list = document.getElementById('exerciseLibraryList');
    list.innerHTML = filtered.map(function (item) {
      var sub = item.lastUsed ? 'LAST USED: ' + item.lastUsed : 'NEVER LOGGED';
      return '<div class="lib-item" data-lib-id="' + item.ex.id + '">' +
        '<div>' +
          '<div class="card-title" style="font-size:16px;">' + item.ex.name + '</div>' +
          '<div class="card-kicker" style="margin-top:3px;">' + item.ex.category + ' • ' + sub + '</div>' +
        '</div>' +
        '<button type="button" class="metro-btn-accent add-now-btn">+ ADD</button>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.lib-item').forEach(function (row) {
      var id = row.getAttribute('data-lib-id');
      row.addEventListener('click', function (e) {
        if (e.target.classList.contains('add-now-btn')) {
          window.triggerHaptic('medium');
          ensureWorkoutEntry(state.selectedDate, id);
          saveDB();
          setActivePane(0);
          scrollToExerciseBottom(id, { behavior: 'auto' });
          return;
        }
        window.triggerHaptic('light');
        openExerciseDetail(id);
      });
    });
  }

  /* -------------------- CHARTS PANE (LINE GRAPH ABOVE ROLLING 7-DAY BARS) -------------------- */
  function getRollingWeekWindow(offset) {
    var today = parseISODate(toISODate(new Date()));
    var end = new Date(today);
    end.setDate(end.getDate() + (offset || 0) * 7);
    var start = new Date(end);
    start.setDate(start.getDate() - 6);
    var days = [];
    for (var i = 0; i < 7; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({
        iso: toISODate(d),
        dow: d.toLocaleDateString('en-US', { weekday: 'short' }),
        shortDate: (d.getMonth() + 1) + '/' + d.getDate()
      });
    }
    return { start: start, end: end, days: days };
  }

  function getRollingBucketKey(isoDate) {
    var d = parseISODate(isoDate);
    var todayDow = new Date().getDay();
    var startDow = (todayDow + 1) % 7;
    var diff = (d.getDay() - startDow + 7) % 7;
    var bucketStart = new Date(d);
    bucketStart.setDate(d.getDate() - diff);
    return toISODate(bucketStart);
  }

  function getRangeCutoffISO(rangeKey) {
    if (!rangeKey || rangeKey === 'all') return '';
    var d = parseISODate(toISODate(new Date()));
    if (rangeKey === '1y') d.setFullYear(d.getFullYear() - 1);
    else if (rangeKey === '6mo') d.setMonth(d.getMonth() - 6);
    else if (rangeKey === '3mo') d.setMonth(d.getMonth() - 3);
    else if (rangeKey === '1mo') d.setMonth(d.getMonth() - 1);
    return toISODate(d);
  }

  function buildLineSeries() {
    var tf = state.chart.timeframe;
    var scope = state.chart.scope;
    var scopeVal = state.chart.scopeValue;
    var metric = state.chart.metric;
    var cutoffISO = getRangeCutoffISO(state.chart.range);
    var buckets = {};

    Object.keys(state.workouts).sort().forEach(function (dateISO) {
      if (cutoffISO && dateISO < cutoffISO) return;
      (state.workouts[dateISO] || []).forEach(function (en) {
        if (!en.sets || !en.sets.length) return;
        var ex = getExerciseById(en.exerciseId);
        if (!ex) return;
        if (scope === 'category' && scopeVal && ex.category !== scopeVal) return;
        if (scope === 'exercise' && scopeVal && ex.id !== scopeVal) return;

        var key = tf === 'workout' ? dateISO
          : tf === 'week' ? getRollingBucketKey(dateISO)
          : tf === 'month' ? dateISO.slice(0, 7)
          : dateISO.slice(0, 4);

        if (!buckets[key]) buckets[key] = 0;
        en.sets.forEach(function (s) {
          if (metric === 'volume') buckets[key] += formatWeightForDisplay(s.weight) * (Number(s.reps) || 0);
          else if (metric === 'sets') buckets[key] += 1;
          else if (metric === 'maxWeight') buckets[key] = Math.max(buckets[key], formatWeightForDisplay(s.weight));
          else if (metric === 'reps') buckets[key] += Number(s.reps) || 0;
          else if (metric === 'cardioMin') buckets[key] += (Number(s.durationSec) || 0) / 60;
          else if (metric === 'calories') buckets[key] += Number(s.calories) || 0;
        });
      });
    });

    var keys = Object.keys(buckets).sort();
    return keys.map(function (k) {
      var lbl = tf === 'month' ? k : tf === 'year' ? k : k.slice(5);
      return { label: lbl, fullKey: k, value: Math.round(buckets[k] * 10) / 10 };
    });
  }

  function renderChartsPane() {
    document.querySelectorAll('#chartTimeframePills .pill-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tf') === state.chart.timeframe);
    });
    document.querySelectorAll('#chartScopePills .pill-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-scope') === state.chart.scope);
    });
    document.querySelectorAll('#chartMetricPills .pill-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-metric') === state.chart.metric);
    });
    document.querySelectorAll('#chartRangePills .pill-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-range') === state.chart.range);
    });

    var scopeWrap = document.getElementById('chartScopeSelectWrap');
    var scopeSel = document.getElementById('chartScopeSelect');
    if (state.chart.scope === 'all') {
      scopeWrap.classList.add('hidden');
    } else {
      scopeWrap.classList.remove('hidden');
      if (state.chart.scope === 'category') {
        if (!state.chart.scopeValue || CATEGORIES.indexOf(state.chart.scopeValue) === -1) {
          state.chart.scopeValue = CATEGORIES[0];
        }
        scopeSel.innerHTML = CATEGORIES.map(function (c) {
          return '<option value="' + c + '"' + (c === state.chart.scopeValue ? ' selected' : '') + '>' + c + '</option>';
        }).join('');
      } else {
        if (!state.chart.scopeValue || !getExerciseById(state.chart.scopeValue)) {
          state.chart.scopeValue = state.exercises[0].id;
        }
        scopeSel.innerHTML = state.exercises.map(function (e) {
          return '<option value="' + e.id + '"' + (e.id === state.chart.scopeValue ? ' selected' : '') + '>' + e.name + '</option>';
        }).join('');
      }
    }

    var series = buildLineSeries();
    var lineCanvas = document.getElementById('globalChartCanvas');
    drawLineCanvas(lineCanvas, series, state.chart.selectedIdx);
    var readout = document.getElementById('globalChartReadout');
    if (series.length) {
      var activePt = (state.chart.selectedIdx >= 0 && state.chart.selectedIdx < series.length)
        ? series[state.chart.selectedIdx]
        : series[series.length - 1];
      readout.textContent = activePt.fullKey + ': ' + activePt.value.toLocaleString();
    } else {
      readout.textContent = 'No data yet';
    }

    document.querySelectorAll('#rollingMetricPills .pill-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-rmetric') === state.rollingWeek.metric);
    });

    var rw = getRollingWeekWindow(state.rollingWeek.offset);
    document.getElementById('rollingWeekRangeTitle').textContent =
      rw.days[0].shortDate + ' – ' + rw.days[6].shortDate;

    var totalVol = 0;
    var totalSets = 0;
    var totalCardioMin = 0;
    var totalCalories = 0;

    var bars = rw.days.map(function (day) {
      var dayVol = 0;
      var daySets = 0;
      var dayCardio = 0;
      var dayKcal = 0;
      (state.workouts[day.iso] || []).forEach(function (en) {
        (en.sets || []).forEach(function (s) {
          daySets += 1;
          dayVol += formatWeightForDisplay(s.weight) * (Number(s.reps) || 0);
          dayCardio += (Number(s.durationSec) || 0) / 60;
          dayKcal += Number(s.calories) || 0;
        });
      });
      totalVol += dayVol;
      totalSets += daySets;
      totalCardioMin += dayCardio;
      totalCalories += dayKcal;
      var val = state.rollingWeek.metric === 'sets' ? daySets
        : state.rollingWeek.metric === 'cardio' ? Math.round(dayCardio * 10) / 10
        : state.rollingWeek.metric === 'calories' ? Math.round(dayKcal)
        : Math.round(dayVol);
      return { label: day.dow, sub: day.shortDate, value: val };
    });

    drawBarCanvas(document.getElementById('rollingWeekBarCanvas'), bars, state.rollingWeek.selectedDayIdx);

    var barReadout = document.getElementById('rollingBarReadout');
    if (state.rollingWeek.selectedDayIdx >= 0 && bars[state.rollingWeek.selectedDayIdx]) {
      var bItem = bars[state.rollingWeek.selectedDayIdx];
      barReadout.textContent = bItem.label + ' (' + bItem.sub + '): ' + bItem.value.toLocaleString();
    } else {
      barReadout.textContent = 'Tap any bar to inspect';
    }

    document.getElementById('rollingSummaryTiles').innerHTML =
      '<div class="sum-tile"><div class="sum-val">' + Math.round(totalVol).toLocaleString() + '</div><div class="sum-lbl">7d Volume</div></div>' +
      '<div class="sum-tile"><div class="sum-val">' + totalSets + '</div><div class="sum-lbl">7d Sets</div></div>' +
      '<div class="sum-tile"><div class="sum-val">' + Math.round(totalCalories).toLocaleString() + '</div><div class="sum-lbl">7d Kcal</div></div>';
  }

  function formatAxisNumber(val) {
    if (Math.abs(val) >= 10000) return Math.round(val / 1000) + 'k';
    if (Math.abs(val) >= 1000) return (Math.round(val / 100) / 10) + 'k';
    return String(Math.round(val * 10) / 10);
  }

  function drawLineCanvas(canvas, points, selectedIdx) {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.parentElement.clientWidth || 320;
    var h = 225;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (!points.length) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '13px Segoe UI, sans-serif';
      ctx.fillText('Log workouts to see trend line', 12, h / 2);
      return;
    }

    var padL = 44, padR = 14, padT = 18, padB = 34;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    var maxVal = Math.max.apply(null, points.map(function (p) { return p.value; })) || 1;

    var styles = getComputedStyle(document.documentElement);
    var c1 = styles.getPropertyValue('--accent-1').trim() || '#ff007f';
    var c2 = styles.getPropertyValue('--accent-2').trim() || '#ff6a00';
    var grad = ctx.createLinearGradient(padL, 0, w - padR, 0);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);

    var gridSteps = 4;
    ctx.lineWidth = 1;
    for (var g = 0; g <= gridSteps; g++) {
      var frac = (gridSteps - g) / gridSteps;
      var gy = padT + (plotH * g) / gridSteps;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(w - padR, gy);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.font = '10px Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(formatAxisNumber(maxVal * frac), padL - 6, gy + 3);
    }

    var coords = points.map(function (pt, idx) {
      var x = points.length === 1 ? padL + plotW / 2 : padL + (plotW * idx) / (points.length - 1);
      var y = padT + plotH - (pt.value / maxVal) * plotH;
      return { x: x, y: y, label: pt.label, fullKey: pt.fullKey };
    });

    ctx.strokeStyle = grad;
    ctx.lineWidth = points.length > 35 ? 2 : 3;
    ctx.beginPath();
    coords.forEach(function (c, i) {
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.stroke();

    var showDots = points.length <= 24;
    coords.forEach(function (c, i) {
      if (showDots || i === selectedIdx) {
        ctx.fillStyle = i === selectedIdx ? '#ffffff' : c2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, i === selectedIdx ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    var startPt = coords[0];
    var midPt = coords[Math.floor((coords.length - 1) / 2)];
    var endPt = coords[coords.length - 1];
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = '10px Segoe UI, sans-serif';

    ctx.textAlign = 'left';
    ctx.fillText(startPt.fullKey, padL, h - 10);

    if (coords.length >= 3) {
      ctx.textAlign = 'center';
      ctx.fillText(midPt.fullKey, midPt.x, h - 10);
    }

    if (coords.length >= 2) {
      ctx.textAlign = 'right';
      ctx.fillText(endPt.fullKey, w - padR, h - 10);
    }

    canvas._hitCoords = coords;
  }

  function drawBarCanvas(canvas, bars, selectedIdx) {
    if (!canvas) return;
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.parentElement.clientWidth || 320;
    var h = 175;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    var padL = 8, padR = 8, padT = 16, padB = 30;
    var plotW = w - padL - padR;
    var plotH = h - padT - padB;
    var maxVal = Math.max.apply(null, bars.map(function (b) { return b.value; })) || 1;

    var styles = getComputedStyle(document.documentElement);
    var c1 = styles.getPropertyValue('--accent-1').trim() || '#ff007f';
    var c2 = styles.getPropertyValue('--accent-2').trim() || '#ff6a00';
    var grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);

    var slotW = plotW / bars.length;
    var barW = Math.min(34, slotW * 0.62);
    var hitRects = [];

    bars.forEach(function (b, i) {
      var x = padL + slotW * i + (slotW - barW) / 2;
      var barH = b.value > 0 ? Math.max(4, (b.value / maxVal) * plotH) : 2;
      var y = padT + plotH - barH;

      ctx.fillStyle = b.value > 0 ? grad : 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, y, barW, barH);

      if (i === selectedIdx) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 1, y - 1, barW + 2, barH + 2);
      }

      ctx.fillStyle = i === selectedIdx ? '#ffffff' : 'rgba(255,255,255,0.68)';
      ctx.font = '10px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.label, x + barW / 2, h - 16);
      ctx.fillStyle = 'rgba(255,255,255,0.42)';
      ctx.fillText(b.sub, x + barW / 2, h - 4);

      hitRects.push({ x: padL + slotW * i, w: slotW });
    });

    canvas._hitBars = hitRects;
  }

  /* -------------------- EXERCISE DETAIL OVERLAY -------------------- */
  function openExerciseDetail(exId) {
    state.detail.exerciseId = exId;
    state.detail.tab = 'track';
    var ex = getExerciseById(exId);
    if (!ex) return;
    state.detail.metric = ex.type === 'cardio' ? CARDIO_DETAIL_METRICS[0].key : STRENGTH_DETAIL_METRICS[0].key;
    document.getElementById('detailCategoryLabel').textContent = ex.category;
    document.getElementById('detailExerciseName').textContent = ex.name;
    document.getElementById('detailOverlay').classList.remove('hidden');
    renderExerciseDetail();
  }

  function renderExerciseDetail() {
    var ex = getExerciseById(state.detail.exerciseId);
    if (!ex) return;

    document.querySelectorAll('#detailTabs .dtab-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-dtab') === state.detail.tab);
    });

    var body = document.getElementById('detailBody');
    if (state.detail.tab === 'track') {
      var entry = ensureWorkoutEntry(state.selectedDate, ex.id);
      var start = getSuggestedStartValues(ex, entry.sets);

      var controlsHtml = ex.type === 'cardio'
        ? '<div class="stepper-grid">' +
            '<div class="step-box"><div class="card-kicker">TIME (00:00)</div>' +
              '<div class="step-controls">' +
                '<button type="button" class="mini-step-btn" id="detTimeMinus">-</button>' +
                '<input type="text" inputmode="text" id="detTimeInp" class="metro-input" value="' + start.timeStr + '" />' +
                '<button type="button" class="mini-step-btn" id="detTimePlus">+</button>' +
              '</div></div>' +
            '<div class="step-box"><div class="card-kicker">DISTANCE (MI)</div>' +
              '<div class="step-controls">' +
                '<button type="button" class="mini-step-btn" id="detDistMinus">-</button>' +
                '<input type="number" step="0.1" id="detDistInp" class="metro-input" value="' + start.distance + '" />' +
                '<button type="button" class="mini-step-btn" id="detDistPlus">+</button>' +
              '</div></div>' +
          '</div>' +
          '<div class="step-box" style="margin-bottom:10px;"><div class="card-kicker">CALORIES (KCAL)</div>' +
            '<div class="step-controls">' +
              '<button type="button" class="mini-step-btn" id="detKcalMinus">-</button>' +
              '<input type="number" step="10" id="detKcalInp" class="metro-input" value="' + (start.calories || 0) + '" />' +
              '<button type="button" class="mini-step-btn" id="detKcalPlus">+</button>' +
            '</div></div>'
        : '<div class="stepper-grid">' +
            '<div class="step-box"><div class="card-kicker">WEIGHT (LB)</div>' +
              '<div class="step-controls">' +
                '<button type="button" class="mini-step-btn" id="detWMinus">-</button>' +
                '<input type="number" step="2.5" id="detWInp" class="metro-input" value="' + start.weight + '" />' +
                '<button type="button" class="mini-step-btn" id="detWPlus">+</button>' +
              '</div></div>' +
            '<div class="step-box"><div class="card-kicker">REPS</div>' +
              '<div class="step-controls">' +
                '<button type="button" class="mini-step-btn" id="detRMinus">-</button>' +
                '<input type="number" id="detRInp" class="metro-input" value="' + start.reps + '" />' +
                '<button type="button" class="mini-step-btn" id="detRPlus">+</button>' +
              '</div></div>' +
          '</div>';

      var setsHtml = entry.sets.map(function (s, idx) {
        var detKcalHtml = (Number(s.calories) || 0) > 0
          ? '<span class="set-val">' + (Number(s.calories) || 0) + '<span class="set-unit">KCAL</span></span>'
          : '';
        var m = ex.type === 'cardio'
          ? '<span class="set-val">' + formatCardioSecondsToClock(s.durationSec) + '<span class="set-unit">TIME</span></span>' +
            '<span class="set-val">' + (s.distance || 0) + '<span class="set-unit">MI</span></span>' +
            detKcalHtml
          : '<span class="set-val">' + formatWeightForDisplay(s.weight) + '<span class="set-unit">' + getWeightUnitLabel() + '</span></span>' +
            '<span class="set-val">' + (s.reps || 0) + '<span class="set-unit">REPS</span></span>';
        return '<div class="set-row-wrap" data-set-idx="' + idx + '">' +
          '<div class="set-swipe-bg">DELETE</div>' +
          '<div class="set-row"><span class="drag-grip">⋮⋮</span><span class="set-num">' + (idx + 1) + '</span>' + m + '</div>' +
        '</div>';
      }).join('');

      body.innerHTML = controlsHtml +
        '<button type="button" id="detLogSetBtn" class="metro-btn-accent" style="width:100%;margin-bottom:14px;">LOG SET</button>' +
        '<div class="sets-list" id="detSetsList">' + setsHtml + '</div>';

      if (ex.type === 'cardio') {
        var tInp = document.getElementById('detTimeInp');
        var dInp = document.getElementById('detDistInp');
        tInp.addEventListener('input', function () { tInp.value = sanitizeCardioTimeInput(tInp.value); });
        document.getElementById('detTimeMinus').addEventListener('click', function () {
          tInp.value = formatCardioSecondsToClock(Math.max(0, parseCardioTimeToSeconds(tInp.value) - 30));
        });
        document.getElementById('detTimePlus').addEventListener('click', function () {
          tInp.value = formatCardioSecondsToClock(parseCardioTimeToSeconds(tInp.value) + 30);
        });
        document.getElementById('detDistMinus').addEventListener('click', function () {
          dInp.value = Math.max(0, (parseFloat(dInp.value) || 0) - 0.1).toFixed(1);
        });
        document.getElementById('detDistPlus').addEventListener('click', function () {
          dInp.value = ((parseFloat(dInp.value) || 0) + 0.1).toFixed(1);
        });
        var kInp = document.getElementById('detKcalInp');
        document.getElementById('detKcalMinus').addEventListener('click', function () {
          kInp.value = Math.max(0, (parseInt(kInp.value, 10) || 0) - 10);
        });
        document.getElementById('detKcalPlus').addEventListener('click', function () {
          kInp.value = (parseInt(kInp.value, 10) || 0) + 10;
        });
      } else {
        var wInp = document.getElementById('detWInp');
        var rInp = document.getElementById('detRInp');
        document.getElementById('detWMinus').addEventListener('click', function () {
          var stepW = state.weightUnit === 'kg' ? 2.5 : 5; wInp.value = Math.max(0, Math.round(((parseFloat(wInp.value) || 0) - stepW) * 100) / 100);
        });
        document.getElementById('detWPlus').addEventListener('click', function () {
          var stepW = state.weightUnit === 'kg' ? 2.5 : 5; wInp.value = Math.round(((parseFloat(wInp.value) || 0) + stepW) * 100) / 100;
        });
        document.getElementById('detRMinus').addEventListener('click', function () {
          rInp.value = Math.max(1, (parseInt(rInp.value, 10) || 1) - 1);
        });
        document.getElementById('detRPlus').addEventListener('click', function () {
          rInp.value = (parseInt(rInp.value, 10) || 0) + 1;
        });
      }

      document.getElementById('detLogSetBtn').addEventListener('click', function () {
        window.triggerHaptic('medium');
        var en = ensureWorkoutEntry(state.selectedDate, ex.id);
        if (ex.type === 'cardio') {
          en.sets.push({
            id: 's_' + Date.now(),
            durationSec: parseCardioTimeToSeconds(document.getElementById('detTimeInp').value),
            distance: parseFloat(document.getElementById('detDistInp').value) || 0,
            calories: Math.round((parseFloat(document.getElementById('detKcalInp').value) || 0) * 10) / 10
          });
        } else {
          en.sets.push({
            id: 's_' + Date.now(),
            weight: parseWeightInputToStoredLb(document.getElementById('detWInp').value),
            reps: parseInt(document.getElementById('detRInp').value, 10) || 0
          });
        }
        saveDB();
        renderExerciseDetail();
        renderWorkoutPane();
      });

      bindSetRowGestures(document.getElementById('detSetsList'), state.selectedDate, ex.id, function () {
        renderExerciseDetail();
        renderWorkoutPane();
      });
    } else if (state.detail.tab === 'history') {
      var dates = Object.keys(state.workouts).sort().reverse();
      var rows = [];
      var unitLbl = getWeightUnitLabel().toLowerCase();
      dates.forEach(function (d) {
        var en = (state.workouts[d] || []).find(function (e) { return e.exerciseId === ex.id && e.sets && e.sets.length; });
        if (en) {
          var dObj = parseISODate(d);
          var fullDateLabel = dObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }).toUpperCase();
          var isSelectedDay = (d === state.selectedDate);

          var setLinesHtml = en.sets.map(function (s) {
            if (ex.type === 'cardio') {
              var kcalBit = (Number(s.calories) || 0) > 0
                ? '<span class="hist-col-sub">' + (Number(s.calories) || 0) + ' <span class="hist-unit">kcal</span></span>'
                : '';
              return '<div class="hist-set-line cardio">' +
                '<div class="hist-col-primary"><span class="hist-num">' + formatCardioSecondsToClock(s.durationSec) + '</span></div>' +
                '<div class="hist-col-secondary"><span class="hist-num">' + (s.distance || 0) + '</span> <span class="hist-unit">mi</span></div>' +
                kcalBit +
              '</div>';
            }
            var wDisp = Number(formatWeightForDisplay(s.weight) || 0).toFixed(1);
            return '<div class="hist-set-line">' +
              '<div class="hist-col-primary"><span class="hist-num">' + wDisp + '</span> <span class="hist-unit">' + unitLbl + '</span></div>' +
              '<div class="hist-col-secondary"><span class="hist-num">' + (s.reps || 0) + '</span> <span class="hist-unit">reps</span></div>' +
            '</div>';
          }).join('');

          rows.push(
            '<div class="hist-session">' +
              '<div class="hist-session-head">' +
                '<div class="hist-date-label">' + fullDateLabel + '</div>' +
                '<button type="button" class="hist-copy-btn' + (isSelectedDay ? ' disabled' : '') + '" data-copy-date="' + d + '"' + (isSelectedDay ? ' disabled' : '') + '>Copy</button>' +
              '</div>' +
              '<div class="hist-card">' + setLinesHtml + '</div>' +
            '</div>'
          );
        }
      });
      body.innerHTML = rows.length ? rows.join('') : '<div class="empty-state">No history recorded yet.</div>';

      body.querySelectorAll('.hist-copy-btn:not([disabled])').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var srcDate = btn.getAttribute('data-copy-date');
          var srcEntry = (state.workouts[srcDate] || []).find(function (e) { return e.exerciseId === ex.id && e.sets && e.sets.length; });
          if (!srcEntry) return;
          window.triggerHaptic('medium');
          var destEntry = ensureWorkoutEntry(state.selectedDate, ex.id);
          srcEntry.sets.forEach(function (s) {
            if (ex.type === 'cardio') {
              destEntry.sets.push({
                id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                durationSec: Number(s.durationSec) || 0,
                distance: Number(s.distance) || 0,
                calories: Number(s.calories) || 0
              });
            } else {
              destEntry.sets.push({
                id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
                weight: Number(s.weight) || 0,
                reps: Number(s.reps) || 0
              });
            }
          });
          saveDB();
          state.detail.tab = 'track';
          renderExerciseDetail();
          renderWorkoutPane();
          scrollToExerciseBottom(ex.id, { behavior: 'auto' });
        });
      });
    } else if (state.detail.tab === 'records') {
      var maxW = 0, maxVol = 0, max1RM = 0, maxSec = 0, maxDist = 0, maxKcal = 0;
      Object.keys(state.workouts).forEach(function (d) {
        (state.workouts[d] || []).forEach(function (en) {
          if (en.exerciseId !== ex.id) return;
          (en.sets || []).forEach(function (s) {
            if (ex.type === 'cardio') {
              maxSec = Math.max(maxSec, Number(s.durationSec) || 0);
              maxDist = Math.max(maxDist, Number(s.distance) || 0);
              maxKcal = Math.max(maxKcal, Number(s.calories) || 0);
            } else {
              var w = Number(s.weight) || 0;
              var r = Number(s.reps) || 0;
              maxW = Math.max(maxW, w);
              maxVol = Math.max(maxVol, w * r);
              max1RM = Math.max(max1RM, Math.round(w * (1 + r / 30)));
            }
          });
        });
      });
      body.innerHTML = ex.type === 'cardio'
        ? '<div class="summary-tiles">' +
            '<div class="sum-tile"><div class="sum-val">' + formatCardioSecondsToClock(maxSec) + '</div><div class="sum-lbl">Longest Time</div></div>' +
            '<div class="sum-tile"><div class="sum-val">' + maxDist + ' mi</div><div class="sum-lbl">Max Distance</div></div>' +
            '<div class="sum-tile"><div class="sum-val">' + maxKcal + ' kcal</div><div class="sum-lbl">Max Calories</div></div>' +
          '</div>'
        : '<div class="summary-tiles">' +
            '<div class="sum-tile"><div class="sum-val">' + formatWeightForDisplay(maxW) + ' ' + getWeightUnitLabel().toLowerCase() + '</div><div class="sum-lbl">Max Weight</div></div>' +
            '<div class="sum-tile"><div class="sum-val">' + Math.round(formatWeightForDisplay(maxVol)).toLocaleString() + '</div><div class="sum-lbl">Best Set Vol</div></div>' +
            '<div class="sum-tile"><div class="sum-val">' + formatWeightForDisplay(max1RM) + ' ' + getWeightUnitLabel().toLowerCase() + '</div><div class="sum-lbl">Est. 1RM</div></div>' +
          '</div>';
    } else if (state.detail.tab === 'charts') {
      var metrics = ex.type === 'cardio' ? CARDIO_DETAIL_METRICS : STRENGTH_DETAIL_METRICS;
      var pills = metrics.map(function (m) {
        return '<button type="button" class="pill-btn' + (state.detail.metric === m.key ? ' active' : '') + '" data-dmetric="' + m.key + '">' + m.label + '</button>';
      }).join('');

      var pts = [];
      Object.keys(state.workouts).sort().forEach(function (d) {
        var en = (state.workouts[d] || []).find(function (e) { return e.exerciseId === ex.id && e.sets && e.sets.length; });
        if (!en) return;
        var v = 0;
        en.sets.forEach(function (s) {
          if (state.detail.metric === 'maxWeight') v = Math.max(v, formatWeightForDisplay(s.weight));
          else if (state.detail.metric === 'volume') v += formatWeightForDisplay(s.weight) * (Number(s.reps) || 0);
          else if (state.detail.metric === 'est1rm') v = Math.max(v, Math.round(formatWeightForDisplay(s.weight) * (1 + (Number(s.reps) || 0) / 30)));
          else if (state.detail.metric === 'reps') v += Number(s.reps) || 0;
          else if (state.detail.metric === 'durationMin') v += (Number(s.durationSec) || 0) / 60;
          else if (state.detail.metric === 'distance') v += Number(s.distance) || 0;
          else if (state.detail.metric === 'calories') v += Number(s.calories) || 0;
        });
        pts.push({ label: d.slice(5), fullKey: d, value: Math.round(v * 10) / 10 });
      });

      body.innerHTML = '<div class="pill-row" id="detMetricPills">' + pills + '</div>' +
        '<div class="canvas-wrap"><canvas id="detailChartCanvas" height="190"></canvas></div>';

      body.querySelectorAll('[data-dmetric]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          state.detail.metric = btn.getAttribute('data-dmetric');
          renderExerciseDetail();
        });
      });

      drawLineCanvas(document.getElementById('detailChartCanvas'), pts.slice(-12), -1);
    }
  }

  /* -------------------- CALENDAR MODAL (ROLLING WEEK ALIGNED) -------------------- */
  function renderCalendarModal() {
    var yr = state.calendarMonth.getFullYear();
    var mo = state.calendarMonth.getMonth();
    document.getElementById('calMonthTitle').textContent =
      state.calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    var dowNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var startDow = (new Date().getDay() + 1) % 7;
    var orderedDows = [];
    for (var i = 0; i < 7; i++) orderedDows.push(dowNames[(startDow + i) % 7]);

    document.getElementById('calDowRow').innerHTML = orderedDows.map(function (d) {
      return '<div>' + d + '</div>';
    }).join('');

    var firstDay = new Date(yr, mo, 1);
    var leadingBlanks = (firstDay.getDay() - startDow + 7) % 7;
    var daysInMonth = new Date(yr, mo + 1, 0).getDate();

    var rw = getRollingWeekWindow(0);
    var rwStartISO = toISODate(rw.start);
    var rwEndISO = toISODate(rw.end);

    var cells = [];
    for (var b = 0; b < leadingBlanks; b++) {
      cells.push('<div class="cal-cell empty"></div>');
    }
    for (var day = 1; day <= daysInMonth; day++) {
      var iso = toISODate(new Date(yr, mo, day));
      var hasLog = (state.workouts[iso] || []).some(function (e) { return e.sets && e.sets.length; });
      var inRolling = iso >= rwStartISO && iso <= rwEndISO;
      var cls = 'cal-cell' +
        (inRolling ? ' in-rolling' : '') +
        (hasLog ? ' has-log' : '') +
        (iso === state.selectedDate ? ' selected' : '');
      cells.push('<button type="button" class="' + cls + '" data-cal-iso="' + iso + '">' + day + '</button>');
    }

    var grid = document.getElementById('calDaysGrid');
    grid.innerHTML = cells.join('');
    grid.querySelectorAll('[data-cal-iso]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.triggerHaptic('light');
        state.selectedDate = btn.getAttribute('data-cal-iso');
        document.getElementById('calendarModal').classList.add('hidden');
        setActivePane(0);
      });
    });
  }

  /* -------------------- FITNOTES CSV IMPORT / EXPORT -------------------- */
  function exportFitNotesCSV() {
    var lines = ['Date,Exercise,Category,Weight (lbs),Reps,Distance,Distance Unit,Time,Calories'];
    Object.keys(state.workouts).sort().forEach(function (d) {
      (state.workouts[d] || []).forEach(function (en) {
        var ex = getExerciseById(en.exerciseId) || { name: en.exerciseId, category: 'Other', type: 'strength' };
        (en.sets || []).forEach(function (s) {
          var w = ex.type === 'cardio' ? '' : (s.weight || 0);
          var r = ex.type === 'cardio' ? '' : (s.reps || 0);
          var dist = ex.type === 'cardio' ? (s.distance || 0) : '';
          var unit = ex.type === 'cardio' ? 'mi' : '';
          var t = ex.type === 'cardio' ? formatCardioSecondsToClock(s.durationSec) : '';
          var kcal = ex.type === 'cardio' ? (Number(s.calories) || 0) : '';
          lines.push([d, '"' + ex.name.replace(/"/g, '""') + '"', ex.category, w, r, dist, unit, t, kcal].join(','));
        });
      });
    });
    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gym-bxtr-fitnotes-' + toISODate(new Date()) + '.csv';
    a.click();
  }

  function importFitNotesCSV(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var text = String(e.target.result || '');
      var rows = text.split(/\r?\n/).slice(1);
      function splitCSVLine(rowStr) {
        var out = [];
        var cur = '';
        var inQ = false;
        for (var i = 0; i < rowStr.length; i++) {
          var ch = rowStr[i];
          if (ch === '"') {
            if (inQ && rowStr[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQ = !inQ;
            }
          } else if (ch === ',' && !inQ) {
            out.push(cur);
            cur = '';
          } else {
            cur += ch;
          }
        }
        out.push(cur);
        return out;
      }

      var headerCols = splitCSVLine(text.split(/\r?\n/)[0] || '').map(function (h) {
        return h.trim().toLowerCase();
      });
      var hasWeightKgAndLbs = headerCols.indexOf('weight (kg)') !== -1 && headerCols.indexOf('weight (lbs)') !== -1;
      var idxDate = headerCols.indexOf('date');
      var idxEx = headerCols.indexOf('exercise');
      var idxCat = headerCols.indexOf('category');
      var idxWeightLb = hasWeightKgAndLbs ? headerCols.indexOf('weight (lbs)') : 3;
      var idxReps = headerCols.indexOf('reps');
      var idxDist = headerCols.indexOf('distance');
      var idxTime = headerCols.indexOf('time');
      var idxKcal = headerCols.indexOf('calories');
      if (idxDate < 0) idxDate = 0;
      if (idxEx < 0) idxEx = 1;
      if (idxCat < 0) idxCat = 2;
      if (idxWeightLb < 0) idxWeightLb = 3;
      if (idxReps < 0) idxReps = 4;
      if (idxDist < 0) idxDist = 5;
      if (idxTime < 0) idxTime = 7;
      if (idxKcal < 0) idxKcal = 8;

      rows.forEach(function (line) {
        if (!line.trim()) return;
        var cols = splitCSVLine(line);
        var date = (cols[idxDate] || '').trim();
        var name = (cols[idxEx] || '').trim();
        var cat = (cols[idxCat] || 'Chest').trim();
        var rawWeightCol = (cols[idxWeightLb] || '').trim();
        var weight = rawWeightCol === '' ? 0 : (hasWeightKgAndLbs ? (Math.round((parseFloat(rawWeightCol) || 0) * 100) / 100) : convertCSVWeightColumnToLb(rawWeightCol));
        var reps = parseInt(cols[idxReps], 10) || 0;
        var dist = parseFloat(cols[idxDist]) || 0;
        var timeStr = (cols[idxTime] || '').trim();
        var kcal = parseFloat(cols[idxKcal]) || 0;
        if (!date || !name) return;

        var catMatch = CATEGORIES.find(function (c) { return c.toLowerCase() === cat.toLowerCase(); }) || cat || 'Chest';
        var isCardio = catMatch.toLowerCase() === 'cardio' || (Boolean(timeStr || dist || kcal) && !weight && !reps);
        var ex = state.exercises.find(function (x) { return x.name.toLowerCase() === name.toLowerCase(); });
        if (!ex) {
          ex = {
            id: 'ex_' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            name: name,
            category: catMatch,
            type: isCardio ? 'cardio' : 'strength'
          };
          state.exercises.push(ex);
        } else if (isCardio && ex.type !== 'cardio') {
          ex.type = 'cardio';
        }
        var en = ensureWorkoutEntry(date, ex.id);
        if (ex.type === 'cardio') {
          en.sets.push({ id: 's_' + Math.random().toString(36).slice(2), durationSec: parseCardioTimeToSeconds(timeStr), distance: dist, calories: kcal });
        } else {
          en.sets.push({ id: 's_' + Math.random().toString(36).slice(2), weight: weight, reps: reps });
        }
      });
      saveDB();
      renderWorkoutPane();
      renderExercisesPane();
    };
    reader.readAsText(file);
  }

  /* -------------------- CONFIRM MODAL & OFFLINE SW -------------------- */
  var confirmCallback = null;
  function openConfirm(title, msg, onOk) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = msg;
    confirmCallback = onOk;
    document.getElementById('confirmModal').classList.remove('hidden');
  }

  function registerOfflineServiceWorker() {
    var statusEl = document.getElementById('swStatusText');
    if (!('serviceWorker' in navigator)) {
      statusEl.textContent = 'Service Worker unavailable in this browser context.';
      return;
    }
    navigator.serviceWorker.register('./sw.js').then(function () {
      statusEl.textContent = 'Offline Service Worker active (caches index.html, styles.css, app.js).';
    }).catch(function () {
      statusEl.textContent = 'Tip: Download sw.js below and place it beside index.html for full offline caching.';
    });
  }

  function downloadServiceWorkerFile() {
    var swCode = [
      "const CACHE_NAME = 'gym-bxtr-v1';",
      "const ASSETS = ['./', './index.html', './styles.css', './app.js'];",
      "self.addEventListener('install', e => {",
      "  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));",
      "});",
      "self.addEventListener('fetch', e => {",
      "  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));",
      "});"
    ].join('\n');
    var blob = new Blob([swCode], { type: 'application/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sw.js';
    a.click();
  }

  /* -------------------- EVENT WIRING -------------------- */
  function initEvents() {
    document.querySelectorAll('#pivotStrip .pivot-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.triggerHaptic('light');
        setActivePane(Number(btn.getAttribute('data-pane')));
      });
    });

    document.querySelectorAll('.appbar-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.triggerHaptic('light');
        var act = btn.getAttribute('data-action');
        if (act === 'pane-0') setActivePane(0);
        else if (act === 'add') setActivePane(1);
        else if (act === 'calendar') {
          state.calendarMonth = new Date(parseISODate(state.selectedDate).getFullYear(), parseISODate(state.selectedDate).getMonth(), 1);
          renderCalendarModal();
          document.getElementById('calendarModal').classList.remove('hidden');
        } else if (act === 'pane-2') setActivePane(2);
        else if (act === 'pane-3') setActivePane(3);
      });
    });

    document.getElementById('prevDayBtn').addEventListener('click', function () {
      window.triggerHaptic('light');
      state.selectedDate = addDaysISO(state.selectedDate, -1);
      renderWorkoutPane();
    });
    document.getElementById('nextDayBtn').addEventListener('click', function () {
      window.triggerHaptic('light');
      state.selectedDate = addDaysISO(state.selectedDate, 1);
      renderWorkoutPane();
    });
    document.getElementById('dateCenterBtn').addEventListener('click', function () {
      window.triggerHaptic('light');
      state.selectedDate = toISODate(new Date());
      renderWorkoutPane();
    });

    var vp = document.getElementById('panesViewport');
    var sx = 0, sy = 0;
    vp.addEventListener('touchstart', function (e) {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    }, { passive: true });
    vp.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - sx;
      var dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 68 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx < 0 && state.activePane < 3) setActivePane(state.activePane + 1);
        else if (dx > 0 && state.activePane > 0) setActivePane(state.activePane - 1);
      }
    }, { passive: true });

    document.getElementById('exerciseSearchInput').addEventListener('input', function (e) {
      state.exerciseSearch = e.target.value;
      renderExercisesPane();
    });

    var newExCat = document.getElementById('newExCatSelect');
    newExCat.innerHTML = CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
    document.getElementById('openNewExerciseModalBtn').addEventListener('click', function () {
      document.getElementById('newExerciseModal').classList.remove('hidden');
    });
    document.getElementById('closeNewExBtn').addEventListener('click', function () {
      document.getElementById('newExerciseModal').classList.add('hidden');
    });
    document.getElementById('saveNewExBtn').addEventListener('click', function () {
      var nm = document.getElementById('newExNameInput').value.trim();
      if (!nm) return;
      var id = 'ex_' + Date.now();
      state.exercises.push({
        id: id,
        name: nm,
        category: newExCat.value,
        type: document.getElementById('newExTypeSelect').value
      });
      ensureWorkoutEntry(state.selectedDate, id);
      saveDB();
      document.getElementById('newExNameInput').value = '';
      document.getElementById('newExerciseModal').classList.add('hidden');
      setActivePane(0);
      scrollToExerciseBottom(id, { behavior: 'auto' });
    });

    document.querySelectorAll('#chartTimeframePills .pill-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.chart.timeframe = b.getAttribute('data-tf');
        state.chart.selectedIdx = -1;
        renderChartsPane();
      });
    });
    document.querySelectorAll('#chartScopePills .pill-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.chart.scope = b.getAttribute('data-scope');
        state.chart.scopeValue = '';
        state.chart.selectedIdx = -1;
        renderChartsPane();
      });
    });
    document.getElementById('chartScopeSelect').addEventListener('change', function (e) {
      state.chart.scopeValue = e.target.value;
      renderChartsPane();
    });
    document.querySelectorAll('#chartMetricPills .pill-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.chart.metric = b.getAttribute('data-metric');
        renderChartsPane();
      });
    });
    document.querySelectorAll('#chartRangePills .pill-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        window.triggerHaptic('light');
        state.chart.range = b.getAttribute('data-range');
        state.chart.selectedIdx = -1;
        renderChartsPane();
      });
    });

    document.getElementById('prevRollingWeekBtn').addEventListener('click', function () {
      state.rollingWeek.offset -= 1;
      state.rollingWeek.selectedDayIdx = -1;
      renderChartsPane();
    });
    document.getElementById('nextRollingWeekBtn').addEventListener('click', function () {
      state.rollingWeek.offset += 1;
      state.rollingWeek.selectedDayIdx = -1;
      renderChartsPane();
    });
    document.querySelectorAll('#rollingMetricPills .pill-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.rollingWeek.metric = b.getAttribute('data-rmetric');
        renderChartsPane();
      });
    });

    document.getElementById('globalChartCanvas').addEventListener('click', function (e) {
      var c = e.currentTarget;
      if (!c._hitCoords || !c._hitCoords.length) return;
      var rect = c.getBoundingClientRect();
      var x = e.clientX - rect.left;
      var best = 0, bestDist = Infinity;
      c._hitCoords.forEach(function (pt, idx) {
        var d = Math.abs(pt.x - x);
        if (d < bestDist) { bestDist = d; best = idx; }
      });
      state.chart.selectedIdx = best;
      renderChartsPane();
    });

    document.getElementById('rollingWeekBarCanvas').addEventListener('click', function (e) {
      var c = e.currentTarget;
      if (!c._hitBars) return;
      var rect = c.getBoundingClientRect();
      var x = e.clientX - rect.left;
      c._hitBars.forEach(function (b, idx) {
        if (x >= b.x && x <= b.x + b.w) {
          state.rollingWeek.selectedDayIdx = idx;
          renderChartsPane();
        }
      });
    });

    document.querySelectorAll('#detailTabs .dtab-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.detail.tab = b.getAttribute('data-dtab');
        renderExerciseDetail();
      });
    });
    document.getElementById('closeDetailBtn').addEventListener('click', function () {
      document.getElementById('detailOverlay').classList.add('hidden');
    });

    document.getElementById('calPrevMonthBtn').addEventListener('click', function () {
      state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() - 1, 1);
      renderCalendarModal();
    });
    document.getElementById('calNextMonthBtn').addEventListener('click', function () {
      state.calendarMonth = new Date(state.calendarMonth.getFullYear(), state.calendarMonth.getMonth() + 1, 1);
      renderCalendarModal();
    });
    document.getElementById('calTodayBtn').addEventListener('click', function () {
      state.selectedDate = toISODate(new Date());
      document.getElementById('calendarModal').classList.add('hidden');
      setActivePane(0);
    });
    document.getElementById('closeCalBtn').addEventListener('click', function () {
      document.getElementById('calendarModal').classList.add('hidden');
    });

    document.querySelectorAll('[data-theme-choice]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.theme = b.getAttribute('data-theme-choice');
        applyThemeAndAccent();
        saveDB();
      });
    });
    document.querySelectorAll('#accentSwatches .swatch-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        state.accent = b.getAttribute('data-accent');
        applyThemeAndAccent();
        saveDB();
        if (state.activePane === 2) renderChartsPane();
      });
    });

    var unitBtn = document.getElementById('toggleWeightUnitBtn');
    if (unitBtn) {
      unitBtn.textContent = 'Display Unit: ' + getWeightUnitLabel();
      unitBtn.addEventListener('click', function () {
        window.triggerHaptic('medium');
        state.weightUnit = state.weightUnit === 'lb' ? 'kg' : 'lb';
        unitBtn.textContent = 'Display Unit: ' + getWeightUnitLabel();
        saveDB();
        renderWorkoutPane();
        if (state.activePane === 2) renderChartsPane();
        if (!document.getElementById('detailOverlay').classList.contains('hidden')) renderExerciseDetail();
      });
    }

    document.getElementById('exportCsvBtn').addEventListener('click', exportFitNotesCSV);
    document.getElementById('importCsvInput').addEventListener('change', function (e) {
      if (e.target.files && e.target.files[0]) importFitNotesCSV(e.target.files[0]);
    });
    document.getElementById('downloadSwBtn').addEventListener('click', downloadServiceWorkerFile);
    document.getElementById('seedDemoBtn').addEventListener('click', function () {
      var today = toISODate(new Date());
      ensureWorkoutEntry(today, 'ex_bench').sets = [
        { id: 'd1', weight: 185, reps: 10 },
        { id: 'd2', weight: 205, reps: 8 }
      ];
      ensureWorkoutEntry(addDaysISO(today, -2), 'ex_elliptical').sets = [
        { id: 'd3', durationSec: 1830, distance: 2.8 }
      ];
      saveDB();
      setActivePane(0);
    });

    document.getElementById('confirmCancelBtn').addEventListener('click', function () {
      document.getElementById('confirmModal').classList.add('hidden');
    });
    document.getElementById('confirmOkBtn').addEventListener('click', function () {
      document.getElementById('confirmModal').classList.add('hidden');
      if (confirmCallback) confirmCallback();
    });

    function updateOnlineStatus() {
      document.getElementById('offlineBadge').classList.toggle('visible', !navigator.onLine);
    }
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  }

  window.addEventListener('error', function (e) {
    var box = document.getElementById('runtimeNotice');
    if (box) {
      box.textContent = 'Runtime notice: ' + (e.message || 'Unknown error');
      box.classList.add('visible');
    }
  });


  function syncViewportHeight() {
    var shell = document.querySelector('.app-shell');
    if (!shell) return;
    if (window.visualViewport) {
      shell.style.height = Math.round(window.visualViewport.height) + 'px';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    syncViewportHeight();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewportHeight);
      window.visualViewport.addEventListener('scroll', syncViewportHeight);
    }
    initBrandAssets();
    initEvents();
    loadDB().then(function () {
      renderWorkoutPane();
      registerOfflineServiceWorker();
    });
  });
})();
