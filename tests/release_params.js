#!/usr/bin/env node
/* release_params.js — 把 evidence/events 中 status=approved 且 parameter_change 非空的事件
   发布为 params.json（参数版本）。无已审核事件时不写文件、exit 0。 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
global.window = global;
require(path.join(root, 'model.js'));
const HT = global.HT;

const evDir = path.join(root, 'evidence', 'events');
if (!fs.existsSync(evDir)) { console.log('无 evidence/events 目录，跳过'); process.exit(0); }
const files = fs.readdirSync(evDir).filter(f => f.endsWith('.json'));
const approved = [];
for (const f of files) {
  let ev;
  try { ev = JSON.parse(fs.readFileSync(path.join(evDir, f), 'utf8')); }
  catch (e) { console.error('✗ ' + f + ' 解析失败: ' + e.message); process.exit(1); }
  if (ev.status === 'approved') {
    if (!ev.parameter_change) { console.error('✗ ' + f + ' status=approved 但缺 parameter_change（禁止无凭据入库）'); process.exit(1); }
    if (ev.requires_review !== true) { console.error('✗ ' + f + ' parameter_change 非空但 requires_review!==true'); process.exit(1); }
    if (!ev.review || !ev.review.reviewer) { console.error('✗ ' + f + ' approved 但 review.reviewer 为空（需人工签名）'); process.exit(1); }
    approved.push(ev);
  }
}
if (!approved.length) { console.log('无已审核事件，未生成 params.json（保持内置默认参数）'); process.exit(0); }

const sc = Object.assign({}, HT.DEFAULT_SC);
const changes = [];
for (const ev of approved) {
  const pc = ev.parameter_change;
  const key = pc.target;
  if (!(key in HT.DEFAULT_SC)) { console.error('✗ ' + ev.event_id + ' 无法定位情景参数 ' + key); process.exit(1); }
  const oldV = sc[key];
  sc[key] = pc.delta;
  changes.push({ event_id: ev.event_id, label: key, old_v: oldV, new_v: sc[key], reason: pc.reason || '', reviewer: ev.review.reviewer });
}
const out = {
  version: 'params-' + new Date().toISOString().slice(0, 10) + '-' + approved.length + 'ev',
  generated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
  base_note: '基于内置默认参数 + 人工审核事件增量；与模型口径同源（SEED=42）',
  sc,changes
};
fs.writeFileSync(path.join(root, 'params.json'), JSON.stringify(out, null, 2), 'utf8');
console.log('✓ 已生成 params.json：' + changes.map(c => c.label + ' ' + c.old_v + '→' + c.new_v + '（' + c.event_id + '）').join('；'));
