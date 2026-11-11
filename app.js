// app.js — loads the CSV files and puts the results on the page.
// All the math lives in ccc.js (window.CCC).

(function () {
  'use strict';

  const fmtDays = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtDollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  function days(x) { return fmtDays.format(x); }
  function signedDays(x) { return (x > 0 ? '+' : '') + fmtDays.format(x); }
  function dollars(x) { return fmtDollars.format(Math.round(x) || 0); }

  function cell(tag, html) {
    const el = document.createElement(tag);
    el.innerHTML = html;
    return el;
  }

  function row(cells, className) {
    const tr = document.createElement('tr');
    if (className) tr.className = className;
    cells.forEach(function (c, i) { tr.appendChild(cell(i === 0 ? 'th' : 'td', c)); });
    tr.firstChild.setAttribute('scope', 'row');
    return tr;
  }

  function loadText(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error('Could not load ' + path + ' (' + r.status + ').');
      return r.text();
    });
  }

  function render(result) {
    const b = result.before;
    const a = result.after;
    const n = result.assumptions.days_in_year;

    const daysBody = document.querySelector('#days-table tbody');
    daysBody.innerHTML = '';
    [
      ['DIO<span class="term">Days inventory outstanding</span>', 'dio'],
      ['DSO<span class="term">Days sales outstanding</span>', 'dso'],
      ['DPO<span class="term">Days payables outstanding</span>', 'dpo']
    ].forEach(function (r) {
      daysBody.appendChild(row([r[0], days(b[r[1]]), days(a[r[1]]), signedDays(a[r[1]] - b[r[1]])]));
    });
    daysBody.appendChild(row(
      ['CCC<span class="term">DIO + DSO − DPO</span>', days(b.ccc), days(a.ccc), signedDays(a.ccc - b.ccc)],
      'total'
    ));
    document.getElementById('days-note').textContent =
      'Uses a ' + n + '-day year from assumptions.csv. Days are shown to two decimals; nothing is rounded before that.';

    const cf = result.cashFreed;
    const cashBody = document.querySelector('#cash-table tbody');
    cashBody.innerHTML = '';
    [
      ['Inventory<span class="term">Before − After inventory</span>', 'inventory'],
      ['Receivables<span class="term">Before − After receivables</span>', 'receivables'],
      ['Payables<span class="term">After − Before payables</span>', 'payables']
    ].forEach(function (r) {
      cashBody.appendChild(row([r[0], dollars(cf[r[1]].fromBalances), dollars(cf[r[1]].fromDays)]));
    });
    const foot = document.querySelector('#cash-table tfoot');
    foot.innerHTML = '';
    foot.appendChild(row(['Total cash freed', dollars(cf.total.fromBalances), dollars(cf.total.fromDays)]));
  }

  // ---- Levers -------------------------------------------------------------

  const fmtPct = new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const KEYS = ['dio', 'dso', 'dpo'];
  let model = null;      // result of CCC.analyze
  let leverDays = null;  // exact lever values; sliders only display them

  function signedDollars(x) {
    const r = Math.round(x) || 0;
    return '<span class="' + (r < 0 ? 'neg' : '') + '">' + dollars(r) + '</span>';
  }

  // Slider range: 0 to about twice the larger of Before and After, in whole tens.
  function setupSliders() {
    KEYS.forEach(function (k) {
      const slider = document.getElementById(k + '-slider');
      let top = Math.max(model.before[k], model.after[k]);
      if (k === 'dpo') top = Math.max(top, model.assumptions.net_days || 0);
      slider.max = String(Math.max(10, Math.ceil(top * 2 / 10) * 10));
      slider.addEventListener('input', function () {
        leverDays[k] = Number(slider.value);
        renderLevers(false);
      });
    });
    document.getElementById('set-before').addEventListener('click', function () { setLevers(model.before); });
    document.getElementById('set-after').addEventListener('click', function () { setLevers(model.after); });
  }

  function setLevers(period) {
    leverDays = { dio: period.dio, dso: period.dso, dpo: period.dpo };
    renderLevers(true);
  }

  function renderLevers(moveSliders) {
    const as = model.assumptions;
    const before = model.statements.before;
    const s = CCC.scenario(leverDays, before, as);

    KEYS.forEach(function (k) {
      const slider = document.getElementById(k + '-slider');
      if (moveSliders) {
        if (leverDays[k] > Number(slider.max)) slider.max = String(Math.ceil(leverDays[k] / 10) * 10);
        slider.value = String(leverDays[k]);
      }
      document.getElementById(k + '-val').textContent = days(leverDays[k]) + ' days';
    });

    document.getElementById('lever-ccc').textContent = days(s.ccc) + ' days';
    document.getElementById('lever-ccc-change').textContent =
      signedDays(s.ccc - model.before.ccc) + ' days vs Before (' + days(model.before.ccc) + ')';

    const body = document.querySelector('#lever-table tbody');
    body.innerHTML = '';
    [
      ['Inventory', 'inventory', 'inventory'],
      ['Receivables', 'accounts_receivable', 'receivables'],
      ['Payables', 'accounts_payable', 'payables']
    ].forEach(function (r) {
      body.appendChild(row([r[0], dollars(before[r[1]]), dollars(s.balances[r[1]]), signedDollars(s.cashFreed[r[2]])]));
    });
    const foot = document.querySelector('#lever-table tfoot');
    foot.innerHTML = '';
    foot.appendChild(row(['Total cash freed', '', '', signedDollars(s.cashFreed.total)]));

    document.getElementById('interest').innerHTML = signedDollars(s.interestSaved);
    document.getElementById('interest-note').textContent =
      'Assumes every freed dollar pays down the bank line (Before ' + dollars(before.notes_payable || 0) +
      ') at ' + fmtPct.format(as.bank_rate) + '. ' +
      (s.interestCapped ? 'Capped: cash freed is more than the bank line. ' : '') +
      (s.cashFreed.total < 0 ? 'Negative: ElectroMart must borrow more. ' : '') +
      'The case’s After balance sheet shows part of the cash was kept, not used to repay the bank.';

    document.getElementById('past-due').textContent = days(s.daysPastDue) + ' days';
    document.getElementById('past-due-note').textContent =
      'DPO − ' + as.net_days + ' net days, never below zero';

    const pctDisc = fmtPct.format(as.supplier_discount);
    if (s.discountCost === null) {
      document.getElementById('discount').textContent = 'Takes discount';
      document.getElementById('discount-note').textContent =
        'DPO is within the ' + as.discount_days + '-day discount period, so ElectroMart takes the ' + pctDisc + ' discount';
    } else {
      document.getElementById('discount').textContent = fmtPct.format(s.discountCost);
      document.getElementById('discount-note').textContent =
        'Nominal annual rate: ' + pctDisc + ' / (1 − ' + pctDisc + ') × ' + as.days_in_year +
        ' / (DPO − ' + as.discount_days + ')';
    }
  }

  function start() {
    const status = document.getElementById('status');
    Promise.all([loadText('data/electromart.csv'), loadText('data/assumptions.csv')])
      .then(function (texts) {
        const result = CCC.analyze(CCC.parseCSV(texts[0]), CCC.parseCSV(texts[1]));
        render(result);
        model = result;
        setupSliders();
        setLevers(model.before);
        status.textContent = '';
      })
      .catch(function (err) {
        status.textContent = err.message;
        status.className = 'status error';
      });
  }

  start();
})();
