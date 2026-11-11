// ccc.js — the finance math for the ElectroMart CCC app.
// These are plain functions that never touch the page, so they can be
// checked with Node: node -e "const c = require('./ccc.js'); ..."
// Nothing is rounded here. Rounding happens only when numbers are displayed.

(function (root) {
  'use strict';

  // Turn CSV text into an array of objects keyed by the header row.
  // Handles quoted fields so a note with a comma in it won't break a row.
  function parseCSV(text) {
    const rows = [];
    let field = '';
    let row = [];
    let inQuotes = false;
    const s = String(text).replace(/^﻿/, '');
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (inQuotes) {
        if (ch === '"' && s[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { field += ch; }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field); field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && s[i + 1] === '\n') i++;
        row.push(field); field = '';
        if (row.some(function (f) { return f.trim() !== ''; })) rows.push(row);
        row = [];
      } else {
        field += ch;
      }
    }
    row.push(field);
    if (row.some(function (f) { return f.trim() !== ''; })) rows.push(row);

    if (rows.length === 0) return [];
    const header = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      const obj = {};
      header.forEach(function (h, j) { obj[h] = (r[j] || '').trim(); });
      return obj;
    });
  }

  // Build { before: {item: value}, after: {item: value}, sections: {item: section} }
  // from the rows of a statements CSV (section,item,before,after).
  function readStatements(rows) {
    const out = { before: {}, after: {}, sections: {} };
    rows.forEach(function (r) {
      out.before[r.item] = Number(r.before);
      out.after[r.item] = Number(r.after);
      out.sections[r.item] = r.section;
    });
    const needed = ['revenue', 'cogs', 'accounts_receivable', 'inventory', 'accounts_payable'];
    needed.forEach(function (item) {
      if (!(item in out.before) || !isFinite(out.before[item]) || !isFinite(out.after[item])) {
        throw new Error('The statements file is missing a number for "' + item + '".');
      }
    });
    return out;
  }

  // Build { days_in_year: 365, bank_rate: 0.08, ... } from assumptions.csv.
  function readAssumptions(rows) {
    const out = {};
    rows.forEach(function (r) { out[r.assumption] = Number(r.value); });
    if (!isFinite(out.days_in_year) || out.days_in_year <= 0) {
      throw new Error('assumptions.csv needs a positive days_in_year.');
    }
    return out;
  }

  // Days inventory outstanding = Inventory / COGS × days in year
  function dio(inventory, cogs, daysInYear) { return inventory / cogs * daysInYear; }

  // Days sales outstanding = Accounts receivable / Revenue × days in year (all sales on credit)
  function dso(receivables, revenue, daysInYear) { return receivables / revenue * daysInYear; }

  // Days payables outstanding = Accounts payable / COGS × days in year (purchases = COGS)
  function dpo(payables, cogs, daysInYear) { return payables / cogs * daysInYear; }

  // Cash conversion cycle = DIO + DSO − DPO
  function ccc(dioDays, dsoDays, dpoDays) { return dioDays + dsoDays - dpoDays; }

  // All four day counts for one period's statements.
  function periodDays(p, daysInYear) {
    const d = {
      dio: dio(p.inventory, p.cogs, daysInYear),
      dso: dso(p.accounts_receivable, p.revenue, daysInYear),
      dpo: dpo(p.accounts_payable, p.cogs, daysInYear)
    };
    d.ccc = ccc(d.dio, d.dso, d.dpo);
    return d;
  }

  // Cash freed by each lever, from the balance sheet change.
  // A drop in an asset frees cash; a rise in accounts payable frees cash.
  // The check column recomputes each one as days changed × annual COGS (or revenue) / days in year.
  function cashFreed(before, after, daysInYear) {
    const b = periodDays(before, daysInYear);
    const a = periodDays(after, daysInYear);
    const levers = {
      inventory: {
        fromBalances: before.inventory - after.inventory,
        fromDays: (b.dio - a.dio) * before.cogs / daysInYear
      },
      receivables: {
        fromBalances: before.accounts_receivable - after.accounts_receivable,
        fromDays: (b.dso - a.dso) * before.revenue / daysInYear
      },
      payables: {
        fromBalances: after.accounts_payable - before.accounts_payable,
        fromDays: (a.dpo - b.dpo) * before.cogs / daysInYear
      }
    };
    levers.total = {
      fromBalances: levers.inventory.fromBalances + levers.receivables.fromBalances + levers.payables.fromBalances,
      fromDays: levers.inventory.fromDays + levers.receivables.fromDays + levers.payables.fromDays
    };
    return levers;
  }

  // Everything the page needs, from the two parsed CSV files.
  function analyze(statementRows, assumptionRows) {
    const st = readStatements(statementRows);
    const as = readAssumptions(assumptionRows);
    const n = as.days_in_year;
    return {
      assumptions: as,
      statements: st,
      before: periodDays(st.before, n),
      after: periodDays(st.after, n),
      cashFreed: cashFreed(st.before, st.after, n)
    };
  }

  const api = {
    parseCSV: parseCSV,
    readStatements: readStatements,
    readAssumptions: readAssumptions,
    dio: dio,
    dso: dso,
    dpo: dpo,
    ccc: ccc,
    periodDays: periodDays,
    cashFreed: cashFreed,
    analyze: analyze
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CCC = api;
})(this);
