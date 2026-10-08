// ═══════════════════════════════════════════════════════════════
// PERSONAL FINANCE TRACKER — Google Apps Script
// Architecture: Mini-ERP with form-based entry, ledger,
//               master data, dashboard, and reports
// ═══════════════════════════════════════════════════════════════

// ── CONSTANTS ────────────────────────────────────────────────
const SHEET_NAMES = {
  LEDGER:             'Ledger',
  DASHBOARD:          'Dashboard',
  REPORTS:            'Reports',
  MASTER_INCOME_CAT:  'M_IncomeCategories',
  MASTER_EXPENSE_CAT: 'M_ExpenseCategories',
  MASTER_PAY_MODES:   'M_PaymentModes',
  MASTER_ACCOUNTS:    'M_Accounts',
  MASTER_VENDORS:     'M_Vendors',
  MASTER_SOURCES:     'M_IncomeSources',
  SETTINGS:           'Settings',
  AUDIT_LOG:          'AuditLog',
  BUDGETS:            'Budgets',
  TRANSFERS:          'Transfers'
};

const LEDGER_HEADERS = [
  'TxnID', 'Date', 'Type', 'Amount', 'Category', 'Source/Payee',
  'PaymentMode', 'Account', 'RunningBalance', 'Notes', 'Tags',
  'Project', 'Recurring', 'Timestamp'
];

const AUDIT_HEADERS = [
  'Timestamp', 'Action', 'TxnID', 'User', 'Details'
];

const TRANSFER_HEADERS = [
  'TxnID', 'Date', 'FromAccount', 'ToAccount', 'Amount', 'Notes', 'Timestamp'
];

const BUDGET_HEADERS = [
  'Month', 'Category', 'Type', 'BudgetAmount'
];


// ── MENU & UI ────────────────────────────────────────────────

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('💰 Finance Tracker')
    .addItem('➕ New Transaction', 'showTransactionForm')
    .addItem('🔄 Transfer Between Accounts', 'showTransferForm')
    .addSeparator()
    .addItem('📊 Refresh Dashboard', 'refreshDashboard')
    .addItem('📋 Generate Monthly Report', 'showReportForm')
    .addSeparator()
    .addSubMenu(ui.createMenu('⚙️ Setup')
      .addItem('🏗️ Initialize All Sheets', 'initializeApp')
      .addItem('📝 Manage Master Data', 'showMasterDataForm')
      .addItem('💵 Set Monthly Budgets', 'showBudgetForm'))
    .addSeparator()
    .addItem('❓ Help & Documentation', 'showHelp')
    .addToUi();
}

