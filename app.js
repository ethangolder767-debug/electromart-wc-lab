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

  function start() {
    const status = document.getElementById('status');
    Promise.all([loadText('data/electromart.csv'), loadText('data/assumptions.csv')])
      .then(function (texts) {
        const result = CCC.analyze(CCC.parseCSV(texts[0]), CCC.parseCSV(texts[1]));
        render(result);
        status.textContent = '';
      })
      .catch(function (err) {
        status.textContent = err.message;
        status.className = 'status error';
      });
  }

  start();
})();
