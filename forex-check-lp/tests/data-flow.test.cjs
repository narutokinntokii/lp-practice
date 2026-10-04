// テスト専用の応答。製品ページのフォールバックデータには使用しない。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/main.js'), 'utf8');
const settle = () => new Promise((resolve) => setImmediate(resolve));

function setup(fetch) {
  const nodes = new Map();
  const get = (id) => {
    if (!nodes.has(id)) nodes.set(id, {
      textContent: '', innerHTML: '', value: '10000', valueAsNumber: 10000,
      attributes: {}, handlers: {}, classList: { add() {}, remove() {} },
      setAttribute(key, value) { this.attributes[key] = value; },
      removeAttribute(key) { delete this.attributes[key]; },
      addEventListener(event, handler) { this.handlers[event] = handler; },
    });
    return nodes.get(id);
  };
  vm.runInNewContext(source, { document: { getElementById: get, querySelectorAll: () => [] }, fetch, AbortSignal, AbortController, URLSearchParams, console });
  return get;
}
const response = (data) => ({ ok: true, json: async () => data });
const latest = [ ['JPY', 160], ['USD', 1.25], ['GBP', .8], ['AUD', 1.6] ].map(([quote, rate]) => ({ date: '2026-10-02', base: 'EUR', quote, rate }));
const history = (base) => [ { date: '2026-10-01', base, quote: 'JPY', rate: 150 }, { date: '2026-10-02', base, quote: 'JPY', rate: 160 } ];

test('通信失敗では値を表示せず、再試行後に回復する', async () => {
  let failing = true;
  const get = setup(async (url) => { if (failing) throw new Error('offline'); return response(url.includes('from=') ? history('USD') : latest); });
  await settle();
  assert.match(get('rate-status').textContent, /取得できません/);
  assert.match(get('conversion').textContent, /—/);
  assert.equal(get('chart-retry').hidden, false);
  assert.equal(get('refresh').disabled, false);
  failing = false;
  get('refresh').handlers.click();
  await settle();
  assert.match(get('conversion').innerHTML, /78.13<small> USD/);
  assert.match(get('chart').innerHTML, /<svg/);
});

test('一部通貨の欠落と非正値を拒否し、換算入力の境界を扱う', async () => {
  const missing = setup(async () => response(latest.slice(0, 1)));
  await settle();
  assert.match(missing('rate-status').textContent, /取得できません/);
  const invalid = setup(async () => response([{date:'2026-10-02',base:'USD',quote:'JPY',rate:0}]));
  await settle();
  assert.match(invalid('chart-status').textContent, /取得できません/);
  const get = setup(async (url) => response(url.includes('from=') ? history('USD') : latest));
  await settle();
  const amount = get('amount');
  for (const value of [-1, NaN, 1000000001]) {
    amount.valueAsNumber = value;
    amount.handlers.input();
    assert.equal(amount.attributes['aria-invalid'], 'true');
  }
  amount.valueAsNumber = 0;
  amount.handlers.input();
  assert.match(get('conversion').innerHTML, /0.00/);
  amount.valueAsNumber = 1.5;
  amount.handlers.input();
  assert.match(get('conversion').innerHTML, /0.01<small> USD/);
});

test('通貨切替後に遅れて届く古い応答でグラフを上書きしない', async () => {
  const pending = [];
  const get = setup((url) => url.includes('from=') ? new Promise((resolve) => pending.push(resolve)) : Promise.resolve(response(latest)));
  await settle();
  get('currency').handlers.change({ target: { value: 'EUR' } });
  assert.match(get('conversion').innerHTML, /62.50<small> EUR/);
  pending[1](response(history('EUR')));
  await settle();
  const chart = get('chart').innerHTML;
  pending[0](response(history('USD')));
  await settle();
  assert.equal(get('chart').innerHTML, chart);
  assert.match(get('chart-title').textContent, /ユーロ/);
});

test('両方向の換算と刻み幅を切り替え、入力を方向ごとに保持する', async () => {
  const get = setup(async (url) => response(url.includes('from=') ? history('USD') : latest));
  await settle();
  const input = get('amount');
  Object.defineProperty(input, 'valueAsNumber', { get() { return Number(this.value); } });
  input.value = '20000';
  get('tab-to-yen').handlers.click();
  assert.equal(input.value, '100');
  assert.equal(input.step, '1');
  assert.match(get('conversion').innerHTML, /12,800.00<small> JPY/);
  input.value = '1.5';
  input.handlers.input();
  assert.match(get('conversion').innerHTML, /192.00<small> JPY/);
  get('tab-to-foreign').handlers.click();
  assert.equal(input.value, '20000');
  assert.equal(input.step, '1000');
  assert.match(get('conversion').innerHTML, /156.25<small> USD/);
  get('tab-to-yen').handlers.click();
  assert.equal(input.value, '1.5');
});