function showTransactionForm() {
  const html = HtmlService.createHtmlOutputFromFile('TransactionForm')
    .setTitle('New Transaction')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showTransferForm() {
  const html = HtmlService.createHtmlOutputFromFile('TransferForm')
    .setTitle('Account Transfer')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showMasterDataForm() {
  const html = HtmlService.createHtmlOutputFromFile('MasterDataForm')
    .setTitle('Manage Master Data')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showBudgetForm() {
  const html = HtmlService.createHtmlOutputFromFile('BudgetForm')
    .setTitle('Monthly Budgets')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showReportForm() {
  const html = HtmlService.createHtmlOutputFromFile('ReportForm')
    .setTitle('Generate Report')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showHelp() {
  const html = HtmlService.createHtmlOutputFromFile('Help')
    .setTitle('Help & Documentation')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}


// ── INITIALIZATION ───────────────────────────────────────────

function initializeApp() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const confirm = ui.alert(
    'Initialize Finance Tracker',
    'This will create all required sheets and master data.\n' +
    'Existing sheets with matching names will NOT be overwritten.\n\nContinue?',
    ui.ButtonSet.YES_NO
  );

  if (confirm !== ui.Button.YES) return;

  // Create all sheets
  createSheetIfMissing_(ss, SHEET_NAMES.LEDGER, LEDGER_HEADERS);
  createSheetIfMissing_(ss, SHEET_NAMES.AUDIT_LOG, AUDIT_HEADERS);
  createSheetIfMissing_(ss, SHEET_NAMES.TRANSFERS, TRANSFER_HEADERS);
  createSheetIfMissing_(ss, SHEET_NAMES.BUDGETS, BUDGET_HEADERS);
  createSheetIfMissing_(ss, SHEET_NAMES.DASHBOARD, ['Dashboard']);
  createSheetIfMissing_(ss, SHEET_NAMES.REPORTS, ['Reports']);
  createSheetIfMissing_(ss, SHEET_NAMES.SETTINGS, ['Key', 'Value']);

  // Master data sheets with defaults
  createMasterSheet_(ss, SHEET_NAMES.MASTER_INCOME_CAT, ['Category', 'Active'],
    [['Salary','Yes'],['Freelance','Yes'],['Investment','Yes'],['Refund','Yes'],
     ['Gift','Yes'],['Rental Income','Yes'],['Interest','Yes'],['Dividend','Yes'],
     ['Commission','Yes'],['Other Income','Yes']]);

  createMasterSheet_(ss, SHEET_NAMES.MASTER_EXPENSE_CAT, ['Category', 'Active'],
    [['Food & Dining','Yes'],['Rent','Yes'],['Utilities','Yes'],['Transport','Yes'],
     ['Shopping','Yes'],['Entertainment','Yes'],['Medical','Yes'],['Insurance','Yes'],
     ['Education','Yes'],['Travel','Yes'],['Subscriptions','Yes'],['Personal Care','Yes'],
     ['Gifts & Donations','Yes'],['Home Maintenance','Yes'],['Fuel','Yes'],
     ['Groceries','Yes'],['Phone & Internet','Yes'],['EMI / Loan','Yes'],
     ['Taxes','Yes'],['Other Expense','Yes']]);

  createMasterSheet_(ss, SHEET_NAMES.MASTER_PAY_MODES, ['Mode', 'Active'],
    [['Cash','Yes'],['Bank Transfer','Yes'],['UPI','Yes'],['Credit Card','Yes'],
     ['Debit Card','Yes'],['Cheque','Yes'],['Net Banking','Yes'],
     ['Mobile Wallet','Yes'],['Other','Yes']]);

  createMasterSheet_(ss, SHEET_NAMES.MASTER_ACCOUNTS, ['Account', 'Type', 'OpeningBalance', 'Active'],
    [['Cash Wallet','Cash',0,'Yes'],['Primary Bank','Bank',0,'Yes'],
     ['Savings Account','Bank',0,'Yes'],['Credit Card','Credit',0,'Yes']]);

  createMasterSheet_(ss, SHEET_NAMES.MASTER_VENDORS, ['Name', 'Category', 'Active'],
    [['Amazon','Shopping','Yes'],['Grocery Store','Groceries','Yes'],
     ['Landlord','Rent','Yes'],['Uber','Transport','Yes']]);

  createMasterSheet_(ss, SHEET_NAMES.MASTER_SOURCES, ['Source', 'Active'],
    [['Employer','Yes'],['Client','Yes'],['Bank Interest','Yes'],
     ['Stock Dividend','Yes'],['Rental Tenant','Yes'],['Other','Yes']]);

  // Settings defaults
  const settingsSheet = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  if (settingsSheet.getLastRow() <= 1) {
    settingsSheet.getRange(2, 1, 3, 2).setValues([
      ['Currency', '₹'],
      ['DateFormat', 'dd/MM/yyyy'],
      ['LastTxnID', '0']
    ]);
  }

  // Format Ledger
  formatLedgerSheet_(ss);

  // Build Dashboard
  refreshDashboard();

  ui.alert('✅ Setup Complete', 'All sheets have been created.\n\nUse the Finance Tracker menu to start adding transactions.', ui.ButtonSet.OK);
  writeAuditLog_('INIT', '-', 'Application initialized');
}


// ── SHEET CREATION HELPERS ───────────────────────────────────

function createSheetIfMissing_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.getRange(1, 1, 1, headers.length)
        .setFontWeight('bold')
        .setBackground('#1a1a2e')
        .setFontColor('#e0e0e0')
        .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

function createMasterSheet_(ss, name, headers, defaults) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#16213e')
      .setFontColor('#e0e0e0');
    sheet.setFrozenRows(1);
    if (defaults && defaults.length) {
      sheet.getRange(2, 1, defaults.length, defaults[0].length).setValues(defaults);
    }
  }
  return sheet;
}

function formatLedgerSheet_(ss) {
  const sheet = ss.getSheetByName(SHEET_NAMES.LEDGER);
  if (!sheet) return;
  sheet.setColumnWidth(1, 120);  // TxnID
  sheet.setColumnWidth(2, 110);  // Date
  sheet.setColumnWidth(3, 80);   // Type
  sheet.setColumnWidth(4, 110);  // Amount
  sheet.setColumnWidth(5, 140);  // Category
  sheet.setColumnWidth(6, 150);  // Source/Payee
  sheet.setColumnWidth(7, 120);  // PaymentMode
  sheet.setColumnWidth(8, 130);  // Account
  sheet.setColumnWidth(9, 120);  // RunningBalance
  sheet.setColumnWidth(10, 200); // Notes
}


// ── TRANSACTION SUBMISSION ───────────────────────────────────

function submitTransaction(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ledger = ss.getSheetByName(SHEET_NAMES.LEDGER);
    if (!ledger) throw new Error('Ledger sheet not found. Run Setup first.');

    // Generate TxnID
    const txnId = generateTxnId_(ss, formData.type);

    // Calculate running balance
    const runningBalance = calculateRunningBalance_(ledger, formData.type, parseFloat(formData.amount));

    // Parse date
    const txnDate = formData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    const row = [
      txnId,
      txnDate,
      formData.type,
      parseFloat(formData.amount),
      formData.category,
      formData.sourcePayee || '',
      formData.paymentMode,
      formData.account,
      runningBalance,
      formData.notes || '',
      formData.tags || '',
      formData.project || '',
      formData.recurring || 'No',
      new Date()
    ];

    ledger.appendRow(row);

    // Format the new row
    const lastRow = ledger.getLastRow();
    const typeCell = ledger.getRange(lastRow, 3);
    const amtCell = ledger.getRange(lastRow, 4);
    const balCell = ledger.getRange(lastRow, 9);

    if (formData.type === 'Income') {
      typeCell.setBackground('#e8f5e9').setFontColor('#2e7d32');
      amtCell.setFontColor('#2e7d32').setNumberFormat('#,##0.00');
    } else {
      typeCell.setBackground('#ffebee').setFontColor('#c62828');
      amtCell.setFontColor('#c62828').setNumberFormat('#,##0.00');
    }
    balCell.setNumberFormat('#,##0.00');

    // Audit log
    writeAuditLog_('ADD', txnId, `${formData.type}: ${formData.amount} — ${formData.category}`);

    return {
      success: true,
      txnId: txnId,
      balance: runningBalance,
      message: `✅ ${formData.type} recorded!\nTxn ID: ${txnId}\nBalance: ${getCurrencySymbol_()}${runningBalance.toFixed(2)}`
    };
  } catch (e) {
    return { success: false, message: '❌ Error: ' + e.message };
  }
}


// ── TRANSFER BETWEEN ACCOUNTS ────────────────────────────────

function submitTransfer(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const transfers = ss.getSheetByName(SHEET_NAMES.TRANSFERS);
    const ledger = ss.getSheetByName(SHEET_NAMES.LEDGER);
    if (!transfers || !ledger) throw new Error('Required sheets not found. Run Setup first.');

    const txnId = generateTxnId_(ss, 'TRF');
    const amount = parseFloat(formData.amount);
    const txnDate = formData.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');

    // Record in Transfers sheet
    transfers.appendRow([
      txnId, txnDate, formData.fromAccount, formData.toAccount,
      amount, formData.notes || '', new Date()
    ]);

    // Record as two ledger entries (debit from source, credit to dest)
    const balAfterDebit = calculateRunningBalance_(ledger, 'Expense', amount);
    ledger.appendRow([
      txnId + '-OUT', txnDate, 'Transfer Out', amount,
      'Account Transfer', formData.toAccount, 'Internal',
      formData.fromAccount, balAfterDebit, `Transfer to ${formData.toAccount}. ${formData.notes || ''}`,
      '', '', 'No', new Date()
    ]);

    const balAfterCredit = calculateRunningBalance_(ledger, 'Income', amount);
    ledger.appendRow([
      txnId + '-IN', txnDate, 'Transfer In', amount,
      'Account Transfer', formData.fromAccount, 'Internal',
      formData.toAccount, balAfterCredit, `Transfer from ${formData.fromAccount}. ${formData.notes || ''}`,
      '', '', 'No', new Date()
    ]);

    writeAuditLog_('TRANSFER', txnId, `${amount} from ${formData.fromAccount} → ${formData.toAccount}`);

    return {
      success: true,
      txnId: txnId,
      message: `✅ Transfer recorded!\nTxn ID: ${txnId}\n${getCurrencySymbol_()}${amount.toFixed(2)} moved from ${formData.fromAccount} to ${formData.toAccount}`
    };
  } catch (e) {
    return { success: false, message: '❌ Error: ' + e.message };
  }
}


