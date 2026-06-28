const STORAGE_KEY = 'combineCoachState';

const ACCOUNT_PRESETS = {
  50000:  { label: '$50K',  profitTarget: 3000, dailyLossLimit: 1000, maxLossLimit: 2000, maxContracts: 5  },
  100000: { label: '$100K', profitTarget: 6000, dailyLossLimit: 2000, maxLossLimit: 3000, maxContracts: 10 },
  150000: { label: '$150K', profitTarget: 9000, dailyLossLimit: 3000, maxLossLimit: 4500, maxContracts: 15 },
};

const DEFAULT_STATE = {
  accountSize: 50000,
  tradeLimit: 5,
  lossStreakLimit: 3,
  days: {},
};

let state = null;
let todayKey = null;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  let parsed = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch (e) {
    parsed = null;
  }
  state = parsed || structuredClone(DEFAULT_STATE);
  todayKey = getTodayKey();
  if (!state.days[todayKey]) state.days[todayKey] = { trades: [] };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('No se pudo guardar:', e);
  }
}

function preset() {
  return ACCOUNT_PRESETS[state.accountSize];
}

function allDayKeys() {
  return Object.keys(state.days).sort();
}

function dayNetPnl(dayKey) {
  const day = state.days[dayKey];
  if (!day) return 0;
  return day.trades.reduce((sum, t) => sum + t.pnl, 0);
}

function totalNetPnl() {
  return allDayKeys().reduce((sum, k) => sum + dayNetPnl(k), 0);
}

function bestDayPnl() {
  let best = 0;
  for (const k of allDayKeys()) {
    const p = dayNetPnl(k);
    if (p > best) best = p;
  }
  return best;
}

function equityBeforeToday() {
  return allDayKeys()
    .filter((k) => k !== todayKey)
    .reduce((sum, k) => sum + dayNetPnl(k), 0);
}

function peakEquityToday() {
  const base = equityBeforeToday();
  const trades = state.days[todayKey].trades;
  let running = base;
  let peak = base;
  for (const t of trades) {
    running += t.pnl;
    if (running > peak) peak = running;
  }
  return Math.max(peak, base);
}

function currentEquity() {
  return equityBeforeToday() + dayNetPnl(todayKey);
}

function mllFloor() {
  return peakEquityToday() - preset().maxLossLimit;
}

function cushionToMll() {
  return currentEquity() - mllFloor();
}

function dllUsedToday() {
  const pnl = dayNetPnl(todayKey);
  return pnl < 0 ? Math.abs(pnl) : 0;
}

function consistencyPct() {
  const total = totalNetPnl();
  if (total <= 0) return 0;
  const best = bestDayPnl();
  return (best / total) * 100;
}

function currentStreak() {
  const trades = state.days[todayKey].trades;
  if (trades.length === 0) return 0;
  let streak = 0;
  const lastSign = trades[trades.length - 1].pnl < 0;
  for (let i = trades.length - 1; i >= 0; i--) {
    const isLoss = trades[i].pnl < 0;
    if (isLoss === lastSign) streak++;
    else break;
  }
  return lastSign ? -streak : streak;
}

function winRateToday() {
  const trades = state.days[todayKey].trades;
  if (trades.length === 0) return null;
  const wins = trades.filter((t) => t.pnl > 0).length;
  return Math.round((wins / trades.length) * 100);
}

function money(n) {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}

function clampPct(p) {
  return Math.max(0, Math.min(100, p));
}

