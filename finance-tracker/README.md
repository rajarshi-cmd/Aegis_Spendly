# Personal Finance Tracker — Google Sheets Mini-ERP

A complete, form-driven personal finance management system built entirely within Google Sheets and Google Apps Script. No external dependencies, no add-ons — just your spreadsheet.

---

## What You Get

- **Sidebar forms** for all data entry (no manual sheet editing)
- **Auto-generated transaction IDs** and running balance
- **13 sheets** created automatically (ledger, dashboard, reports, budgets, transfers, audit log, 6 master data sheets, settings)
- **6 report types** (monthly, yearly, category, cash flow, account-wise, budget vs actual)
- **Dashboard** with KPIs, charts, category breakdown, monthly trends, and recent transactions
- **Account transfers** with double-entry tracking
- **Budget management** with variance analysis
- **Full audit log** of every action
- **Tags & projects** for cross-category grouping

---

## Quick Start — Deployment Guide

### Step 1: Create the Spreadsheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new blank spreadsheet.
2. Name it something like **"Personal Finance Tracker"**.

### Step 2: Open the Script Editor

1. In your spreadsheet, go to **Extensions → Apps Script**.
2. This opens the Apps Script editor in a new tab.

### Step 3: Add the Code Files

The script editor starts with a default `Code.gs` file.

**For Code.gs:**
1. Click on the existing `Code.gs` file in the left sidebar.
2. Delete all the default content.
3. Copy and paste the entire contents of the provided `Code.gs` file.

**For each HTML file** (TransactionForm, TransferForm, MasterDataForm, BudgetForm, ReportForm, Help):
1. Click the **+** button next to "Files" in the left sidebar.
2. Select **HTML**.
3. Name the file exactly as listed (without the `.html` extension — Apps Script adds it automatically):
   - `TransactionForm`
   - `TransferForm`
   - `MasterDataForm`
   - `BudgetForm`
   - `ReportForm`
   - `Help`
4. Paste the contents of the corresponding `.html` file.

You should end up with **7 files** in total in the editor:
```
Code.gs
TransactionForm.html
TransferForm.html
MasterDataForm.html
BudgetForm.html
ReportForm.html
Help.html
```

### Step 4: Save and Authorize

1. Click **💾 Save** (or Ctrl+S / Cmd+S).
2. Go back to your spreadsheet and **reload the page** (F5).
3. After a few seconds, a new menu item **💰 Finance Tracker** will appear in the menu bar.
4. Click **💰 Finance Tracker → ⚙️ Setup → 🏗️ Initialize All Sheets**.
5. Google will ask you to **authorize** the script:
   - Click "Continue"
   - Choose your Google account
   - Click "Advanced" → "Go to (project name) (unsafe)" (this is normal for custom scripts)
   - Click "Allow"
6. Run the Initialize command again after authorization completes.

### Step 5: Start Using

You're done! Use the **💰 Finance Tracker** menu for everything:
- **➕ New Transaction** — record income or expenses
- **🔄 Transfer Between Accounts** — move money between accounts
- **📊 Refresh Dashboard** — update your financial overview
- **📋 Generate Monthly Report** — create detailed reports
- **⚙️ Setup** — manage categories, accounts, budgets

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    USER INTERFACE                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Txn Form │ │ Transfer │ │ Master   │ │ Budget /  │  │
│  │ (Income/ │ │ Form     │ │ Data Mgr │ │ Report    │  │
│  │ Expense) │ │          │ │          │ │ Forms     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬──────┘  │
│       │             │            │             │         │
├───────┴─────────────┴────────────┴─────────────┴────────┤
│                 APPS SCRIPT ENGINE                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Code.gs                                         │    │
│  │  • submitTransaction()   • generateReport()     │    │
│  │  • submitTransfer()      • refreshDashboard()   │    │
│  │  • addMasterDataItem()   • saveBudget()         │    │
│  │  • writeAuditLog_()      • generateTxnId_()     │    │
│  └─────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────┤
│                   DATA LAYER (Sheets)                    │
│                                                         │
│  CORE                  MASTER DATA         ANALYSIS     │
│  ┌──────────┐          ┌──────────────┐   ┌──────────┐ │
│  │ Ledger   │          │ M_IncomeCat  │   │Dashboard │ │
│  │ Transfers│          │ M_ExpenseCat │   │Reports   │ │
│  │ AuditLog │          │ M_PayModes   │   │Budgets   │ │
│  │ Settings │          │ M_Accounts   │   └──────────┘ │
│  └──────────┘          │ M_Vendors    │                 │
│                        │ M_Sources    │                 │
│                        └──────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

### Sheet Descriptions

| Sheet | Purpose |
|-------|---------|
| **Ledger** | Every transaction (income, expense, transfer) in chronological order with running balance |
| **Transfers** | Dedicated log of account-to-account transfers |
| **AuditLog** | Timestamped record of every user action (add, delete, report generation, etc.) |
| **Settings** | Configuration: currency symbol, date format, last transaction ID counter |
| **Dashboard** | Auto-generated financial overview with KPIs, charts, and recent transactions |
| **Reports** | Output sheet for generated reports (overwritten each time) |
| **Budgets** | Monthly budget targets by expense category |
| **M_IncomeCategories** | Income category master list |
| **M_ExpenseCategories** | Expense category master list |
| **M_PaymentModes** | Payment method master list |
| **M_Accounts** | Bank accounts, wallets, and credit cards with types |
| **M_Vendors** | Payees/vendors with default categories |
| **M_IncomeSources** | Income sources (employer, clients, etc.) |

### Ledger Columns

