import { caseStore, computeStats, removeUserRecords } from '../src/services/caseStore.js';
import { setKV } from '../src/utils/runtime.js';

/** 内存版 KV 模拟（仅供本地测试） */
class FakeKV {
  private store = new Map<string, string>();
  async get(key: string) { return this.store.get(key) ?? null; }
  async put(key: string, value: string) { this.store.set(key, value); }
}

const TEST_USER = '__test_stats_user__';
let passed = 0;
let failed = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}${detail ? ` → ${detail}` : ''}`);
  }
}

async function main() {
  setKV(new FakeKV());

  console.log('\n[1] 空记录用户统计');
  {
    await removeUserRecords(TEST_USER);
    const records = await caseStore.getUserRecords(TEST_USER);
    const stats = computeStats(records);
    assert('total = 0', stats.total === 0);
    assert('good/neutral/bad 全为0', stats.good === 0 && stats.neutral === 0 && stats.bad === 0);
    assert('solo/team 全为0', stats.solo === 0 && stats.team === 0);
    assert('total_clues = 0', stats.total_clues === 0);
  }

  console.log('\n[2] 混合记录统计（含3种结局 + 2种模式）');
  {
    await removeUserRecords(TEST_USER);
    await caseStore.saveExploreRecord({
      user_id: TEST_USER, case_id: 'c1', case_title: '案件一',
      game_mode: 'solo', ending_type: 'good',
      clue_count: 4, key_clue_count: 4, companion_clue_count: 0,
    });
    await caseStore.saveExploreRecord({
      user_id: TEST_USER, case_id: 'c2', case_title: '案件二',
      game_mode: 'team', companion_name: '林微', ending_type: 'good',
      clue_count: 3, key_clue_count: 3, companion_clue_count: 2,
    });
    await caseStore.saveExploreRecord({
      user_id: TEST_USER, case_id: 'c3', case_title: '案件三',
      game_mode: 'team', ending_type: 'neutral',
      clue_count: 2, key_clue_count: 1, companion_clue_count: 0,
    });
    await caseStore.saveExploreRecord({
      user_id: TEST_USER, case_id: 'c4', case_title: '案件四',
      game_mode: 'solo', ending_type: 'bad',
      clue_count: 1, key_clue_count: 0, companion_clue_count: 0,
    });

    const records = await caseStore.getUserRecords(TEST_USER);
    const stats = caseStore.computeStats(records);

    assert('total = 4', stats.total === 4, `实际 ${stats.total}`);
    assert('good = 2', stats.good === 2, `实际 ${stats.good}`);
    assert('neutral = 1', stats.neutral === 1, `实际 ${stats.neutral}`);
    assert('bad = 1', stats.bad === 1, `实际 ${stats.bad}`);
    assert('结局分类总和 = total', stats.good + stats.neutral + stats.bad === stats.total);
    assert('solo = 2', stats.solo === 2, `实际 ${stats.solo}`);
    assert('team = 2', stats.team === 2, `实际 ${stats.team}`);
    assert('模式分类总和 = total', stats.solo + stats.team === stats.total);
    assert('total_clues = 10 (4+3+2+1)', stats.total_clues === 10, `实际 ${stats.total_clues}`);
    assert('记录按时间倒序', new Date(records[0].finished_at).getTime() >= new Date(records[3].finished_at).getTime());
    assert('每条记录含 record_id', records.every(r => r.record_id?.startsWith('rec_')));
  }

  console.log('\n[3] 边界：缺省字段与非法值容错');
  {
    const stats = computeStats([
      { clue_count: 0 } as any,
      { clue_count: undefined } as any,
    ]);
    assert('clue_count 缺省时 total_clues = 0', stats.total_clues === 0);
    assert('未知 ending_type 不计入三类', stats.good + stats.neutral + stats.bad === 0);
  }

  console.log('\n[4] 记录隔离：不同用户互不污染');
  {
    const otherRecords = await caseStore.getUserRecords('__test_other_user__');
    const myRecords = await caseStore.getUserRecords(TEST_USER);
    assert('查询不存在的用户返回空数组', Array.isArray(otherRecords) && otherRecords.length === 0);
    assert('测试用户记录仍是4条', myRecords.length === 4, `实际 ${myRecords.length}`);
  }

  console.log('\n[5] 清理测试数据');
  {
    const removed = await removeUserRecords(TEST_USER);
    assert('清理了4条测试记录', removed === 4, `实际清理 ${removed}`);
    assert('清理后查询为空', (await caseStore.getUserRecords(TEST_USER)).length === 0);
  }

  console.log(`\n========== 结果: ${passed} 通过, ${failed} 失败 ==========`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
