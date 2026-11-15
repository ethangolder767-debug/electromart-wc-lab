---
name: pro-forma-forecast
description: Builds a pro forma forecast workbook for any company (income statement, balance sheet, bank-loan plug, covenant tests, sustainable growth rate and indirect statement of cash flows) from an opening balance sheet and a set of forecast assumptions. Use when someone asks to forecast financial statements, find how much a company must borrow and when, or test whether a plan breaks its bank covenants.
---
# Pro forma forecast

A pro forma forecast projects a company's financial statements from a set of stated assumptions. The bank loan is the "plug": the one line that makes the balance sheet balance. The finished model answers three questions: how much the company must borrow and when, whether the plan breaks its loan covenants, and whether the planned growth is more than the company can fund on its own.

## 1. Inputs to ask the user for

Collect every item below before you build. **If an input is missing, ask. Never guess.** If the user tells you to assume something, record it as their assumption. Record every input and assumption on the Assumptions tab, one per row, with a value, a unit and a note on its source (for example "case Exhibit II" or "user: assume 0%").

- **Opening balance sheet**, dated the day before the first forecast period, with every line: cash, receivables, inventory, securities, net plant, other assets, each payable and accrual, each loan split into current and long-term, common stock and retained earnings.
- **Sales forecast**: first-year sales by period, the growth rate for later years, and the forecast horizon. Also ask for sales one period past the horizon if inventory is bought ahead.
- **Seasonality**: the share of annual sales in each quarter (or month), and whether later years use the same pattern.
- **Collection timing**: the share of sales collected in the same period, the next period, and so on. Ask whether there are bad debts or a cash-sales share.
- **Purchase and payment timing**: what is bought (as a percent of which period's sales), how far ahead it is bought, and the share paid in the same period versus later.
- **Each expense rule**: for every cost line, ask whether it is a percent of sales or a fixed amount, when fixed amounts step up and by how much, and whether it is paid as incurred or accrued.
- **Capital spending**: each asset's cost, in-service date, depreciable life, salvage value and depreciation method. Also ask for depreciation on existing assets and when it ends.
- **Capex financing**: cash, the bank line, or vendor or term financing. For financing, get the payment amount, the payment schedule (when payments start), the interest rate and the term.
- **Debt terms** for each loan: rate, which balance interest is charged on, principal payments, maturity, and the size of the bank line.
- **Minimum cash balance**, and the rule for excess cash (usually: repay the bank loan first, then buy short-term securities). Also ask for the yield on those securities, even if it is 0%.
- **Tax rate**, when taxes are paid (which sets taxes payable), and how a loss is treated.
- **Dividend policy**: the amount per period and its growth, or a payout ratio.
- **Covenants**: each ratio with its limit and its exact definition (for example, whether "debt" means all liabilities), plus the line limit and any clean-up rule (the loan must be paid to zero for some period each year).
- **Lines held constant**: confirm which lines stay at opening levels (other assets, accruals, common stock, no new equity).

## 2. Workbook layout

- **Tab 1: Assumptions.** Every input from section 1 goes here, in its own labeled cell. This includes the opening balance sheet, or it goes in the first column of tab 2 with a note.
- **Tab 2: Pro forma.** One column per period, with the opening balance sheet in the first column. When the business is seasonal, use quarterly columns for at least the first year, then annual columns, plus one extra sales-only column if inventory is bought ahead. Stack these blocks top to bottom:
  1. Income statement
  2. Balance sheet
  3. Bank-loan plug (AFN, the additional funds needed)
  4. Covenant tests
  5. Sustainable growth rate (SGR)
  6. Statement of cash flows, ending with the cash-delta check
- **Every formula references the Assumptions tab. Nothing is hard-coded.** A typed number in a formula, such as `*0.22`, `4*2000`, `-13500` or a typed sales figure, is an input that is hiding. Move it to the Assumptions tab and reference it. Use absolute references, such as `Assumptions!$B$10`, so a formula can be copied across periods.
- An annual column for a year that also has quarterly columns sums the quarters for flow lines (income statement and cash flow). For balance lines it equals the last quarter.

## 3. How to forecast each line

**Income statement**
- **Variable costs** (materials, labor, commissions) = percent of the same period's sales.
- **Fixed costs** = the stated amount per period. A step-up is the previous year's amount plus the step × periods per year, with both the step and the count on the Assumptions tab.
- **Depreciation** = the sum over assets in service of cost ÷ (life × periods per year). An asset starts depreciating in the period it goes into service and stops when its life ends. Build a small schedule with one row per asset rather than a typed total.
- **Interest is charged on the opening balance** (the prior period's ending balance). This keeps the model free of circular references, because the plug changes the loan, which changes interest. For an annual column, apply the annual rate to the opening balance of the year. If a loan amortizes inside the year and the terms charge interest on each quarter's opening balance, use the average of the four quarter-start balances.
- **Interest income** on securities = opening securities × yield, even when the yield is 0%.
- **Taxes** = rate × EBT (earnings before tax). Dividends come from the stated policy. Addition to retained earnings = net income − dividends.

**Balance sheet**
- **Cash** = the minimum balance. Any excess goes to securities through the plug.
- **Receivables** = the share of each period's sales not yet collected. With 30% collected now and 70% next quarter, AR = 70% × this quarter's sales. For an annual column, use the year-end quarter: uncollected share × Q4 seasonal share × annual sales.
- **Inventory bought ahead** = the purchase percent × the next period's sales. For an annual year-end column, use next year's Q1 share × next year's sales.
- **Payables** = the unpaid share × this period's purchases.
- **Net plant** = prior net plant + capex in service this period − depreciation.
- **Retained earnings** = prior retained earnings + addition to retained earnings. Lines held constant equal the prior period.
- **Term loans: split current and long-term from one total.** The total balance = prior total + new borrowing − principal paid. The current portion = MIN(the next 12 months of scheduled principal, the total). Long-term = total − current. Never let either portion go negative. If a new loan starts mid-year, count only the payments that fall in the next 12 months.

## 4. The bank loan plug

Build it in its own block, below the balance sheet, in every column:

```
Trial assets       = every asset EXCEPT excess-cash securities
Trial liab. + eq.  = every liability and equity line EXCEPT the bank loan
AFN                = Trial assets − Trial liab. + eq.
Bank loan          = MAX(0, AFN)
Securities         = MAX(0, −AFN)
```

- **Never build the plug from the total rows.** The totals include the bank loan and the securities, so using them makes a circular reference or a wrong plug. List each line in the trial sums.
- When a balance sheet line is added, add it to the matching trial sum. A line missing from a trial sum shows up as a balance check failure.
- The loan is capped by nothing in the formula. The line limit is tested as a covenant, so a shortfall shows up instead of being hidden.

## 5. Statement of cash flows (indirect method)

Every line is **this period minus the prior period** of a balance sheet line, or comes straight from the income statement:

- **Operating:** net income, + depreciation, + the increase in each payable and accrual, − the increase in each receivable and inventory line.
- **Investing:** − capex = −(net plant this period − net plant prior + depreciation), and − the increase in securities.
- **Financing:** + the increase in the bank loan, + the increase in each term loan (current + long-term together), + the increase in common stock, − dividends.
- **Net change in cash** = operating + investing + financing. Then show ending cash − beginning cash, and **cash delta** = net change − the change in the balance-sheet cash line.
- **The annual total column sums the quarters**, line by line. Its beginning cash is the opening balance sheet's cash, not Q4's.

## 6. Covenant tests and sustainable growth rate

**Covenants**, tested in every column with each limit referenced from Assumptions:
- Each ratio uses the bank's definition. For example, when the bank counts all liabilities as debt, debt/equity = total liabilities ÷ (common stock + retained earnings).
- Line limit: bank loan ≤ line → "Yes"/"No".
- **Clean-up**: in a year with quarterly columns, it passes if MIN(that year's quarterly loan balances) = 0. In an annual-only column, a zero year-end balance doesn't prove the loan reached zero during the year. Label the result "year-end only" or add quarterly columns.

**Sustainable growth rate**, for each annual column:
- M (margin) = net income ÷ sales
- T (turnover) = sales ÷ ending total assets
- LEV (leverage) = ending total assets ÷ **beginning** equity
- R (retention) = 1 − dividends ÷ net income
- SGR = M × T × LEV × R. Show the planned growth rate beside it.

## 7. Checks to run before finishing

Recalculate the workbook (for example, `soffice --headless --convert-to xlsx`, then read the values), then confirm all three:

1. **Total assets = total liabilities + equity in every column**, to within rounding (|difference| < 0.01).
2. **Cash delta = 0 in every column**, including the annual total columns.
3. **The opening-period AFN equals the actual bank loan on the opening balance sheet.** If it doesn't, a line is missing from a trial sum or the opening balance sheet was entered wrong.

Also scan every formula for hard-coded numbers (anything other than 0, 1, or a reference to Assumptions). **If any check fails, find and fix the cause. Never adjust a number, add a balancing entry or override a cell to force a pass.** Report what was wrong and what you changed.

## 8. What to report

- **Peak borrowing**: the largest bank loan balance, the period it occurs in, and how close it comes to the line. Name the driver, for example the seasonal receivables and inventory buildup or a capex payment.
- **Covenant breaches**: each ratio and period that fails, the value against the limit, and the cause in plain words. Include the clean-up test, and say when it can only be tested at year-end.
- **SGR vs. planned growth**: for each year, whether planned growth is above SGR. If it is, the gap must come from more borrowing, new equity, a lower payout or better margins or turnover.
- **Assumptions that drive the result**: the two or three inputs that move peak borrowing most, and any input the user told you to assume.

## Example (SG Electronics, a quarterly-then-annual model, 20x1–20x5)

The example is for illustration only. The rules are in the sections above.

- Sales of $1,510,000 in 20x1 are split 22/32/26/20% by quarter and grow 8% a year after that.
- AR is 70% of the quarter's sales. Materials (45% of sales) are bought one quarter ahead, with half paid in the quarter.
- Interest is charged at 10.75% on the opening bank loan.
- The opening AFN is $1,201,500 − $1,170,500 = $31,000, which matches the bank loan on the books.
- Borrowing peaks at $141,479 in Q2 20x1, inside the $150,000 line.
- Total liabilities ÷ equity is 0.81 in Q2 and 0.65 in Q3 20x1, against a 0.60 limit. The cause is the Q2 sales peak plus the new equipment loan.
- The loan never reaches zero, so the clean-up test fails every year.
- SGR is 4–6% against 8% planned growth.