function render() {
  const p = preset();
  document.getElementById('accountLabel').textContent = `${p.label} Combine`;

  const cushion = cushionToMll();
  const cushionPct = clampPct((cushion / p.maxLossLimit) * 100);
  document.getElementById('mllAmountLeft').textContent = money(cushion);
  document.getElementById('peakEquity').textContent = money(peakEquityToday());
  document.getElementById('mllFloor').textContent = money(mllFloor());

  const fill = document.getElementById('mllFill');
  fill.style.width = cushionPct + '%';

  const dllMarkerPct = clampPct(100 - (p.dailyLossLimit / p.maxLossLimit) * 100);
  document.getElementById('mllMarkerDLL').style.left = dllMarkerPct + '%';

  let gaugeColor = 'var(--green)';
  if (cushionPct <= 25) gaugeColor = 'var(--red)';
  else if (cushionPct <= 50) gaugeColor = 'var(--amber)';
  fill.style.background = gaugeColor;

  const statusBand = document.getElementById('statusBand');
  const statusText = document.getElementById('statusText');
  statusBand.classList.remove('status-safe', 'status-warn', 'status-danger');

  const dllUsed = dllUsedToday();
  const dllPct = clampPct((dllUsed / p.dailyLossLimit) * 100);

  if (cushionPct <= 20 || dllPct >= 100) {
    statusBand.classList.add('status-danger');
    statusText.textContent = cushionPct <= 20
      ? 'Zona crítica — muy cerca del Max Loss Limit'
      : 'Daily Loss Limit alcanzado — detén operaciones hoy';
  } else if (cushionPct <= 45 || dllPct >= 70) {
    statusBand.classList.add('status-warn');
    statusText.textContent = 'Precaución — vas reduciendo tu margen de error';
  } else {
    statusBand.classList.add('status-safe');
    statusText.textContent = 'Dentro de límites — sigue así';
  }

  const todayPnl = dayNetPnl(todayKey);
  document.getElementById('todayPnl').textContent = money(todayPnl);
  document.getElementById('todayPnl').style.color = todayPnl < 0 ? 'var(--red)' : todayPnl > 0 ? 'var(--green)' : 'var(--text)';
  document.getElementById('dllBarFill').style.width = dllPct + '%';
  document.getElementById('dllSub').textContent = `DLL: ${money(dllUsed)} / ${money(p.dailyLossLimit)}`;

  const total = totalNetPnl();
  document.getElementById('netPnl').textContent = money(total);
  const ptPct = clampPct((total / p.profitTarget) * 100);
  document.getElementById('ptBarFill').style.width = ptPct + '%';
  document.getElementById('ptSub').textContent = `${money(total)} / ${money(p.profitTarget)}`;

  const cPct = consistencyPct();
  document.getElementById('consBarFill').style.width = clampPct(cPct) + '%';
  document.getElementById('consBarFill').style.background = cPct > 50 ? 'var(--red)' : cPct > 40 ? 'var(--amber)' : 'var(--green)';
  document.getElementById('consSub').textContent = `Mejor día: ${money(bestDayPnl())} (${cPct.toFixed(0)}% del total)`;

  const streak = currentStreak();
  document.getElementById('streakValue').textContent = Math.abs(streak);
  document.getElementById('streakValue').style.color = streak < 0 ? 'var(--red)' : streak > 0 ? 'var(--green)' : 'var(--text)';
  document.getElementById('streakSub').textContent =
    streak === 0 ? 'sin trades hoy' : streak < 0 ? 'pérdidas seguidas' : 'ganancias seguidas';

  const tradesToday = state.days[todayKey].trades.length;
  document.getElementById('tradesToday').innerHTML = `${tradesToday} / <span>${state.tradeLimit}</span>`;
  const wr = winRateToday();
  document.getElementById('winRateToday').textContent = wr === null ? '—' : wr + '%';

  renderCoachMessages({ cushionPct, dllPct, streak, tradesToday, cPct });
  renderSettingsSummary();
}