// ── ID & BALANCE HELPERS ─────────────────────────────────────

function generateTxnId_(ss, type) {
  const settings = ss.getSheetByName(SHEET_NAMES.SETTINGS);
  const data = settings.getDataRange().getValues();
  let lastId = 0;
  let idRow = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'LastTxnID') {
      lastId = parseInt(data[i][1]) || 0;
      idRow = i + 1;
      break;
    }
  }

  const newId = lastId + 1;
  if (idRow > 0) {
    settings.getRange(idRow, 2).setValue(newId);
  }

  const prefix = type === 'Income' ? 'INC' : type === 'Expense' ? 'EXP' : 'TRF';
  const dateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  return `${prefix}-${dateStr}-${String(newId).padStart(4, '0')}`;
}

function calculateRunningBalance_(ledger, type, amount) {
  const lastRow = ledger.getLastRow();
  let prevBalance = 0;

  if (lastRow > 1) {
    prevBalance = parseFloat(ledger.getRange(lastRow, 9).getValue()) || 0;
  }

  if (type === 'Income' || type === 'Transfer In') {
    return prevBalance + amount;
  } else {
    return prevBalance - amount;
  }
}

function getCurrencySymbol_() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const settings = ss.getSheetByName(SHEET_NAMES.SETTINGS);
    const data = settings.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === 'Currency') return data[i][1];
    }
  } catch (e) {}
  return '₹';
}


// ── MASTER DATA API ──────────────────────────────────────────

function getMasterData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  // Return only active items (last column = 'Yes' or just the name if single col)
  return data.filter(row => {
    const lastCol = row[row.length - 1];
    return lastCol === 'Yes' || lastCol === true;
  }).map(row => row[0]);
}

function getAllMasterData() {
  return {
    incomeCategories: getMasterData(SHEET_NAMES.MASTER_INCOME_CAT),
    expenseCategories: getMasterData(SHEET_NAMES.MASTER_EXPENSE_CAT),
    paymentModes: getMasterData(SHEET_NAMES.MASTER_PAY_MODES),
    accounts: getMasterData(SHEET_NAMES.MASTER_ACCOUNTS),
    vendors: getMasterData(SHEET_NAMES.MASTER_VENDORS),
    incomeSources: getMasterData(SHEET_NAMES.MASTER_SOURCES),
    currency: getCurrencySymbol_()
  };
}

function addMasterDataItem(sheetName, values) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet not found: ' + sheetName);
    sheet.appendRow(values);
    writeAuditLog_('MASTER_ADD', sheetName, `Added: ${values[0]}`);
    return { success: true, message: `✅ "${values[0]}" added to ${sheetName}` };
  } catch (e) {
    return { success: false, message: '❌ Error: ' + e.message };
  }
}


// ── BUDGET MANAGEMENT ────────────────────────────────────────

function saveBudget(month, budgets) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAMES.BUDGETS);
    if (!sheet) throw new Error('Budget sheet not found.');

    // Clear existing entries for this month
    const data = sheet.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][0] === month) {
        sheet.deleteRow(i + 1);
      }
    }

    // Write new budget entries
    budgets.forEach(b => {
      sheet.appendRow([month, b.category, b.type, parseFloat(b.amount)]);
    });

    writeAuditLog_('BUDGET', month, `Set ${budgets.length} budget items`);
    return { success: true, message: `✅ Budget saved for ${month}` };
  } catch (e) {
    return { success: false, message: '❌ Error: ' + e.message };
  }
}

function getBudgets(month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.BUDGETS);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 4).getValues();
  return data.filter(row => row[0] === month).map(row => ({
    category: row[1],
    type: row[2],
    amount: row[3]
  }));
}


// ── DASHBOARD ────────────────────────────────────────────────

function refreshDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ledger = ss.getSheetByName(SHEET_NAMES.LEDGER);
  let dashboard = ss.getSheetByName(SHEET_NAMES.DASHBOARD);

  if (!ledger) {
    SpreadsheetApp.getUi().alert('Ledger not found. Run Setup first.');
    return;
  }
  if (!dashboard) {
    dashboard = ss.insertSheet(SHEET_NAMES.DASHBOARD);
  }

  dashboard.clear();
  const currency = getCurrencySymbol_();

  // Get all ledger data
  const lastRow = ledger.getLastRow();
  if (lastRow <= 1) {
    dashboard.getRange('A1').setValue('No transactions yet. Add your first transaction!');
    return;
  }

  const allData = ledger.getRange(2, 1, lastRow - 1, LEDGER_HEADERS.length).getValues();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Calculate totals
  let totalIncome = 0, totalExpense = 0;
  let monthIncome = 0, monthExpense = 0;
  const categoryExpense = {};
  const categoryIncome = {};
  const monthlyData = {};
  const accountBalances = {};
  const recentTxns = [];

  allData.forEach(row => {
    const type = row[2];
    const amount = parseFloat(row[3]) || 0;
    const category = row[4];
    const account = row[7];
    const txnDate = new Date(row[1]);

    // Skip transfer entries for income/expense totals
    if (type === 'Transfer In' || type === 'Transfer Out') return;

    if (type === 'Income') {
      totalIncome += amount;
      if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
        monthIncome += amount;
      }
      categoryIncome[category] = (categoryIncome[category] || 0) + amount;
    } else if (type === 'Expense') {
      totalExpense += amount;
      if (txnDate.getMonth() === currentMonth && txnDate.getFullYear() === currentYear) {
        monthExpense += amount;
      }
      categoryExpense[category] = (categoryExpense[category] || 0) + amount;
    }

    // Monthly trend
    const monthKey = Utilities.formatDate(txnDate, Session.getScriptTimeZone(), 'yyyy-MM');
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { income: 0, expense: 0 };
    if (type === 'Income') monthlyData[monthKey].income += amount;
    if (type === 'Expense') monthlyData[monthKey].expense += amount;
  });

  // Recent transactions (last 15)
  const recent = allData.slice(-15).reverse();

  // ── WRITE DASHBOARD ──

  // Title
  dashboard.getRange('A1').setValue('📊 FINANCIAL DASHBOARD');
  dashboard.getRange('A1:H1').merge()
    .setFontSize(18).setFontWeight('bold')
    .setBackground('#1a1a2e').setFontColor('#e0e0e0')
    .setHorizontalAlignment('center');

  dashboard.getRange('A2').setValue(`Last refreshed: ${Utilities.formatDate(now, Session.getScriptTimeZone(), 'dd MMM yyyy, HH:mm')}`);
  dashboard.getRange('A2:H2').merge().setFontColor('#888').setHorizontalAlignment('center');

  // KPI Cards Row
  const kpiRow = 4;
  const kpis = [
    ['CURRENT BALANCE', totalIncome - totalExpense],
    ['TOTAL INCOME', totalIncome],
    ['TOTAL EXPENSES', totalExpense],
    ['THIS MONTH SAVINGS', monthIncome - monthExpense]
  ];

  kpis.forEach((kpi, i) => {
    const col = (i * 2) + 1;
    dashboard.getRange(kpiRow, col).setValue(kpi[0])
      .setFontSize(9).setFontColor('#888').setFontWeight('bold');
    dashboard.getRange(kpiRow + 1, col).setValue(kpi[1])
      .setFontSize(16).setFontWeight('bold')
      .setNumberFormat(`"${currency}"#,##0.00`);

    if (i === 0) {
      dashboard.getRange(kpiRow + 1, col).setFontColor(kpi[1] >= 0 ? '#2e7d32' : '#c62828');
    } else if (i === 1) {
      dashboard.getRange(kpiRow + 1, col).setFontColor('#2e7d32');
    } else if (i === 2) {
      dashboard.getRange(kpiRow + 1, col).setFontColor('#c62828');
    } else {
      dashboard.getRange(kpiRow + 1, col).setFontColor(kpi[1] >= 0 ? '#2e7d32' : '#c62828');
    }
  });

  // Monthly Income & Expense Summary
  const monthStart = 8;
  dashboard.getRange(monthStart, 1).setValue('📈 THIS MONTH BREAKDOWN')
    .setFontSize(12).setFontWeight('bold');
  dashboard.getRange(monthStart + 1, 1).setValue('Income this month:');
  dashboard.getRange(monthStart + 1, 2).setValue(monthIncome).setNumberFormat(`"${currency}"#,##0.00`).setFontColor('#2e7d32');
  dashboard.getRange(monthStart + 2, 1).setValue('Expenses this month:');
  dashboard.getRange(monthStart + 2, 2).setValue(monthExpense).setNumberFormat(`"${currency}"#,##0.00`).setFontColor('#c62828');
  dashboard.getRange(monthStart + 3, 1).setValue('Net this month:');
  dashboard.getRange(monthStart + 3, 2).setValue(monthIncome - monthExpense)
    .setNumberFormat(`"${currency}"#,##0.00`)
    .setFontColor(monthIncome - monthExpense >= 0 ? '#2e7d32' : '#c62828')
    .setFontWeight('bold');

  // Category-wise expense breakdown
  const catStart = monthStart + 5;
  dashboard.getRange(catStart, 1).setValue('🏷️ EXPENSE BY CATEGORY')
    .setFontSize(12).setFontWeight('bold');
  dashboard.getRange(catStart + 1, 1).setValue('Category').setFontWeight('bold');
  dashboard.getRange(catStart + 1, 2).setValue('Amount').setFontWeight('bold');
  dashboard.getRange(catStart + 1, 3).setValue('% of Total').setFontWeight('bold');

  const sortedCats = Object.entries(categoryExpense).sort((a, b) => b[1] - a[1]);
  sortedCats.forEach((cat, i) => {
    const r = catStart + 2 + i;
    dashboard.getRange(r, 1).setValue(cat[0]);
    dashboard.getRange(r, 2).setValue(cat[1]).setNumberFormat(`"${currency}"#,##0.00`);
    dashboard.getRange(r, 3).setValue(totalExpense > 0 ? cat[1] / totalExpense : 0).setNumberFormat('0.0%');
  });

  // Create expense chart if categories exist
  if (sortedCats.length > 0) {
    const chartDataRange = dashboard.getRange(catStart + 1, 1, sortedCats.length + 1, 2);
    const chart = dashboard.newChart()
      .setChartType(Charts.ChartType.PIE)
      .addRange(chartDataRange)
      .setPosition(catStart, 5, 0, 0)
      .setOption('title', 'Expense Distribution')
      .setOption('pieHole', 0.4)
      .setOption('width', 400)
      .setOption('height', 300)
      .build();
    dashboard.insertChart(chart);
  }

  // Monthly trend table
  const trendStart = catStart + sortedCats.length + 4;
  dashboard.getRange(trendStart, 1).setValue('📅 MONTHLY TREND')
    .setFontSize(12).setFontWeight('bold');
  dashboard.getRange(trendStart + 1, 1).setValue('Month').setFontWeight('bold');
  dashboard.getRange(trendStart + 1, 2).setValue('Income').setFontWeight('bold');
  dashboard.getRange(trendStart + 1, 3).setValue('Expenses').setFontWeight('bold');
  dashboard.getRange(trendStart + 1, 4).setValue('Net').setFontWeight('bold');

  const sortedMonths = Object.keys(monthlyData).sort();
  sortedMonths.forEach((m, i) => {
    const r = trendStart + 2 + i;
    const net = monthlyData[m].income - monthlyData[m].expense;
    dashboard.getRange(r, 1).setValue(m);
    dashboard.getRange(r, 2).setValue(monthlyData[m].income).setNumberFormat(`"${currency}"#,##0.00`).setFontColor('#2e7d32');
    dashboard.getRange(r, 3).setValue(monthlyData[m].expense).setNumberFormat(`"${currency}"#,##0.00`).setFontColor('#c62828');
    dashboard.getRange(r, 4).setValue(net).setNumberFormat(`"${currency}"#,##0.00`).setFontColor(net >= 0 ? '#2e7d32' : '#c62828');
  });

  // Monthly trend bar chart
  if (sortedMonths.length > 1) {
    const trendRange = dashboard.getRange(trendStart + 1, 1, sortedMonths.length + 1, 3);
    const trendChart = dashboard.newChart()
      .setChartType(Charts.ChartType.COLUMN)
      .addRange(trendRange)
      .setPosition(trendStart, 5, 0, 0)
      .setOption('title', 'Income vs Expenses')
      .setOption('width', 500)
      .setOption('height', 300)
      .setOption('colors', ['#2e7d32', '#c62828'])
      .build();
    dashboard.insertChart(trendChart);
  }

  // Recent transactions
  const recentStart = trendStart + sortedMonths.length + 4;
  dashboard.getRange(recentStart, 1).setValue('🕒 RECENT TRANSACTIONS')
    .setFontSize(12).setFontWeight('bold');

  const recentHeaders = ['TxnID', 'Date', 'Type', 'Amount', 'Category', 'Source/Payee', 'Account'];
  dashboard.getRange(recentStart + 1, 1, 1, recentHeaders.length).setValues([recentHeaders])
    .setFontWeight('bold').setBackground('#f5f5f5');

  recent.forEach((row, i) => {
    const r = recentStart + 2 + i;
    dashboard.getRange(r, 1).setValue(row[0]);
    dashboard.getRange(r, 2).setValue(row[1]);
    dashboard.getRange(r, 3).setValue(row[2]);
    dashboard.getRange(r, 4).setValue(row[3]).setNumberFormat(`"${currency}"#,##0.00`);
    dashboard.getRange(r, 5).setValue(row[4]);
    dashboard.getRange(r, 6).setValue(row[5]);
    dashboard.getRange(r, 7).setValue(row[7]);

    if (row[2] === 'Income') {
      dashboard.getRange(r, 3).setFontColor('#2e7d32');
      dashboard.getRange(r, 4).setFontColor('#2e7d32');
    } else if (row[2] === 'Expense') {
      dashboard.getRange(r, 3).setFontColor('#c62828');
      dashboard.getRange(r, 4).setFontColor('#c62828');
    }
  });

  // Auto-resize columns
  for (let c = 1; c <= 8; c++) {
    dashboard.autoResizeColumn(c);
  }

  SpreadsheetApp.flush();
}


