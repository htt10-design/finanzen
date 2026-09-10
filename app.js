// Globale Anwendungsdaten (lokal gesichert via localStorage)
let appState = {
  activeMonth: '',
  deductYearlyReserve: false,
  theme: 'light',
  incomes: {},       // { "2026-09": [ { id, name, amount } ] }
  fixExpenses: {},   // { "2026-09": [ { id, name, category, amount } ] }
  varExpenses: {},   // { "2026-09": [ { id, name, category, amount } ] }
  yearlyExpenses: [] // [ { id, name, amount, interval } ]
};

// Farb-Mapping für Kategorien
const categoryColors = {
  'Abos & Streaming': '#9b59b6',
  'Lebensmittel & Haushalt': '#2ecc71',
  'Auto & Mobilität': '#e67e22',
  'Baumarkt & Handwerk': '#d35400',
  'Wohnen & Fixkosten': '#3498db',
  'Gastronomie & Freizeit': '#e74c3c',
  'Shopping & Elektronik': '#1abc9c',
  'Gesundheit & Pflege': '#16a085',
  'Haustier': '#f1c40f',
  'Sonstiges': '#95a5a6'
};

// Initialisierung bei DOM-Aufruf
document.addEventListener('DOMContentLoaded', () => {
  loadStorage();
  
  // Design setzen
  if (appState.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  if (!appState.activeMonth) {
    appState.activeMonth = currentKey;
  }
  
  ensureMonthExists(appState.activeMonth);
  
  // Zustand des Dashboard-Switches laden
  const deductToggle = document.getElementById('deduct-yearly-toggle');
  if (deductToggle) {
    deductToggle.checked = !!appState.deductYearlyReserve;
  }
  
  updateMonthPickers();
  updateDashboard();
  lucide.createIcons();
});

// HELL / DUNKEL DESIGN TOGGLE
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  appState.theme = newTheme;
  saveStorage();
  lucide.createIcons();
}

// SPEICHER-VERWALTUNG (localStorage)
function saveStorage() {
  localStorage.setItem('financeControlData', JSON.stringify(appState));
}

function loadStorage() {
  const data = localStorage.getItem('financeControlData');
  if (data) {
    try {
      appState = { ...appState, ...JSON.parse(data) };
    } catch (e) {
      console.error("Fehler beim Laden der Daten", e);
    }
  }
}

function ensureMonthExists(monthKey) {
  if (!appState.incomes[monthKey]) appState.incomes[monthKey] = [];
  if (!appState.fixExpenses[monthKey]) appState.fixExpenses[monthKey] = [];
  if (!appState.varExpenses[monthKey]) appState.varExpenses[monthKey] = [];
}

// VIEW SWITCHING
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');

  if (viewId === 'dashboard-view') updateDashboard();
  if (viewId === 'einnahmen-view') renderIncomes();
  if (viewId === 'fixkosten-view') renderFixExpenses();
  if (viewId === 'variable-view') renderVarExpenses();
  if (viewId === 'jaehrliche-kosten-view') renderYearlyExpenses();
  if (viewId === 'summary-view') renderSummary();
  if (viewId === 'history-view') renderHistoryAnalysis();
  
  lucide.createIcons();
}

// MONATSSTEUERUNG
function changeActiveMonth(monthKey) {
  appState.activeMonth = monthKey;
  ensureMonthExists(monthKey);
  saveStorage();
  
  updateMonthPickers();
  
  const activeView = document.querySelector('.view.active').id;
  switchView(activeView);
}

