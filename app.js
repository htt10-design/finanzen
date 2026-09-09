const STORAGE_KEY = 'finance_control_data_v3';

let db = loadData() || {
  activeMonthKey: '2026-09',
  yearlyExpenses: [
    { id: 1, name: "KFZ-Steuer", amount: 240, interval: 12 },
    { id: 2, name: "Auto-Versicherung", amount: 600, interval: 12 },
    { id: 3, name: "Urlaubskasse", amount: 1200, interval: 12 }
  ],
  months: {
    '2026-09': {
      inc: [
        { id: 1, name: "Hauptgehalt", amount: 2800 }
      ],
      fix: [
        { id: 101, name: "Miete", amount: 850 },
        { id: 102, name: "Strom & Internet", amount: 150 }
      ],
      var: [
        { id: 201, name: "Supermarkt", amount: 210.50 }
      ]
    }
  }
};

const monthNamesGerman = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
  
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  if (!db.yearlyExpenses) db.yearlyExpenses = [];

  if (!db.months[db.activeMonthKey]) {
    db.activeMonthKey = currentKey;
    ensureMonthExists(currentKey);
  }

  document.getElementById('new-month-input').value = currentKey;

  renderMonthSelect();
  renderAll();
});

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : null;
}

function ensureMonthExists(key) {
  if (!db.months[key]) {
    db.months[key] = { inc: [], fix: [], var: [] };
    saveData();
  }
}

function formatEUR(val) {
  return (val || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

function formatKeyToLabel(key) {
  const [year, month] = key.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  return `${monthNamesGerman[monthIdx]} ${year}`;
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById(viewId);
  if (target) target.classList.add('active');
  
  if (viewId === 'history-view') {
    renderHistoryAnalysis();
  }
}

function changeActiveMonth(key) {
  db.activeMonthKey = key;
  saveData();
  renderAll();
}

function renderMonthSelect() {
  const select = document.getElementById('global-month-select');
  select.innerHTML = '';

  const sortedKeys = Object.keys(db.months).sort().reverse();

  sortedKeys.forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.innerText = formatKeyToLabel(key);
    if (key === db.activeMonthKey) opt.selected = true;
    select.appendChild(opt);
  });
}

function copyFromPreviousMonth(typeKey, typeLabel) {
  const currentKey = db.activeMonthKey;
  const [year, month] = currentKey.split('-').map(Number);
  
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

  if (!db.months[prevKey] || !db.months[prevKey][typeKey] || db.months[prevKey][typeKey].length === 0) {
    alert(`Keine ${typeLabel} im Vormonat (${formatKeyToLabel(prevKey)}) gefunden!`);
    return;
  }

  const currentList = db.months[currentKey][typeKey];
  const prevList = db.months[prevKey][typeKey];

  let addedCount = 0;
  prevList.forEach(item => {
    const exists = currentList.some(c => c.name.toLowerCase() === item.name.toLowerCase());
    if (!exists) {
      currentList.push({ id: Date.now() + Math.random(), name: item.name, amount: item.amount });
      addedCount++;
    }
  });

  saveData();
  renderAll();
  alert(`${addedCount} ${typeLabel}-Einträge aus ${formatKeyToLabel(prevKey)} übernommen!`);
}

function copyIncomesFromPreviousMonth() { copyFromPreviousMonth('inc', 'Einnahmen'); }
function copyFixExpensesFromPreviousMonth() { copyFromPreviousMonth('fix', 'Fixkosten'); }

function addNewMonth() {
  const input = document.getElementById('new-month-input').value;
  if (!input) return;

  ensureMonthExists(input);
  db.activeMonthKey = input;
  saveData();
  
  renderMonthSelect();
  renderAll();
  alert(`Monat ${formatKeyToLabel(input)} wurde angelegt und ausgewählt.`);
}

// Monatliche Einträge
function addEntry(e, type) {
  e.preventDefault();
  const monthData = db.months[db.activeMonthKey];
  const nameInput = document.getElementById(`${type}-name`);
  const amountInput = document.getElementById(`${type}-amount`);

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);

  if (name && !isNaN(amount)) {
    if (!monthData[type]) monthData[type] = [];
    monthData[type].push({ id: Date.now(), name, amount });
    nameInput.value = '';
    amountInput.value = '';
    saveData();
    renderAll();
  }
}