| Column | Description |
|--------|-------------|
| TxnID | Auto-generated: `INC-20260806-0001`, `EXP-20260806-0002`, `TRF-20260806-0003` |
| Date | Transaction date |
| Type | Income, Expense, Transfer In, Transfer Out |
| Amount | Transaction amount |
| Category | From master data |
| Source/Payee | Who paid you or who you paid |
| PaymentMode | Cash, UPI, Card, etc. |
| Account | Which account/wallet was used |
| RunningBalance | Cumulative balance after this transaction |
| Notes | Free-text notes |
| Tags | Comma-separated tags for cross-category grouping |
| Project | Optional project name |
| Recurring | Yes/No flag |
| Timestamp | When the entry was created (server time) |

---

## Features in Detail

### Transaction Entry
- Tabbed sidebar: switch between Income and Expense
- Large, color-coded amount field (green for income, red for expense)
- Dropdowns auto-populated from master data
- Tags for grouping (e.g., tag a trip's food + hotel + transport)
- Project field for work-related tracking
- Recurring flag for regular payments
- Recent transactions feed at the bottom
- Confirmation message with TxnID and updated balance

### Account Transfers
- Separate form for moving money between accounts
- Creates paired ledger entries (Transfer Out + Transfer In)
- Net-zero impact on overall balance
- Logged in both Ledger and Transfers sheets

### Dashboard (auto-generated)
- **KPIs**: Current balance, total income, total expenses, this month's savings
- **Monthly breakdown**: Income, expenses, and net for current month
- **Category pie chart**: Visual expense distribution
- **Monthly trend**: Bar chart of income vs expenses over time
- **Recent transactions**: Last 15 entries, color-coded

### Reports
| Report | What It Shows |
|--------|---------------|
| Monthly Statement | Summary + full transaction list for a month |
| Yearly Statement | Annual summary + all transactions |
| Category-wise | Expense and income broken down by category with percentages |
| Cash Flow | 12-month view: income, expenses, net, cumulative |
| Account-wise | Inflows/outflows/net per account |
| Budget vs Actual | Budgeted amount vs actual spending with over/under flags |

### Budget Management
- Set monthly spending limits by expense category
- Compare against actual spending via Budget vs Actual report
- Visual indicators: ✅ Under budget / ⚠️ Over budget

### Audit Log
Every action is automatically logged:
- Transaction additions and deletions
- Transfers
- Report generation
- Master data changes
- App initialization

---

## Customization Guide

### Change Currency
1. Go to the **Settings** sheet.
2. Find the row with Key = `Currency`.
3. Change the Value from `₹` to your currency symbol (`$`, `€`, `£`, etc.).

### Add Categories / Accounts / Vendors
**Option A (Recommended):** Use **💰 Finance Tracker → ⚙️ Setup → Manage Master Data**.

**Option B (Direct):** Edit the master sheets directly:
- Add a new row with the item name and `Yes` in the Active column.
- To deactivate an item (hide from dropdowns without deleting): change `Yes` to `No`.

### Add Opening Balances
1. Go to the **M_Accounts** sheet.
2. Set the `OpeningBalance` column for each account.
3. Note: The ledger's running balance starts from zero and calculates from transactions. To set an initial balance, record an "Income" transaction for each account with category "Opening Balance" (add this category first via Master Data).

### Customize Default Categories
Edit the respective M_ sheets directly, or delete all rows and re-enter your own before you start adding transactions.

### Printing Reports
1. Generate the report you need.
2. Go to the **Reports** sheet.
3. Use **File → Print** (or Ctrl+P) to print or save as PDF.
4. Adjust print settings: Landscape orientation recommended, fit to width.

---

## FAQ

**Q: Can I edit the Ledger directly?**
A: You can, but it's not recommended. Use the sidebar forms to maintain data integrity and audit trails. If you must edit, avoid changing TxnIDs or the running balance column.

**Q: What happens if I delete a transaction?**
A: Currently, deletion is available via Apps Script. The running balances will be recalculated automatically. Future versions could add a "Delete" button in the sidebar.

**Q: Can multiple people use this?**
A: Yes — share the spreadsheet with collaborators. The audit log tracks which user performed each action. Note that concurrent form submissions may occasionally conflict; the system handles this gracefully.

**Q: How do I back up my data?**
A: Google Sheets auto-saves and maintains version history (File → Version history). For additional backups, periodically download as Excel via File → Download → Microsoft Excel.

**Q: Can I add more reports?**
A: Yes — add new report types by creating a new function in Code.gs following the pattern of existing report writers (e.g., `writeStatementReport_`), then add the option to `ReportForm.html`.

---

## File Reference

| File | Type | Purpose |
|------|------|---------|
| `Code.gs` | Server Script | All backend logic |
| `TransactionForm.html` | Sidebar UI | Income/Expense entry |
| `TransferForm.html` | Sidebar UI | Account transfers |
| `MasterDataForm.html` | Sidebar UI | Category/account management |
| `BudgetForm.html` | Sidebar UI | Monthly budget setting |
| `ReportForm.html` | Sidebar UI | Report generation |
| `Help.html` | Sidebar UI | In-app documentation |

---

## Limitations & Future Enhancements

**Current limitations:**
- Reports sheet is overwritten with each new report (save/print before generating another)
- No attachment/receipt upload (Google Forms limitation in sidebar context)
- No recurring transaction auto-creation (flag exists but processing is manual)

**Possible enhancements to add later:**
- Time-triggered recurring transaction processing
- Email report delivery
- Multi-currency support with exchange rates
- Google Form integration for mobile-first entry
- Data export to CSV/Excel
- Advanced analytics with pivot-table-based views
- Receipt image storage via Google Drive integration

---

## License

This is a personal tool. Use, modify, and share freely.