function updateMonthPickers() {
  const select = document.getElementById('global-month-select');
  if (!select) return;
  select.innerHTML = '';
  
  const allMonths = Array.from(new Set([
    ...Object.keys(appState.incomes),
    ...Object.keys(appState.fixExpenses),
    ...Object.keys(appState.varExpenses),
    appState.activeMonth
  ])).sort().reverse();

  allMonths.forEach(mKey => {
    const opt = document.createElement('option');
    opt.value = mKey;
    opt.innerText = formatMonthName(mKey);
    if (mKey === appState.activeMonth) opt.selected = true;
    select.appendChild(opt);
  });

  document.querySelectorAll('.active-month-name').forEach(el => {
    el.innerText = formatMonthName(appState.activeMonth);
  });
  
  const currentMonthDisplay = document.getElementById('current-month-display');
  if (currentMonthDisplay) {
    currentMonthDisplay.innerText = formatMonthName(appState.activeMonth);
  }
  
  // Kopier-Dropdowns befüllen
  const copyIncSelect = document.getElementById('copy-inc-month-select');
  const copyFixSelect = document.getElementById('copy-fix-month-select');
  if (copyIncSelect && copyFixSelect) {
    copyIncSelect.innerHTML = '<option value="">Von Monat...</option>';
    copyFixSelect.innerHTML = '<option value="">Von Monat...</option>';
    allMonths.filter(m => m !== appState.activeMonth).forEach(m => {
      copyIncSelect.innerHTML += `<option value="${m}">${formatMonthName(m)}</option>`;
      copyFixSelect.innerHTML += `<option value="${m}">${formatMonthName(m)}</option>`;
    });
  }
}

function addNewMonth() {
  const val = document.getElementById('new-month-input').value;
  if (!val) return;
  changeActiveMonth(val);
  document.getElementById('new-month-input').value = '';
}

// DASHBOARD BERECHNUNG
function updateDashboard() {
  const m = appState.activeMonth;
  ensureMonthExists(m);

  const totalInc = (appState.incomes[m] || []).reduce((acc, curr) => acc + curr.amount, 0);
  const totalFix = (appState.fixExpenses[m] || []).reduce((acc, curr) => acc + curr.amount, 0);
  const totalVar = (appState.varExpenses[m] || []).reduce((acc, curr) => acc + curr.amount, 0);
  
  const yearlyTotal = appState.yearlyExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const yearlyMonthly = appState.yearlyExpenses.reduce((acc, curr) => acc + (curr.amount / (curr.interval || 12)), 0);

  const deductToggle = document.getElementById('deduct-yearly-toggle');
  const isDeduct = deductToggle ? deductToggle.checked : false;
  appState.deductYearlyReserve = isDeduct;
  saveStorage();

  let remaining = totalInc - (totalFix + totalVar);
  if (isDeduct) {
    remaining -= yearlyMonthly;
  }

  document.getElementById('tile-income-total').innerText = formatCurrency(totalInc);
  document.getElementById('tile-fix-total').innerText = formatCurrency(totalFix);
  document.getElementById('tile-var-total').innerText = formatCurrency(totalVar);
  document.getElementById('tile-yearly-total').innerText = formatCurrency(yearlyTotal);
  document.getElementById('tile-yearly-monthly').innerText = formatCurrency(yearlyMonthly);

  const remEl = document.getElementById('tile-remaining');
  remEl.innerText = formatCurrency(remaining);
  remEl.className = 'amount ' + (remaining >= 0 ? 'text-green' : 'text-red');
}

// BUCHUNGEN VERWALTEN & AUTOMATISCHE KATEGORIE-ERKENNUNG
function autoDetectCategory(prefix) {
  const nameInput = document.getElementById(`${prefix}-name`).value.toLowerCase();
  const catSelect = document.getElementById(`${prefix}-category`);
  
  if (!nameInput || !catSelect) return;

  if (nameInput.includes('netflix') || nameInput.includes('spotify') || nameInput.includes('dyn') || nameInput.includes('abo') || nameInput.includes('disney') || nameInput.includes('amazon prime')) {
    catSelect.value = 'Abos & Streaming';
  } else if (nameInput.includes('edeka') || nameInput.includes('rewe') || nameInput.includes('aldi') || nameInput.includes('lidl') || nameInput.includes('markt')) {
    catSelect.value = 'Lebensmittel & Haushalt';
  } else if (nameInput.includes('tanken') || nameInput.includes('kfz') || nameInput.includes('auto') || nameInput.includes('diesel') || nameInput.includes('benzin')) {
    catSelect.value = 'Auto & Mobilität';
  } else if (nameInput.includes('hornbach') || nameInput.includes('bauhaus') || nameInput.includes('obi')) {
    catSelect.value = 'Baumarkt & Handwerk';
  } else if (nameInput.includes('miete') || nameInput.includes('strom') || nameInput.includes('gas') || nameInput.includes('gez')) {
    catSelect.value = 'Wohnen & Fixkosten';
  }
}