function renderCoachMessages({ cushionPct, dllPct, streak, tradesToday, cPct }) {
  const box = document.getElementById('coachMsgs');
  box.innerHTML = '';
  const msgs = [];

  if (dllPct >= 100) {
    msgs.push({ level: 'danger', text: 'Alcanzaste tu Daily Loss Limit de hoy. Topstep liquidaría posiciones — cierra la sesión y retoma mañana.' });
  } else if (dllPct >= 80) {
    msgs.push({ level: 'warn', text: `Vas en ${dllPct.toFixed(0)}% de tu Daily Loss Limit. Considera parar por hoy.` });
  }

  if (cushionPct <= 20) {
    msgs.push({ level: 'danger', text: 'Tu colchón hasta el Max Loss Limit es muy delgado. Reduce tamaño de posición o detente.' });
  } else if (cushionPct <= 45) {
    msgs.push({ level: 'warn', text: 'El MLL trailing está más cerca de lo cómodo. Opera más chico hasta recuperar margen.' });
  }

  if (streak <= -state.lossStreakLimit) {
    msgs.push({ level: 'danger', text: `Llevas ${Math.abs(streak)} pérdidas seguidas. Es buen momento para pausar y revisar tu plan, no para "recuperar".` });
  }

  if (tradesToday >= state.tradeLimit) {
    msgs.push({ level: 'warn', text: `Llegaste a tu límite de ${state.tradeLimit} trades hoy. Operar de más suele ser la causa #1 de romper el Combine.` });
  }

  if (cPct > 50) {
    msgs.push({ level: 'warn', text: 'Tu mejor día supera el 50% del total — bajo la regla de consistencia, esto podría subir tu Profit Target.' });
  }

  if (msgs.length === 0) {
    msgs.push({ level: 'info', text: 'Todo en orden. Recuerda: la consistencia pasa el Combine, no los días explosivos.' });
  }

  for (const m of msgs) {
    const div = document.createElement('div');
    div.className = `coach-msg ${m.level}`;
    const ico = m.level === 'danger' ? '⛔' : m.level === 'warn' ? '⚠' : '💡';
    div.innerHTML = `<span class="ico">${ico}</span><span>${m.text}</span>`;
    box.appendChild(div);
  }
}

function renderSettingsSummary() {
  const p = preset();
  document.getElementById('settingsSummary').innerHTML =
    `Profit target: <strong>${money(p.profitTarget)}</strong><br>` +
    `Daily Loss Limit: <strong>${money(p.dailyLossLimit)}</strong><br>` +
    `Max Loss Limit (trailing): <strong>${money(p.maxLossLimit)}</strong><br>` +
    `Máx. contratos: <strong>${p.maxContracts}</strong>`;
}

function renderHistory() {
  const list = document.getElementById('historyList');
  const keys = allDayKeys().slice().reverse();
  list.innerHTML = '';

  const hasAny = keys.some((k) => state.days[k].trades.length > 0);
  if (!hasAny) {
    list.innerHTML = '<p class="empty-state">Aún no hay trades registrados.<br>Empieza con tu primer trade de hoy.</p>';
    return;
  }

  for (const k of keys) {
    const day = state.days[k];
    if (day.trades.length === 0) continue;
    const pnl = dayNetPnl(k);
    const wins = day.trades.filter((t) => t.pnl > 0).length;
    const div = document.createElement('div');
    div.className = 'history-day';
    div.innerHTML = `
      <div class="history-day-head">
        <span class="date">${k}</span>
        <span class="pnl" style="color:${pnl < 0 ? 'var(--red)' : pnl > 0 ? 'var(--green)' : 'var(--text)'}">${money(pnl)}</span>
      </div>
      <div class="history-day-meta">${day.trades.length} trades · ${wins}/${day.trades.length} ganadores</div>
    `;
    list.appendChild(div);
  }
}

const HOME_SECTION_IDS = [
  'statusBand', 'homeGrid1', 'consistencyCard', 'coachMsgs', 'homeGrid2', 'addTradeBtn',
];