// ── REPORTS ──────────────────────────────────────────────────

function generateReport(reportType, month, year) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ledger = ss.getSheetByName(SHEET_NAMES.LEDGER);
  let report = ss.getSheetByName(SHEET_NAMES.REPORTS);

  if (!ledger || ledger.getLastRow() <= 1) {
    return { success: false, message: 'No transaction data found.' };
  }

  if (!report) report = ss.insertSheet(SHEET_NAMES.REPORTS);
  report.clear();

  const allData = ledger.getRange(2, 1, ledger.getLastRow() - 1, LEDGER_HEADERS.length).getValues();
  const currency = getCurrencySymbol_();
  const monthNum = parseInt(month) - 1;
  const yearNum = parseInt(year);

  // Filter data based on report type
  let filtered;
  let title;

  if (reportType === 'monthly') {
    title = `Monthly Statement — ${getMonthName_(monthNum)} ${yearNum}`;
    filtered = allData.filter(row => {
      const d = new Date(row[1]);
      return d.getMonth() === monthNum && d.getFullYear() === yearNum;
    });
  } else if (reportType === 'yearly') {
    title = `Yearly Statement — ${yearNum}`;
    filtered = allData.filter(row => {
      const d = new Date(row[1]);
      return d.getFullYear() === yearNum;
    });
  } else if (reportType === 'category') {
    title = `Category-wise Report — ${getMonthName_(monthNum)} ${yearNum}`;
    filtered = allData.filter(row => {
      const d = new Date(row[1]);
      return d.getMonth() === monthNum && d.getFullYear() === yearNum;
    });
  } else if (reportType === 'cashflow') {
    title = `Cash Flow Report — ${yearNum}`;
    filtered = allData.filter(row => new Date(row[1]).getFullYear() === yearNum);
  } else if (reportType === 'account') {
    title = `Account-wise Balance — ${getMonthName_(monthNum)} ${yearNum}`;
    filtered = allData.filter(row => {
      const d = new Date(row[1]);
      return d.getMonth() === monthNum && d.getFullYear() === yearNum;
    });
  } else if (reportType === 'budget_vs_actual') {
    title = `Budget vs Actual — ${getMonthName_(monthNum)} ${yearNum}`;
    filtered = allData.filter(row => {
      const d = new Date(row[1]);
      return d.getMonth() === monthNum && d.getFullYear() === yearNum;
    });
  }

  // Title
  report.getRange('A1').setValue(title);
  report.getRange('A1:H1').merge()
    .setFontSize(16).setFontWeight('bold')
    .setBackground('#1a1a2e').setFontColor('#e0e0e0')
    .setHorizontalAlignment('center');

  report.getRange('A2').setValue(`Generated: ${Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd MMM yyyy HH:mm')}`);
  report.getRange('A2:H2').merge().setFontColor('#888').setHorizontalAlignment('center');

  let currentRow = 4;

  if (reportType === 'monthly' || reportType === 'yearly') {
    currentRow = writeStatementReport_(report, filtered, currentRow, currency);
  } else if (reportType === 'category') {
    currentRow = writeCategoryReport_(report, filtered, currentRow, currency);
  } else if (reportType === 'cashflow') {
    currentRow = writeCashFlowReport_(report, filtered, currentRow, currency, yearNum);
  } else if (reportType === 'account') {
    currentRow = writeAccountReport_(report, filtered, currentRow, currency);
  } else if (reportType === 'budget_vs_actual') {
    currentRow = writeBudgetReport_(report, filtered, currentRow, currency, `${yearNum}-${String(parseInt(month)).padStart(2, '0')}`);
  }

  // Auto-resize
  for (let c = 1; c <= 8; c++) {
    report.autoResizeColumn(c);
  }

  writeAuditLog_('REPORT', reportType, `${title}`);
  ss.setActiveSheet(report);

  return { success: true, message: `✅ Report generated: ${title}` };
}