function addEntry(e, type) {
  e.preventDefault();
  const m = appState.activeMonth;
  ensureMonthExists(m);

  if (type === 'inc') {
    const name = document.getElementById('inc-name').value;
    const amount = parseFloat(document.getElementById('inc-amount').value);
    if (!name || isNaN(amount)) return;

    appState.incomes[m].push({ id: Date.now(), name, amount });
    document.getElementById('inc-form').reset();
    renderIncomes();
  } else if (type === 'fix') {
    const name = document.getElementById('fix-name').value;
    const amount = parseFloat(document.getElementById('fix-amount').value);
    const category = document.getElementById('fix-category').value;
    if (!name || isNaN(amount)) return;

    appState.fixExpenses[m].push({ id: Date.now(), name, category, amount });
    document.getElementById('fix-form').reset();
    renderFixExpenses();
  } else if (type === 'var') {
    const name = document.getElementById('var-name').value;
    const amount = parseFloat(document.getElementById('var-amount').value);
    const category = document.getElementById('var-category').value;
    if (!name || isNaN(amount)) return;

    appState.varExpenses[m].push({ id: Date.now(), name, category, amount });
    document.getElementById('var-form').reset();
    renderVarExpenses();
  }

  saveStorage();
  updateDashboard();
}

function deleteEntry(type, id) {
  const m = appState.activeMonth;
  if (type === 'inc') {
    appState.incomes[m] = appState.incomes[m].filter(i => i.id !== id);
    renderIncomes();
  } else if (type === 'fix') {
    appState.fixExpenses[m] = appState.fixExpenses[m].filter(i => i.id !== id);
    renderFixExpenses();
  } else if (type === 'var') {
    appState.varExpenses[m] = appState.varExpenses[m].filter(i => i.id !== id);
    renderVarExpenses();
  }

  saveStorage();
  updateDashboard();
}

// RENDERN DER TABELLEN
function renderIncomes() {
  const list = document.getElementById('inc-list');
  if (!list) return;
  list.innerHTML = '';
  (appState.incomes[appState.activeMonth] || []).forEach(item => {
    list.innerHTML += `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td class="text-green font-weight-bold">${formatCurrency(item.amount)}</td>
        <td><button class="action-btn" onclick="deleteEntry('inc', ${item.id})"><i data-lucide="trash-2"></i></button></td>
      </tr>
    `;
  });
  lucide.createIcons();
}

function renderFixExpenses() {
  const list = document.getElementById('fix-list');
  if (!list) return;
  list.innerHTML = '';
  (appState.fixExpenses[appState.activeMonth] || []).forEach(item => {
    list.innerHTML += `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td><span class="badge">${escapeHtml(item.category)}</span></td>
        <td class="text-red">${formatCurrency(item.amount)}</td>
        <td><button class="action-btn" onclick="deleteEntry('fix', ${item.id})"><i data-lucide="trash-2"></i></button></td>
      </tr>
    `;
  });
  lucide.createIcons();
}

function renderVarExpenses() {
  const list = document.getElementById('var-list');
  if (!list) return;
  list.innerHTML = '';
  (appState.varExpenses[appState.activeMonth] || []).forEach(item => {
    list.innerHTML += `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td><span class="badge">${escapeHtml(item.category)}</span></td>
        <td class="text-red">${formatCurrency(item.amount)}</td>
        <td><button class="action-btn" onclick="deleteEntry('var', ${item.id})"><i data-lucide="trash-2"></i></button></td>
      </tr>
    `;
  });
  lucide.createIcons();
}

// KOPIERFUNKTIONEN
function copyIncomesFromSelectedMonth() {
  const sourceMonth = document.getElementById('copy-inc-month-select').value;
  if (!sourceMonth) return;
  const sourceItems = appState.incomes[sourceMonth] || [];
  ensureMonthExists(appState.activeMonth);
  
  sourceItems.forEach(item => {
    appState.incomes[appState.activeMonth].push({
      id: Date.now() + Math.random(),
      name: item.name,
      amount: item.amount
    });
  });
  saveStorage();
  renderIncomes();
  updateDashboard();
}