function deleteEntry(type, id) {
  const monthData = db.months[db.activeMonthKey];
  monthData[type] = monthData[type].filter(item => item.id !== id);
  saveData();
  renderAll();
}

function editEntry(type, id) {
  const monthData = db.months[db.activeMonthKey];
  const item = monthData[type].find(i => i.id === id);
  if (!item) return;

  const newName = prompt("Neue Bezeichnung:", item.name);
  const newAmount = prompt("Neuer Betrag (€):", item.amount);

  if (newName !== null && newAmount !== null) {
    const parsed = parseFloat(newAmount);
    if (newName.trim() !== "" && !isNaN(parsed)) {
      item.name = newName.trim();
      item.amount = parsed;
      saveData();
      renderAll();
    }
  }
}

// Jährliche Kosten verwalten
function addYearlyEntry(e) {
  e.preventDefault();
  const nameInput = document.getElementById('yearly-name');
  const amountInput = document.getElementById('yearly-amount');
  const intervalSelect = document.getElementById('yearly-interval');

  const name = nameInput.value.trim();
  const amount = parseFloat(amountInput.value);
  const interval = parseInt(intervalSelect.value, 10);

  if (name && !isNaN(amount)) {
    db.yearlyExpenses.push({ id: Date.now(), name, amount, interval });
    nameInput.value = '';
    amountInput.value = '';
    saveData();
    renderAll();
  }
}

function deleteYearlyEntry(id) {
  db.yearlyExpenses = db.yearlyExpenses.filter(item => item.id !== id);
  saveData();
  renderAll();
}