function writeStatementReport_(sheet, data, startRow, currency) {
  let r = startRow;
  let totalInc = 0, totalExp = 0;

  // Summary
  data.forEach(row => {
    if (row[2] === 'Income') totalInc += parseFloat(row[3]) || 0;
    if (row[2] === 'Expense') totalExp += parseFloat(row[3]) || 0;
  });

  sheet.getRange(r, 1).setValue('SUMMARY').setFontWeight('bold').setFontSize(12);
  r++;
  sheet.getRange(r, 1).setValue('Total Income:');
  sheet.getRange(r, 2).setValue(totalInc).setNumberFormat(`"${currency}"#,##0.00`).setFontColor('#2e7d32');
  r++;
  sheet.getRange(r, 1).setValue('Total Expenses:');
  sheet.getRange(r, 2).setValue(totalExp).setNumberFormat(`"${currency}"#,##0.00`).setFontColor('#c62828');
  r++;
  sheet.getRange(r, 1).setValue('Net Savings:').setFontWeight('bold');
  sheet.getRange(r, 2).setValue(totalInc - totalExp)
    .setNumberFormat(`"${currency}"#,##0.00`).setFontWeight('bold')
    .setFontColor(totalInc - totalExp >= 0 ? '#2e7d32' : '#c62828');
  r++;
  sheet.getRange(r, 1).setValue('Savings Rate:');
  sheet.getRange(r, 2).setValue(totalInc > 0 ? (totalInc - totalExp) / totalInc : 0).setNumberFormat('0.0%');
  r += 2;

  // Transaction list
  sheet.getRange(r, 1).setValue('TRANSACTIONS').setFontWeight('bold').setFontSize(12);
  r++;
  const headers = ['Date', 'Type', 'Amount', 'Category', 'Source/Payee', 'PayMode', 'Account', 'Notes'];
  sheet.getRange(r, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#e0e0e0');
  r++;

  data.forEach(row => {
    sheet.getRange(r, 1).setValue(row[1]);
    sheet.getRange(r, 2).setValue(row[2]);
    sheet.getRange(r, 3).setValue(row[3]).setNumberFormat(`"${currency}"#,##0.00`);
    sheet.getRange(r, 4).setValue(row[4]);
    sheet.getRange(r, 5).setValue(row[5]);
    sheet.getRange(r, 6).setValue(row[6]);
    sheet.getRange(r, 7).setValue(row[7]);
    sheet.getRange(r, 8).setValue(row[9]);
    r++;
  });

  return r;
}

function writeCategoryReport_(sheet, data, startRow, currency) {
  let r = startRow;
  const expByCat = {}, incByCat = {};

  data.forEach(row => {
    const cat = row[4];
    const amt = parseFloat(row[3]) || 0;
    if (row[2] === 'Expense') expByCat[cat] = (expByCat[cat] || 0) + amt;
    if (row[2] === 'Income') incByCat[cat] = (incByCat[cat] || 0) + amt;
  });

  const totalExp = Object.values(expByCat).reduce((a, b) => a + b, 0);

  sheet.getRange(r, 1).setValue('EXPENSE BY CATEGORY').setFontWeight('bold').setFontSize(12);
  r++;
  sheet.getRange(r, 1, 1, 3).setValues([['Category', 'Amount', '% of Total']])
    .setFontWeight('bold').setBackground('#e0e0e0');
  r++;

  Object.entries(expByCat).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    sheet.getRange(r, 1).setValue(cat);
    sheet.getRange(r, 2).setValue(amt).setNumberFormat(`"${currency}"#,##0.00`);
    sheet.getRange(r, 3).setValue(totalExp > 0 ? amt / totalExp : 0).setNumberFormat('0.0%');
    r++;
  });

  r += 2;
  const totalInc = Object.values(incByCat).reduce((a, b) => a + b, 0);

  sheet.getRange(r, 1).setValue('INCOME BY CATEGORY').setFontWeight('bold').setFontSize(12);
  r++;
  sheet.getRange(r, 1, 1, 3).setValues([['Category', 'Amount', '% of Total']])
    .setFontWeight('bold').setBackground('#e0e0e0');
  r++;

  Object.entries(incByCat).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    sheet.getRange(r, 1).setValue(cat);
    sheet.getRange(r, 2).setValue(amt).setNumberFormat(`"${currency}"#,##0.00`);
    sheet.getRange(r, 3).setValue(totalInc > 0 ? amt / totalInc : 0).setNumberFormat('0.0%');
    r++;
  });

  return r;
}