function showView(view) {
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));

  document.getElementById('historyView').classList.toggle('hidden', view !== 'history');
  document.getElementById('settingsView').classList.toggle('hidden', view !== 'settings');

  const isHome = view === 'home';
  document.querySelector('.status-band').style.display = isHome ? '' : 'none';
  document.querySelector('.gauge-card').style.display = isHome ? '' : 'none';
  document.getElementById('homeGrid1').style.display = isHome ? '' : 'none';
  document.getElementById('consistencyCard').style.display = isHome ? '' : 'none';
  document.getElementById('coachMsgs').style.display = isHome ? '' : 'none';
  document.getElementById('homeGrid2').style.display = isHome ? '' : 'none';
  document.getElementById('addTradeBtn').style.display = isHome ? '' : 'none';

  if (view !== 'home') document.getElementById('tradeForm').classList.add('hidden');
  if (view === 'history') renderHistory();

  document.querySelector('.scroll-area').scrollTo({ top: 0, behavior: 'instant' });
}

function setupNav() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });
}

function setupTradeForm() {
  const formSection = document.getElementById('tradeForm');
  document.getElementById('addTradeBtn').addEventListener('click', () => {
    formSection.classList.remove('hidden');
    formSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  document.getElementById('cancelTradeBtn').addEventListener('click', () => {
    formSection.classList.add('hidden');
  });
  document.getElementById('saveTradeBtn').addEventListener('click', () => {
    const pnlRaw = document.getElementById('fPnl').value;
    if (pnlRaw === '') {
      document.getElementById('fPnl').focus();
      return;
    }
    const trade = {
      symbol: document.getElementById('fSymbol').value.trim().toUpperCase() || '—',
      side: document.getElementById('fSide').value,
      size: Number(document.getElementById('fSize').value) || 1,
      pnl: Number(pnlRaw),
      emotion: document.getElementById('fEmotion').value,
      ts: Date.now(),
    };
    state.days[todayKey].trades.push(trade);
    save();

    document.getElementById('fSymbol').value = '';
    document.getElementById('fPnl').value = '';
    document.getElementById('fEmotion').value = '';
    document.getElementById('fSize').value = 1;
    formSection.classList.add('hidden');

    render();
  });
}

function setupSettings() {
  document.getElementById('settingsBtn').addEventListener('click', () => showView('settings'));

  const accSel = document.getElementById('accountSize');
  accSel.value = state.accountSize;
  accSel.addEventListener('change', () => {
    state.accountSize = Number(accSel.value);
    save();
    render();
  });

  const tradeLimitInput = document.getElementById('tradeLimitInput');
  tradeLimitInput.value = state.tradeLimit;
  tradeLimitInput.addEventListener('change', () => {
    state.tradeLimit = Math.max(1, Number(tradeLimitInput.value) || 5);
    save();
    render();
  });

  const lossStreakInput = document.getElementById('lossStreakInput');
  lossStreakInput.value = state.lossStreakLimit;
  lossStreakInput.addEventListener('change', () => {
    state.lossStreakLimit = Math.max(1, Number(lossStreakInput.value) || 3);
    save();
    render();
  });

  document.getElementById('resetDayBtn').addEventListener('click', () => {
    todayKey = getTodayKey();
    if (!state.days[todayKey]) state.days[todayKey] = { trades: [] };
    save();
    render();
    showView('home');
  });

  document.getElementById('wipeDataBtn').addEventListener('click', () => {
    if (!confirm('Esto borrará todo tu historial y configuración. ¿Continuar?')) return;
    state = structuredClone(DEFAULT_STATE);
    todayKey = getTodayKey();
    state.days[todayKey] = { trades: [] };
    save();
    render();
    document.getElementById('accountSize').value = state.accountSize;
    document.getElementById('tradeLimitInput').value = state.tradeLimit;
    document.getElementById('lossStreakInput').value = state.lossStreakLimit;
  });
}

function init() {
  load();
  setupNav();
  setupTradeForm();
  setupSettings();
  render();

  setInterval(() => {
    const nowKey = getTodayKey();
    if (nowKey !== todayKey) {
      todayKey = nowKey;
      if (!state.days[todayKey]) state.days[todayKey] = { trades: [] };
      save();
      render();
    }
  }, 60000);
}

document.addEventListener('DOMContentLoaded', init);