function renderAll() {
  const monthLabel = formatKeyToLabel(db.activeMonthKey);
  
  document.getElementById('current-month-display').innerText = monthLabel;
  document.querySelectorAll('.active-month-name').forEach(el => el.innerText = monthLabel);

  const monthData = db.months[db.activeMonthKey];
  if (!monthData.inc) monthData.inc = [];
  if (!monthData.fix) monthData.fix = [];
  if (!monthData.var) monthData.var = [];

  renderList('inc');
  renderList('fix');
  renderList('var');
  renderYearlyList();
  updateDashboardSummaries();

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderList(type) {
  const monthData = db.months[db.activeMonthKey];
  const tbody = document.getElementById(`${type}-list`);
  tbody.innerHTML = '';

  (monthData[type] || []).forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td><strong>${formatEUR(item.amount)}</strong></td>
      <td>
        <button class="action-btn" onclick="editEntry('${type}', ${item.id})"><i data-lucide="pencil"></i></button>
        <button class="action-btn delete" onclick="deleteEntry('${type}', ${item.id})"><i data-lucide="trash-2"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderYearlyList() {
  const tbody = document.getElementById('yearly-list');
  tbody.innerHTML = '';

  (db.yearlyExpenses || []).forEach(item => {
    const monthlyRate = item.amount / item.interval;
    let intervalLabel = "1x jährlich";
    if (item.interval === 6) intervalLabel = "2x jährlich";
    if (item.interval === 3) intervalLabel = "4x jährlich";

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.name}</td>
      <td><span class="badge">${intervalLabel}</span></td>
      <td>${formatEUR(item.amount)}</td>
      <td><strong class="text-blue">${formatEUR(monthlyRate)} / Mtl.</strong></td>
      <td>
        <button class="action-btn delete" onclick="deleteYearlyEntry(${item.id})"><i data-lucide="trash-2"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateDashboardSummaries() {
  const monthData = db.months[db.activeMonthKey];

  const totalInc = (monthData.inc || []).reduce((sum, item) => sum + item.amount, 0);
  const totalFix = (monthData.fix || []).reduce((sum, item) => sum + item.amount, 0);
  const totalVar = (monthData.var || []).reduce((sum, item) => sum + item.amount, 0);

  // Berechnung der jährlichen Rücklagen
  let totalYearlySum = 0;
  let totalMonthlyReserve = 0;

  (db.yearlyExpenses || []).forEach(item => {
    totalYearlySum += item.amount;
    totalMonthlyReserve += (item.amount / item.interval);
  });

  const totalSpent = totalFix + totalVar;
  const remainingAfterReserve = totalInc - totalSpent - totalMonthlyReserve;

  // Dashboard-Kacheln
  document.getElementById('tile-income-total').innerText = formatEUR(totalInc);
  document.getElementById('tile-fix-total').innerText = formatEUR(totalFix);
  document.getElementById('tile-var-total').innerText = formatEUR(totalVar);
  document.getElementById('tile-yearly-total').innerText = formatEUR(totalYearlySum);
  document.getElementById('tile-yearly-monthly').innerText = formatEUR(totalMonthlyReserve);
  document.getElementById('tile-remaining').innerText = formatEUR(remainingAfterReserve);

  // Jahres-View Gesamtsummen
  document.getElementById('yearly-total-sum').innerText = formatEUR(totalYearlySum);
  document.getElementById('yearly-monthly-sum').innerText = formatEUR(totalMonthlyReserve);

  // Sub-View Monatsbilanz
  document.getElementById('summary-income').innerText = formatEUR(totalInc);
  document.getElementById('summary-spent').innerText = formatEUR(totalSpent);
  document.getElementById('summary-yearly-reserve').innerText = formatEUR(totalMonthlyReserve);
  document.getElementById('summary-remaining').innerText = formatEUR(remainingAfterReserve);
  document.getElementById('legend-fix').innerText = formatEUR(totalFix);
  document.getElementById('legend-var').innerText = formatEUR(totalVar);

  const fixPct = totalInc > 0 ? Math.min((totalFix / totalInc) * 100, 100) : 0;
  const varPct = totalInc > 0 ? Math.min((totalVar / totalInc) * 100, 100 - fixPct) : 0;

  document.getElementById('progress-fix').style.width = `${fixPct}%`;
  document.getElementById('progress-var').style.width = `${varPct}%`;
}

function renderHistoryAnalysis() {
  const yearSelect = document.getElementById('filter-year');
  const years = Array.from(new Set(Object.keys(db.months).map(k => k.split('-')[0]))).sort().reverse();

  const currentSelectedYear = yearSelect.value || years[0] || new Date().getFullYear().toString();
  yearSelect.innerHTML = '';
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.innerText = y;
    if (y === currentSelectedYear) opt.selected = true;
    yearSelect.appendChild(opt);
  });

  const selectedYear = yearSelect.value || currentSelectedYear;

  let totalYearSpent = 0;
  let activeMonthCount = 0;
  let monthTotals = [];

  for (let m = 1; m <= 12; m++) {
    const mKey = `${selectedYear}-${String(m).padStart(2, '0')}`;
    const mData = db.months[mKey];
    
    let spent = 0;
    if (mData) {
      spent = (mData.fix || []).reduce((s, i) => s + i.amount, 0) + (mData.var || []).reduce((s, i) => s + i.amount, 0);
      totalYearSpent += spent;
      activeMonthCount++;
    }

    monthTotals.push({
      monthName: monthNamesGerman[m - 1],
      spent,
      exists: !!mData
    });
  }

  const avgSpent = activeMonthCount > 0 ? totalYearSpent / activeMonthCount : 0;

  document.getElementById('year-total-spent').innerText = formatEUR(totalYearSpent);
  document.getElementById('year-avg-spent').innerText = formatEUR(avgSpent);

  const container = document.getElementById('yearly-bars-container');
  container.innerHTML = '';

  const maxSpentInYear = Math.max(...monthTotals.map(m => m.spent), 1);

  monthTotals.forEach(m => {
    const row = document.createElement('div');
    row.className = 'month-bar-row';

    const pct = (m.spent / maxSpentInYear) * 100;

    row.innerHTML = `
      <div class="month-bar-label">${m.monthName}</div>
      <div class="month-bar-track">
        <div class="month-bar-fill" style="width: ${m.spent > 0 ? pct : 0}%"></div>
      </div>
      <div class="month-bar-val">${m.exists ? formatEUR(m.spent) : '-'}</div>
    `;
    container.appendChild(row);
  });
}