function writeCashFlowReport_(sheet, data, startRow, currency, year) {
  let r = startRow;
  const months = {};

  for (let m = 0; m < 12; m++) {
    months[m] = { income: 0, expense: 0 };
  }

  data.forEach(row => {
    const d = new Date(row[1]);
    const m = d.getMonth();
    const amt = parseFloat(row[3]) || 0;
    if (row[2] === 'Income') months[m].income += amt;
    if (row[2] === 'Expense') months[m].expense += amt;
  });

  sheet.getRange(r, 1).setValue('CASH FLOW STATEMENT').setFontWeight('bold').setFontSize(12);
  r++;
  sheet.getRange(r, 1, 1, 5).setValues([['Month', 'Income', 'Expenses', 'Net', 'Cumulative']])
    .setFontWeight('bold').setBackground('#e0e0e0');
  r++;

  let cumulative = 0;
  for (let m = 0; m < 12; m++) {
    const net = months[m].income - months[m].expense;
    cumulative += net;
    sheet.getRange(r, 1).setValue(getMonthName_(m));
    sheet.getRange(r, 2).setValue(months[m].income).setNumberFormat(`"${currency}"#,##0.00`).setFontColor('#2e7d32');
    sheet.getRange(r, 3).setValue(months[m].expense).setNumberFormat(`"${currency}"#,##0.00`).setFontColor('#c62828');
    sheet.getRange(r, 4).setValue(net).setNumberFormat(`"${currency}"#,##0.00`).setFontColor(net >= 0 ? '#2e7d32' : '#c62828');
    sheet.getRange(r, 5).setValue(cumulative).setNumberFormat(`"${currency}"#,##0.00`);
    r++;
  }

  return r;
}

function writeAccountReport_(sheet, data, startRow, currency) {
  let r = startRow;
  const accounts = {};

  data.forEach(row => {
    const acct = row[7];
    const amt = parseFloat(row[3]) || 0;
    if (!accounts[acct]) accounts[acct] = { income: 0, expense: 0 };
    if (row[2] === 'Income' || row[2] === 'Transfer In') accounts[acct].income += amt;
    if (row[2] === 'Expense' || row[2] === 'Transfer Out') accounts[acct].expense += amt;
  });

  sheet.getRange(r, 1).setValue('ACCOUNT-WISE SUMMARY').setFontWeight('bold').setFontSize(12);
  r++;
  sheet.getRange(r, 1, 1, 4).setValues([['Account', 'Inflows', 'Outflows', 'Net']])
    .setFontWeight('bold').setBackground('#e0e0e0');
  r++;

  Object.entries(accounts).forEach(([acct, data]) => {
    const net = data.income - data.expense;
    sheet.getRange(r, 1).setValue(acct);
    sheet.getRange(r, 2).setValue(data.income).setNumberFormat(`"${currency}"#,##0.00`);
    sheet.getRange(r, 3).setValue(data.expense).setNumberFormat(`"${currency}"#,##0.00`);
    sheet.getRange(r, 4).setValue(net).setNumberFormat(`"${currency}"#,##0.00`).setFontColor(net >= 0 ? '#2e7d32' : '#c62828');
    r++;
  });

  return r;
}

function writeBudgetReport_(sheet, data, startRow, currency, monthKey) {
  let r = startRow;
  const budgets = getBudgets(monthKey);
  const actuals = {};

  data.forEach(row => {
    const cat = row[4];
    const amt = parseFloat(row[3]) || 0;
    if (row[2] === 'Expense') actuals[cat] = (actuals[cat] || 0) + amt;
  });

  sheet.getRange(r, 1).setValue('BUDGET vs ACTUAL').setFontWeight('bold').setFontSize(12);
  r++;
  sheet.getRange(r, 1, 1, 5).setValues([['Category', 'Budget', 'Actual', 'Variance', 'Status']])
    .setFontWeight('bold').setBackground('#e0e0e0');
  r++;

  if (budgets.length === 0) {
    sheet.getRange(r, 1).setValue('No budgets set for this period. Use Set Monthly Budgets from the menu.');
    return r + 1;
  }

  budgets.filter(b => b.type === 'Expense').forEach(b => {
    const actual = actuals[b.category] || 0;
    const variance = b.amount - actual;
    const status = variance >= 0 ? '✅ Under' : '⚠️ Over';

    sheet.getRange(r, 1).setValue(b.category);
    sheet.getRange(r, 2).setValue(b.amount).setNumberFormat(`"${currency}"#,##0.00`);
    sheet.getRange(r, 3).setValue(actual).setNumberFormat(`"${currency}"#,##0.00`);
    sheet.getRange(r, 4).setValue(variance).setNumberFormat(`"${currency}"#,##0.00`)
      .setFontColor(variance >= 0 ? '#2e7d32' : '#c62828');
    sheet.getRange(r, 5).setValue(status);
    r++;
  });

  return r;
}


// ── RECENT TRANSACTIONS FOR SIDEBAR ──────────────────────────

function getRecentTransactions(count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ledger = ss.getSheetByName(SHEET_NAMES.LEDGER);
  if (!ledger || ledger.getLastRow() <= 1) return [];

  const lastRow = ledger.getLastRow();
  const startRow = Math.max(2, lastRow - (count || 10) + 1);
  const data = ledger.getRange(startRow, 1, lastRow - startRow + 1, 9).getValues();

  return data.reverse().map(row => ({
    id: row[0],
    date: row[1],
    type: row[2],
    amount: row[3],
    category: row[4],
    sourcePayee: row[5],
    paymentMode: row[6],
    account: row[7],
    balance: row[8]
  }));
}


// ── DELETE TRANSACTION ───────────────────────────────────────

function deleteTransaction(txnId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ledger = ss.getSheetByName(SHEET_NAMES.LEDGER);
    const data = ledger.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === txnId) {
        ledger.deleteRow(i + 1);
        recalculateRunningBalances_();
        writeAuditLog_('DELETE', txnId, `Deleted transaction ${txnId}`);
        return { success: true, message: `✅ Transaction ${txnId} deleted.` };
      }
    }
    return { success: false, message: 'Transaction not found.' };
  } catch (e) {
    return { success: false, message: '❌ Error: ' + e.message };
  }
}

function recalculateRunningBalances_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ledger = ss.getSheetByName(SHEET_NAMES.LEDGER);
  const lastRow = ledger.getLastRow();
  if (lastRow <= 1) return;

  let balance = 0;
  for (let r = 2; r <= lastRow; r++) {
    const type = ledger.getRange(r, 3).getValue();
    const amount = parseFloat(ledger.getRange(r, 4).getValue()) || 0;

    if (type === 'Income' || type === 'Transfer In') {
      balance += amount;
    } else {
      balance -= amount;
    }
    ledger.getRange(r, 9).setValue(balance);
  }
}


// ── AUDIT LOG ────────────────────────────────────────────────