function copyFixExpensesFromSelectedMonth() {
  const sourceMonth = document.getElementById('copy-fix-month-select').value;
  if (!sourceMonth) return;
  const sourceItems = appState.fixExpenses[sourceMonth] || [];
  ensureMonthExists(appState.activeMonth);

  sourceItems.forEach(item => {
    appState.fixExpenses[appState.activeMonth].push({
      id: Date.now() + Math.random(),
      name: item.name,
      category: item.category,
      amount: item.amount
    });
  });
  saveStorage();
  renderFixExpenses();
  updateDashboard();
}

// JÄHRLICHE KOSTEN
function addYearlyEntry(e) {
  e.preventDefault();
  const name = document.getElementById('yearly-name').value;
  const amount = parseFloat(document.getElementById('yearly-amount').value);
  const interval = parseInt(document.getElementById('yearly-interval').value);
  if (!name || isNaN(amount)) return;

  appState.yearlyExpenses.push({ id: Date.now(), name, amount, interval });
  document.getElementById('yearly-form').reset();
  
  saveStorage();
  renderYearlyExpenses();
  updateDashboard();
}

function deleteYearlyEntry(id) {
  appState.yearlyExpenses = appState.yearlyExpenses.filter(i => i.id !== id);
  saveStorage();
  renderYearlyExpenses();
  updateDashboard();
}

function renderYearlyExpenses() {
  const list = document.getElementById('yearly-list');
  if (!list) return;
  list.innerHTML = '';
  
  let totalSum = 0;
  let monthlySum = 0;

  appState.yearlyExpenses.forEach(item => {
    const monthlyRate = item.amount / (item.interval || 12);
    totalSum += item.amount;
    monthlySum += monthlyRate;

    let turnusText = '1x im Jahr';
    if (item.interval === 6) turnusText = '2x im Jahr';
    if (item.interval === 3) turnusText = '4x im Jahr';

    list.innerHTML += `
      <tr>
        <td>${escapeHtml(item.name)}</td>
        <td>${turnusText}</td>
        <td>${formatCurrency(item.amount)}</td>
        <td class="text-blue font-weight-bold">${formatCurrency(monthlyRate)} / Mo.</td>
        <td><button class="action-btn" onclick="deleteYearlyEntry(${item.id})"><i data-lucide="trash-2"></i></button></td>
      </tr>
    `;
  });

  document.getElementById('yearly-total-sum').innerText = formatCurrency(totalSum);
  document.getElementById('yearly-monthly-sum').innerText = formatCurrency(monthlySum);
  lucide.createIcons();
}

