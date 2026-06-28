const STORAGE_KEY = "combineCoachState";

const ACCOUNT_PRESETS = {
  50000:  { label: "$50K",  profitTarget: 3000, dailyLossLimit: 1000, maxLossLimit: 2000, maxContracts: 5  },
  100000: { label: "$100K", profitTarget: 6000, dailyLossLimit: 2000, maxLossLimit: 3000, maxContracts: 10 },
  150000: { label: "$150K", profitTarget: 9000, dailyLossLimit: 3000, maxLossLimit: 4500, maxContracts: 15 }
};

const DEFAULT_STATE = {
  accountSize: 50000,
  tradeLimit: 5,
  lossStreakLimit: 3,
  days: {}
};

var state = null;
var todayKey = null;

function cloneDefaultState() {
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  var parsed = null;
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch (e) {
    parsed = null;
  }
  state = parsed || cloneDefaultState();
  todayKey = getTodayKey();
  if (!state.days[todayKey]) state.days[todayKey] = { trades: [] };
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("No se pudo guardar:", e);
  }
}

function preset() {
  return ACCOUNT_PRESETS[state.accountSize];
}

function allDayKeys() {
  return Object.keys(state.days).sort();
}

function dayNetPnl(dayKey) {
  var day = state.days[dayKey];
  if (!day) return 0;
  return day.trades.reduce(function (sum, t) { return sum + t.pnl; }, 0);
}

function totalNetPnl() {
  return allDayKeys().reduce(function (sum, k) { return sum + dayNetPnl(k); }, 0);
}

function bestDayPnl() {
  var best = 0;
  var keys = allDayKeys();
  for (var i = 0; i < keys.length; i++) {
    var p = dayNetPnl(keys[i]);
    if (p > best) best = p;
  }
  return best;
}

function equityBeforeToday() {
  return allDayKeys()
    .filter(function (k) { return k !== todayKey; })
    .reduce(function (sum, k) { return sum + dayNetPnl(k); }, 0);
}

function peakEquityToday() {
  var base = equityBeforeToday();
  var trades = state.days[todayKey].trades;
  var running = base;
  var peak = base;
  for (var i = 0; i < trades.length; i++) {
    running += trades[i].pnl;
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
  var pnl = dayNetPnl(todayKey);
  return pnl < 0 ? Math.abs(pnl) : 0;
}

function consistencyPct() {
  var total = totalNetPnl();
  if (total <= 0) return 0;
  var best = bestDayPnl();
  return (best / total) * 100;
}

function currentStreak() {
  var trades = state.days[todayKey].trades;
  if (trades.length === 0) return 0;
  var streak = 0;
  var lastSign = trades[trades.length - 1].pnl < 0;
  for (var i = trades.length - 1; i >= 0; i--) {
    var isLoss = trades[i].pnl < 0;
    if (isLoss === lastSign) streak++;
    else break;
  }
  return lastSign ? -streak : streak;
}

function winRateToday() {
  var trades = state.days[todayKey].trades;
  if (trades.length === 0) return null;
  var wins = trades.filter(function (t) { return t.pnl > 0; }).length;
  return Math.round((wins / trades.length) * 100);
}

function money(n) {
  var sign = n < 0 ? "-" : "";
  return sign + "$" + Math.abs(Math.round(n)).toLocaleString("en-US");
}

function clampPct(p) {
  return Math.max(0, Math.min(100, p));
}

function render() {
  var p = preset();
  document.getElementById("accountLabel").textContent = p.label + " Comb