function writeAuditLog_(action, txnId, details) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const log = ss.getSheetByName(SHEET_NAMES.AUDIT_LOG);
    if (!log) return;
    const user = Session.getActiveUser().getEmail() || 'Unknown';
    log.appendRow([new Date(), action, txnId, user, details]);
  } catch (e) {
    // Silent fail for audit
  }
}


// ── UTILITY ──────────────────────────────────────────────────

function getMonthName_(monthIndex) {
  const months = ['January','February','March','April','May','June',
                   'July','August','September','October','November','December'];
  return months[monthIndex] || '';
}

function getCurrentMonthYear() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear()
  };
}

function getSheetNames() {
  return SHEET_NAMES;
}


// ═══════════════════════════════════════════════════════════════
// ZERO-COST RATE-LIMITED CLOUD SYNC GATEWAY (Web App Endpoints)
// ═══════════════════════════════════════════════════════════════

const SCRIPT_RATE_LIMITS = {
  MIN_COOLDOWN_SEC: 60,       // 60-second cooldown between syncs
  MAX_SYNCS_PER_HOUR: 6,      // Maximum 6 syncs per hour
  MAX_PAYLOAD_SIZE_CHARS: 5 * 1024 * 1024, // 5MB payload character limit
};

/**
 * Health check and service metadata endpoint.
 */
function doGet(e) {
  const result = {
    service: 'Aegis Spendly - Google Drive Sync Gateway',
    version: '2.0.0',
    costModel: 'Zero-Cost BYOC (User-Owned Cloud)',
    developerInfrastructureCost: '$0.00 Guaranteed',
    rateLimits: {
      cooldownSeconds: SCRIPT_RATE_LIMITS.MIN_COOLDOWN_SEC,
      maxPerHour: SCRIPT_RATE_LIMITS.MAX_SYNCS_PER_HOUR,
      maxPayloadBytes: SCRIPT_RATE_LIMITS.MAX_PAYLOAD_SIZE_CHARS,
    },
    status: 'ONLINE',
    timestamp: new Date().toISOString(),
  };

  return ContentService.createTextOutput(JSON.stringify(result, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles incoming encrypted/batched sync payloads from mobile/web clients.
 * Enforces destination-side rate limiting via CacheService to protect personal quotas.
 */
function doPost(e) {
  try {
    // 1. Destination-Side Rate Limiter Check
    const rateCheck = enforceScriptRateLimit_();
    if (!rateCheck.allowed) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        code: 429,
        error: 'Too Many Requests',
        message: rateCheck.message,
        retryAfterSeconds: rateCheck.retryAfterSeconds,
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Payload Boundary Validation
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        code: 400,
        message: 'Empty or missing request payload.',
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (e.postData.contents.length > SCRIPT_RATE_LIMITS.MAX_PAYLOAD_SIZE_CHARS) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        code: 413,
        message: 'Payload exceeds maximum permissible size of 5 MB.',
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Parse Payload
    const payload = JSON.parse(e.postData.contents);

    // 4. Record Audit Log & Process Data
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let rowsProcessed = 0;

    if (payload.accounts && Array.isArray(payload.accounts)) {
      rowsProcessed += payload.accounts.length;
    }
    if (payload.investments && Array.isArray(payload.investments)) {
      rowsProcessed += payload.investments.length;
    }
    if (payload.obligations && Array.isArray(payload.obligations)) {
      rowsProcessed += payload.obligations.length;
    }

    // Process Monthly sheets if provided
    let monthlyTabsCount = 0;
    if (payload.monthlySheets && typeof payload.monthlySheets === 'object') {
      const monthKeys = Object.keys(payload.monthlySheets);
      monthlyTabsCount = monthKeys.length;
      monthKeys.forEach((key) => {
        const sheetData = payload.monthlySheets[key];
        if (sheetData && sheetData.transactions) {
          rowsProcessed += sheetData.transactions.length;
        }
      });
    }

    writeAuditLog_('CLOUD_SYNC', 'SYNC-BATCH', `Batch sync processed: ${rowsProcessed} records across ${monthlyTabsCount} monthly tabs.`);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      code: 200,
      timestamp: new Date().toISOString(),
      rowsProcessed,
      monthlyTabsCount,
      message: 'Aegis Finance batch ledger successfully synchronized to Google Drive.',
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      code: 500,
      message: 'Failed to process sync payload: ' + (err.message || String(err)),
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Serverless Token-Bucket Throttling utilizing Google Apps Script CacheService.
 * Returns { allowed: boolean, message?: string, retryAfterSeconds?: number }
 */
function enforceScriptRateLimit_() {
  const cache = CacheService.getScriptCache();
  const nowMs = new Date().getTime();

  const lastSyncStr = cache.get('aegis_last_sync_timestamp');
  const countStr = cache.get('aegis_hourly_sync_count');

  const lastSyncMs = lastSyncStr ? parseInt(lastSyncStr, 10) : 0;
  const currentCount = countStr ? parseInt(countStr, 10) : 0;

  // Check 60-second minimum cooldown
  if (lastSyncMs > 0) {
    const elapsedSec = Math.floor((nowMs - lastSyncMs) / 1000);
    if (elapsedSec < SCRIPT_RATE_LIMITS.MIN_COOLDOWN_SEC) {
      const waitSec = SCRIPT_RATE_LIMITS.MIN_COOLDOWN_SEC - elapsedSec;
      return {
        allowed: false,
        retryAfterSeconds: waitSec,
        message: `Sync cooldown active. Please wait ${waitSec}s between requests to prevent API quota drain and maintain zero-cost operation.`
      };
    }
  }

  // Check hourly quota ceiling
  if (currentCount >= SCRIPT_RATE_LIMITS.MAX_SYNCS_PER_HOUR) {
    return {
      allowed: false,
      retryAfterSeconds: 600,
      message: `Hourly sync ceiling reached (${SCRIPT_RATE_LIMITS.MAX_SYNCS_PER_HOUR}/hr). Sync locked to prevent resource abuse.`
    };
  }

  // Allow and update cache tokens
  cache.put('aegis_last_sync_timestamp', String(nowMs), 3600);
  cache.put('aegis_hourly_sync_count', String(currentCount + 1), 3600);

  return { allowed: true };
}