// MONATSBILANZ & KATEGORIE-AUSWERTUNG
function renderSummary() {
  const m = appState.activeMonth;
  ensureMonthExists(m);

  const incList = appState.incomes[m] || [];
  const fixList = appState.fixExpenses[m] || [];
  const varList = appState.varExpenses[m] || [];

  const totalInc = incList.reduce((acc, c) => acc + c.amount, 0);
  const totalFix = fixList.reduce((acc, c) => acc + c.amount, 0);
  const totalVar = varList.reduce((acc, c) => acc + c.amount, 0);
  const totalSpent = totalFix + totalVar;
  const remaining = totalInc - totalSpent;

  document.getElementById('summary-income').innerText = formatCurrency(totalInc);
  document.getElementById('summary-spent').innerText = formatCurrency(totalSpent);
  
  const remEl = document.getElementById('summary-remaining');
  remEl.innerText = formatCurrency(remaining);
  remEl.className = remaining >= 0 ? 'text-green' : 'text-red';

  // Kategorien zusammenrechnen
  const catTotals = {};
  [...fixList, ...varList].forEach(item => {
    const cat = item.category || 'Sonstiges';
    catTotals[cat] = (catTotals[cat] || 0) + item.amount;
  });

  const progressBar = document.getElementById('category-progress-bar');
  const legend = document.getElementById('category-legend');
  const tbody = document.getElementById('category-table-body');

  progressBar.innerHTML = '';
  legend.innerHTML = '';
  tbody.innerHTML = '';

  if (totalSpent === 0) {
    progressBar.innerHTML = '<div style="width:100%; text-align:center; font-size:0.75rem; color:#888; padding-top:2px;">Keine Ausgaben</div>';
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--text-muted);">Keine Buchungen in diesem Monat</td></tr>';
    return;
  }

  for (const [cat, sum] of Object.entries(catTotals)) {
    const percentage = ((sum / totalSpent) * 100).toFixed(1);
    const color = categoryColors[cat] || '#95a5a6';

    const seg = document.createElement('div');
    seg.className = 'progress-segment';
    seg.style.width = `${percentage}%`;
    seg.style.backgroundColor = color;
    seg.title = `${cat}: ${formatCurrency(sum)} (${percentage}%)`;
    progressBar.appendChild(seg);

    legend.innerHTML += `
      <div class="legend-item">
        <div class="legend-color" style="background-color: ${color};"></div>
        <span>${cat} (${percentage}%)</span>
      </div>
    `;

    tbody.innerHTML += `
      <tr>
        <td><strong>${cat}</strong></td>
        <td>${percentage}%</td>
        <td class="text-red">${formatCurrency(sum)}</td>
      </tr>
    `;
  }
}

// HISTORIE & JAHRESANALSYE
function renderHistoryAnalysis() {
  const yearSelect = document.getElementById('filter-year');
  if (!yearSelect) return;

  const allMonths = Array.from(new Set([
    ...Object.keys(appState.incomes),
    ...Object.keys(appState.fixExpenses),
    ...Object.keys(appState.varExpenses)
  ])).sort();

  const years = Array.from(new Set(allMonths.map(m => m.split('-')[0]))).sort().reverse();
  if (years.length === 0) years.push(new Date().getFullYear().toString());

  yearSelect.innerHTML = '';
  years.forEach(y => {
    yearSelect.innerHTML += `<option value="${y}">${y}</option>`;
  });

  const selectedYear = yearSelect.value || years[0];
  
  const monthsInYear = allMonths.filter(m => m.startsWith(selectedYear));
  let yearlyTotalSpent = 0;
  const monthData = [];

  monthsInYear.forEach(m => {
    const fix = (appState.fixExpenses[m] || []).reduce((acc, c) => acc + c.amount, 0);
    const v = (appState.varExpenses[m] || []).reduce((acc, c) => acc + c.amount, 0);
    const spent = fix + v;
    yearlyTotalSpent += spent;
    monthData.push({ monthKey: m, spent });
  });

  const avgSpent = monthsInYear.length > 0 ? (yearlyTotalSpent / monthsInYear.length) : 0;

  document.getElementById('year-total-spent').innerText = formatCurrency(yearlyTotalSpent);
  document.getElementById('year-avg-spent').innerText = formatCurrency(avgSpent);

  const maxSpent = Math.max(...monthData.map(d => d.spent), 1);
  const barsContainer = document.getElementById('yearly-bars-container');
  barsContainer.innerHTML = '';

  if (monthData.length === 0) {
    barsContainer.innerHTML = '<p style="color: var(--text-muted);">Keine Daten für dieses Jahr vorhanden.</p>';
    return;
  }

  monthData.forEach(d => {
    const fillPercent = ((d.spent / maxSpent) * 100).toFixed(1);
    barsContainer.innerHTML += `
      <div class="yearly-bar-row">
        <div class="yearly-bar-label">${formatMonthName(d.monthKey)}</div>
        <div class="yearly-bar-track">
          <div class="yearly-bar-fill" style="width: ${fillPercent}%;"></div>
        </div>
        <div class="yearly-bar-val text-red">${formatCurrency(d.spent)}</div>
      </div>
    `;
  });
}

// FORMATIERUNGS- UND HILFSFUNKTIONEN
function formatCurrency(val) {
  return (val || 0).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatMonthName(monthKey) {
  if (!monthKey || !monthKey.includes('-')) return monthKey;
  const [year, month] = monthKey.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
