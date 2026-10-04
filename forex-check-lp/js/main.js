(() => {
  'use strict';
  const API = 'https://api.frankfurter.dev/v2/providers/ecb/rates';
  const currencies = { USD: ['米ドル', '$'], EUR: ['ユーロ', '€'], GBP: ['英ポンド', '£'], AUD: ['豪ドル', 'A$'] };
  const $ = (id) => document.getElementById(id);
  const number = (n, digits = 2) => n.toLocaleString('ja-JP', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const dateLabel = (date) => date.replaceAll('-', '/');
  let selected = 'USD';
  let days = 30;
  let rates = null;
  let direction = 'to-foreign';
  const amounts = { 'to-foreign': '10000', 'to-yen': '100' };
  let chartController;
  let chartVersion = 0;

  // 中途半端な応答や不正な値も取得失敗として扱う。代替の架空レートは使わない。
  async function fetchRates(params, signal) {
    const response = await fetch(`${API}?${new URLSearchParams(params)}`, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length || !rows.every((row) =>
      /^\d{4}-\d{2}-\d{2}$/.test(row.date) && typeof row.rate === 'number' && Number.isFinite(row.rate) && row.rate > 0
    )) throw new Error('Invalid response');
    return rows;
  }

  function renderCards() {
    $('rate-cards').innerHTML = Object.entries(currencies).map(([code, [name, symbol]]) => `
      <button type="button" class="rate-card" data-currency="${code}" aria-pressed="${selected === code}" aria-label="${name}を選択">
        <span class="currency-name"><span class="currency-icon" aria-hidden="true">${symbol}</span><b>${code}</b> ${name}</span>
        <div class="rate-value">${rates ? number(rates[code].rate) : '—'}<small>円</small></div>
        <span class="card-date">${rates ? `基準日 ${dateLabel(rates[code].date)}` : 'レート未取得'}</span>
      </button>`).join('');
  }

  function convert() {
    const input = $('amount');
    const toForeign = direction === 'to-foreign';
    const outputCurrency = toForeign ? selected : 'JPY';
    $('amount-label').textContent = toForeign ? '換算する金額（日本円）' : `換算する金額（${selected}）`;
    $('currency').setAttribute('aria-label', toForeign ? '換算先の外貨' : '換算する外貨');
    $('result-label').textContent = toForeign ? '外貨の目安' : '日本円の目安';
    $('conversion-description').textContent = toForeign ? '日本円の金額から、外貨の目安を確認。' : '外貨の金額から、日本円の目安を確認。';
    const amount = input.valueAsNumber;
    if (input.value === '' || !Number.isFinite(amount) || amount < 0 || amount > 1e9) {
      $('conversion').textContent = `— ${outputCurrency}`;
      $('conversion-rate').textContent = '0〜1,000,000,000の金額を入力してください';
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    input.removeAttribute('aria-invalid');
    if (!rates) {
      $('conversion').textContent = `— ${outputCurrency}`;
      $('conversion-rate').textContent = 'レート取得後に換算できます';
      return;
    }
    const result = toForeign ? amount / rates[selected].rate : amount * rates[selected].rate;
    $('conversion').innerHTML = `${number(result)}<small> ${outputCurrency}</small>`;
    $('conversion-rate').textContent = `1 ${selected} = ${number(rates[selected].rate, 4)} 円 · ${dateLabel(rates[selected].date)} 基準`;
  }

  async function loadLatest() {
    $('refresh').disabled = true;
    $('rate-cards').setAttribute('aria-busy', 'true');
    $('rate-status').classList.remove('error');
    $('rate-status').textContent = '参考レートを読み込んでいます…';
    rates = null;
    renderCards();
    convert();
    $('rate-date').textContent = '基準日を確認中';
    try {
      const rows = await fetchRates({ base: 'EUR', quotes: 'JPY,USD,GBP,AUD' });
      const byQuote = Object.fromEntries(rows.map((row) => [row.quote, row]));
      if (!['JPY', 'USD', 'GBP', 'AUD'].every((code) => byQuote[code]?.base === 'EUR' && byQuote[code].date === byQuote.JPY.date)) throw new Error('Missing currencies');
      // ECBの対ユーロ値から対円クロスレートを計算。
      rates = Object.fromEntries(Object.keys(currencies).map((code) => [code, {
        rate: byQuote.JPY.rate / (code === 'EUR' ? 1 : byQuote[code].rate), date: byQuote.JPY.date,
      }]));
      $('rate-date').textContent = `基準日 ${dateLabel(byQuote.JPY.date)}`;
      $('rate-status').textContent = '公表済みの最新の日次レートです。通貨を選ぶと、換算とグラフが切り替わります。';
    } catch {
      $('rate-date').textContent = '基準日：取得できませんでした';
      $('rate-status').textContent = 'レートを取得できませんでした。通信環境を確認し、「データを再取得」をお試しください。';
      $('rate-status').classList.add('error');
    } finally {
      renderCards();
      convert();
      $('rate-cards').setAttribute('aria-busy', 'false');
      $('refresh').disabled = false;
    }
  }

  function drawChart(rows) {
    const first = rows[0], last = rows.at(-1);
    const values = rows.map((row) => row.rate);
    const low = Math.min(...values), high = Math.max(...values);
    const padding = Math.max((high - low) * .18, .1);
    const min = low - padding, max = high + padding;
    const width = 560, height = 215, left = 45, right = 540, top = 14, bottom = 185;
    const start = Date.parse(first.date), end = Date.parse(last.date);
    const x = (date) => left + (Date.parse(date) - start) / (end - start || 1) * (right - left);
    const y = (value) => bottom - (value - min) / (max - min) * (bottom - top);
    const points = rows.map((row) => `${x(row.date).toFixed(2)},${y(row.rate).toFixed(2)}`).join(' ');
    const grid = [0, 1, 2, 3].map((i) => {
      const value = min + (max - min) * i / 3;
      return `<line x1="${left}" y1="${y(value)}" x2="${right}" y2="${y(value)}" stroke="#e5e9df" stroke-dasharray="3 4"/><text x="0" y="${y(value) + 4}" fill="#68766e" font-size="10">${value.toFixed(1)}</text>`;
    }).join('');
    $('chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="svg-title svg-description"><title id="svg-title">${currencies[selected][0]} / 円の日次推移</title><desc id="svg-description">${dateLabel(first.date)}から${dateLabel(last.date)}。最小${number(low)}円、最大${number(high)}円。日別の数値は下の表で確認できます。</desc><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#b5ce7c" stop-opacity=".4"/><stop offset="100%" stop-color="#b5ce7c" stop-opacity="0"/></linearGradient></defs>${grid}<polygon points="${left},${bottom} ${points} ${x(last.date)},${bottom}" fill="url(#area)"/><polyline points="${points}" fill="none" stroke="#386b4d" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${x(last.date)}" cy="${y(last.rate)}" r="4" fill="#386b4d" stroke="white" stroke-width="2"/><text x="${left}" y="210" fill="#68766e" font-size="10">${dateLabel(first.date)}</text><text x="${right}" y="210" text-anchor="end" fill="#68766e" font-size="10">${dateLabel(last.date)}</text></svg>`;
    $('chart-latest').innerHTML = `${number(last.rate)} <small>JPY</small>`;
    const change = (last.rate / first.rate - 1) * 100;
    $('chart-change').textContent = `期間始点比 ${change > 0 ? '+' : ''}${number(change)}%`;
    $('chart-status').textContent = `${dateLabel(first.date)} → ${dateLabel(last.date)} · ${rows.length}公表日`;
    $('history-table').innerHTML = [...rows].reverse().map((row) => `<tr><td>${dateLabel(row.date)}</td><td>${number(row.rate, 4)}</td></tr>`).join('');
  }

  async function loadChart() {
    chartController?.abort();
    chartController = new AbortController();
    const version = ++chartVersion;
    const currency = selected;
    $('chart-title').textContent = `${currencies[currency][0]} / 円の推移`;
    $('table-caption').textContent = `${currencies[currency][0]} / 円の日別レート`;
    $('chart').setAttribute('aria-busy', 'true');
    $('chart').innerHTML = '<p class="chart-placeholder">日々の動きを読み込み中…</p>';
    $('history-table').innerHTML = '';
    $('chart-latest').innerHTML = '— <small>JPY</small>';
    $('chart-change').textContent = '';
    $('chart-status').textContent = '推移を読み込んでいます…';
    $('chart-status').classList.remove('error');
    $('chart-retry').hidden = true;
    const to = new Date();
    const from = new Date(to);
    from.setUTCDate(from.getUTCDate() - days);
    try {
      const rows = await fetchRates({ base: currency, quotes: 'JPY', from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }, chartController.signal);
      if (version !== chartVersion) return;
      if (!rows.every((row) => row.base === currency && row.quote === 'JPY')) throw new Error('Invalid pair');
      rows.sort((a, b) => a.date.localeCompare(b.date));
      drawChart(rows);
    } catch {
      if (version !== chartVersion) return;
      $('chart').innerHTML = '<p class="chart-placeholder">グラフを表示できませんでした</p>';
      $('chart-status').textContent = '推移データを取得できませんでした。再取得をお試しください。';
      $('chart-status').classList.add('error');
      $('chart-retry').hidden = false;
    } finally {
      if (version === chartVersion) $('chart').setAttribute('aria-busy', 'false');
    }
  }

  function selectCurrency(code) {
    if (!(code in currencies) || code === selected) return;
    selected = code;
    $('currency').value = code;
    // ボタンを作り直さず、キーボードフォーカスを維持する。
    document.querySelectorAll('[data-currency]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.currency === code)));
    convert();
    loadChart();
  }
  $('rate-cards').addEventListener('click', (event) => {
    const button = event.target.closest('[data-currency]');
    if (button) selectCurrency(button.dataset.currency);
  });
  $('currency').addEventListener('change', (event) => selectCurrency(event.target.value));
  $('amount').addEventListener('input', convert);
  function setDirection(next) {
    if (next === direction) return;
    amounts[direction] = $('amount').value;
    direction = next;
    $('amount').value = amounts[direction];
    $('amount').step = direction === 'to-foreign' ? '1000' : '1';
    for (const mode of ['to-foreign', 'to-yen']) {
      const active = mode === direction;
      $(`tab-${mode}`).setAttribute('aria-selected', String(active));
      $(`tab-${mode}`).tabIndex = active ? 0 : -1;
    }
    $('conversion-panel').setAttribute('aria-labelledby', `tab-${direction}`);
    convert();
  }
  for (const mode of ['to-foreign', 'to-yen']) {
    const tab = $(`tab-${mode}`);
    tab.addEventListener('click', () => setDirection(mode));
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 'to-foreign' : event.key === 'End' ? 'to-yen' : mode === 'to-foreign' ? 'to-yen' : 'to-foreign';
      setDirection(next);
      $(`tab-${next}`).focus();
    });
  }
  document.querySelectorAll('[data-days]').forEach((button) => button.addEventListener('click', () => {
    days = Number(button.dataset.days);
    document.querySelectorAll('[data-days]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    loadChart();
  }));
  $('refresh').addEventListener('click', () => { loadLatest(); loadChart(); });
  $('chart-retry').addEventListener('click', loadChart);
  loadLatest();
  loadChart();
})();
