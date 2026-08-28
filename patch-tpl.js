/* 模板加工：從原型模板（build_tpl.txt）產出實際使用版模板（build_tpl_live.txt）
   原型畫面全部保留；只加殼層開關、登入註冊、帳號管理與少數實際使用需要的元件。 */
const fs = require('fs');
let t = fs.readFileSync('build_tpl.txt', 'utf8');
const must = (a, b) => {
  if (t.indexOf(a) < 0) { console.error('MISS: ' + a.slice(0, 100)); process.exit(1); }
  t = t.split(a).join(b);
};

/* 1. 外殼 */
must(
  '<div style="min-height:100vh;background:#0B0A09;background-image:radial-gradient(1100px 560px at 50% -12%,rgba(233,179,65,.07),transparent 70%);font-family:\'C11\';color:#E8E2D6;padding:0 0 56px;{{ uiVars }}">',
  '<div style="{{ shellStyle }}{{ uiVars }}">');

/* 2. 原型工具列：只在演練模式出現 */
must(
  '  <div style="position:sticky;top:0;z-index:40;display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:12px 22px;background:rgba(11,10,9,.93);backdrop-filter:blur(10px);border-bottom:1px solid #26211C">',
  '  <sc-if value="{{ protoChrome }}" hint-placeholder-val="{{ false }}">\n' +
  '  <div style="position:sticky;top:0;z-index:40;display:flex;flex-wrap:wrap;align-items:center;gap:16px;padding:12px 22px;background:rgba(11,10,9,.93);backdrop-filter:blur(10px);border-bottom:1px solid #26211C">');

must(
  '      <button onClick="{{ reset }}" style="margin-left:6px;font:500 11px/1 \'C11\';letter-spacing:.1em;color:#8A8073;background:none;border:1px solid #2E2822;padding:7px 10px;cursor:pointer;white-space:nowrap">重置</button>\n    </div>\n  </div>',
  '      <button onClick="{{ reset }}" style="margin-left:6px;font:500 11px/1 \'C11\';letter-spacing:.1em;color:#8A8073;background:none;border:1px solid #2E2822;padding:7px 10px;cursor:pointer;white-space:nowrap">重置</button>\n' +
  '      <button onClick="{{ exitDemo }}" style="margin-left:6px;font:500 11px/1 \'C11\';letter-spacing:.1em;color:#C9A227;background:rgba(201,162,39,.12);border:1px solid #4A4238;padding:7px 10px;cursor:pointer;white-space:nowrap">離開演練</button>\n    </div>\n  </div>\n  </sc-if>');

/* 3. 舞台：實際使用版滿版 */
must('  <div style="display:flex;justify-content:center;padding:26px 20px 0">',
     '  <div style="{{ stageWrapStyle }}">');
must('    <div style="position:relative;width:100%;max-width:{{ stageW }};height:{{ stageH }};background:#100E0C;border:1px solid #2E2822;box-shadow:0 30px 90px rgba(0,0,0,.6);overflow:hidden;display:flex;flex-direction:column;border-radius:{{ stageRadius }}">',
     '    <div style="{{ stageStyle }}">');

/* 4. 身分列右側加「登出」 */
must(
  '              <span style="font:400 11px/1 \'C11\';color:#8A8073;text-align:right">{{ idMeta }}</span>',
  '              <span style="font:400 11px/1 \'C11\';color:#8A8073;text-align:right">{{ idMeta }}</span>\n' +
  '              <sc-if value="{{ showSignOut }}" hint-placeholder-val="{{ false }}">\n' +
  '                <button onClick="{{ signOut }}" style="font:500 11px/1 \'C11\';letter-spacing:.14em;color:#FFE3DA;background:#8E2F1C;border:1px solid #D9603F;padding:8px 13px;cursor:pointer;white-space:nowrap;flex:none">登出</button>\n' +
  '              </sc-if>');

/* 5. C-03 登入：記住我、錯誤訊息、研究者註冊入口 */
const C03OLD = [
'                <sc-if value="{{ authIsStudent }}" hint-placeholder-val="{{ true }}">',
'                  <button onClick="{{ toggleFirst }}" style="{{ firstToggleStyle }}"><span style="{{ firstBoxStyle }}">{{ firstMark }}</span><span style="font:400 22px/1.4 \'C11\';text-align:left">這是我第一次登入</span></button>',
'                </sc-if>',
'                <button onClick="{{ doLogin }}" style="width:100%;margin-top:18px;font:500 22px/1 \'C11\';letter-spacing:.2em;text-indent:.2em;color:#0B0A09;background:#E9B341;border:none;padding:15px;cursor:pointer;clip-path:polygon(11px 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%,0 11px)">登入</button>',
'                <button onClick="{{ goIdentity }}" style="width:100%;margin-top:9px;font:400 22px/1 \'C11\';color:#6E665A;background:none;border:none;padding:8px;cursor:pointer">回上一步</button>'
].join('\n');
const C03NEW = [
'                <sc-if value="{{ showAuthToggle }}" hint-placeholder-val="{{ true }}">',
'                  <button onClick="{{ toggleFirst }}" style="{{ firstToggleStyle }}"><span style="{{ firstBoxStyle }}">{{ firstMark }}</span><span style="font:400 22px/1.4 \'C11\';text-align:left">{{ authToggleLabel }}</span></button>',
'                </sc-if>',
'                <sc-if value="{{ authIsManaged }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:6px;font:400 22px/1.7 \'C11\';color:#5F574C;text-wrap:pretty">帳號由研究者建立與發放。拿到帳號密碼就能直接登入。</div>',
'                </sc-if>',
'                <sc-if value="{{ hasAuthError }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:14px;padding:11px 13px;background:rgba(217,96,63,.1);border:1px solid rgba(217,96,63,.32);font:400 22px/1.6 \'C11\';color:#E8B4A4;text-wrap:pretty">{{ authError }}</div>',
'                </sc-if>',
'                <button onClick="{{ doLogin }}" style="{{ authSubmitStyle }}">{{ authSubmitLabel }}</button>',
'                <sc-if value="{{ showRegisterLink }}" hint-placeholder-val="{{ false }}">',
'                  <button onClick="{{ goRegister }}" style="width:100%;margin-top:9px;font:400 22px/1 \'C11\';color:#E9B341;background:none;border:1px dashed #5A4A2C;padding:12px;cursor:pointer">第一次使用？註冊研究者帳號</button>',
'                </sc-if>',
'                <button onClick="{{ goIdentity }}" style="width:100%;margin-top:9px;font:400 22px/1 \'C11\';color:#6E665A;background:none;border:none;padding:8px;cursor:pointer">回上一步</button>'
].join('\n');
must(C03OLD, C03NEW);

/* 6. C-04：實際使用版不讓學生自由輸入組員名字；可加入既有小隊 */
const MEMOLD = [
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#5F574C;margin-bottom:8px">組員</div>',
'                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:11px">',
'                  <sc-for list="{{ memberRows }}" as="m" hint-placeholder-count="3">',
'                    <div style="display:flex;gap:8px;align-items:center">',
'                      <span style="font:400 11px/1 \'C11\';color:#5F574C;width:22px;flex:none">{{ m.n }}</span>',
'                      <input value="{{ m.value }}" onChange="{{ m.set }}" placeholder="姓名" style="flex:1;min-width:0;padding:12px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.4 \'C11\';outline:none">',
'                      <button onClick="{{ m.remove }}" style="font:400 22px/1 \'C11\';color:#6E665A;background:none;border:1px solid #2E2822;padding:11px 13px;cursor:pointer;flex:none;white-space:nowrap">移除</button>',
'                    </div>',
'                  </sc-for>',
'                </div>',
'                <button onClick="{{ addMember }}" style="font:400 22px/1 \'C11\';color:#E9B341;background:none;border:1px dashed #5A4A2C;padding:11px 15px;cursor:pointer;width:100%">＋ 新增組員</button>'
].join('\n');
const MEMNEW = [
'                <sc-if value="{{ showMemberRows }}" hint-placeholder-val="{{ true }}">',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#5F574C;margin-bottom:8px">組員</div>',
'                <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:11px">',
'                  <sc-for list="{{ memberRows }}" as="m" hint-placeholder-count="3">',
'                    <div style="display:flex;gap:8px;align-items:center">',
'                      <span style="font:400 11px/1 \'C11\';color:#5F574C;width:22px;flex:none">{{ m.n }}</span>',
'                      <input value="{{ m.value }}" onChange="{{ m.set }}" placeholder="姓名" style="flex:1;min-width:0;padding:12px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.4 \'C11\';outline:none">',
'                      <button onClick="{{ m.remove }}" style="font:400 22px/1 \'C11\';color:#6E665A;background:none;border:1px solid #2E2822;padding:11px 13px;cursor:pointer;flex:none;white-space:nowrap">移除</button>',
'                    </div>',
'                  </sc-for>',
'                </div>',
'                <button onClick="{{ addMember }}" style="font:400 22px/1 \'C11\';color:#E9B341;background:none;border:1px dashed #5A4A2C;padding:11px 15px;cursor:pointer;width:100%">＋ 新增組員</button>',
'                </sc-if>',
'                <sc-if value="{{ liveMemberNote }}" hint-placeholder-val="{{ false }}">',
'                  <div style="padding:13px 15px;background:#0E0C0A;border:1px dashed #2E2822;font:400 22px/1.7 \'C11\';color:#8A8073;text-wrap:pretty">你的名字會自動掛在這支小隊上。其他組員用自己的帳號登入後，在這一頁選「加入」就會進來——名字都是研究者建帳號時定好的，不用自己打。</div>',
'                </sc-if>'
].join('\n');
must(MEMOLD, MEMNEW);

const C04OLD = '                <button onClick="{{ finishTeam }}" style="width:100%;margin-top:20px;font:500 22px/1 \'C11\';letter-spacing:.2em;text-indent:.2em;color:#0B0A09;background:#E9B341;border:none;padding:15px;cursor:pointer;clip-path:polygon(11px 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%,0 11px)">建立小隊</button>';
const C04NEW = C04OLD + '\n' + [
'                <sc-if value="{{ hasJoinable }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:26px;padding-top:20px;border-top:1px solid #221E19">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#5F574C;margin-bottom:5px">或者，加入班上已經建好的小隊</div>',
'                    <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-bottom:12px;text-wrap:pretty">同一組的人要加入同一支小隊，交出去的東西才會算在一起。</div>',
'                    <div style="display:flex;flex-direction:column;gap:7px">',
'                      <sc-for list="{{ joinableTeams }}" as="j" hint-placeholder-count="3">',
'                        <button onClick="{{ j.join }}" style="text-align:left;padding:13px 15px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:inherit;cursor:pointer;width:100%">',
'                          <span style="display:block;font:500 22px/1.3 \'C11\'">{{ j.name }}</span>',
'                          <span style="display:block;font:400 11px/1.6 \'C11\';color:#8A8073;margin-top:5px">{{ j.members }}</span>',
'                        </button>',
'                      </sc-for>',
'                    </div>',
'                  </div>',
'                </sc-if>',
'                <sc-if value="{{ hasAuthError }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:14px;padding:11px 13px;background:rgba(217,96,63,.1);border:1px solid rgba(217,96,63,.32);font:400 22px/1.6 \'C11\';color:#E8B4A4;text-wrap:pretty">{{ authError }}</div>',
'                </sc-if>'
].join('\n');
must(C04OLD, C04NEW);

/* 6b. C-04 上方：名單已建好時改成「你是誰」 */
const C04HEAD = [
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.3em;color:#5F574C">C-04 · NEW TEAM</div>',
'                <h1 style="font:700 33px/1.4 \'C11\';margin:12px 0 6px;letter-spacing:.03em">建立你的小隊</h1>',
'                <p style="font:400 22px/1.7 \'C11\';color:#8A8073;margin:0 0 22px;text-wrap:pretty">隊名和成員之後都可以再改。</p>'
].join('\n');
must(C04HEAD, [
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.3em;color:#5F574C">{{ c04Kicker }}</div>',
'                <h1 style="font:700 33px/1.4 \'C11\';margin:12px 0 6px;letter-spacing:.03em">{{ c04Title }}</h1>',
'                <p style="font:400 22px/1.7 \'C11\';color:#8A8073;margin:0 0 22px;text-wrap:pretty">{{ c04Hint }}</p>',
'                <sc-if value="{{ hasIdentityList }}" hint-placeholder-val="{{ false }}">',
'                  <div style="display:flex;flex-direction:column;gap:16px;margin-bottom:20px">',
'                    <sc-for list="{{ identityTeams }}" as="g" hint-placeholder-count="2">',
'                      <div>',
'                        <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:9px">',
'                          <span style="font:700 22px/1.3 \'C11\';color:#E8E2D6">{{ g.teamName }}</span>',
'                          <span style="font:400 11px/1 \'C11\';color:#5F574C">{{ g.meta }}</span>',
'                        </div>',
'                        <div style="display:flex;flex-wrap:wrap;gap:7px">',
'                          <sc-for list="{{ g.members }}" as="m" hint-placeholder-count="3">',
'                            <button onClick="{{ m.pick }}" style="{{ m.style }}">{{ m.label }}</button>',
'                          </sc-for>',
'                        </div>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                  <div style="padding:12px 14px;background:#0E0C0A;border:1px dashed #2E2822;font:400 11px/1.7 \'C11\';color:#5F574C;text-wrap:pretty;margin-bottom:8px">名單是研究者建好的。點到不是自己的名字，找研究者「放掉」就能改。灰掉的表示已經有人認領了。</div>',
'                </sc-if>',
'                <sc-if value="{{ showTeamMaker }}" hint-placeholder-val="{{ true }}">'
].join('\n'));

/* C-04 建隊區塊收尾 */
const C04TAIL = [
'                <sc-if value="{{ hasAuthError }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:14px;padding:11px 13px;background:rgba(217,96,63,.1);border:1px solid rgba(217,96,63,.32);font:400 22px/1.6 \'C11\';color:#E8B4A4;text-wrap:pretty">{{ authError }}</div>',
'                </sc-if>',
'              </div>',
'            </div>',
'          </sc-if>'
].join('\n');
must(C04TAIL, [
'                </sc-if>',
'                <sc-if value="{{ hasAuthError }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:14px;padding:11px 13px;background:rgba(217,96,63,.1);border:1px solid rgba(217,96,63,.32);font:400 22px/1.6 \'C11\';color:#E8B4A4;text-wrap:pretty">{{ authError }}</div>',
'                </sc-if>',
'              </div>',
'            </div>',
'          </sc-if>'
].join('\n'));

/* 7. 新畫面 C-05：研究者註冊 */
const ANCHOR = '          <sc-if value="{{ scStory }}" hint-placeholder-val="{{ false }}">';
const C05 = [
'          <sc-if value="{{ scC05 }}" hint-placeholder-val="{{ false }}">',
'            <div data-screen-label="C-05 研究者註冊" style="min-height:100%;display:flex;align-items:center;justify-content:center;padding:34px var(--pad)">',
'              <div style="width:100%;max-width:440px">',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.3em;color:#5F574C">C-05 · REGISTER</div>',
'                <h1 style="font:700 33px/1.4 \'C11\';margin:12px 0 6px;letter-spacing:.03em">{{ regTitle }}</h1>',
'                <p style="font:400 22px/1.7 \'C11\';color:#8A8073;margin:0 0 22px;text-wrap:pretty">{{ regHint }}</p>',
'                <div style="display:flex;flex-direction:column;gap:14px">',
'                  <sc-for list="{{ regFields }}" as="f" hint-placeholder-count="4">',
'                    <div>',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#5F574C;margin-bottom:8px">{{ f.label }}</div>',
'                      <input type="{{ f.type }}" value="{{ f.value }}" onChange="{{ f.set }}" placeholder="{{ f.ph }}" style="width:100%;padding:13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.4 \'C11\';outline:none">',
'                      <sc-if value="{{ f.hasNote }}" hint-placeholder-val="{{ false }}">',
'                        <div style="font:400 11px/1.7 \'C11\';color:#5F574C;margin-top:6px;text-wrap:pretty">{{ f.note }}</div>',
'                      </sc-if>',
'                    </div>',
'                  </sc-for>',
'                </div>',
'                <sc-if value="{{ hasAuthError }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:16px;padding:11px 13px;background:rgba(217,96,63,.1);border:1px solid rgba(217,96,63,.32);font:400 22px/1.6 \'C11\';color:#E8B4A4;text-wrap:pretty">{{ authError }}</div>',
'                </sc-if>',
'                <button onClick="{{ doRegister }}" style="{{ regSubmitStyle }}">{{ regSubmitLabel }}</button>',
'                <button onClick="{{ goSignIn }}" style="width:100%;margin-top:9px;font:400 22px/1 \'C11\';color:#6E665A;background:none;border:none;padding:8px;cursor:pointer">已經有帳號了，去登入</button>',
'              </div>',
'            </div>',
'          </sc-if>',
'',
ANCHOR
].join('\n');
must(ANCHOR, C05);

/* 8. R-08：加上真正的匯出執行鈕 */
const R08OLD = '                    <div style="margin-top:16px;padding:12px 14px;background:rgba(217,164,92,.08);border-left:2px solid #D9A45C;font-family:\'IBM Plex Mono\',monospace;font-size:11px;line-height:1.8;color:#D9A45C">已套用匿名化：組別→代號、老師→〔T1〕、時間戳日期偏移。已移除欄位：學生姓名、帳號、隊名原文。沒有關閉選項。</div>';
must(R08OLD, [
'                    <div style="margin-top:16px;padding:13px 15px;background:#0C1116;border:1px solid #1D2831;border-radius:9px">',
'                      <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.12em;color:#D9A45C">自由文本原文</div>',
'                      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px">',
'                        <sc-for list="{{ resVals.fullTextPicks }}" as="ft" hint-placeholder-count="2">',
'                          <button onClick="{{ ft.pick }}" style="{{ ft.style }}">{{ ft.label }}</button>',
'                        </sc-for>',
'                      </div>',
'                      <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:12.5px;line-height:1.85;color:#8393A0;margin-top:10px">{{ resVals.fullTextNote }}</div>',
'                    </div>',
R08OLD, ''].join('\n') + [
'                    <sc-if value="{{ resVals.canExport }}" hint-placeholder-val="{{ false }}">',
'                      <button onClick="{{ resVals.runExport }}" style="margin-top:14px;font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:12px 20px;background:#1E2024;border:1px solid #2A2E33;color:#DFE6EB;cursor:pointer;border-radius:5px">匯出勾選的事件（CSV → 你的雲端硬碟）</button>',
'                    </sc-if>'
].join('\n'));

/* 9. T-07：多組同時送審時的切換列 */
const T07A = '              <sc-if value="{{ noGate }}" hint-placeholder-val="{{ true }}">';
must(T07A, [
'              <sc-if value="{{ hasGatePick }}" hint-placeholder-val="{{ false }}">',
'                <div style="display:flex;flex-wrap:wrap;gap:8px;padding:14px var(--pad) 0">',
'                  <sc-for list="{{ gatePickers }}" as="gp" hint-placeholder-count="2">',
'                    <button onClick="{{ gp.pick }}" style="{{ gp.style }}"><span style="display:block;font:500 22px/1.3 \'C11\'">{{ gp.name }}</span><span style="display:block;font:400 11px/1.5 \'C11\';opacity:.6;margin-top:4px">{{ gp.sub }}</span></button>',
'                  </sc-for>',
'                </div>',
'              </sc-if>',
T07A].join('\n'));

/* 10. R-ADM：帳號管理（研究者先開好老師與學生的帳號） */
const R00A = '                <sc-if value="{{ scR00 }}" hint-placeholder-val="{{ false }}">';
const RADM = [
'                <sc-if value="{{ scRADM }}" hint-placeholder-val="{{ false }}">',
'                  <div data-screen-label="R-ADM 帳號管理" style="padding:var(--pad) 24px;max-width:860px">',
'                    <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.22em;color:#5A6874">R-ADM · ACCOUNTS</div>',
'                    <h1 style="font-family:\'Noto Serif TC\',serif;font-size:26px;font-weight:700;margin:10px 0 6px">帳號管理</h1>',
'                    <p style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;line-height:1.9;color:#8393A0;margin:0 0 18px">你在這裡先把班級開好、把老師與學生的帳號建好再發下去。名字是你定的——他們登入就能用，不能自己亂改。這一頁是行政功能，不是研究資料，不受延遲揭露限制。</p>',
'                    <sc-if value="{{ adm.hasMsg }}" hint-placeholder-val="{{ false }}">',
'                      <div style="margin:0 0 14px;padding:11px 14px;background:{{ adm.msgBg }};border-left:2px solid {{ adm.msgLine }};font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;line-height:1.8;color:{{ adm.msgColor }}">{{ adm.msg }}</div>',
'                    </sc-if>',
'',
'                    <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.14em;color:#5A6874;margin:18px 0 8px">班級</div>',
'                    <div style="display:flex;flex-direction:column;gap:7px">',
'                      <sc-for list="{{ adm.classes }}" as="k" hint-placeholder-count="1">',
'                        <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:baseline;padding:12px 14px;background:#121A21;border:1px solid #1D2831;border-radius:9px">',
'                          <span style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;color:#DFE6EB">{{ k.name }}</span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ k.meta }}</span>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;align-items:stretch">',
'                      <input value="{{ adm.kname }}" onChange="{{ adm.setKname }}" placeholder="班級名稱（例：設計專題 · 週三班）" style="flex:2;min-width:180px;padding:10px 12px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'Noto Sans TC\',sans-serif;font-size:13px;outline:none">',
'                      <input value="{{ adm.kterm }}" onChange="{{ adm.setKterm }}" placeholder="學期（例：2026 秋）" style="flex:1;min-width:110px;padding:10px 12px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'Noto Sans TC\',sans-serif;font-size:13px;outline:none">',
'                      <input value="{{ adm.kstart }}" onChange="{{ adm.setKstart }}" placeholder="開課日 2026-09-14" style="flex:1;min-width:130px;padding:10px 12px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'IBM Plex Mono\',monospace;font-size:12px;outline:none">',
'                      <input value="{{ adm.kweeks }}" onChange="{{ adm.setKweeks }}" placeholder="總週數 18" style="flex:0 0 110px;padding:10px 12px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'IBM Plex Mono\',monospace;font-size:12px;outline:none">',
'                      <button onClick="{{ adm.createClass }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:10px 16px;background:#1E2024;border:1px solid #2A2E33;color:#DFE6EB;cursor:pointer;border-radius:6px">開一個班</button>',
'                    </div>',
'                    <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:13px;line-height:1.9;color:#8393A0;margin-top:8px">總週數決定甘特圖有幾欄、期限可以訂到第幾週。一學期填 18，一學年填 36，最多 52。開完之後在下面每一班那一列還可以改。</div>',
'                    <div style="display:flex;flex-direction:column;gap:7px;margin-top:10px">',
'                      <sc-for list="{{ adm.classWeeks }}" as="cw" hint-placeholder-count="1">',
'                        <div style="display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding:11px 13px;background:#121A21;border:1px solid #1D2831;border-radius:9px">',
'                          <span style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;color:#DFE6EB;min-width:150px">{{ cw.name }}</span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:11px;color:#5A6874">總週數</span>',
'                          <input value="{{ cw.value }}" onChange="{{ cw.set }}" style="flex:0 0 80px;padding:8px 10px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'IBM Plex Mono\',monospace;font-size:12px;outline:none">',
'                          <button onClick="{{ cw.save }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;padding:8px 13px;background:#1E2024;border:1px solid #2A2E33;color:#DFE6EB;cursor:pointer;border-radius:6px">存</button>',
'                          <span style="flex:1;min-width:160px;font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ cw.note }}</span>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'',
'                    <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.14em;color:#5A6874;margin:24px 0 8px">揭露節奏</div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 14px;background:#121A21;border:1px solid #1D2831;border-radius:9px">',
'                      <sc-for list="{{ adm.unlockPicks }}" as="up" hint-placeholder-count="2">',
'                        <button onClick="{{ up.pick }}" style="{{ up.style }}">{{ up.label }}</button>',
'                      </sc-for>',
'                      <span style="flex:1;min-width:200px;font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;line-height:1.8;color:#5A6874">{{ adm.unlockNote }}</span>',
'                    </div>',
'',
'                    <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.14em;color:#5A6874;margin:24px 0 8px">名單與分組</div>',
'                    <div style="padding:14px;background:#121A21;border:1px solid #1D2831;border-radius:9px">',
'                      <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:13px;line-height:1.9;color:#8393A0;margin-bottom:10px">把你拿到的名單貼進來，一行一組，格式是「組名：成員, 成員, 成員」。貼完系統會直接把小隊建好；學生自己註冊完之後，在名單裡點自己的名字就會進到對的組。</div>',
'                      <textarea onChange="{{ adm.setRosterText }}" value="{{ adm.rosterText }}" placeholder="挖到再說：陳小明, 李小華, 張大同&#10;慢慢掘：王小美, 林小強" style="width:100%;min-height:96px;padding:11px 13px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'Noto Sans TC\',sans-serif;font-size:13px;line-height:1.9;resize:vertical;outline:none"></textarea>',
'                      <button onClick="{{ adm.saveRoster }}" style="margin-top:10px;font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:10px 16px;background:#1E2024;border:1px solid #2A2E33;color:#DFE6EB;cursor:pointer;border-radius:6px">建立／更新名單</button>',
'                    </div>',
'                    <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">',
'                      <sc-for list="{{ adm.rosterTeams }}" as="rt" hint-placeholder-count="2">',
'                        <div style="padding:13px 15px;background:#121A21;border:1px solid #1D2831;border-radius:9px">',
'                          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:baseline">',
'                            <span style="font-family:\'Noto Sans TC\',sans-serif;font-size:14px;color:#DFE6EB">{{ rt.teamName }}</span>',
'                            <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874;flex:1">{{ rt.meta }}</span>',
'                            <button onClick="{{ rt.del }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;padding:6px 10px;background:transparent;border:1px solid #2A2E33;color:#5A6874;cursor:pointer;border-radius:5px">刪除這一組</button>',
'                          </div>',
'                          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">',
'                            <sc-for list="{{ rt.members }}" as="rm" hint-placeholder-count="3">',
'                              <span style="{{ rm.style }}">',
'                                <span style="font-family:\'Noto Sans TC\',sans-serif;font-size:12.5px">{{ rm.name }}</span>',
'                                <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;opacity:.75">{{ rm.state }}</span>',
'                                <sc-if value="{{ rm.claimed }}" hint-placeholder-val="{{ false }}">',
'                                  <button onClick="{{ rm.unclaim }}" style="background:none;border:none;color:#5A6874;cursor:pointer;font-family:\'IBM Plex Mono\',monospace;font-size:10px;padding:0 2px">放掉</button>',
'                                </sc-if>',
'                              </span>',
'                            </sc-for>',
'                          </div>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'',
'                    <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.14em;color:#5A6874;margin:24px 0 8px">建立帳號</div>',
'                    <div style="padding:14px;background:#121A21;border:1px solid #1D2831;border-radius:9px">',
'                      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">',
'                        <sc-for list="{{ adm.rolePicks }}" as="rp" hint-placeholder-count="2">',
'                          <button onClick="{{ rp.pick }}" style="{{ rp.style }}">{{ rp.label }}</button>',
'                        </sc-for>',
'                        <span style="flex:1"></span>',
'                        <sc-for list="{{ adm.classPicks }}" as="cp" hint-placeholder-count="1">',
'                          <button onClick="{{ cp.pick }}" style="{{ cp.style }}">{{ cp.label }}</button>',
'                        </sc-for>',
'                      </div>',
'                      <div style="display:flex;flex-wrap:wrap;gap:8px">',
'                        <input value="{{ adm.uname }}" onChange="{{ adm.setUname }}" placeholder="姓名（顯示在系統裡）" style="flex:1;min-width:140px;padding:10px 12px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'Noto Sans TC\',sans-serif;font-size:13px;outline:none">',
'                        <input value="{{ adm.uacct }}" onChange="{{ adm.setUacct }}" placeholder="帳號（例：s1130001）" style="flex:1;min-width:140px;padding:10px 12px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'IBM Plex Mono\',monospace;font-size:12px;outline:none">',
'                        <input value="{{ adm.upw }}" onChange="{{ adm.setUpw }}" placeholder="初始密碼" style="flex:1;min-width:110px;padding:10px 12px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'IBM Plex Mono\',monospace;font-size:12px;outline:none">',
'                        <button onClick="{{ adm.createUser }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:10px 16px;background:#1E2024;border:1px solid #2A2E33;color:#DFE6EB;cursor:pointer;border-radius:6px">建立帳號</button>',
'                      </div>',
'                      <div style="margin-top:10px;font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;line-height:1.8;color:#5A6874">建好之後把「帳號＋初始密碼」抄給對方。學生登入後自己建立或加入小隊；隊名他們自己取，人名用你定的。</div>',
'                    </div>',
'',
'                    <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.14em;color:#5A6874;margin:24px 0 8px">已建立的帳號</div>',
'                    <div style="display:flex;flex-direction:column;gap:6px">',
'                      <sc-for list="{{ adm.users }}" as="u" hint-placeholder-count="3">',
'                        <button onClick="{{ u.pick }}" style="{{ u.style }}">',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.1em;flex:none;width:44px;color:{{ u.roleColor }}">{{ u.roleTag }}</span>',
'                          <span style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;color:#DFE6EB;flex:none;min-width:90px;text-align:left">{{ u.name }}</span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;color:#8393A0;flex:1;text-align:left">{{ u.account }}</span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ u.meta }}</span>',
'                        </button>',
'                      </sc-for>',
'                    </div>',
'                    <sc-if value="{{ adm.hasSel }}" hint-placeholder-val="{{ false }}">',
'                      <div style="margin-top:10px;padding:14px;background:#121A21;border:1px solid #2A2E33;border-radius:9px">',
'                        <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.14em;color:#5A6874;margin-bottom:10px">{{ adm.selLabel }}</div>',
'                        <div style="display:flex;flex-wrap:wrap;gap:8px">',
'                          <input value="{{ adm.editName }}" onChange="{{ adm.setEditName }}" placeholder="改名" style="flex:1;min-width:130px;padding:10px 12px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'Noto Sans TC\',sans-serif;font-size:13px;outline:none">',
'                          <button onClick="{{ adm.saveName }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:10px 14px;background:#1E2024;border:1px solid #2A2E33;color:#DFE6EB;cursor:pointer;border-radius:6px">存新名字</button>',
'                          <input value="{{ adm.editPw }}" onChange="{{ adm.setEditPw }}" placeholder="新密碼" style="flex:1;min-width:110px;padding:10px 12px;background:#0C1116;border:1px solid #1D2831;border-radius:6px;color:#DFE6EB;font-family:\'IBM Plex Mono\',monospace;font-size:12px;outline:none">',
'                          <button onClick="{{ adm.resetPw }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:10px 14px;background:#1E2024;border:1px solid #2A2E33;color:#DFE6EB;cursor:pointer;border-radius:6px">重設密碼</button>',
'                          <button onClick="{{ adm.delUser }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:10px 14px;background:transparent;border:1px solid #4A3238;color:#C08080;cursor:pointer;border-radius:6px">刪除帳號</button>',
'                        </div>',
'                      </div>',
'                    </sc-if>',
'                  </div>',
'                </sc-if>',
'',
R00A].join('\n');
must(R00A, RADM);

/* 9b. S-02 任務分區：依狀態切成獨立區塊，每一區有自己的框與標題列 */
const GRP_OLD = [
'                <sc-for list="{{ taskGroups }}" as="g" hint-placeholder-count="2">',
'                  <div>',
'                    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:11px;flex-wrap:wrap">',
'                      <span style="{{ g.tagStyle }}">{{ g.tag }}</span>',
'                      <span style="font:400 22px/1.5 \'C11\';color:#8A8073;text-wrap:pretty">{{ g.desc }}</span>',
'                    </div>',
'                    <div style="display:flex;flex-direction:column;gap:8px">'
].join('\n');
const GRP_NEW = [
'                <sc-for list="{{ taskGroups }}" as="g" hint-placeholder-count="2">',
'                  <div style="{{ g.boxStyle }}">',
'                    <div style="{{ g.headStyle }}">',
'                      <span style="{{ g.tagStyle }}">{{ g.tag }}</span>',
'                      <span style="font:700 22px/1 \'C11\';color:{{ g.countColor }}">{{ g.count }}</span>',
'                      <span style="flex:1;min-width:180px;font:400 22px/1.5 \'C11\';color:#8A8073;text-wrap:pretty">{{ g.desc }}</span>',
'                    </div>',
'                    <div style="display:flex;flex-direction:column;gap:8px;padding:13px 14px 14px">'
].join('\n');
must(GRP_OLD, GRP_NEW);

/* 10a. S-02 採集進度：這一層要收集幾塊、集滿會換到什麼 */
const CAL_ANCHOR = '              <sc-if value="{{ hasTasks }}" hint-placeholder-val="{{ true }}">\n                <div style="margin:24px var(--pad) 0;padding:16px 19px;background:#14110E;border:1px solid #26211C;display:flex;flex-wrap:wrap;gap:16px;align-items:center">';
must(CAL_ANCHOR, [
'              <sc-if value="{{ hasTasks }}" hint-placeholder-val="{{ true }}">',
'                <div style="margin:24px var(--pad) 0;padding:18px 19px;background:linear-gradient(150deg,rgba(233,179,65,.05),transparent 58%),#14110E;border:1px solid #3A3026">',
'                  <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:12px">',
'                    <span style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">這一層的採集進度</span>',
'                    <span style="font:700 33px/1 \'C11\';color:#E9B341">{{ collectDone }}</span>',
'                    <span style="font:400 22px/1 \'C11\';color:#8A8073">/ {{ collectTotal }} 塊</span>',
'                  </div>',
'                  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">',
'                    <sc-for list="{{ collectCells }}" as="c" hint-placeholder-count="6">',
'                      <span style="{{ c.box }}">',
'                        <span style="{{ c.icon }}"></span>',
'                        <span style="display:block;font:400 11px/1.3 \'C11\';margin-top:6px;color:{{ c.color }};white-space:nowrap">{{ c.name }}</span>',
'                      </span>',
'                    </sc-for>',
'                  </div>',
'                  <div style="display:flex;flex-direction:column;gap:9px;margin-top:15px">',
'                    <sc-for list="{{ collectBars }}" as="b" hint-placeholder-count="2">',
'                      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:11px">',
'                        <span style="font:400 11px/1 \'C11\';letter-spacing:.1em;color:#5F574C;width:82px;flex:none">{{ b.label }}</span>',
'                        <span style="flex:none;font:700 22px/1 \'C11\';color:{{ b.color }};width:56px">{{ b.count }}</span>',
'                        <span style="display:flex;gap:3px;flex:none">',
'                          <sc-for list="{{ b.pips }}" as="p" hint-placeholder-count="3">',
'                            <span style="{{ p.style }}"></span>',
'                          </sc-for>',
'                        </span>',
'                        <span style="flex:1;min-width:150px;font:400 22px/1.6 \'C11\';color:#8A8073;text-wrap:pretty">{{ b.note }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                  <div style="margin-top:15px;padding-top:13px;border-top:1px solid #26211C">',
'                    <div style="font:400 22px/1.6 \'C11\';color:{{ collectNextColor }};text-wrap:pretty">{{ collectNext }}</div>',
'                    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-top:11px">',
'                      <sc-for list="{{ collectChain }}" as="ch" hint-placeholder-count="5">',
'                        <span style="{{ ch.style }}">{{ ch.text }}</span>',
'                      </sc-for>',
'                    </div>',
'                  </div>',
'                </div>',
'              </sc-if>',
'',
'              <sc-if value="{{ hasTasks }}" hint-placeholder-val="{{ true }}">',
'                <div style="margin:24px var(--pad) 0;padding:16px 19px;background:#14110E;border:1px solid #26211C;display:flex;flex-wrap:wrap;gap:16px;align-items:center">'
].join('\n'));

/* 10b. S-02 工具校準：整塊改寫成看得懂的說明 */
const CAL_OLD = [
'                <div style="margin:24px var(--pad) 0;padding:16px 19px;background:#14110E;border:1px solid #26211C;display:flex;flex-wrap:wrap;gap:16px;align-items:center">',
'                  <div style="flex:1;min-width:210px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">工具校準 · 預估階級</div>',
'                    <div style="display:flex;align-items:baseline;gap:11px;margin-top:9px">',
'                      <span style="font:700 33px/1 \'C11\';color:#E9B341">{{ estLevel }}</span>',
'                      <span style="font:400 11px/1.6 \'C11\';color:#8A8073">延伸項 {{ estExt }}</span>',
'                    </div>',
'                  </div>',
'                  <div style="flex:1.4;min-width:230px;font:400 11px/1.7 \'C11\';color:#8A8073;text-wrap:pretty">階級只看你做了幾項延伸項，不看做得多好。這是系統試算，最後由他在關卡審核時定。</div>',
'                </div>'
].join('\n');
const CAL_NEW = [
'                <div style="margin:24px var(--pad) 0;padding:18px 19px;background:#14110E;border:1px solid #26211C">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">工具校準</div>',
'                  <div style="font:700 22px/1.5 \'C11\';color:#E8E2D6;margin-top:9px;text-wrap:pretty">{{ calHeadline }}</div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:6px;text-wrap:pretty">{{ calPlain }}</div>',
'                  <div style="display:flex;flex-wrap:wrap;gap:13px;align-items:flex-start;margin-top:12px">',
'                    <span style="{{ calToolIcon }}"></span>',
'                    <div style="flex:1;min-width:200px">',
'                      <div style="font:700 22px/1.4 \'C11\';color:{{ calToolColor }}">{{ calToolName }}</div>',
'                      <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:4px;text-wrap:pretty">{{ calToolDesc }}</div>',
'                    </div>',
'                  </div>',
'                  <div style="display:flex;flex-wrap:wrap;gap:20px;align-items:baseline;margin-top:16px;padding-top:14px;border-top:1px solid #221E19">',
'                    <div>',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">現在會拿到</div>',
'                      <div style="font:700 33px/1 \'C11\';color:#E9B341;margin-top:8px">{{ estLevel }}</div>',
'                    </div>',
'                    <div>',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">延伸項做了幾項</div>',
'                      <div style="font:700 33px/1 \'C11\';color:#C3BAAA;margin-top:8px">{{ estExt }}</div>',
'                    </div>',
'                  </div>',
'                  <div style="display:flex;gap:3px;margin-top:14px">',
'                    <sc-for list="{{ calSteps }}" as="s" hint-placeholder-count="4">',
'                      <div style="{{ s.style }}"><span style="display:block;font:500 11px/1 \'C11\'">{{ s.label }}</span><span style="display:block;font:400 11px/1 \'C11\';opacity:.6;margin-top:5px">{{ s.need }}</span></div>',
'                    </sc-for>',
'                  </div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:{{ calNextColor }};margin-top:13px;text-wrap:pretty">{{ calNext }}</div>',
'                  <div style="display:flex;flex-direction:column;gap:7px;margin-top:15px;padding-top:13px;border-top:1px solid #221E19">',
'                    <sc-for list="{{ calNotes }}" as="n" hint-placeholder-count="3">',
'                      <div style="display:flex;gap:9px;align-items:flex-start">',
'                        <span style="font:400 11px/1.7 \'C11\';color:#5F574C;flex:none">·</span>',
'                        <span style="font:400 22px/1.6 \'C11\';color:#8A8073;text-wrap:pretty">{{ n.t }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                </div>'
].join('\n');
must(CAL_OLD, '');

/* 11. S-02 每一項：完成之後會採到什麼 */
const REWARD_BLOCK = (v) => [
'                          <sc-if value="{{ ' + v + '.hasReward }}" hint-placeholder-val="{{ true }}">',
'                            <div style="{{ ' + v + '.rewardBox }}">',
'                              <span style="{{ ' + v + '.rewardIcon }}"></span>',
'                              <span style="flex:1;min-width:0">',
'                                <span style="display:block;font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">{{ ' + v + '.rewardLabel }}</span>',
'                                <span style="display:block;font:500 22px/1.4 \'C11\';margin-top:5px;color:{{ ' + v + '.rewardColor }}">{{ ' + v + '.rewardName }}</span>',
'                                <span style="display:block;font:400 22px/1.6 \'C11\';color:#6E665A;margin-top:6px;text-wrap:pretty">{{ ' + v + '.rewardNote }}</span>',
'                              </span>',
'                            </div>',
'                          </sc-if>'
].join('\n');

const S02ROW = [
'                          <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:2px;text-wrap:pretty"><span style="color:#5F574C">要注意的　</span>{{ t.note }}</div>',
'                          <sc-if value="{{ t.hasFeedback }}" hint-placeholder-val="{{ false }}">'
].join('\n');
must(S02ROW, [
'                          <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:2px;text-wrap:pretty"><span style="color:#5F574C">要注意的　</span>{{ t.note }}</div>',
REWARD_BLOCK('t'),
'                          <sc-if value="{{ t.hasFeedback }}" hint-placeholder-val="{{ false }}">'
].join('\n'));

/* 12. S-02 關卡卡：這一層通過可得 */
const GATECARD = [
'                    <button onClick="{{ goSubmitGate }}" style="{{ gateBtnStyle }}">{{ gateBtn }}</button>',
'                  </div>',
'                </div>'
].join('\n');
must(GATECARD, [
'                    <button onClick="{{ goSubmitGate }}" style="{{ gateBtnStyle }}">{{ gateBtn }}</button>',
'                  </div>',
'                </div>'
].join('\n'));

/* 12b. S-02 關卡卡：送關卡的依據＝手上的礦石，沒採到的整格黑掉 */
const GATE_BTN = '                    <button onClick="{{ goSubmitGate }}" style="{{ gateBtnStyle }}">{{ gateBtn }}</button>';
must(GATE_BTN, [
'                  </div>',
'                  <div style="margin-top:16px;padding-top:14px;border-top:1px solid #26211C">',
'                    <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:11px;margin-bottom:12px">',
'                      <span style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">送關卡的依據 · 必要項的礦石</span>',
'                      <span style="font:500 22px/1 \'C11\';color:{{ gateNeedColor }}">{{ gateNeed }}</span>',
'                    </div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:8px">',
'                      <sc-for list="{{ gateMinerals }}" as="gm" hint-placeholder-count="3">',
'                        <span style="{{ gm.box }}">',
'                          <span style="{{ gm.icon }}"></span>',
'                          <span style="display:block;font:500 11px/1.4 \'C11\';margin-top:7px;color:{{ gm.nameColor }};white-space:nowrap">{{ gm.name }}</span>',
'                          <span style="display:block;font:400 11px/1.4 \'C11\';margin-top:4px;color:{{ gm.stateColor }};white-space:nowrap">{{ gm.state }}</span>',
'                        </span>',
'                      </sc-for>',
'                    </div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:{{ gateNeedColor }};margin-top:13px;text-wrap:pretty">{{ gateNeedNote }}</div>',
'                    <sc-if value="{{ hasVeinNote }}" hint-placeholder-val="{{ true }}">',
'                      <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:11px;padding-top:11px;border-top:1px solid #26211C;text-wrap:pretty">{{ veinNote }}</div>',
'                    </sc-if>',
'                  </div>',
'                  <div style="display:flex;justify-content:flex-end;margin-top:14px">',
GATE_BTN].join('\n'));

/* 13. S-05 提交頁：同一塊物證預告 */
const S05COND = [
'                <div style="padding:14px 16px;background:#14110E;border:1px solid #26211C">',
'                  <div style="font:400 22px/1.7 \'C11\';color:#9A9184;text-wrap:pretty"><span style="color:#5F574C">通過條件　</span>{{ openTaskCond }}</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#8A8073;text-wrap:pretty"><span style="color:#5F574C">要注意的　</span>{{ openTaskNote }}</div>',
'                </div>'
].join('\n');
must(S05COND, S05COND + '\n' + [
'                <sc-if value="{{ openReward.hasReward }}" hint-placeholder-val="{{ true }}">',
'                  <div style="{{ openReward.rewardBox }}">',
'                    <span style="{{ openReward.rewardIcon }}"></span>',
'                    <span style="flex:1;min-width:0">',
'                      <span style="display:block;font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">{{ openReward.rewardLabel }}</span>',
'                      <span style="display:block;font:500 22px/1.4 \'C11\';margin-top:5px;color:{{ openReward.rewardColor }}">{{ openReward.rewardName }}</span>',
'                      <span style="display:block;font:400 22px/1.6 \'C11\';color:#6E665A;margin-top:4px;text-wrap:pretty">{{ openReward.rewardNote }}</span>',
'                    </span>',
'                  </div>',
'                </sc-if>'
].join('\n'));

/* 12c. 送審三格：先說清楚為什麼問這三題 */
const SUB_FIELDS = '                <sc-for list="{{ gateFields }}" as="f" hint-placeholder-count="3">';
must(SUB_FIELDS, [
'                <div style="padding:15px 17px;background:linear-gradient(140deg,rgba(233,179,65,.06),transparent 62%),#14110E;border:1px solid #3A3026">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">為什麼問這三題</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:9px;text-wrap:pretty">{{ gateWhy }}</div>',
'                  <div style="display:flex;flex-direction:column;gap:7px;margin-top:13px">',
'                    <sc-for list="{{ gateWhyRows }}" as="w" hint-placeholder-count="3">',
'                      <div style="display:flex;gap:10px;align-items:flex-start">',
'                        <span style="font:600 11px/1 \'C11\';color:#0B0A09;background:#5A4A2C;padding:5px 7px;flex:none">{{ w.n }}</span>',
'                        <span style="font:400 22px/1.6 \'C11\';color:#8A8073;text-wrap:pretty">{{ w.t }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                </div>',
SUB_FIELDS].join('\n'));

/* 13a. S-05：被退回時，明白告訴他這是第幾次重交，並把往返紀錄攤開 */
const S05FB = [
'                <sc-if value="{{ openTaskHasFeedback }}" hint-placeholder-val="{{ false }}">',
'                  <div style="padding:14px 16px;background:rgba(217,96,63,.07);border-left:2px solid #D9603F">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#D9603F">需補充 · 他的理由</div>',
'                    <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:7px;text-wrap:pretty">{{ openTaskFeedback }}</div>',
'                    <div style="font:400 11px/1 \'C11\';color:#5F574C;margin-top:9px">重新提交次數不限</div>',
'                  </div>',
'                </sc-if>'
].join('\n');
must(S05FB, [
'                <sc-if value="{{ isRetry }}" hint-placeholder-val="{{ false }}">',
'                  <div style="padding:16px 18px;background:linear-gradient(140deg,rgba(217,96,63,.12),transparent 62%),#17110F;border:1px solid rgba(217,96,63,.42)">',
'                    <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:11px">',
'                      <span style="font:700 33px/1 \'C11\';color:#D9603F">{{ retryTitle }}</span>',
'                      <span style="font:400 22px/1 \'C11\';color:#8A8073">{{ retryCount }}</span>',
'                    </div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#C3BAAA;margin-top:9px;text-wrap:pretty">{{ retryHint }}</div>',
'                  </div>',
'                </sc-if>',
S05FB,
'                <sc-if value="{{ hasHistory }}" hint-placeholder-val="{{ false }}">',
'                  <div style="padding:15px 17px;background:#100E0C;border:1px solid #2E2822">',
'                    <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:11px;margin-bottom:4px">',
'                      <span style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">你在這一項上的往返紀錄</span>',
'                      <span style="font:400 11px/1 \'C11\';color:#8A8073">{{ historyNote }}</span>',
'                    </div>',
'                    <div style="display:flex;flex-direction:column;gap:9px;margin-top:11px">',
'                      <sc-for list="{{ history }}" as="h" hint-placeholder-count="2">',
'                        <div style="{{ h.box }}">',
'                          <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:9px">',
'                            <span style="font:700 22px/1 \'C11\';color:{{ h.color }}">{{ h.label }}</span>',
'                            <span style="font:400 11px/1 \'C11\';color:#8A8073">{{ h.meta }}</span>',
'                            <span style="{{ h.effortChip }}">{{ h.effortLabel }}</span>',
'                          </div>',
'                          <div style="font:400 22px/1.6 \'C11\';color:#9A9184;margin-top:8px;text-wrap:pretty">{{ h.text }}</div>',
'                          <sc-if value="{{ h.hasReason }}" hint-placeholder-val="{{ true }}">',
'                            <div style="margin-top:9px;padding-top:8px;border-top:1px solid #26211C">',
'                              <span style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:{{ h.color }}">他的理由</span>',
'                              <div style="font:400 22px/1.6 \'C11\';color:#C3BAAA;margin-top:6px;text-wrap:pretty">{{ h.reason }}</div>',
'                            </div>',
'                          </sc-if>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                    <sc-if value="{{ canCopyPrev }}" hint-placeholder-val="{{ false }}">',
'                      <button onClick="{{ copyPrev }}" style="margin-top:12px;font:400 22px/1 \'C11\';color:#8A8073;background:none;border:1px dashed #3A3026;padding:11px 15px;cursor:pointer">把上一次的內容帶進來改</button>',
'                    </sc-if>',
'                  </div>',
'                </sc-if>'
].join('\n'));

/* 13b. S-05：這一組現在的狀態（送出前的自我判斷，老師會先看到這一段） */
const S05TEXT = '                  <textarea onChange="{{ setSubmitText }}" value="{{ submitText }}" placeholder="例：訪談三位大三生之後，把題目收斂成「畢製組隊後的分工失衡」，範圍縮到系上，排除跨校比較。" style="width:100%;min-height:108px;padding:13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.7 \'C11\';resize:vertical;outline:none"></textarea>\n                </div>';
must(S05TEXT, S05TEXT + '\n' + [
'                <div style="padding:15px 16px;background:linear-gradient(140deg,rgba(233,179,65,.055),transparent 62%),#14110E;border:1px solid #3A3026">',
'                  <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:10px">',
'                    <span style="font:500 22px/1 \'C11\';color:#E8E2D6">這一組現在的狀態</span>',
'                    <span style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#E9B341">會跟這一項一起送給他</span>',
'                  </div>',
'                  <div style="font:400 11px/1.7 \'C11\';color:#6E665A;margin-top:7px;text-wrap:pretty">專題最難的一件事是估準自己。他驗收的不只是東西，還有你們對自己的判斷準不準——這一段就是你們這邊的說法。</div>',
'                  <div style="margin-top:14px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C;margin-bottom:9px">這一項實際花的力氣，跟你們原本估的比</div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:7px">',
'                      <sc-for list="{{ effortPicks }}" as="ep" hint-placeholder-count="3">',
'                        <button onClick="{{ ep.pick }}" style="{{ ep.style }}">{{ ep.label }}</button>',
'                      </sc-for>',
'                    </div>',
'                  </div>',
'                  <div style="margin-top:14px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C;margin-bottom:8px">為什麼差這麼多（一句話就好）</div>',
'                    <input value="{{ effortNote }}" onChange="{{ setEffortNote }}" placeholder="例：訪談約不到人，等了一週才排上。" style="width:100%;padding:12px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.5 \'C11\';outline:none">',
'                  </div>',
'                  <div style="margin-top:14px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C;margin-bottom:8px">現在卡在哪（沒有就留空）</div>',
'                    <textarea onChange="{{ setBlocker }}" value="{{ blocker }}" placeholder="例：兩個人對範圍的理解還不一樣，下一項開始前要先講清楚。" style="width:100%;min-height:62px;padding:12px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.7 \'C11\';resize:vertical;outline:none"></textarea>',
'                  </div>',
'                </div>'
].join('\n'));

/* 14. S-05 證據區：真實上傳（檔名、大小、檢視、移除、連結、上傳中） */
const EV_OLD = [
'                  <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px">',
'                    <sc-for list="{{ evidence }}" as="e" hint-placeholder-count="2">',
'                      <span style="display:inline-flex;align-items:center;gap:8px;padding:8px 11px;background:#14110E;border:1px solid #2E2822;font:400 22px/1 \'C11\';color:#C3BAAA">{{ e.name }}<button onClick="{{ e.remove }}" style="background:none;border:none;color:#6E665A;cursor:pointer;font:400 22px/1 \'C11\';padding:0">×</button></span>',
'                    </sc-for>',
'                  </div>',
'                  <div style="display:flex;flex-wrap:wrap;gap:7px">',
'                    <sc-for list="{{ evidenceAdders }}" as="a" hint-placeholder-count="4">',
'                      <button onClick="{{ a.add }}" style="padding:9px 13px;background:none;border:1px dashed #3A3026;color:#8A8073;font:400 22px/1 \'C11\';cursor:pointer">＋ {{ a.label }}</button>',
'                    </sc-for>',
'                  </div>'
].join('\n');
const EV_NEW = [
'                  <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:10px">',
'                    <sc-for list="{{ evidence }}" as="e" hint-placeholder-count="2">',
'                      <span style="display:flex;align-items:center;gap:10px;padding:9px 11px;background:#14110E;border:1px solid #2E2822">',
'                        <span style="{{ e.iconStyle }}"></span>',
'                        <span style="flex:1;min-width:0">',
'                          <span style="display:block;font:400 22px/1.4 \'C11\';color:#C3BAAA;word-break:break-all">{{ e.name }}</span>',
'                          <span style="display:block;font:400 11px/1 \'C11\';color:#5F574C;margin-top:4px">{{ e.meta }}</span>',
'                        </span>',
'                        <sc-if value="{{ e.canOpen }}" hint-placeholder-val="{{ true }}">',
'                          <button onClick="{{ e.open }}" style="flex:none;background:none;border:1px solid #2E2822;color:#8A8073;cursor:pointer;font:400 11px/1 \'C11\';padding:7px 10px;white-space:nowrap">檢視</button>',
'                        </sc-if>',
'                        <button onClick="{{ e.remove }}" style="flex:none;background:none;border:none;color:#6E665A;cursor:pointer;font:400 22px/1 \'C11\';padding:0 4px">×</button>',
'                      </span>',
'                    </sc-for>',
'                  </div>',
'                  <sc-if value="{{ uploading }}" hint-placeholder-val="{{ false }}">',
'                    <div style="margin-bottom:10px;padding:10px 12px;background:rgba(233,179,65,.06);border:1px solid #3A3026;font:400 11px/1.7 \'C11\';color:#E9B341">{{ uploadNote }}</div>',
'                  </sc-if>',
'                  <div style="display:flex;flex-wrap:wrap;gap:7px">',
'                    <sc-for list="{{ evidenceAdders }}" as="a" hint-placeholder-count="4">',
'                      <button onClick="{{ a.add }}" style="padding:9px 13px;background:none;border:1px dashed #3A3026;color:#8A8073;font:400 22px/1 \'C11\';cursor:pointer">＋ {{ a.label }}</button>',
'                    </sc-for>',
'                  </div>',
'                  <sc-if value="{{ linkOpen }}" hint-placeholder-val="{{ false }}">',
'                    <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:9px">',
'                      <input value="{{ linkDraft }}" onChange="{{ setLinkDraft }}" placeholder="貼上網址，例：figma.com/file/…" style="flex:1;min-width:180px;padding:11px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.4 \'C11\';outline:none">',
'                      <button onClick="{{ addLink }}" style="padding:11px 15px;background:none;border:1px solid #5A4A2C;color:#E9B341;font:400 22px/1 \'C11\';cursor:pointer;white-space:nowrap">加入連結</button>',
'                    </div>',
'                  </sc-if>',
'                  <div style="margin-top:9px;font:400 22px/1.6 \'C11\';color:#5F574C;text-wrap:pretty">{{ uploadHint }}</div>'
].join('\n');
must(EV_OLD, EV_NEW);

/* 14b. T-06：先看到他們對自己的判斷，再寫合格考量 */
const T06AFTER = [
'                  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:9px">',
'                    <sc-for list="{{ revFiles }}" as="f" hint-placeholder-count="2">'
].join('\n');
must(T06AFTER, [
'                  <sc-if value="{{ hasSelfCall }}" hint-placeholder-val="{{ true }}">',
'                    <div style="margin-top:11px;padding:14px 16px;background:linear-gradient(140deg,rgba(233,179,65,.05),transparent 62%),#12100D;border:1px solid #3A3026">',
'                      <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:10px">',
'                        <span style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">他們對自己的判斷</span>',
'                        <span style="{{ selfEffortChip }}">{{ selfEffortLabel }}</span>',
'                      </div>',
'                      <sc-if value="{{ hasSelfNote }}" hint-placeholder-val="{{ true }}">',
'                        <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:9px;text-wrap:pretty">{{ selfNote }}</div>',
'                      </sc-if>',
'                      <sc-if value="{{ hasBlocker }}" hint-placeholder-val="{{ false }}">',
'                        <div style="margin-top:11px;padding-top:10px;border-top:1px solid #26211C">',
'                          <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#D9603F">他們說現在卡在</div>',
'                          <div style="font:400 22px/1.7 \'C11\';color:#E8C4B6;margin-top:7px;text-wrap:pretty">{{ blockerText }}</div>',
'                        </div>',
'                      </sc-if>',
'                      <div style="font:400 22px/1.6 \'C11\';color:#5F574C;margin-top:11px;text-wrap:pretty">{{ selfHint }}</div>',
'                    </div>',
'                  </sc-if>',
T06AFTER].join('\n'));

/* 14c. 甘特圖：欄位數改成依實際學期長度，加橫向捲動 */
const G_HEAD = '                <div style="display:flex;gap:0;padding-left:{{ ganttHeadPad }};border-bottom:1px solid #221E19;margin-bottom:9px">';
must(G_HEAD, [
'                <div style="{{ ganttHowToStyle }}">{{ ganttHowTo }}</div>',
'                <div style="overflow-x:auto;padding-bottom:6px">',
'                <div style="min-width:{{ ganttMinWidth }}">',
G_HEAD].join('\n'));

const G_TAIL = [
'                    </span>',
'                  </div>',
'                </div>',
'                <div style="display:flex;flex-wrap:wrap;gap:14px;margin-top:12px;font:400 11px/1 \'C11\';color:#5F574C">',
'                  <span>實心 · 你排的那一週</span><span>斜紋 · 期限之後</span><span>✓ · 已通過</span><span>… · 待老師確認</span>',
'                </div>'
].join('\n');
must(G_TAIL, [
'                    </span>',
'                  </div>',
'                </div>',
'                </div>',
'                </div>',
'                <div style="display:flex;flex-wrap:wrap;gap:9px;margin-top:14px">',
'                  <sc-for list="{{ ganttLegend }}" as="lg" hint-placeholder-count="5">',
'                    <span style="display:inline-flex;align-items:center;gap:8px;padding:7px 11px;background:rgba(0,0,0,.26);border:1px solid #26211C">',
'                      <span style="{{ lg.swatch }}">{{ lg.mark }}</span>',
'                      <span style="font:400 22px/1 \'C11\';color:#9A9184;white-space:nowrap">{{ lg.label }}</span>',
'                    </span>',
'                  </sc-for>',
'                </div>'
].join('\n'));

/* 14d. T-05 時間限制：可以直接挑日期，不再只有四個星期幾 */
const DUE_TAIL = '                    <div style="margin-top:12px;padding:11px 13px;background:rgba(233,179,65,.07);border:1px solid #3A3026;font:400 22px/1.5 \'C11\';color:#E8E2D6">學生看到的期限：{{ duePreview }}</div>';
must(DUE_TAIL, [
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#5F574C;margin:13px 0 7px">或直接挑一個日期</div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">',
'                      <input type="date" value="{{ dueDateValue }}" onChange="{{ setDueDate }}" style="flex:1;min-width:170px;padding:11px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.4 \'C11\';outline:none;color-scheme:dark">',
'                      <span style="font:400 11px/1.6 \'C11\';color:#5F574C;flex:1;min-width:150px;text-wrap:pretty">{{ dueDateNote }}</span>',
'                    </div>',
DUE_TAIL].join('\n'));

/* 14e. 拿掉層級詳情下面的「工具架 · 五個位置」——跟收藏總覽的道具區重複 */
const RACK = [
'              <sc-if value="{{ vLayer }}" hint-placeholder-val="{{ false }}">',
'              <div style="margin:20px var(--pad) 0;padding:15px 17px;background:#14110E;border:1px solid #26211C">',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C;margin-bottom:11px">工具架 · 五個位置</div>',
'                <div style="display:flex;flex-wrap:wrap;gap:8px">',
'                  <sc-for list="{{ rack }}" as="r" hint-placeholder-count="5">',
'                    <button onClick="{{ r.open }}" style="{{ r.style }}"><span style="{{ r.iconStyle }}"></span><span style="font:500 11px/1.3 \'C11\';margin-top:7px;display:block">{{ r.label }}</span><span style="font:400 11px/1.4 \'C11\';color:#8A8073;margin-top:5px;display:block">{{ r.layerLabel }}</span><span style="font:400 11px/1 \'C11\';color:#5F574C;margin-top:4px;display:block">{{ r.lv }}</span></button>',
'                  </sc-for>',
'                </div>',
'              </div>',
'              </sc-if>'
].join('\n');
must(RACK, '              <!-- 工具架已移除：道具一覽統一在「收藏總覽」看 -->');

/* 14f. T-06 往返紀錄：改成真實的每一輪（他們交了什麼、當時怎麼判斷自己、你怎麼回） */
const T06R = [
'                <sc-if value="{{ hasRounds }}" hint-placeholder-val="{{ false }}">',
'                  <div>',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#D9603F;margin-bottom:9px">往返紀錄 · 這一項已退回 {{ roundCount }} 次</div>',
'                    <div style="display:flex;flex-direction:column;gap:6px">',
'                      <sc-for list="{{ rounds }}" as="r" hint-placeholder-count="1">',
'                        <div style="padding:11px 13px;background:rgba(217,96,63,.06);border-left:2px solid rgba(217,96,63,.4)">',
'                          <div style="font:400 11px/1 \'C11\';color:#5F574C">第 {{ r.n }} 輪 · 你當時的理由</div>',
'                          <div style="font:400 11px/1.7 \'C11\';color:#C3BAAA;margin-top:6px;text-wrap:pretty">{{ r.reason }}</div>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                  </div>',
'                </sc-if>'
].join('\n');
must(T06R, [
'                <sc-if value="{{ hasRounds }}" hint-placeholder-val="{{ false }}">',
'                  <div>',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#D9603F;margin-bottom:9px">往返紀錄 · {{ roundCount }}</div>',
'                    <div style="display:flex;flex-direction:column;gap:8px">',
'                      <sc-for list="{{ rounds }}" as="r" hint-placeholder-count="1">',
'                        <div style="{{ r.box }}">',
'                          <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:9px">',
'                            <span style="font:700 22px/1 \'C11\';color:{{ r.color }}">{{ r.label }}</span>',
'                            <span style="font:400 11px/1 \'C11\';color:#8A8073">{{ r.meta }}</span>',
'                            <span style="{{ r.effortChip }}">{{ r.effortLabel }}</span>',
'                          </div>',
'                          <div style="font:400 22px/1.6 \'C11\';color:#9A9184;margin-top:8px;text-wrap:pretty">{{ r.text }}</div>',
'                          <sc-if value="{{ r.hasReason }}" hint-placeholder-val="{{ true }}">',
'                            <div style="margin-top:9px;padding-top:8px;border-top:1px solid #26211C">',
'                              <span style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:{{ r.color }}">你當時的理由</span>',
'                              <div style="font:400 22px/1.6 \'C11\';color:#C3BAAA;margin-top:6px;text-wrap:pretty">{{ r.reason }}</div>',
'                            </div>',
'                          </sc-if>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:11px;text-wrap:pretty">{{ roundsNote }}</div>',
'                  </div>',
'                </sc-if>'
].join('\n'));

/* 15. T-06：附件可以點開來看 */
const T06F = [
'                    <sc-for list="{{ revFiles }}" as="f" hint-placeholder-count="2">',
'                      <span style="padding:7px 11px;background:#14110E;border:1px solid #2E2822;font:400 11px/1 \'C11\';color:#8A8073">{{ f.name }}</span>',
'                    </sc-for>'
].join('\n');
must(T06F, [
'                    <sc-for list="{{ revFiles }}" as="f" hint-placeholder-count="2">',
'                      <button onClick="{{ f.open }}" style="{{ f.style }}"><span style="{{ f.iconStyle }}"></span><span style="font:400 11px/1.4 \'C11\'">{{ f.name }}</span><span style="font:400 11px/1 \'C11\';color:#5F574C">{{ f.meta }}</span></button>',
'                    </sc-for>'
].join('\n'));

/* 15a. 研究者端每一頁都標出「這一頁在看學生端與老師端的什麼動作」 */
const RES_UNLOCK = '                <div style="flex:none;padding:11px 24px;border-bottom:1px solid #1D2831;background:#0C1116;font-family:\'IBM Plex Mono\',monospace;font-size:11.5px;letter-spacing:.04em;color:#B7C3CC">{{ resVals.unlockLine }}</div>';
must(RES_UNLOCK, RES_UNLOCK + '\n' + [
'                <sc-if value="{{ resVals.hasSource }}" hint-placeholder-val="{{ true }}">',
'                  <div style="flex:none;padding:12px 24px;border-bottom:1px solid #1D2831;background:#0A0E12">',
'                    <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px">',
'                      <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.2em;color:#5A6874;flex:none">資料從哪裡來</span>',
'                      <sc-for list="{{ resVals.sourceChain }}" as="sc" hint-placeholder-count="3">',
'                        <span style="{{ sc.style }}">',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.1em;opacity:.75">{{ sc.end }}</span>',
'                          <span style="font-family:\'Noto Sans TC\',sans-serif;font-size:12.5px">{{ sc.screen }}</span>',
'                        </span>',
'                      </sc-for>',
'                    </div>',
'                    <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:12.5px;line-height:1.85;color:#8393A0;margin-top:9px;text-wrap:pretty">{{ resVals.sourceNote }}</div>',
'                  </div>',
'                </sc-if>'
].join('\n'));

/* 15a2. R-02：四型編碼要有準則，不然那四個標籤沒有操作定義 */
const R02BARS = '                      <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.12em;color:#5A6874;margin-bottom:12px">四型比例</div>';
must(R02BARS, [
'                      <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.12em;color:#5A6874;margin-bottom:6px">四型比例</div>',
'                      <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:12.5px;line-height:1.85;color:#8393A0;margin-bottom:12px">你在左邊逐則編碼之後，這裡才會長出來。四型是分析「老師的回饋長什麼樣」用的，不是評老師好壞。</div>',
'                      <div style="padding:13px 15px;background:#0C1116;border:1px solid #1D2831;border-radius:9px;margin-bottom:14px">',
'                        <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.12em;color:#D9A45C">編碼準則 · 由上往下判斷，符合就停</div>',
'                        <div style="display:flex;flex-direction:column;gap:9px;margin-top:11px">',
'                          <sc-for list="{{ resVals.codebook }}" as="cb" hint-placeholder-count="5">',
'                            <div style="display:flex;gap:11px;align-items:flex-start">',
'                              <span style="{{ cb.tagStyle }}">{{ cb.tag }}</span>',
'                              <span style="flex:1;min-width:0">',
'                                <span style="display:block;font-family:\'Noto Sans TC\',sans-serif;font-size:13px;line-height:1.8;color:#DFE6EB">{{ cb.rule }}</span>',
'                                <span style="display:block;font-family:\'Noto Sans TC\',sans-serif;font-size:12.5px;line-height:1.8;color:#8393A0;margin-top:4px">{{ cb.example }}</span>',
'                              </span>',
'                            </div>',
'                          </sc-for>',
'                        </div>',
'                        <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;line-height:1.8;color:#5A6874;margin-top:11px">{{ resVals.codebookNote }}</div>',
'                      </div>'
].join('\n'));

/* 15b. R-02：把老師的合格考量跟學生那一邊接起來，看得到整輪來回 */
const R02PICK = [
'                            <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:14px;line-height:2;color:#DFE6EB;margin-top:12px">{{ resVals.pickText }}</div>',
'                            <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.12em;color:#5A6874;margin:20px 0 9px">語言類型編碼 · 只存在研究者端</div>'
].join('\n');
must(R02PICK, [
'                            <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:14px;line-height:2;color:#DFE6EB;margin-top:12px">{{ resVals.pickText }}</div>',
'                            <sc-if value="{{ resVals.hasStudentSide }}" hint-placeholder-val="{{ true }}">',
'                              <div style="margin-top:20px;padding-top:16px;border-top:1px solid #1D2831">',
'                                <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.12em;color:#5A6874">學生那一邊 · 同一輪</div>',
'                                <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:10px">',
'                                  <sc-for list="{{ resVals.pickTags }}" as="pt" hint-placeholder-count="3">',
'                                    <span style="{{ pt.style }}">{{ pt.label }}</span>',
'                                  </sc-for>',
'                                </div>',
'                                <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;line-height:1.95;color:#B7C3CC;margin-top:11px">{{ resVals.pickSubText }}</div>',
'                                <sc-if value="{{ resVals.hasSelfNote }}" hint-placeholder-val="{{ false }}">',
'                                  <div style="margin-top:11px;padding:11px 13px;background:#0C1116;border-left:2px solid #59636E">',
'                                    <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.12em;color:#5A6874">他們對自己的說法</div>',
'                                    <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;line-height:1.95;color:#DFE6EB;margin-top:7px">{{ resVals.pickSelfNote }}</div>',
'                                  </div>',
'                                </sc-if>',
'                                <sc-if value="{{ resVals.hasSelfBlocker }}" hint-placeholder-val="{{ false }}">',
'                                  <div style="margin-top:8px;padding:11px 13px;background:#16202A;border-left:2px solid #D9A45C">',
'                                    <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.12em;color:#D9A45C">他們說卡在</div>',
'                                    <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;line-height:1.95;color:#DFE6EB;margin-top:7px">{{ resVals.pickBlocker }}</div>',
'                                  </div>',
'                                </sc-if>',
'                                <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;line-height:1.8;color:#5A6874;margin-top:11px">{{ resVals.pickCross }}</div>',
'                              </div>',
'                            </sc-if>',
'                            <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;letter-spacing:.12em;color:#5A6874;margin:20px 0 9px">語言類型編碼 · 只存在研究者端</div>'
].join('\n'));

/* 15c. R-01：加一組「自評 對 老師判斷」的交叉 */
const R01ABSENT = '                    <h2 style="font-family:\'Noto Serif TC\',serif;font-size:19px;font-weight:700;margin:28px 0 6px">尚未發生的事</h2>';
must(R01ABSENT, [
'                    <div style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.22em;color:#5A6874">自評 對 老師的判斷</div>',
'                    <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:13px;line-height:1.9;color:#8393A0;margin:8px 0 12px">學生送出前先說自己這一項花的力氣跟原本估的差多少，老師之後才做判斷。兩邊擺在一起，看得到他們估得準不準——這是這套系統唯一能直接觀察「自我認識」的地方。</div>',
'                    <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:26px">',
'                      <sc-for list="{{ resVals.selfCross }}" as="sc" hint-placeholder-count="3">',
'                        <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:baseline;padding:11px 13px;background:#121A21;border-left:2px solid {{ sc.color }}">',
'                          <span style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;color:#DFE6EB;min-width:150px">{{ sc.label }}</span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:15px;color:{{ sc.color }}">{{ sc.value }}</span>',
'                          <span style="flex:1;min-width:180px;font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;line-height:1.8;color:#5A6874">{{ sc.note }}</span>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
R01ABSENT].join('\n'));

/* 15d. S-01：把「規則」與「下一件事」講在最前面 */
const S01CARDS = '              <div style="padding:20px var(--pad);display:grid;grid-template-columns:repeat(auto-fit,minmax(var(--card),1fr));gap:11px">';
must(S01CARDS, [
'              <div style="margin:20px var(--pad) 0;padding:18px 19px;background:linear-gradient(150deg,rgba(233,179,65,.07),transparent 58%),#14110E;border:1px solid #3A3026">',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一層怎麼走</div>',
'                <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">',
'                  <sc-for list="{{ ruleSteps }}" as="rs" hint-placeholder-count="3">',
'                    <div style="{{ rs.box }}">',
'                      <span style="{{ rs.num }}">{{ rs.n }}</span>',
'                      <span style="flex:1;min-width:180px">',
'                        <span style="display:block;font:700 22px/1.4 \'C11\';color:{{ rs.color }}">{{ rs.title }}</span>',
'                        <span style="display:block;font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:5px;text-wrap:pretty">{{ rs.desc }}</span>',
'                      </span>',
'                      <span style="{{ rs.stateStyle }}">{{ rs.state }}</span>',
'                    </div>',
'                  </sc-for>',
'                </div>',
'                <div style="margin-top:16px;padding-top:14px;border-top:1px solid #26211C">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">下一件要做的事</div>',
'                  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:13px;margin-top:11px">',
'                    <span style="flex:1;min-width:200px;font:700 22px/1.5 \'C11\';color:#E8E2D6;text-wrap:pretty">{{ nextAction }}</span>',
'                    <sc-if value="{{ hasNextAction }}" hint-placeholder-val="{{ true }}">',
'                      <button onClick="{{ goNextAction }}" style="font:500 22px/1 \'C11\';letter-spacing:.14em;color:#0B0A09;background:#E9B341;border:none;padding:13px 20px;cursor:pointer;white-space:nowrap;clip-path:polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)">{{ nextActionBtn }}</button>',
'                    </sc-if>',
'                  </div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:9px;text-wrap:pretty">{{ nextActionWhy }}</div>',
'                </div>',
'              </div>',
'',
S01CARDS].join('\n'));

/* 15e. T-05：老師開一項的時候，看得到自己在開什麼 */
const T05HEAD = [
'                <div style="padding:15px 17px;background:linear-gradient(140deg,rgba(233,179,65,.09),transparent 65%),#14110E;border:1px solid #3A3026">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一項屬於哪個環節</div>',
'                  <div style="font:700 22px/1.5 \'C11\';color:#E8E2D6;margin-top:9px">{{ editCourse }}</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:7px;text-wrap:pretty">{{ editStageNote }}</div>',
'                </div>'
].join('\n');
must(T05HEAD, [
'                <div style="padding:16px 18px;background:linear-gradient(140deg,rgba(233,179,65,.09),transparent 62%),#14110E;border:1px solid #3A3026">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">你現在在開的是什麼</div>',
'                  <div style="font:700 22px/1.5 \'C11\';color:#E8E2D6;margin-top:10px;text-wrap:pretty">{{ openWhat }}</div>',
'                  <div style="display:flex;flex-direction:column;gap:9px;margin-top:13px">',
'                    <sc-for list="{{ openChain }}" as="oc" hint-placeholder-count="3">',
'                      <div style="display:flex;gap:11px;align-items:flex-start">',
'                        <span style="{{ oc.num }}">{{ oc.n }}</span>',
'                        <span style="flex:1;font:400 22px/1.6 \'C11\';color:#9A9184;text-wrap:pretty">{{ oc.t }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                  <div style="margin-top:14px;padding:12px 14px;background:rgba(0,0,0,.3);border-left:2px solid #5A4A2C">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">這一層現在的樣子</div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#C3BAAA;margin-top:8px;text-wrap:pretty">{{ layerShape }}</div>',
'                  </div>',
'                </div>',
T05HEAD].join('\n'));

/* 15f. 地圖／收藏／名單改成並排分頁，不再堆在同一頁往下捲 */
[['                    ', '                      '], ['                  ', '                    ']].forEach(function (ind) {
  /* 一定要連前面那個換行一起比對：18 空白的樣式是 20 空白那一行的子字串，不然會插兩次 */
  var old = String.fromCharCode(10) + ind[0] + '<button onClick="{{ mapTabColl }}" style="{{ mapTabCollStyle }}">收藏總覽</button>';
  if (t.indexOf(old) < 0) { console.error('MISS tabrow ' + ind[0].length); process.exit(1); }
  t = t.split(old).join([
    old,
    ind[0] + '<sc-if value="{{ showRosterTab }}" hint-placeholder-val="{{ false }}">',
    ind[1] + '<button onClick="{{ mapTabRoster }}" style="{{ mapTabRosterStyle }}">班級名單</button>',
    ind[0] + '</sc-if>'
  ].join('\n'));
});

/* 名單那一塊自己也帶一排分頁，並改成獨立視圖 */
const T04HEAD = [
'              <div style="padding:20px var(--pad) 0;display:flex;align-items:baseline;gap:10px">',
'                <span style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#5F574C">名單 · 依停留週數排序</span>',
'                <span style="flex:1;height:1px;background:#221E19"></span>',
'              </div>'
].join('\n');
must(T04HEAD, [
'              <div style="padding:22px var(--pad) 0">',
'                <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px">',
'                  <button onClick="{{ mapTabMap }}" style="{{ mapTabMapStyle }}">地圖剖面</button>',
'                  <button onClick="{{ mapTabColl }}" style="{{ mapTabCollStyle }}">收藏總覽</button>',
'                  <button onClick="{{ mapTabRoster }}" style="{{ mapTabRosterStyle }}">班級名單</button>',
'                </div>',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.26em;color:#5F574C">T-04 · CLASS ROSTER</div>',
'                <h1 style="font:700 33px/1.4 \'C11\';margin:10px 0 5px;letter-spacing:.04em">班級名單</h1>',
'                <p style="font:400 22px/1.7 \'C11\';color:#8A8073;margin:0 0 4px;max-width:460px;text-wrap:pretty">依停留週數排序。排最前面的不是進度最快的，是待最久的。</p>',
'              </div>'
].join('\n'));

/* 15g. 班級切換：改成獨立畫面，不再原地下拉 */
const NAVKLASS = [
'                <sc-if value="{{ klassOpen }}" hint-placeholder-val="{{ false }}">',
'                  <div style="display:flex;flex-direction:column;gap:5px;margin-top:6px">',
'                    <sc-for list="{{ klassOptions }}" as="k" hint-placeholder-count="3">',
'                      <button onClick="{{ k.pick }}" style="{{ k.style }}">',
'                        <span style="display:block;font:500 22px/1.3 \'C11\'">{{ k.name }}</span>',
'                        <span style="display:block;font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:4px">{{ k.sub }}</span>',
'                      </button>',
'                    </sc-for>',
'                  </div>',
'                </sc-if>'
].join('\n');
must(NAVKLASS, '                <!-- 班級切換改成獨立畫面 KLASS -->');

const T01KLASS = [
'                <sc-if value="{{ klassOpen }}" hint-placeholder-val="{{ false }}">',
'                  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(var(--card),1fr));gap:7px;margin-top:12px">',
'                    <sc-for list="{{ klassOptions }}" as="k" hint-placeholder-count="3">',
'                      <button onClick="{{ k.pick }}" style="{{ k.style }}">',
'                        <span style="display:block;font:500 22px/1.3 \'C11\'">{{ k.name }}</span>',
'                        <span style="display:block;font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:4px">{{ k.sub }}</span>',
'                      </button>',
'                    </sc-for>',
'                  </div>',
'                </sc-if>'
].join('\n');
must(T01KLASS, '                <!-- 班級切換改成獨立畫面 KLASS -->');

/* 新畫面：KLASS 切換班級 */
const KLASS_ANCHOR = '          <sc-if value="{{ scT04 }}" hint-placeholder-val="{{ false }}">';
must(KLASS_ANCHOR, [
'          <sc-if value="{{ scKlass }}" hint-placeholder-val="{{ false }}">',
'            <div data-screen-label="切換班級" style="padding:0 0 32px">',
'              <div style="padding:22px var(--pad) 16px;border-bottom:1px solid #221E19;display:flex;align-items:center;gap:13px">',
'                <button onClick="{{ goT01 }}" style="font:400 22px/1 \'C11\';color:#8A8073;background:none;border:1px solid #26211C;padding:8px 12px;cursor:pointer">←</button>',
'                <div>',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.26em;color:#5F574C">CLASSES</div>',
'                  <h1 style="font:700 33px/1.4 \'C11\';margin:7px 0 0">切換班級</h1>',
'                </div>',
'              </div>',
'              <div style="padding:20px var(--pad);display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:11px">',
'                <sc-for list="{{ klassCards }}" as="k" hint-placeholder-count="3">',
'                  <button onClick="{{ k.pick }}" style="{{ k.style }}">',
'                    <span style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">',
'                      <span style="font:700 22px/1.4 \'C11\';color:{{ k.nameColor }}">{{ k.name }}</span>',
'                      <span style="{{ k.badgeStyle }}">{{ k.badge }}</span>',
'                    </span>',
'                    <span style="display:block;font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:9px;text-wrap:pretty">{{ k.meta }}</span>',
'                    <span style="display:flex;align-items:baseline;gap:8px;margin-top:11px;padding-top:10px;border-top:1px solid #26211C">',
'                      <span style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">邀請碼</span>',
'                      <span style="font:700 22px/1 \'C11\';letter-spacing:.12em;color:#E9B341">{{ k.code }}</span>',
'                    </span>',
'                  </button>',
'                </sc-for>',
'              </div>',
'              <div style="margin:0 var(--pad);padding:13px 15px;background:rgba(0,0,0,.24);border-left:2px solid #3A3026;font:400 22px/1.6 \'C11\';color:#8A8073;text-wrap:pretty">邀請碼發給學生，他們自己註冊之後在名單裡點自己的名字就會進到對的組。名單由研究者建立。</div>',
'            </div>',
'          </sc-if>',
'',
KLASS_ANCHOR].join('\n'));

/* 15h. 新畫面 FINALE：結局、整學期的比對、最後的檢討 */
const FIN_ANCHOR = '          <sc-if value="{{ scKlass }}" hint-placeholder-val="{{ false }}">';
must(FIN_ANCHOR, [
'          <sc-if value="{{ scFinale }}" hint-placeholder-val="{{ false }}">',
'            <div data-screen-label="期末回顧" style="padding:0 0 40px">',
'              <div style="position:relative;padding:34px var(--pad) 28px;background:radial-gradient(700px 360px at 50% -10%,rgba(233,179,65,.18),transparent 70%),#0B0A09;border-bottom:1px solid #221E19;overflow:hidden">',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.34em;color:#8A8073">{{ finKicker }}</div>',
'                <h1 style="font:700 44px/1.2 \'C11\';letter-spacing:.14em;text-indent:.14em;color:#F2E6C8;margin:16px 0 0;text-shadow:0 0 26px rgba(233,179,65,.3)">{{ finTitle }}</h1>',
'                <p style="font:400 22px/1.8 \'C11\';color:#B6AC9C;margin:14px 0 0;max-width:520px;text-wrap:pretty">{{ finLede }}</p>',
'              </div>',
'',
'              <sc-if value="{{ finLocked }}" hint-placeholder-val="{{ false }}">',
'                <div style="margin:22px var(--pad);padding:36px 24px;border:1px dashed #2E2822;text-align:center">',
'                  <div style="font:400 22px/1.8 \'C11\';color:#8A8073;text-wrap:pretty">{{ finLockNote }}</div>',
'                </div>',
'              </sc-if>',
'',
'              <sc-if value="{{ finOpen }}" hint-placeholder-val="{{ true }}">',
'                <div style="padding:24px var(--pad) 0;display:flex;flex-direction:column;gap:22px;max-width:760px">',
'',
'                  <div style="padding:20px;background:linear-gradient(150deg,rgba(233,179,65,.09),transparent 60%),#14110E;border:1px solid #3A3026">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#E9B341">大秘寶</div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-top:14px">',
'                      <span style="{{ crownIcon }}"></span>',
'                      <div style="flex:1;min-width:220px">',
'                        <div style="font:700 33px/1.3 \'C11\';color:#F2E6C8">{{ crownName }}</div>',
'                        <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:9px;text-wrap:pretty">{{ crownLook }}</div>',
'                        <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:9px;text-wrap:pretty">{{ crownTrait }}</div>',
'                      </div>',
'                    </div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:16px">',
'                      <sc-for list="{{ crownSlots }}" as="cs" hint-placeholder-count="4">',
'                        <span style="{{ cs.box }}"><span style="{{ cs.icon }}"></span><span style="display:block;font:500 11px/1.4 \'C11\';margin-top:7px;color:{{ cs.color }}">{{ cs.name }}</span></span>',
'                      </sc-for>',
'                    </div>',
'                    <div style="margin-top:18px;padding:14px 16px;background:rgba(0,0,0,.34);border-left:2px solid #E9B341">',
'                      <div style="font:400 22px/1.9 \'C11\';color:#E8E2D6;text-wrap:pretty">{{ crownLine }}</div>',
'                      <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:11px;text-wrap:pretty">{{ crownNotice }}</div>',
'                    </div>',
'                  </div>',
'',
'                  <div style="padding:19px;background:#14110E;border:1px solid #26211C">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">這一學期你採到的</div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:20px;margin-top:14px">',
'                      <sc-for list="{{ finStats }}" as="fs" hint-placeholder-count="4">',
'                        <div style="min-width:120px">',
'                          <div style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#5F574C">{{ fs.label }}</div>',
'                          <div style="font:700 33px/1 \'C11\';color:{{ fs.color }};margin-top:9px">{{ fs.value }}</div>',
'                          <div style="font:400 11px/1.6 \'C11\';color:#8A8073;margin-top:6px">{{ fs.note }}</div>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                  </div>',
'',
'                  <div style="padding:19px;background:#14110E;border:1px solid #26211C">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">整學期 · 你排的 對 實際發生的</div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:8px;text-wrap:pretty">{{ finGanttNote }}</div>',
'                    <div style="overflow-x:auto;margin-top:14px;padding-bottom:6px">',
'                      <div style="min-width:{{ finGanttWidth }}">',
'                        <div style="display:flex;padding-left:190px;border-bottom:1px solid #221E19;margin-bottom:8px">',
'                          <sc-for list="{{ finWeeks }}" as="fw" hint-placeholder-count="18">',
'                            <span style="{{ fw.style }}">{{ fw.label }}</span>',
'                          </sc-for>',
'                        </div>',
'                        <div style="display:flex;flex-direction:column;gap:4px">',
'                          <sc-for list="{{ finRows }}" as="fr" hint-placeholder-count="6">',
'                            <div style="display:flex;align-items:stretch;min-height:34px">',
'                              <span style="width:190px;flex:none;padding-right:10px;display:flex;flex-direction:column;justify-content:center">',
'                                <span style="font:500 22px/1.3 \'C11\';color:{{ fr.nameColor }}">{{ fr.title }}</span>',
'                                <span style="font:400 11px/1.4 \'C11\';color:#8A8073;margin-top:4px">{{ fr.meta }}</span>',
'                              </span>',
'                              <sc-for list="{{ fr.cells }}" as="fc" hint-placeholder-count="18">',
'                                <span style="{{ fc.style }}">{{ fc.mark }}</span>',
'                              </sc-for>',
'                            </div>',
'                          </sc-for>',
'                        </div>',
'                      </div>',
'                    </div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:9px;margin-top:14px">',
'                      <sc-for list="{{ finLegend }}" as="fl" hint-placeholder-count="3">',
'                        <span style="display:inline-flex;align-items:center;gap:8px;padding:7px 11px;background:rgba(0,0,0,.26);border:1px solid #26211C">',
'                          <span style="{{ fl.swatch }}">{{ fl.mark }}</span>',
'                          <span style="font:400 22px/1 \'C11\';color:#9A9184;white-space:nowrap">{{ fl.label }}</span>',
'                        </span>',
'                      </sc-for>',
'                    </div>',
'                    <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:14px;padding:13px 15px;background:rgba(0,0,0,.28);border-left:2px solid #5A4A2C;text-wrap:pretty">{{ finGrowth }}</div>',
'                  </div>',
'',
'                  <div style="padding:19px;background:#14110E;border:1px solid #26211C">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">你對自己的判斷，準不準</div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:8px;text-wrap:pretty">每一次提交前你們都先說了一次「這一項花的力氣跟原本估的差多少」。把那些話跟老師後來的判斷擺在一起，就是這一學期你們最直接的自我認識紀錄。</div>',
'                    <div style="display:flex;flex-direction:column;gap:7px;margin-top:14px">',
'                      <sc-for list="{{ finCross }}" as="fx" hint-placeholder-count="3">',
'                        <div style="display:flex;flex-wrap:wrap;gap:13px;align-items:baseline;padding:12px 14px;background:rgba(0,0,0,.26);border-left:2px solid {{ fx.color }}">',
'                          <span style="font:500 22px/1.3 \'C11\';color:#E8E2D6;min-width:130px">{{ fx.label }}</span>',
'                          <span style="font:700 22px/1 \'C11\';color:{{ fx.color }};min-width:80px">{{ fx.value }}</span>',
'                          <span style="flex:1;min-width:200px;font:400 11px/1.7 \'C11\';color:#8A8073;text-wrap:pretty">{{ fx.note }}</span>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                  </div>',
'',
'                  <div style="padding:20px;background:linear-gradient(150deg,rgba(233,179,65,.07),transparent 58%),#14110E;border:1px solid #3A3026">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">最後一件事</div>',
'                    <div style="font:700 22px/1.5 \'C11\';color:#E8E2D6;margin-top:10px;text-wrap:pretty">{{ finalTitle }}</div>',
'                    <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:8px;text-wrap:pretty">{{ finalLede }}</div>',
'                    <sc-if value="{{ needLightName }}" hint-placeholder-val="{{ false }}">',
'                      <div style="margin-top:16px;padding:14px 16px;background:rgba(0,0,0,.3);border:1px dashed #5A4A2C">',
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#E9B341">第五層那一塊還沒有名字</div>',
'                        <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:8px;text-wrap:pretty">前面四層你拿的都是別人命名好的東西。這一塊沒有人替它命名過——你採到了什麼、叫它什麼，由你決定。</div>',
'                        <input value="{{ lightName }}" onChange="{{ setLightName }}" placeholder="替它取一個名字" style="width:100%;margin-top:11px;padding:12px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.5 \'C11\';outline:none">',
'                      </div>',
'                    </sc-if>',
'                    <div style="display:flex;flex-direction:column;gap:18px;margin-top:18px">',
'                      <sc-for list="{{ finalFields }}" as="ff" hint-placeholder-count="3">',
'                        <div>',
'                          <div style="display:flex;align-items:baseline;gap:9px;margin-bottom:6px">',
'                            <span style="font:600 11px/1 \'C11\';color:#0B0A09;background:#E9B341;padding:5px 8px">{{ ff.n }}</span>',
'                            <span style="font:700 22px/1.4 \'C11\'">{{ ff.q }}</span>',
'                          </div>',
'                          <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-bottom:9px;text-wrap:pretty">{{ ff.hint }}</div>',
'                          <textarea onChange="{{ ff.set }}" value="{{ ff.value }}" placeholder="{{ ff.ph }}" style="width:100%;min-height:190px;padding:13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.7 \'C11\';resize:vertical;outline:none"></textarea>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:18px">',
'                      <button onClick="{{ submitFinal }}" style="{{ finalBtnStyle }}">{{ finalBtnLabel }}</button>',
'                      <span style="font:400 11px/1.7 \'C11\';color:#5F574C;flex:1;min-width:200px;text-wrap:pretty">{{ finalSaveNote }}</span>',
'                    </div>',
'                  </div>',
'',
'                </div>',
'              </sc-if>',
'            </div>',
'          </sc-if>',
'',
FIN_ANCHOR].join('\n'));

/* 15i. T-07 審第五層時，看得到那一組的期末回顧 */
const T07CALC = '                  <div style="padding:17px 19px;background:linear-gradient(140deg,rgba(233,179,65,.1),transparent 65%),#14110E;border:1px solid #3A3026">';
must(T07CALC, [
'                  <sc-if value="{{ hasTeamFinale }}" hint-placeholder-val="{{ false }}">',
'                    <div style="padding:17px 19px;background:linear-gradient(140deg,rgba(233,179,65,.07),transparent 62%),#12100D;border:1px solid #3A3026">',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一組的期末回顧</div>',
'                      <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:8px;text-wrap:pretty">{{ teamFinaleNote }}</div>',
'                      <div style="display:flex;flex-direction:column;gap:13px;margin-top:14px">',
'                        <sc-for list="{{ teamFinale }}" as="tf" hint-placeholder-count="3">',
'                          <div>',
'                            <div style="font:500 22px/1.4 \'C11\';color:#C3BAAA">{{ tf.q }}</div>',
'                            <div style="margin-top:7px;padding:12px 14px;background:#0E0C0A;border:1px solid #2E2822;font:400 22px/1.7 \'C11\';color:#E8E2D6;text-wrap:pretty">{{ tf.a }}</div>',
'                          </div>',
'                        </sc-for>',
'                      </div>',
'                    </div>',
'                  </sc-if>',
T07CALC].join('\n'));

/* 15j. T-05：把「累加成一份清單再一次發派」講清楚，草稿移到按鈕上面 */
const T05DRAFT = [
'                <sc-if value="{{ draftHasItems }}" hint-placeholder-val="{{ false }}">',
'                  <div style="padding:15px 17px;background:#14110E;border:1px solid #26211C">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C;margin-bottom:11px">草稿中的項目</div>',
'                    <div style="display:flex;flex-direction:column;gap:7px">',
'                      <sc-for list="{{ draftItems }}" as="d" hint-placeholder-count="2">',
'                        <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap">',
'                          <span style="{{ d.tagStyle }}">{{ d.tag }}</span>',
'                          <span style="font:500 22px/1.4 \'C11\';flex:1">{{ d.title }}</span>',
'                          <span style="font:400 11px/1 \'C11\';color:#5F574C">{{ d.due }}</span>',
'                          <button onClick="{{ d.remove }}" style="background:none;border:none;color:#6E665A;cursor:pointer;font:400 22px/1 \'C11\'">×</button>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                  </div>',
'                </sc-if>'
].join('\n');
must(T05DRAFT, '                <!-- 草稿清單已移到按鈕上方 -->');

const T05BTNS = [
'                <sc-if value="{{ notEditing }}" hint-placeholder-val="{{ true }}">',
'                  <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:4px">',
'                    <button onClick="{{ addTask }}" style="{{ addTaskStyle }}">加入清單</button>',
'                    <button onClick="{{ publishSet }}" style="{{ publishStyle }}">{{ publishLabel }}</button>',
'                  </div>',
'                </sc-if>'
].join('\n');
must(T05BTNS, [
'                <sc-if value="{{ notEditing }}" hint-placeholder-val="{{ true }}">',
'                  <div style="padding:16px 18px;background:{{ draftBoxStyle }}">',
'                    <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:11px">',
'                      <span style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">這一層的清單草稿</span>',
'                      <span style="font:700 22px/1 \'C11\';color:{{ draftCountColor }}">{{ draftCount }}</span>',
'                    </div>',
'                    <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px">',
'                      <sc-for list="{{ draftItems }}" as="d" hint-placeholder-count="2">',
'                        <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:9px 11px;background:rgba(0,0,0,.28);border-left:2px solid #5A4A2C">',
'                          <span style="{{ d.tagStyle }}">{{ d.tag }}</span>',
'                          <span style="font:500 22px/1.4 \'C11\';flex:1;min-width:120px">{{ d.title }}</span>',
'                          <span style="font:400 11px/1 \'C11\';color:#8A8073">{{ d.due }}</span>',
'                          <button onClick="{{ d.remove }}" style="background:none;border:none;color:#8A8073;cursor:pointer;font:400 22px/1 \'C11\';padding:0 4px">×</button>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                    <sc-if value="{{ draftEmpty }}" hint-placeholder-val="{{ true }}">',
'                      <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:10px;text-wrap:pretty">還沒有項目。上面寫完一項就按「加入清單」，寫下一項時上面的欄位會清空，這裡會累積起來。</div>',
'                    </sc-if>',
'                    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:15px">',
'                      <button onClick="{{ addTask }}" style="{{ addTaskStyle }}">{{ addTaskLabel }}</button>',
'                      <span style="flex:1"></span>',
'                      <button onClick="{{ publishSet }}" style="{{ publishStyle }}">{{ publishLabel }}</button>',
'                    </div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:12px;text-wrap:pretty">{{ publishNote }}</div>',
'                  </div>',
'                </sc-if>'
].join('\n'));

/* T-05 最上方：說清楚一次寫完還是慢慢給都可以 */
const T05WHAT = '                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">你現在在開的是什麼</div>';
must(T05WHAT, [
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">你現在在開的是什麼</div>',
'                  <div style="margin-top:11px;padding:12px 14px;background:rgba(0,0,0,.3);border-left:2px solid #5A4A2C">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">怎麼用這一頁</div>',
'                    <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:8px;text-wrap:pretty">{{ howToOpen }}</div>',
'                  </div>'
].join('\n'));

/* 16. 所有撰寫框加大——老師與學生都可能有很多要說 */
[['min-height:62px', 'min-height:110px'],
 ['min-height:66px', 'min-height:130px'],
 ['min-height:76px', 'min-height:150px'],
 ['min-height:84px', 'min-height:170px'],
 ['min-height:92px', 'min-height:180px'],
 ['min-height:94px', 'min-height:190px'],
 ['min-height:108px', 'min-height:220px']].forEach(function (p) {
  t = t.split(p[0]).join(p[1]);
});

/* 17. T-05 新增「要交的檔案與規格」——老師講清楚他要收到什麼 */
const NF_NOTE = '                  <textarea onChange="{{ setNfNote }}" value="{{ nfNote }}" placeholder="例：這一層的調查很容易越做越多。" style="width:100%;min-height:130px;padding:12px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.7 \'C11\';resize:vertical;outline:none"></textarea>\n                </div>';
must(NF_NOTE, NF_NOTE + '\n' + [
'                <div>',
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:4px">要交的檔案與規格</div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-bottom:9px;text-wrap:pretty">寫清楚你要收到什麼：格式、份數、命名、長度、要不要含原始檔。學生在提交頁會看到這一段，附錯東西的來回就少一次。留空就是不限。</div>',
'                  <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:10px">',
'                    <sc-for list="{{ specPresets }}" as="sp" hint-placeholder-count="5">',
'                      <button onClick="{{ sp.add }}" style="{{ sp.style }}">＋ {{ sp.label }}</button>',
'                    </sc-for>',
'                  </div>',
'                  <textarea onChange="{{ setNfSpec }}" value="{{ nfSpec }}" placeholder="例：PDF 一份，A4 直式，8 頁以內，檔名 組別_專案定義_v1.pdf。訪談逐字稿另附 .docx 原始檔。" style="width:100%;min-height:150px;padding:12px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.7 \'C11\';resize:vertical;outline:none"></textarea>',
'                </div>'
].join('\n'));

/* 18. S-05 顯示老師開的檔案規格 */
const S05COND2 = [
'                <div style="padding:14px 16px;background:#14110E;border:1px solid #26211C">',
'                  <div style="font:400 22px/1.7 \'C11\';color:#9A9184;text-wrap:pretty"><span style="color:#5F574C">通過條件　</span>{{ openTaskCond }}</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#8A8073;text-wrap:pretty"><span style="color:#5F574C">要注意的　</span>{{ openTaskNote }}</div>',
'                </div>'
].join('\n');
must(S05COND2, S05COND2 + '\n' + [
'                <sc-if value="{{ hasSpec }}" hint-placeholder-val="{{ false }}">',
'                  <div style="padding:14px 16px;background:rgba(195,186,170,.05);border:1px solid #3A3026;border-left:2px solid #8A8073">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#8A8073">他要收到的檔案與規格</div>',
'                    <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:8px;text-wrap:pretty">{{ openTaskSpec }}</div>',
'                  </div>',
'                </sc-if>'
].join('\n'));

/* 19. T-06 也讓老師對照自己開的規格 */
const T06COND = [
'                <div style="padding:15px 17px;background:#14110E;border:1px solid #26211C">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">通過條件</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#9A9184;margin-top:7px;text-wrap:pretty">{{ revCond }}</div>',
'                </div>'
].join('\n');
must(T06COND, [
'                <div style="padding:15px 17px;background:#14110E;border:1px solid #26211C">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">通過條件</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#9A9184;margin-top:7px;text-wrap:pretty">{{ revCond }}</div>',
'                  <sc-if value="{{ revHasSpec }}" hint-placeholder-val="{{ false }}">',
'                    <div style="margin-top:11px;padding-top:10px;border-top:1px solid #26211C">',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">你要求的檔案與規格</div>',
'                      <div style="font:400 22px/1.7 \'C11\';color:#9A9184;margin-top:7px;text-wrap:pretty">{{ revSpec }}</div>',
'                    </div>',
'                  </sc-if>',
'                </div>'
].join('\n'));

/* 20. 側欄一直留在原地：自己可捲，不跟著內容走 */
must('          <div style="flex:none;width:264px;border-right:1px solid #221E19;background:#0E0C0A;display:flex;flex-direction:column;padding:20px 0">',
     '          <div style="flex:none;width:264px;border-right:1px solid #221E19;background:#0E0C0A;display:flex;flex-direction:column;padding:20px 0;height:100%;overflow-y:auto">');

/* 研究者側欄同理 */
must('              <div style="flex:none;width:172px;border-right:1px solid #1D2831;background:#0C1116;padding:18px 0;display:flex;flex-direction:column">',
     '              <div style="flex:none;width:172px;border-right:1px solid #1D2831;background:#0C1116;padding:18px 0;display:flex;flex-direction:column;position:sticky;top:0;align-self:flex-start;max-height:100vh;overflow-y:auto">');

/* 10c. 工具校準整套移除：學生端看不到階級，老師端那顆選擇器與獎勵上的階級字樣也一併拿掉 */
must(
  '                  <div style="font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:7px">決定工具校準到哪一階</div>',
  '                  <div style="font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:7px">做一項多採一塊礦石，圖鑑多一格</div>');

must([
'                  <div style="padding:17px 19px;background:linear-gradient(140deg,rgba(233,179,65,.1),transparent 65%),#14110E;border:1px solid #3A3026">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">系統試算 · 工具校準階級</div>',
'                    <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:12px;margin-top:11px">',
'                      <span style="font:900 33px/1 \'C11\';letter-spacing:.05em;color:#F2EADA">{{ calcLevel }}</span>',
'                      <span style="font:400 22px/1.7 \'C11\';color:#8A8073;text-wrap:pretty">{{ calcReason }}</span>',
'                    </div>',
'                    <div style="margin-top:14px;padding-top:13px;border-top:1px solid #26211C">',
'                      <div style="font:400 11px/1.6 \'C11\';color:#8A8073;margin-bottom:9px">試算只是建議。最後交出去的階級由你決定：</div>',
'                      <div style="display:flex;flex-wrap:wrap;gap:6px">',
'                        <sc-for list="{{ levelPicks }}" as="p" hint-placeholder-count="4">',
'                          <button onClick="{{ p.pick }}" style="{{ p.style }}">{{ p.label }}</button>',
'                        </sc-for>',
'                      </div>',
'                    </div>',
'                  </div>',
''].join('\n'), [
'                  <sc-if value="{{ gateBlocked }}" hint-placeholder-val="{{ false }}">',
'                    <div style="padding:14px 17px;background:rgba(217,96,63,.1);border-left:2px solid #D9603F">',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#D9603F">還不能放他們過關</div>',
'                      <div style="font:400 22px/1.6 \'C11\';color:#FFB9A2;margin-top:8px;text-wrap:pretty">{{ gateBlockedWhy }}</div>',
'                    </div>',
'                  </sc-if>',
''].join('\n'));

must('              <div style="font:400 11px/1 \'C11\';color:#E9B341;margin-top:6px">{{ rewardLevel }}</div>\n', '');


/* 10d. T-05 桌機用整個寬度：左邊表單、右邊固定的側欄（說明＋草稿＋按鈕） */

/* 頂部：說明改成一條橫幅，攤開整個寬度 */
must([
'              <div style="padding:20px var(--pad);display:flex;flex-direction:column;gap:17px;max-width:640px">',
'                <div style="padding:16px 18px;background:linear-gradient(140deg,rgba(233,179,65,.09),transparent 62%),#14110E;border:1px solid #3A3026">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">你現在在開的是什麼</div>',
'                  <div style="margin-top:11px;padding:12px 14px;background:rgba(0,0,0,.3);border-left:2px solid #5A4A2C">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">怎麼用這一頁</div>',
'                    <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:8px;text-wrap:pretty">{{ howToOpen }}</div>',
'                  </div>',
'                  <div style="font:700 22px/1.5 \'C11\';color:#E8E2D6;margin-top:10px;text-wrap:pretty">{{ openWhat }}</div>',
'                  <div style="display:flex;flex-direction:column;gap:9px;margin-top:13px">',
'                    <sc-for list="{{ openChain }}" as="oc" hint-placeholder-count="3">',
'                      <div style="display:flex;gap:11px;align-items:flex-start">',
'                        <span style="{{ oc.num }}">{{ oc.n }}</span>',
'                        <span style="flex:1;font:400 22px/1.6 \'C11\';color:#9A9184;text-wrap:pretty">{{ oc.t }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                  <div style="margin-top:14px;padding:12px 14px;background:rgba(0,0,0,.3);border-left:2px solid #5A4A2C">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">這一層現在的樣子</div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#C3BAAA;margin-top:8px;text-wrap:pretty">{{ layerShape }}</div>',
'                  </div>',
'                </div>',
'                <div style="padding:15px 17px;background:linear-gradient(140deg,rgba(233,179,65,.09),transparent 65%),#14110E;border:1px solid #3A3026">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一項屬於哪個環節</div>',
'                  <div style="font:700 22px/1.5 \'C11\';color:#E8E2D6;margin-top:9px">{{ editCourse }}</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:7px;text-wrap:pretty">{{ editStageNote }}</div>',
'                </div>',
''].join('\n'),
[
'              <div style="padding:16px var(--pad) 0">',
'                <div style="padding:14px 17px;background:linear-gradient(140deg,rgba(233,179,65,.08),transparent 62%),#14110E;border:1px solid #3A3026;display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start">',
'                  <div style="flex:1.1;min-width:250px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">怎麼用這一頁</div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#C3BAAA;margin-top:8px;text-wrap:pretty">{{ howToOpen }}</div>',
'                  </div>',
'                  <div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:7px">',
'                    <sc-for list="{{ openChain }}" as="oc" hint-placeholder-count="3">',
'                      <div style="display:flex;gap:9px;align-items:flex-start">',
'                        <span style="{{ oc.num }}">{{ oc.n }}</span>',
'                        <span style="flex:1;font:400 22px/1.5 \'C11\';color:#9A9184;text-wrap:pretty">{{ oc.t }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                </div>',
'                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:9px">',
'                  <sc-for list="{{ layerStats }}" as="ls" hint-placeholder-count="5">',
'                    <div style="{{ ls.s }}"><span style="{{ ls.ks }}">{{ ls.k }}</span><span style="{{ ls.vs }}">{{ ls.val }}</span></div>',
'                  </sc-for>',
'                </div>',
'                <sc-if value="{{ hasLayerWarn }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:9px;padding:10px 13px;background:rgba(217,96,63,.1);border-left:2px solid #D9603F;font:400 22px/1.5 \'C11\';color:#FFB9A2;text-wrap:pretty">{{ layerWarn }}</div>',
'                </sc-if>',
'              </div>',
'              <div style="{{ t05Grid }}">',
'                <div style="display:flex;flex-direction:column;gap:17px;min-width:0">',
'                <div style="padding:13px 16px;background:rgba(233,179,65,.06);border-left:2px solid #5A4A2C">',
'                  <span style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一項屬於哪個環節</span>',
'                  <span style="font:700 22px/1.5 \'C11\';color:#E8E2D6;margin-left:10px">{{ editCourse }}</span>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:5px;text-wrap:pretty">{{ editStageNote }}</div>',
'                </div>',
''].join('\n'));

/* 表單結束 → 右欄開始（草稿與按鈕移到側欄） */
must([
'                <sc-if value="{{ isEditing }}" hint-placeholder-val="{{ false }}">',
'                  <div style="padding:13px 16px;background:rgba(233,179,65,.07);border-left:2px solid #E9B341;font:400 22px/1.7 \'C11\';color:#E8E2D6;text-wrap:pretty">{{ editLiveNote }}</div>'].join('\n'),
[
'                </div>',
'                <div style="{{ t05Rail }}">',
'                <sc-if value="{{ isEditing }}" hint-placeholder-val="{{ false }}">',
'                  <div style="padding:13px 16px;background:rgba(233,179,65,.07);border-left:2px solid #E9B341;font:400 22px/1.7 \'C11\';color:#E8E2D6;text-wrap:pretty">{{ editLiveNote }}</div>'].join('\n'));

must([
'                </sc-if>',
'                <!-- 草稿清單已移到按鈕上方 -->',
'              </div>',
'            </div>',
'          </sc-if>'].join('\n'),
[
'                </sc-if>',
'                </div>',
'              </div>',
'            </div>',
'          </sc-if>'].join('\n'));



/* 10e. 其餘「要寫東西」的頁在桌機也用整個寬度，不再卡在 640px */
must('display:flex;flex-direction:column;gap:17px;max-width:640px">',
     'display:flex;flex-direction:column;gap:17px;{{ formW }}">');
must('display:flex;flex-direction:column;gap:19px;max-width:660px">',
     'display:flex;flex-direction:column;gap:19px;{{ formW }}">');
must('display:flex;flex-direction:column;gap:17px;max-width:660px">',
     'display:flex;flex-direction:column;gap:17px;{{ formW }}">');
must('display:flex;flex-direction:column;gap:18px;max-width:680px">',
     'display:flex;flex-direction:column;gap:18px;{{ formW }}">');


/* 10f. 結尾＝現實期末發表的資格：學生端加狀態／通行證，老師端加 T-09 審核頁 */
must([
'              <sc-if value="{{ finOpen }}" hint-placeholder-val="{{ true }}">',
'                <div style="padding:24px var(--pad) 0;display:flex;flex-direction:column;gap:22px;max-width:760px">',
''].join('\n'),
[
'              <sc-if value="{{ finOpen }}" hint-placeholder-val="{{ true }}">',
'                <div style="padding:24px var(--pad) 0;display:flex;flex-direction:column;gap:22px;{{ formW }}">',
'',
'                  <div style="{{ finGateBox }}">',
'                    <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">',
'                      <span style="{{ finGateIcon }}"></span>',
'                      <div style="flex:1;min-width:250px">',
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:{{ finGateAccent }}">{{ finGateKicker }}</div>',
'                        <div style="font:700 33px/1.3 \'C11\';color:{{ finGateAccent }};margin-top:11px;text-wrap:pretty">{{ finGateTitle }}</div>',
'                        <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:9px;text-wrap:pretty">{{ finGateLede }}</div>',
'                      </div>',
'                    </div>',
'                    <sc-if value="{{ hasFinGateReason }}" hint-placeholder-val="{{ false }}">',
'                      <div style="margin-top:15px;padding:13px 16px;background:rgba(0,0,0,.32);border-left:2px solid {{ finGateAccent }}">',
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">{{ finGateReasonLabel }}</div>',
'                        <div style="font:400 22px/1.7 \'C11\';color:#E8E2D6;margin-top:8px;text-wrap:pretty">{{ finGateReason }}</div>',
'                      </div>',
'                    </sc-if>',
'                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:15px">',
'                      <sc-for list="{{ finGateSteps }}" as="fg" hint-placeholder-count="3">',
'                        <div style="{{ fg.style }}"><span style="{{ fg.markStyle }}">{{ fg.mark }}</span><span style="flex:1;min-width:0">{{ fg.t }}</span></div>',
'                      </sc-for>',
'                    </div>',
'                  </div>',
''].join('\n'));

/* 老師端 T-09：期末發表資格 */
must([
'          <sc-if value="{{ scKlass }}" hint-placeholder-val="{{ false }}">',
'            <div data-screen-label="切換班級" style="padding:0 0 32px">'].join('\n'),
[
'          <sc-if value="{{ scTFIN }}" hint-placeholder-val="{{ false }}">',
'            <div data-screen-label="T-09 期末回顧" style="padding:0 0 32px">',
'              <div style="padding:22px var(--pad) 16px;border-bottom:1px solid #221E19">',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.26em;color:#5F574C">T-09 · FINAL REVIEW</div>',
'                <h1 style="font:700 33px/1.4 \'C11\';margin:10px 0 5px;letter-spacing:.04em">期末回顧</h1>',
'                <p style="font:400 22px/1.7 \'C11\';color:#8A8073;margin:0;max-width:640px;text-wrap:pretty">{{ tfinHow }}</p>',
'              </div>',
'              <sc-if value="{{ tfinEmpty }}" hint-placeholder-val="{{ true }}">',
'                <div style="margin:22px var(--pad);padding:34px 24px;border:1px dashed #2E2822;text-align:center;font:400 22px/1.8 \'C11\';color:#8A8073;text-wrap:pretty">{{ tfinEmptyNote }}</div>',
'              </sc-if>',
'              <sc-if value="{{ hasTfin }}" hint-placeholder-val="{{ false }}">',
'                <div style="{{ t05Grid }}">',
'                  <div style="display:flex;flex-direction:column;gap:16px;min-width:0">',
'                    <sc-if value="{{ hasTfinSel }}" hint-placeholder-val="{{ true }}">',
'                      <div style="padding:16px 18px;background:#14110E;border:1px solid #26211C">',
'                        <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:12px">',
'                          <span style="font:700 33px/1.2 \'C11\';color:#F2E6C8">{{ tfinTeam }}</span>',
'                          <span style="{{ tfinStatusStyle }}">{{ tfinStatus }}</span>',
'                        </div>',
'                        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">',
'                          <sc-for list="{{ tfinStats }}" as="ts" hint-placeholder-count="4">',
'                            <div style="{{ ts.s }}"><span style="{{ ts.ks }}">{{ ts.k }}</span><span style="{{ ts.vs }}">{{ ts.val }}</span></div>',
'                          </sc-for>',
'                        </div>',
'                        <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:12px;text-wrap:pretty">{{ tfinStatsNote }}</div>',
'                      </div>',
'                      <div style="padding:16px 18px;background:#14110E;border:1px solid #26211C;display:flex;flex-direction:column;gap:17px">',
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">他們自己回頭寫的三題</div>',
'                        <sc-for list="{{ tfinAnswers }}" as="ta" hint-placeholder-count="3">',
'                          <div>',
'                            <div style="display:flex;align-items:baseline;gap:9px;margin-bottom:7px">',
'                              <span style="font:600 11px/1 \'C11\';color:#0B0A09;background:#E9B341;padding:5px 8px">{{ ta.n }}</span>',
'                              <span style="font:500 22px/1.4 \'C11\';color:#9A9184">{{ ta.q }}</span>',
'                            </div>',
'                            <div style="padding:14px 16px;background:#0E0C0A;border:1px solid #2E2822;font:400 22px/1.7 \'C11\';color:#C3BAAA;text-wrap:pretty">{{ ta.a }}</div>',
'                          </div>',
'                        </sc-for>',
'                      </div>',
'                    </sc-if>',
'                  </div>',
'                  <div style="{{ t05Rail }}">',
'                    <sc-if value="{{ hasTfinPick }}" hint-placeholder-val="{{ false }}">',
'                      <div style="display:flex;flex-direction:column;gap:6px">',
'                        <sc-for list="{{ tfinList }}" as="tl" hint-placeholder-count="3">',
'                          <button onClick="{{ tl.pick }}" style="{{ tl.style }}">',
'                            <span style="display:block;font:500 22px/1.3 \'C11\'">{{ tl.name }}</span>',
'                            <span style="display:block;font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:5px">{{ tl.sub }}</span>',
'                          </button>',
'                        </sc-for>',
'                      </div>',
'                    </sc-if>',
'                    <sc-if value="{{ hasTfinSel }}" hint-placeholder-val="{{ true }}">',
'                      <div style="padding:16px 18px;background:rgba(0,0,0,.26);border:1px solid #2E2822">',
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">這一頁在做什麼</div>',
'                        <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:9px;text-wrap:pretty">{{ tfinFootNote }}</div>',
'                      </div>',
'                    </sc-if>',
'                  </div>',
'                </div>',
'              </sc-if>',
'            </div>',
'          </sc-if>',
'',
'          <sc-if value="{{ scKlass }}" hint-placeholder-val="{{ false }}">',
'            <div data-screen-label="切換班級" style="padding:0 0 32px">'].join('\n'));



/* 10g. 邀請碼一鍵複製：切換班級的卡片、研究者 ADM 的班級列 */
must([
'                <sc-for list="{{ klassCards }}" as="k" hint-placeholder-count="3">',
'                  <button onClick="{{ k.pick }}" style="{{ k.style }}">',
'                    <span style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">',
'                      <span style="font:700 22px/1.4 \'C11\';color:{{ k.nameColor }}">{{ k.name }}</span>',
'                      <span style="{{ k.badgeStyle }}">{{ k.badge }}</span>',
'                    </span>',
'                    <span style="display:block;font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:9px;text-wrap:pretty">{{ k.meta }}</span>',
'                    <span style="display:flex;align-items:baseline;gap:8px;margin-top:11px;padding-top:10px;border-top:1px solid #26211C">',
'                      <span style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">邀請碼</span>',
'                      <span style="font:700 22px/1 \'C11\';letter-spacing:.12em;color:#E9B341">{{ k.code }}</span>',
'                    </span>',
'                  </button>',
'                </sc-for>'].join('\n'),
[
'                <sc-for list="{{ klassCards }}" as="k" hint-placeholder-count="3">',
'                  <div style="{{ k.style }}">',
'                    <button onClick="{{ k.pick }}" style="display:block;width:100%;text-align:left;background:none;border:none;padding:0;font:inherit;color:inherit;cursor:pointer">',
'                      <span style="display:flex;align-items:baseline;gap:9px;flex-wrap:wrap">',
'                        <span style="font:700 22px/1.4 \'C11\';color:{{ k.nameColor }}">{{ k.name }}</span>',
'                        <span style="{{ k.badgeStyle }}">{{ k.badge }}</span>',
'                      </span>',
'                      <span style="display:block;font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:9px;text-wrap:pretty">{{ k.meta }}</span>',
'                    </button>',
'                    <div style="display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:11px;padding-top:10px;border-top:1px solid #26211C">',
'                      <span style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">邀請碼</span>',
'                      <span style="font:700 22px/1 \'C11\';letter-spacing:.12em;color:#E9B341">{{ k.code }}</span>',
'                      <span style="flex:1"></span>',
'                      <button onClick="{{ k.copy }}" style="{{ k.copyStyle }}">{{ k.copyLabel }}</button>',
'                    </div>',
'                  </div>',
'                </sc-for>'].join('\n'));

/* 研究者 ADM 的班級列 */
must(
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ k.meta }}</span>',
[
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ k.meta }}</span>',
'                          <span style="flex:1"></span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.14em;color:#5A6874">邀請碼</span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:13px;letter-spacing:.1em;color:#7FC4D8">{{ k.code }}</span>',
'                          <button onClick="{{ k.copy }}" style="{{ k.copyStyle }}">{{ k.copyLabel }}</button>'].join('\n'));


/* 10h. 道具與寶物的介紹下面，列出要湊齊哪些礦石才拿得到 */
must([
'                  <div style="display:flex;flex-wrap:wrap;gap:22px;padding-top:13px;border-top:1px solid #221E19">',
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">來自哪一項任務</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specFrom }}</div></div>',
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">取得日期</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specDate }}</div></div>',
'                  </div>'].join('\n'),
[
'                  <sc-if value="{{ hasSpecNeed }}" hint-placeholder-val="{{ false }}">',
'                    <div style="padding:15px 17px;background:rgba(0,0,0,.3);border:1px solid #2E2822">',
'                      <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:11px">',
'                        <span style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">{{ specNeedLabel }}</span>',
'                        <span style="font:700 22px/1 \'C11\';color:{{ specNeedColor }}">{{ specNeedCount }}</span>',
'                      </div>',
'                      <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:8px;text-wrap:pretty">{{ specNeedNote }}</div>',
'                      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:7px;margin-top:12px">',
'                        <sc-for list="{{ specNeeds }}" as="sn" hint-placeholder-count="6">',
'                          <div style="{{ sn.style }}">',
'                            <span style="{{ sn.icon }}"></span>',
'                            <span style="flex:1;min-width:0">',
'                              <span style="display:block;font:500 22px/1.3 \'C11\';color:{{ sn.color }}">{{ sn.name }}</span>',
'                              <span style="display:block;font:400 11px/1.5 \'C11\';color:#6E665A;margin-top:4px">{{ sn.sub }}</span>',
'                            </span>',
'                            <span style="{{ sn.markStyle }}">{{ sn.mark }}</span>',
'                          </div>',
'                        </sc-for>',
'                      </div>',
'                    </div>',
'                  </sc-if>',
'                  <div style="display:flex;flex-wrap:wrap;gap:22px;padding-top:13px;border-top:1px solid #221E19">',
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">來自哪一項任務</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specFrom }}</div></div>',
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">取得日期</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specDate }}</div></div>',
'                  </div>'].join('\n'));


/* 10i. 發道具那一幕：校準拿掉之後，標題與「無等級」也不能留 */
must(
'          <div style="position:relative;font:400 11px/1 \'C11\';letter-spacing:.34em;color:#8A8073">CALIBRATION COMPLETE</div>',
'          <div style="position:relative;font:400 11px/1 \'C11\';letter-spacing:.34em;color:#8A8073">LAYER CLEARED</div>');

must(
'              <div style="font:400 11px/1 \'C11\';color:#5F574C;margin-top:6px">無等級</div>\n',
'');


/* 10j. 全收集：這一層開的每一項都要採到，不再分必要／延伸 */
must([
'                <div>',
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:9px">必要或延伸</div>',
'                  <div style="display:flex;gap:8px;flex-wrap:wrap">',
'                    <button onClick="{{ setNfReq }}" style="{{ nfReqStyle }}">必要項 · 過關的最低標準</button>',
'                    <button onClick="{{ setNfExt }}" style="{{ nfExtStyle }}">延伸項 · 選擇挖多深</button>',
'                  </div>',
'                </div>',
''].join('\n'), '');

/* S-02 上面三張卡：必要／延伸／已採 → 這一層採齊了沒 */
must([
'                <div style="padding:15px;background:#14110E;border:1px solid #26211C;position:relative">',
'                  <div style="position:absolute;top:0;left:0;width:10px;height:1px;background:#E9B341"></div><div style="position:absolute;top:0;left:0;width:1px;height:10px;background:#E9B341"></div>',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">必要項</div>',
'                  <div style="font:700 33px/1 \'C11\';margin-top:10px">{{ reqDone }}<span style="font:400 22px/1 \'C11\';color:#5F574C"> / {{ reqTotal }}</span></div>',
'                  <div style="font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:7px">全數通過才能送交關卡審核</div>',
'                </div>',
'                <div style="padding:15px;background:#14110E;border:1px solid #26211C;position:relative">',
'                  <div style="position:absolute;top:0;left:0;width:10px;height:1px;background:#5F574C"></div><div style="position:absolute;top:0;left:0;width:1px;height:10px;background:#5F574C"></div>',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">延伸項</div>',
'                  <div style="font:700 33px/1 \'C11\';margin-top:10px">{{ extDone }}<span style="font:400 22px/1 \'C11\';color:#5F574C"> / {{ extTotal }}</span></div>',
'                  <div style="font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:7px">做一項多採一塊礦石，圖鑑多一格</div>',
'                </div>'].join('\n'),
[
'                <div style="padding:15px;background:#14110E;border:1px solid #26211C;position:relative">',
'                  <div style="position:absolute;top:0;left:0;width:10px;height:1px;background:#E9B341"></div><div style="position:absolute;top:0;left:0;width:1px;height:10px;background:#E9B341"></div>',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">這一層採到幾塊</div>',
'                  <div style="font:700 33px/1 \'C11\';margin-top:10px">{{ reqDone }}<span style="font:400 22px/1 \'C11\';color:#5F574C"> / {{ reqTotal }}</span></div>',
'                  <div style="font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:7px">全部採齊才送得出關卡</div>',
'                </div>',
'                <div style="padding:15px;background:#14110E;border:1px solid #26211C;position:relative">',
'                  <div style="position:absolute;top:0;left:0;width:10px;height:1px;background:#5F574C"></div><div style="position:absolute;top:0;left:0;width:1px;height:10px;background:#5F574C"></div>',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">還差幾塊</div>',
'                  <div style="font:700 33px/1 \'C11\';margin-top:10px">{{ extDone }}</div>',
'                  <div style="font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:7px">{{ layerLeftNote }}</div>',
'                </div>'].join('\n'));

must(
'                      <span style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">送關卡的依據 · 必要項的礦石</span>',
'                      <span style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">送關卡的依據 · 這一層的礦石</span>');

must(
'                  <div><div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">未完成必要項</div><div style="font:700 33px/1.2 \'C11\';margin-top:5px">{{ reqLeft }}</div></div>',
'                  <div><div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">這一層還差</div><div style="font:700 33px/1.2 \'C11\';margin-top:5px">{{ reqLeft }}</div></div>');

must(
'                  <div><div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">延伸已通過</div><div style="font:700 33px/1.2 \'C11\';margin-top:5px">{{ extDone }}</div></div>',
'                  <div><div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">已經採到</div><div style="font:700 33px/1.2 \'C11\';margin-top:5px">{{ reqDone }}</div></div>');

must(
'<span style="font:400 11px/1 \'C11\';color:#5F574C">學生必要項全通過並送出送審三格後，這裡才會有東西</span>',
'<span style="font:400 11px/1 \'C11\';color:#5F574C">學生把那一層的礦石全採齊、送出送審三格後，這裡才會有東西</span>');

must(
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C;margin-bottom:10px">必要項對照</div>',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C;margin-bottom:10px">這一層的項目對照</div>');


/* 10k. 排程納入主流程：交之前要先說你打算哪一週交 */
must([
'              <div style="padding:20px var(--pad);display:flex;flex-direction:column;gap:17px;{{ formW }}">',
'                <div style="padding:14px 16px;background:#14110E;border:1px solid #26211C">',
'                  <div style="font:400 22px/1.7 \'C11\';color:#9A9184;text-wrap:pretty"><span style="color:#5F574C">通過條件　</span>{{ openTaskCond }}</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#8A8073;text-wrap:pretty"><span style="color:#5F574C">要注意的　</span>{{ openTaskNote }}</div>',
'                </div>'].join('\n'),
[
'              <div style="padding:20px var(--pad);display:flex;flex-direction:column;gap:17px;{{ formW }}">',
'                <div style="{{ planBox }}">',
'                  <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:11px">',
'                    <span style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:{{ planAccent }}">你排的時間</span>',
'                    <span style="font:700 22px/1 \'C11\';color:{{ planAccent }}">{{ planLabel }}</span>',
'                    <span style="flex:1"></span>',
'                    <button onClick="{{ goGantt }}" style="font:500 11px/1 \'C11\';letter-spacing:.1em;padding:7px 11px;cursor:pointer;background:none;border:1px solid #3A3026;color:#8A8073;white-space:nowrap">去甘特圖排整層</button>',
'                  </div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:8px;text-wrap:pretty">{{ planNote }}</div>',
'                  <sc-if value="{{ needPlan }}" hint-placeholder-val="{{ false }}">',
'                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:11px">',
'                      <sc-for list="{{ planPicks }}" as="pw" hint-placeholder-count="6">',
'                        <button onClick="{{ pw.pick }}" style="{{ pw.style }}">',
'                          <span style="display:block">{{ pw.label }}</span>',
'                          <span style="{{ pw.subStyle }}">{{ pw.sub }}</span>',
'                        </button>',
'                      </sc-for>',
'                    </div>',
'                  </sc-if>',
'                </div>',
'                <div style="padding:14px 16px;background:#14110E;border:1px solid #26211C">',
'                  <div style="font:400 22px/1.7 \'C11\';color:#9A9184;text-wrap:pretty"><span style="color:#5F574C">通過條件　</span>{{ openTaskCond }}</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#8A8073;text-wrap:pretty"><span style="color:#5F574C">要注意的　</span>{{ openTaskNote }}</div>',
'                </div>'].join('\n'));


/* 10l. 礦脈要開完：把「規畫環節」正名成「這一層的礦脈」 */
must(
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">這一項屬於哪個規畫環節</div>',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一項是哪一塊礦石　{{ veinCount }}</div>');

must(
'                  <div style="font:400 11px/1.7 \'C11\';color:#6E665A;margin-top:7px;text-wrap:pretty">選這一項對應的專案規畫環節。學生端會拿到一件對應的物證（小字那一行），選哪一件不改變驗收標準。</div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:7px;text-wrap:pretty">{{ veinPickNote }}</div>');


/* 10m. 送審頁：送不出去的時候要看得見原因，按鈕也要看起來按不下去 */
must(
'                  <button onClick="{{ submitGate }}" style="font:500 22px/1 \'C11\';letter-spacing:.16em;text-indent:.16em;color:#0B0A09;background:#E9B341;border:none;padding:15px var(--pad);cursor:pointer;clip-path:polygon(11px 0,100% 0,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%,0 11px)">送出關卡審核</button>',
[
'                  <button onClick="{{ submitGate }}" style="{{ submitGateStyle }}">{{ submitGateLabel }}</button>'].join('\n'));

must([
'              <div style="padding:20px var(--pad);display:flex;flex-direction:column;gap:19px;{{ formW }}">'].join('\n'),
[
'              <div style="padding:20px var(--pad);display:flex;flex-direction:column;gap:19px;{{ formW }}">',
'                <sc-if value="{{ subBlocked }}" hint-placeholder-val="{{ false }}">',
'                  <div style="padding:15px 17px;background:rgba(217,96,63,.1);border-left:2px solid #D9603F">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#D9603F">現在還送不出去</div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#FFB9A2;margin-top:8px;text-wrap:pretty">{{ subBlockedWhy }}</div>',
'                  </div>',
'                </sc-if>'].join('\n'));


/* 10n. 一年以上的專案：甘特圖加縮放與「跳到本週」，期限快選加說明 */
must([
'              <div style="padding:16px var(--pad)">',
'                <div style="{{ ganttHowToStyle }}">{{ ganttHowTo }}</div>',
'                <div style="overflow-x:auto;padding-bottom:6px">'].join('\n'),
[
'              <div style="padding:16px var(--pad)">',
'                <div style="{{ ganttHowToStyle }}">{{ ganttHowTo }}</div>',
'                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-bottom:11px">',
'                  <span style="font:400 11px/1.6 \'C11\';color:#8A8073">{{ ganttSpanNote }}</span>',
'                  <span style="flex:1"></span>',
'                  <button onClick="{{ jumpNow }}" style="font:500 11px/1 \'C11\';letter-spacing:.1em;padding:7px 12px;cursor:pointer;background:rgba(233,179,65,.1);border:1px solid #5A4A2C;color:#E9B341;white-space:nowrap">跳到本週</button>',
'                  <span style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#5F574C">格寬</span>',
'                  <sc-for list="{{ ganttZoomPicks }}" as="gz" hint-placeholder-count="3">',
'                    <button onClick="{{ gz.pick }}" style="{{ gz.style }}">{{ gz.label }}</button>',
'                  </sc-for>',
'                </div>',
'                <div data-gantt-scroll="1" style="overflow-x:auto;padding-bottom:6px">'].join('\n'));

/* 期限快選：週數多的時候說明只列一段 */
must([
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#5F574C;margin-bottom:7px">哪一週</div>'].join('\n'),
[
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#5F574C;margin-bottom:7px">哪一週</div>',
'                  <sc-if value="{{ hasDueWindow }}" hint-placeholder-val="{{ false }}">',
'                    <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-bottom:9px;text-wrap:pretty">{{ dueWindowNote }}</div>',
'                  </sc-if>'].join('\n'));


/* 10o. 總週數說明：跨年度的專案也支援 */
must(
'                    <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:13px;line-height:1.9;color:#8393A0;margin-top:8px">總週數決定甘特圖有幾欄、期限可以訂到第幾週。一學期填 18，一學年填 36，最多 52。開完之後在下面每一班那一列還可以改。</div>',
'                    <div style="font-family:\'Noto Sans TC\',sans-serif;font-size:13px;line-height:1.9;color:#8393A0;margin-top:8px">總週數決定甘特圖有幾欄、期限可以訂到第幾週。一學期 18、一學年 36、整整一年 52、兩年 104，<b>最多 156 週（三年）</b>。跨年度的專案照樣可以開——甘特圖會自動縮格寬，學生端也有寬／中／窄與「跳到本週」。開完之後在下面每一班那一列還可以改。</div>');


/* 10p. 45 格畫成看得見的路：像棋盤一樣一格一格排出來 */
must([
'                <sc-if value="{{ showSteps }}" hint-placeholder-val="{{ true }}">',
'                <div style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:9px;margin-top:14px;padding:8px 12px;background:rgba(233,179,65,.07);border:1px solid #3A3026">',
'                  <span style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#8A8073;white-space:nowrap">距離地心</span>',
'                  <span style="font:700 22px/1 \'C11\';color:#E9B341;white-space:nowrap">{{ stepsLeft }} 格</span>',
'                  <span style="font:400 11px/1 \'C11\';color:#8A8073;white-space:nowrap">已走 {{ stepsDone }} 格</span>',
'                </div>',
'                </sc-if>'].join('\n'),
[
'                <sc-if value="{{ showSteps }}" hint-placeholder-val="{{ true }}">',
'                <div style="margin-top:16px;padding:15px 17px;background:rgba(0,0,0,.3);border:1px solid #2E2822">',
'                  <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:10px">',
'                    <span style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#E9B341">地表 → 地心　45 格</span>',
'                    <span style="flex:1"></span>',
'                    <span style="font:400 11px/1 \'C11\';color:#8A8073">已走</span>',
'                    <span style="font:700 22px/1 \'C11\';color:#E9B341">{{ boardDone }}</span>',
'                    <span style="font:400 11px/1 \'C11\';color:#8A8073">還有</span>',
'                    <span style="font:700 22px/1 \'C11\';color:#C3BAAA">{{ boardLeft }}</span>',
'                  </div>',
'                  <div style="{{ boardGridStyle }}">',
'                    <sc-for list="{{ boardCells }}" as="bc" hint-placeholder-count="45">',
'                      <div style="{{ bc.style }}">',
'                        <span style="{{ bc.numStyle }}">{{ bc.n }}</span>',
'                        <span style="{{ bc.titleStyle }}">{{ bc.title }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:12px;text-wrap:pretty">{{ boardStepNote }}</div>',
'                  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:5px;margin-top:11px">',
'                    <sc-for list="{{ boardLegend }}" as="bl" hint-placeholder-count="5">',
'                      <div style="{{ bl.style }}">',
'                        <span style="{{ bl.dot }}"></span>',
'                        <span style="flex:1;min-width:0">',
'                          <span style="{{ bl.nameStyle }}">{{ bl.name }}</span>',
'                          <span style="{{ bl.metaStyle }}">　{{ bl.range }}　{{ bl.mark }}</span>',
'                        </span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                </div>',
'                </sc-if>'].join('\n'));


/* 10q. 45 格直接畫在剖面上：每一層鋪自己那一段 */
must([
'                        <span style="position:relative;display:flex;flex-direction:column;justify-content:flex-start;padding:11px 14px 0;width:var(--mcol);flex:none">',
'                          <span style="font:600 11px/1 \'C11\';letter-spacing:.18em;color:#B6AC9C">{{ m.code }}</span>',
'                          <span style="{{ m.nameStyle }}">{{ m.nameShown }}</span>',
'                          <span style="font:400 11px/1 \'C11\';color:#9A9184;margin-top:5px">{{ m.depth }}</span>',
'                          <span style="{{ m.stateStyle }}">{{ m.state }}</span>',
'                        </span>'].join('\n'),
[
'                        <span style="position:relative;display:flex;flex-direction:column;justify-content:flex-start;padding:11px 14px 0;width:var(--mcol);flex:none">',
'                          <span style="font:600 11px/1 \'C11\';letter-spacing:.18em;color:#B6AC9C">{{ m.code }}</span>',
'                          <span style="{{ m.nameStyle }}">{{ m.nameShown }}</span>',
'                          <span style="font:400 11px/1 \'C11\';color:#9A9184;margin-top:5px">{{ m.depth }}</span>',
'                          <span style="{{ m.stateStyle }}">{{ m.state }}</span>',
'                        </span>',
'                        <span style="{{ m.stepsTagStyle }}">{{ m.stepsTag }}</span>',
'                        <span style="{{ m.stepsStyle }}">',
'                          <sc-for list="{{ m.steps }}" as="st" hint-placeholder-count="6">',
'                            <span onClick="{{ st.open }}" style="{{ st.style }}">',
'                              <span style="{{ st.dotStyle }}">{{ st.mark }}</span>',
'                              <span style="{{ st.nameStyle }}">{{ st.name }}</span>',
'                            </span>',
'                          </sc-for>',
'                        </span>'].join('\n'));

/* 上面那張獨立的棋盤收掉，只留一行進度 */
must([
'                <div style="margin-top:16px;padding:15px 17px;background:rgba(0,0,0,.3);border:1px solid #2E2822">',
'                  <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:10px">',
'                    <span style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#E9B341">地表 → 地心　45 格</span>',
'                    <span style="flex:1"></span>',
'                    <span style="font:400 11px/1 \'C11\';color:#8A8073">已走</span>',
'                    <span style="font:700 22px/1 \'C11\';color:#E9B341">{{ boardDone }}</span>',
'                    <span style="font:400 11px/1 \'C11\';color:#8A8073">還有</span>',
'                    <span style="font:700 22px/1 \'C11\';color:#C3BAAA">{{ boardLeft }}</span>',
'                  </div>',
'                  <div style="{{ boardGridStyle }}">',
'                    <sc-for list="{{ boardCells }}" as="bc" hint-placeholder-count="45">',
'                      <div style="{{ bc.style }}">',
'                        <span style="{{ bc.numStyle }}">{{ bc.n }}</span>',
'                        <span style="{{ bc.titleStyle }}">{{ bc.title }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:12px;text-wrap:pretty">{{ boardStepNote }}</div>',
'                  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:5px;margin-top:11px">',
'                    <sc-for list="{{ boardLegend }}" as="bl" hint-placeholder-count="5">',
'                      <div style="{{ bl.style }}">',
'                        <span style="{{ bl.dot }}"></span>',
'                        <span style="flex:1;min-width:0">',
'                          <span style="{{ bl.nameStyle }}">{{ bl.name }}</span>',
'                          <span style="{{ bl.metaStyle }}">　{{ bl.range }}　{{ bl.mark }}</span>',
'                        </span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                </div>'].join('\n'),
[
'                <div style="margin-top:16px;padding:13px 16px;background:rgba(0,0,0,.3);border-left:2px solid #5A4A2C">',
'                  <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:10px">',
'                    <span style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#E9B341">地表 → 地心</span>',
'                    <span style="font:700 22px/1 \'C11\';color:#E9B341">{{ boardDone }}</span>',
'                    <span style="font:400 11px/1 \'C11\';color:#8A8073">還有 {{ boardLeft }}</span>',
'                  </div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:8px;text-wrap:pretty">{{ boardStepNote }}</div>',
'                </div>'].join('\n'));


/* 10r. 期末回顧最上面先把故事收完 */
must([
'                  <div style="{{ finGateBox }}">'].join('\n'),
[
'                  <sc-if value="{{ hasEnding }}" hint-placeholder-val="{{ true }}">',
'                    <div style="display:flex;flex-direction:column;gap:11px">',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.26em;color:#E9B341">故事到這裡結束</div>',
'                      <sc-for list="{{ endingPages }}" as="ep" hint-placeholder-count="4">',
'                        <div style="{{ ep.style }}">',
'                          <div style="{{ ep.kStyle }}">{{ ep.k }}</div>',
'                          <div style="{{ ep.tStyle }}">{{ ep.t }}</div>',
'                          <div style="{{ ep.bStyle }}">{{ ep.b }}</div>',
'                        </div>',
'                      </sc-for>',
'                    </div>',
'                  </sc-if>',
'                  <div style="{{ finGateBox }}">'].join('\n'));


/* 10s. 剖面上標出同一層還有哪幾組 */
must(
'                        <span style="{{ m.stepsTagStyle }}">{{ m.stepsTag }}</span>',
[
'                        <span style="{{ m.stepsTagStyle }}">{{ m.stepsTag }}</span>',
'                        <sc-if value="{{ m.hasOthers }}" hint-placeholder-val="{{ false }}">',
'                          <span style="{{ m.othersStyle }}">',
'                            <span style="{{ m.othersNoteStyle }}">{{ m.othersNote }}</span>',
'                            <sc-for list="{{ m.others }}" as="ot" hint-placeholder-count="2">',
'                              <span onClick="{{ ot.open }}" style="{{ ot.style }}">{{ ot.name }}　{{ ot.meta }}</span>',
'                            </sc-for>',
'                          </span>',
'                        </sc-if>'].join('\n'));


/* 10t. 驗收改成一次審完一組：T-03 先選組，T-06 標第幾件並自動接下一件 */
must([
'                <p style="font:400 22px/1.7 \'C11\';color:#8A8073;margin:0;max-width:440px;text-wrap:pretty">每一項都要寫下合格考量。學生看到的不是通過或退回，是你憑什麼這樣判斷。</p>',
'              </div>',
'              <div style="padding:20px var(--pad);display:flex;flex-direction:column;gap:8px">'].join('\n'),
[
'                <p style="font:400 22px/1.7 \'C11\';color:#8A8073;margin:0;max-width:640px;text-wrap:pretty">{{ queueLede }}</p>',
'              </div>',
'              <sc-if value="{{ hasQueueGroups }}" hint-placeholder-val="{{ true }}">',
'                <div style="padding:16px var(--pad) 0;display:flex;flex-wrap:wrap;gap:7px">',
'                  <sc-for list="{{ queueGroups }}" as="qg" hint-placeholder-count="3">',
'                    <button onClick="{{ qg.pick }}" style="{{ qg.style }}">',
'                      <span style="display:block;font:500 22px/1.3 \'C11\'">{{ qg.name }}</span>',
'                      <span style="display:block;font:400 11px/1.5 \'C11\';color:#8A8073;margin-top:5px">{{ qg.sub }}</span>',
'                    </button>',
'                  </sc-for>',
'                </div>',
'              </sc-if>',
'              <sc-if value="{{ hasPickedGroup }}" hint-placeholder-val="{{ true }}">',
'                <div style="margin:14px var(--pad) 0;padding:14px 17px;background:linear-gradient(140deg,rgba(233,179,65,.08),transparent 65%),#14110E;border:1px solid #3A3026">',
'                  <div style="display:flex;flex-wrap:wrap;align-items:baseline;gap:11px">',
'                    <span style="font:700 33px/1.2 \'C11\';color:#F2E6C8">{{ pickedTeam }}</span>',
'                    <span style="font:400 11px/1 \'C11\';color:#8A8073">{{ pickedMeta }}</span>',
'                  </div>',
'                  <sc-if value="{{ hasPattern }}" hint-placeholder-val="{{ false }}">',
'                    <div style="font:400 22px/1.6 \'C11\';color:#C3BAAA;margin-top:9px;text-wrap:pretty">{{ patternNote }}</div>',
'                  </sc-if>',
'                </div>',
'              </sc-if>',
'              <div style="padding:14px var(--pad) 20px;display:flex;flex-direction:column;gap:8px">'].join('\n'));

/* T-06 標第幾件 ＋ 前後切換 */
must(
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.26em;color:#5F574C">T-06 · VERIFY</div>',
[
'                  <div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px">',
'                    <span style="font:400 11px/1 \'C11\';letter-spacing:.26em;color:#5F574C">T-06 · VERIFY</span>',
'                    <sc-if value="{{ hasRevProgress }}" hint-placeholder-val="{{ true }}">',
'                      <span style="font:500 11px/1 \'C11\';letter-spacing:.12em;padding:6px 10px;background:rgba(233,179,65,.12);border:1px solid #5A4A2C;color:#E9B341">{{ revProgress }}</span>',
'                      <span style="flex:1"></span>',
'                      <sc-if value="{{ hasPrevRev }}" hint-placeholder-val="{{ false }}">',
'                        <button onClick="{{ prevRev }}" style="font:500 11px/1 \'C11\';padding:7px 11px;cursor:pointer;background:none;border:1px solid #2E2822;color:#8A8073">← 上一件</button>',
'                      </sc-if>',
'                      <sc-if value="{{ hasNextRev }}" hint-placeholder-val="{{ false }}">',
'                        <button onClick="{{ nextRev }}" style="font:500 11px/1 \'C11\';padding:7px 11px;cursor:pointer;background:none;border:1px solid #2E2822;color:#8A8073">下一件 →</button>',
'                      </sc-if>',
'                      <button onClick="{{ backToGroup }}" style="font:500 11px/1 \'C11\';padding:7px 11px;cursor:pointer;background:none;border:1px solid #2E2822;color:#8A8073">回組別清單</button>',
'                    </sc-if>',
'                  </div>'].join('\n'));


/* 10u. 演練模式工具列：換成腳本控制，三端看同一個時刻 */
must([
'      <button onClick="{{ tickWeek }}" style="font:500 11px/1 \'C11\';letter-spacing:.1em;color:#E9B341;background:rgba(233,179,65,.1);border:1px solid #5A4A2C;padding:7px 10px;cursor:pointer;white-space:nowrap">＋1 週</button>',
'      <button onClick="{{ unlockAll }}" style="{{ unlockStyle }}">全開</button>',
'      <button onClick="{{ reset }}" style="margin-left:6px;font:500 11px/1 \'C11\';letter-spacing:.1em;color:#8A8073;background:none;border:1px solid #2E2822;padding:7px 10px;cursor:pointer;white-space:nowrap">重置</button>'].join('\n'),
[
'      <button onClick="{{ demoRestart }}" style="font:500 11px/1 \'C11\';letter-spacing:.1em;color:#8A8073;background:none;border:1px solid #2E2822;padding:7px 10px;cursor:pointer;white-space:nowrap">從頭</button>'].join('\n'));

/* 工具列下面加一條腳本控制帶 */
must([
'      <button onClick="{{ exitDemo }}" style="margin-left:6px;font:500 11px/1 \'C11\';letter-spacing:.1em;color:#C9A227;background:rgba(201,162,39,.12);border:1px solid #4A4238;padding:7px 10px;cursor:pointer;white-space:nowrap">離開演練</button>',
'    </div>',
'  </div>',
'  </sc-if>'].join('\n'),
[
'      <button onClick="{{ exitDemo }}" style="margin-left:6px;font:500 11px/1 \'C11\';letter-spacing:.1em;color:#C9A227;background:rgba(201,162,39,.12);border:1px solid #4A4238;padding:7px 10px;cursor:pointer;white-space:nowrap">離開演練</button>',
'    </div>',
'  </div>',
'  <div style="position:sticky;top:53px;z-index:39;padding:11px 22px;background:rgba(11,10,9,.96);border-bottom:1px solid #26211C;display:flex;flex-wrap:wrap;align-items:center;gap:12px">',
'    <button onClick="{{ demoPrev }}" style="font:500 11px/1 \'C11\';letter-spacing:.1em;padding:8px 12px;cursor:pointer;background:none;border:1px solid #2E2822;color:#8A8073;white-space:nowrap">← 上一步</button>',
'    <div style="display:flex;gap:3px;flex-wrap:wrap">',
'      <sc-for list="{{ demoJumps }}" as="dj" hint-placeholder-count="11">',
'        <button onClick="{{ dj.pick }}" style="{{ dj.style }}">{{ dj.label }}</button>',
'      </sc-for>',
'    </div>',
'    <button onClick="{{ demoNext }}" style="font:500 11px/1 \'C11\';letter-spacing:.1em;padding:8px 12px;cursor:pointer;background:rgba(233,179,65,.12);border:1px solid #5A4A2C;color:#E9B341;white-space:nowrap">下一步 →</button>',
'    <div style="flex:1;min-width:200px">',
'      <div style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#E9B341">{{ demoStepLabel }}</div>',
'      <div style="font:500 11px/1.5 \'C11\';color:#DCD4C6;margin-top:4px">{{ demoStepTitle }}</div>',
'      <div style="font:400 11px/1.6 \'C11\';color:#8A8073;margin-top:3px;text-wrap:pretty">{{ demoStepNote }}</div>',
'    </div>',
'    <div style="display:flex;gap:5px">',
'      <sc-for list="{{ demoRoles }}" as="dr" hint-placeholder-count="3">',
'        <button onClick="{{ dr.pick }}" style="{{ dr.style }}">{{ dr.label }}</button>',
'      </sc-for>',
'    </div>',
'  </div>',
'  </sc-if>'].join('\n'));


/* 10v. 四件更正的畫面：T-09 回話、T-05 撞週、T-06 常用句與書寫量 */

/* T-09：回一句話 */
must([
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">這一頁在做什麼</div>',
'                        <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:9px;text-wrap:pretty">{{ tfinFootNote }}</div>'].join('\n'),
[
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">回他們一句話</div>',
'                        <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:9px;text-wrap:pretty">{{ tfinFootNote }}</div>',
'                        <sc-if value="{{ tfinHasReply }}" hint-placeholder-val="{{ false }}">',
'                          <div style="margin-top:12px;padding:12px 14px;background:rgba(233,179,65,.07);border-left:2px solid #E9B341">',
'                            <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">你已經回過了{{ tfinReplyBy }}</div>',
'                            <div style="font:400 22px/1.7 \'C11\';color:#E8E2D6;margin-top:8px;text-wrap:pretty">{{ tfinReplyOld }}</div>',
'                          </div>',
'                        </sc-if>',
'                        <textarea onChange="{{ setTfinReply }}" value="{{ tfinReply }}" placeholder="{{ tfinReplyPh }}" style="width:100%;margin-top:12px;min-height:150px;padding:13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.7 \'C11\';resize:vertical;outline:none"></textarea>',
'                        <button onClick="{{ sendTfinReply }}" style="{{ tfinReplyStyle }}">{{ tfinReplyLabel }}</button>'].join('\n'));

/* T-05：撞週警告 */
must([
'                <sc-if value="{{ hasLayerWarn }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:9px;padding:10px 13px;background:rgba(217,96,63,.1);border-left:2px solid #D9603F;font:400 22px/1.5 \'C11\';color:#FFB9A2;text-wrap:pretty">{{ layerWarn }}</div>',
'                </sc-if>'].join('\n'),
[
'                <sc-if value="{{ hasLayerWarn }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:9px;padding:10px 13px;background:rgba(217,96,63,.1);border-left:2px solid #D9603F;font:400 22px/1.5 \'C11\';color:#FFB9A2;text-wrap:pretty">{{ layerWarn }}</div>',
'                </sc-if>',
'                <sc-if value="{{ hasDuePeak }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-top:9px;padding:11px 13px;background:rgba(217,96,63,.1);border-left:2px solid #D9603F">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#D9603F">期限都擠在同一週</div>',
'                    <div style="font:400 22px/1.5 \'C11\';color:#FFB9A2;margin-top:8px;text-wrap:pretty">{{ duePeakNote }}</div>',
'                  </div>',
'                </sc-if>',
'                <sc-if value="{{ hasDueSpread }}" hint-placeholder-val="{{ false }}">',
'                  <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">',
'                    <sc-for list="{{ duePeakRows }}" as="dp" hint-placeholder-count="4">',
'                      <div style="{{ dp.style }}"><span style="{{ dp.labelStyle }}">{{ dp.label }}</span><span style="{{ dp.countStyle }}">{{ dp.count }}</span></div>',
'                    </sc-for>',
'                  </div>',
'                </sc-if>'].join('\n'));

/* T-06：常用句 ＋ 書寫量，放在理由欄上面 */
must(
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:4px">合格考量 · 學生會看到這一段</div>',
[
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:4px">合格考量 · 學生會看到這一段</div>',
'                  <sc-if value="{{ hasWritingNote }}" hint-placeholder-val="{{ false }}">',
'                    <div style="margin-bottom:9px;padding:9px 12px;background:rgba(0,0,0,.28);border-left:2px solid #3A3026;font:400 11px/1.7 \'C11\';color:#8A8073;text-wrap:pretty">{{ writingNote }}</div>',
'                  </sc-if>',
'                  <sc-if value="{{ hasMyPhrases }}" hint-placeholder-val="{{ false }}">',
'                    <div style="margin-bottom:9px">',
'                      <div style="font:400 11px/1.6 \'C11\';color:#6E665A;margin-bottom:7px;text-wrap:pretty">{{ myPhrasesNote }}</div>',
'                      <div style="display:flex;flex-wrap:wrap;gap:6px">',
'                        <sc-for list="{{ myPhrases }}" as="mp" hint-placeholder-count="3">',
'                          <button onClick="{{ mp.pick }}" style="{{ mp.style }}">{{ mp.text }}<span style="display:block;font:400 11px/1 \'C11\';color:#5F574C;margin-top:4px">{{ mp.meta }}</span></button>',
'                        </sc-for>',
'                      </div>',
'                    </div>',
'                  </sc-if>'].join('\n'));


/* 10w. T-09 改成「准許進入結局」：老師在系統裡的最後一個動作 */
must(
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">回他們一句話</div>',
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">{{ tfinReplyLabel }}</div>');

must([
'                        <sc-if value="{{ tfinHasReply }}" hint-placeholder-val="{{ false }}">',
'                          <div style="margin-top:12px;padding:12px 14px;background:rgba(233,179,65,.07);border-left:2px solid #E9B341">',
'                            <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">你已經回過了{{ tfinReplyBy }}</div>',
'                            <div style="font:400 22px/1.7 \'C11\';color:#E8E2D6;margin-top:8px;text-wrap:pretty">{{ tfinReplyOld }}</div>',
'                          </div>',
'                        </sc-if>'].join('\n'),
[
'                        <sc-if value="{{ tfinHasWords }}" hint-placeholder-val="{{ false }}">',
'                          <div style="margin-top:12px;padding:12px 14px;background:rgba(233,179,65,.07);border-left:2px solid #E9B341">',
'                            <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">你放行的時候說了{{ tfinWordsBy }}</div>',
'                            <div style="font:400 22px/1.7 \'C11\';color:#E8E2D6;margin-top:8px;text-wrap:pretty">{{ tfinWordsOld }}</div>',
'                          </div>',
'                        </sc-if>'].join('\n'));

/* 三題只有放行之後才有意義 */
must(
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">他們自己回頭寫的三題</div>',
'                        <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:{{ tfinAnsColor }}">{{ tfinAnsLabel }}</div>');


/* 10x. 重要動作之後的一頁：擋在畫面前，按確認才回去 */
must([
'      <sc-if value="{{ rewardOpen }}" hint-placeholder-val="{{ false }}">'].join('\n'),
[
'      <sc-if value="{{ momentOpen }}" hint-placeholder-val="{{ false }}">',
'        <div style="{{ momentBox }}">',
'          <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:16px;max-width:600px;width:100%;animation:momentIn .42s cubic-bezier(.2,.9,.3,1) both">',
'            <div style="position:relative;display:flex;align-items:center;justify-content:center;width:104px;height:104px">',
'              <span style="{{ momentRay }}"></span>',
'              <span style="{{ momentArt }}"></span>',
'            </div>',
'            <sc-if value="{{ hasMomentBadge }}" hint-placeholder-val="{{ false }}">',
'              <span style="{{ momentBadgeStyle }}">{{ momentBadge }}</span>',
'            </sc-if>',
'            <div>',
'              <div style="font:400 11px/1 \'C11\';letter-spacing:.34em;color:{{ momentAccent }}">{{ momentKicker }}</div>',
'              <h1 style="font:700 44px/1.25 \'C11\';letter-spacing:.1em;text-indent:.1em;color:#F2E6C8;margin:14px 0 0;text-shadow:0 0 30px rgba(233,179,65,.28);text-wrap:balance">{{ momentTitle }}</h1>',
'              <p style="font:400 22px/1.8 \'C11\';color:#C3BAAA;margin:12px 0 0;text-wrap:pretty">{{ momentLede }}</p>',
'            </div>',
'            <sc-if value="{{ hasMomentRows }}" hint-placeholder-val="{{ true }}">',
'              <div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:center">',
'                <sc-for list="{{ momentRows }}" as="mr" hint-placeholder-count="3">',
'                  <div style="{{ mr.style }}">',
'                    <span style="{{ mr.kStyle }}">{{ mr.k }}</span>',
'                    <span style="{{ mr.vStyle }}">{{ mr.v }}</span>',
'                  </div>',
'                </sc-for>',
'              </div>',
'            </sc-if>',
'            <sc-if value="{{ hasMomentQuote }}" hint-placeholder-val="{{ false }}">',
'              <div style="{{ momentQuoteStyle }}">',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">{{ momentQuoteLabel }}</div>',
'                <div style="font:400 22px/1.8 \'C11\';color:#E8E2D6;margin-top:8px;text-wrap:pretty">{{ momentQuote }}</div>',
'              </div>',
'            </sc-if>',
'            <sc-if value="{{ hasMomentLines }}" hint-placeholder-val="{{ false }}">',
'              <div style="display:flex;flex-direction:column;gap:8px;max-width:520px">',
'                <sc-for list="{{ momentLines }}" as="ml" hint-placeholder-count="2">',
'                  <div style="{{ ml.style }}">{{ ml.t }}</div>',
'                </sc-for>',
'              </div>',
'            </sc-if>',
'            <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:6px">',
'              <button onClick="{{ closeMoment }}" style="{{ momentBtnStyle }}">{{ momentBtn }}</button>',
'              <sc-if value="{{ hasMomentAlt }}" hint-placeholder-val="{{ false }}">',
'                <button onClick="{{ doMomentAlt }}" style="{{ momentAltStyle }}">{{ momentAlt }}</button>',
'              </sc-if>',
'            </div>',
'          </div>',
'        </div>',
'      </sc-if>',
'',
'      <sc-if value="{{ rewardOpen }}" hint-placeholder-val="{{ false }}">'].join('\n'));

/* 21. T-05：怎麼用這一頁改成旁邊一顆鈕，另外開一頁看，介面清乾淨 */
must([
'              <div style="padding:16px var(--pad) 0">',
'                <div style="padding:14px 17px;background:linear-gradient(140deg,rgba(233,179,65,.08),transparent 62%),#14110E;border:1px solid #3A3026;display:flex;flex-wrap:wrap;gap:18px;align-items:flex-start">',
'                  <div style="flex:1.1;min-width:250px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">怎麼用這一頁</div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#C3BAAA;margin-top:8px;text-wrap:pretty">{{ howToOpen }}</div>',
'                  </div>',
'                  <div style="flex:1;min-width:240px;display:flex;flex-direction:column;gap:7px">',
'                    <sc-for list="{{ openChain }}" as="oc" hint-placeholder-count="3">',
'                      <div style="display:flex;gap:9px;align-items:flex-start">',
'                        <span style="{{ oc.num }}">{{ oc.n }}</span>',
'                        <span style="flex:1;font:400 22px/1.5 \'C11\';color:#9A9184;text-wrap:pretty">{{ oc.t }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                </div>'].join('\n'),
[
'              <div style="padding:16px var(--pad) 0">',
'                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px">',
'                  <div style="flex:1;min-width:200px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">{{ t05Kicker }}</div>',
'                    <div style="font:700 22px/1.3 \'C11\';color:#E8E2D6;margin-top:7px;text-wrap:pretty">{{ t05Head }}</div>',
'                  </div>',
'                  <button onClick="{{ openHowTo }}" style="{{ howToBtnStyle }}">{{ howToBtnLabel }}</button>',
'                </div>'].join('\n'));

/* 22. S-05：要交的東西擺最前面，問的話擺後面 */
(function () {
  var EV = [
'                <div>',
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:9px">證據</div>'].join('\n');
  var TXT = [
'                <div>',
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:4px">做到什麼程度</div>'].join('\n');
  var BTN = [
'                <div style="display:flex;gap:10px;flex-wrap:wrap;padding-top:4px">',
'                  <button onClick="{{ submitTask }}" style="{{ submitBtnStyle }}">{{ submitBtnLabel }}</button>'].join('\n');
  var a = t.indexOf(EV), b = t.indexOf(BTN), c = t.indexOf(TXT);
  if (a < 0 || b < 0 || c < 0 || !(c < a && a < b)) { console.error('MISS 22 S05 reorder'); process.exit(1); }
  var block = t.slice(a, b);                       // 證據那一整塊
  t = t.slice(0, a) + t.slice(b);                  // 先拿掉
  t = t.slice(0, c) + block + t.slice(c);          // 放到「做到什麼程度」前面
})();

/* 22b. 換名字：交的東西叫「要提交的東西」，寫的那格叫「提交內容」 */
must('                  <div style="font:500 22px/1 \'C11\';margin-bottom:9px">證據</div>',
[
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:4px">要提交的東西</div>',
'                  <div style="font:400 11px/1.6 \'C11\';color:#6E665A;margin-bottom:9px">先把檔案、截圖或連結放上來。他要收到的規格寫在上面。</div>'].join('\n'));

must([
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:4px">做到什麼程度</div>',
'                  <div style="font:400 11px/1.6 \'C11\';color:#6E665A;margin-bottom:9px">寫程度，不是寫「有做」。</div>'].join('\n'),
[
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:4px">提交內容</div>',
'                  <div style="font:400 11px/1.6 \'C11\';color:#6E665A;margin-bottom:9px">說明你交出來的是什麼、做到哪個程度。寫程度，不是寫「有做」。</div>'].join('\n'));

/* 23. S-05：這一組現在的狀態必填；「為什麼差這麼多」只有勾比預估慢的人要寫 */
must('                    <span style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#E9B341">會跟這一項一起送給他</span>',
     '                    <span style="{{ reflectReqStyle }}">必填</span>\n' +
     '                    <span style="font:400 11px/1 \'C11\';letter-spacing:.14em;color:#E9B341">會跟這一項一起送給他</span>');

must('                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C;margin-bottom:9px">這一項實際花的力氣，跟你們原本估的比</div>',
     '                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C;margin-bottom:9px">這一項實際花的力氣，跟你們原本估的比　<span style="color:#E9B341">三選一</span></div>');

must([
'                  <div style="margin-top:14px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C;margin-bottom:8px">為什麼差這麼多（一句話就好）</div>',
'                    <input value="{{ effortNote }}" onChange="{{ setEffortNote }}" placeholder="例：訪談約不到人，等了一週才排上。" style="width:100%;padding:12px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.5 \'C11\';outline:none">',
'                  </div>'].join('\n'),
[
'                  <sc-if value="{{ needEffortNote }}" hint-placeholder-val="{{ false }}">',
'                    <div style="margin-top:14px">',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C;margin-bottom:8px">{{ effortNoteLabel }}</div>',
'                      <input value="{{ effortNote }}" onChange="{{ setEffortNote }}" placeholder="例：訪談約不到人，等了一週才排上。" style="width:100%;padding:12px 13px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.5 \'C11\';outline:none">',
'                    </div>',
'                  </sc-if>'].join('\n'));

/* 24. 標題不要羅馬拼音 */
must('              <div style="font:400 11px/1 \'C11\';letter-spacing:.42em;color:#8A8073;margin-bottom:26px">ZHU CENG JUE JIN</div>\n', '');

/* 25. 說明句不要在螢幕一半就換行——桌機把整個欄寬用滿 */
(function () {
  var n = 0;
  /* 學生／老師端的段落（像素字 22px）：拿掉自己的窄上限，交給欄寬決定 */
  t = t.replace(/(<p style="font:400 22px\/1\.7 'C11';[^"]*?)max-width:\d+px;/g,
    function (m, head) { n++; return head; });
  /* 研究者端的段落（13-14px）同理 */
  t = t.replace(/(font-family:'Noto Sans TC',sans-serif;font-size:1[2-4](?:\.5)?px;[^"]*?);?max-width:\d+px/g,
    function (m, head) { n++; return head; });
  /* 研究者端那幾個清單容器 */
  ['gap:6px;max-width:620px', 'gap:9px;max-width:620px', 'gap:7px;max-width:660px'].forEach(function (o) {
    if (t.indexOf(o) < 0) return;
    n++; t = t.split(o).join(o.split(';')[0]);
  });
  if (n < 18) { console.error('MISS 25 寬度，只換到 ' + n + ' 處'); process.exit(1); }
  console.log('25. 說明句放寬 ' + n + ' 處');
})();

/* 26. 期末回顧的說明句與研究者端幾個窄欄——同樣不要停在螢幕一半 */
must('<p style="font:400 22px/1.8 \'C11\';color:#B6AC9C;margin:14px 0 0;max-width:520px;text-wrap:pretty">{{ finLede }}</p>',
     '<p style="font:400 22px/1.8 \'C11\';color:#B6AC9C;margin:14px 0 0;text-wrap:pretty">{{ finLede }}</p>');
[['R-ADM 帳號管理" style="padding:var(--pad) 24px;max-width:860px"', 'R-ADM 帳號管理" style="padding:var(--pad) 24px;max-width:1200px"'],
 ['R-00 進入" style="padding:var(--pad) 24px;max-width:720px"', 'R-00 進入" style="padding:var(--pad) 24px;max-width:1200px"'],
 ['R-04 天然對照" style="padding:var(--pad) 24px;max-width:760px"', 'R-04 天然對照" style="padding:var(--pad) 24px;max-width:1200px"'],
 ['R-08 匯出" style="padding:var(--pad) 24px;max-width:720px"', 'R-08 匯出" style="padding:var(--pad) 24px;max-width:1200px"']].forEach(function (p) { must(p[0], p[1]); });

/* 26b. S-01 標頭的難處也一樣 */
must('<div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:6px;max-width:400px;text-wrap:pretty">{{ layerHard }}</div>',
     '<div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:6px;text-wrap:pretty">{{ layerHard }}</div>');

/* 27. 開頭新增兩頁的插圖：擋路的生物、拿礦石換武器 */
must('                <div style="font:400 11px/1 \'C11\';letter-spacing:.3em;color:#5F574C;margin-bottom:14px">{{ storyKicker }}</div>',
[
'                <sc-if value="{{ storyArtBeast }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-bottom:22px;display:flex;justify-content:center">',
'                    <svg viewBox="0 0 320 150" width="320" height="150" shape-rendering="crispEdges" style="max-width:100%;height:auto">',
'                      <rect x="0" y="0" width="320" height="150" fill="#0E0C0A"></rect>',
'                      <polygon points="0,0 0,150 42,150 58,34 262,34 278,150 320,150 320,0" fill="#151109"></polygon>',
'                      <rect x="0" y="96" width="320" height="54" fill="#1A1611"></rect>',
'                      <rect x="0" y="96" width="320" height="4" fill="#3A3026"></rect>',
'                      <rect x="0" y="132" width="320" height="18" fill="#241C10"></rect>',
'                      <polygon points="150,96 138,46 160,28 182,46 170,96" fill="#C9A227"></polygon>',
'                      <rect x="152" y="36" width="16" height="16" fill="#0E0C0A"></rect>',
'                      <rect x="128" y="58" width="10" height="30" fill="#C9A227"></rect>',
'                      <rect x="182" y="58" width="10" height="30" fill="#C9A227"></rect>',
'                      <rect x="118" y="88" width="84" height="6" fill="#4A3F2A" opacity=".8"></rect>',
'                      <rect x="104" y="94" width="112" height="4" fill="#4A3F2A" opacity=".55"></rect>',
'                      <rect x="96" y="140" width="128" height="4" fill="#C9A227" opacity=".18"></rect>',
'                      <rect x="40" y="70" width="12" height="14" fill="#C3BAAA"></rect>',
'                      <rect x="38" y="84" width="16" height="12" fill="#8A8073"></rect>',
'                      <rect x="56" y="74" width="4" height="4" fill="#E9B341"></rect>',
'                    </svg>',
'                  </div>',
'                </sc-if>',
'                <sc-if value="{{ storyArtTrade }}" hint-placeholder-val="{{ false }}">',
'                  <div style="margin-bottom:22px;display:flex;justify-content:center">',
'                    <svg viewBox="0 0 320 150" width="320" height="150" shape-rendering="crispEdges" style="max-width:100%;height:auto">',
'                      <rect x="0" y="0" width="320" height="150" fill="#0E0C0A"></rect>',
'                      <rect x="0" y="96" width="320" height="54" fill="#1A1611"></rect>',
'                      <rect x="0" y="96" width="320" height="4" fill="#3A3026"></rect>',
'                      <rect x="0" y="132" width="320" height="18" fill="#241C10"></rect>',
'                      <polygon points="236,96 228,52 252,40 276,52 268,96" fill="#2A241C"></polygon>',
'                      <polygon points="242,52 252,44 262,52 260,66 244,66" fill="#0B0A09"></polygon>',
'                      <rect x="244" y="56" width="6" height="4" fill="#E9B341"></rect>',
'                      <rect x="256" y="56" width="6" height="4" fill="#E9B341"></rect>',
'                      <rect x="224" y="94" width="48" height="4" fill="#3A3026"></rect>',
'                      <polygon points="150,50 158,58 150,68 142,58" fill="#E9B341"></polygon>',
'                      <polygon points="176,46 184,54 176,64 168,54" fill="#E9B341" opacity=".8"></polygon>',
'                      <polygon points="164,72 172,80 164,90 156,80" fill="#E9B341" opacity=".65"></polygon>',
'                      <polygon points="196,68 204,76 196,86 188,76" fill="#E9B341" opacity=".5"></polygon>',
'                      <polygon points="138,74 146,82 138,92 130,82" fill="#E9B341" opacity=".45"></polygon>',
'                      <polygon points="188,92 194,98 188,106 182,98" fill="#E9B341" opacity=".35"></polygon>',
'                      <rect x="58" y="50" width="44" height="44" fill="#3A3026"></rect>',
'                      <rect x="64" y="56" width="32" height="32" fill="#14110E"></rect>',
'                      <polygon points="80,60 86,78 80,74 74,78" fill="#E9B341"></polygon>',
'                      <rect x="78" y="70" width="4" height="4" fill="#C3BAAA"></rect>',
'                      <rect x="108" y="70" width="18" height="4" fill="#5F574C"></rect>',
'                      <polygon points="108,66 108,78 100,72" fill="#5F574C"></polygon>',
'                    </svg>',
'                  </div>',
'                </sc-if>',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.3em;color:#5F574C;margin-bottom:14px">{{ storyKicker }}</div>'].join('\n'));

/* 28. S-06 那幾個標題換成變數——生物那一頁要換掉「功能」「他交給你的時候說」這種說法 */
[['<div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#E9B341">功能</div>',
  '<div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#E9B341">{{ specFuncLabel }}</div>'],
 ['<div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">對應的專案能力</div>',
  '<div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">{{ specAbilityLabel }}</div>'],
 ['<div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">他交給你的時候說</div>',
  '<div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specLineLabel }}</div>'],
 ['<div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">你注意到的事</div>',
  '<div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specNoticeLabel }}</div>'],
 ['<div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">來自哪一項任務</div>',
  '<div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specFromLabel }}</div>'],
 ['<div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">取得日期</div>',
  '<div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specDateLabel }}</div>']
].forEach(function (p) { must(p[0], p[1]); });

/* 29. 研究者端：班級可以編輯與刪除 */
must([
'                        <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:baseline;padding:12px 14px;background:#121A21;border:1px solid #1D2831;border-radius:9px">',
'                          <span style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;color:#DFE6EB">{{ k.name }}</span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ k.meta }}</span>',
'                          <span style="flex:1"></span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.14em;color:#5A6874">邀請碼</span>',
'                          <span style="font-family:\'IBM Plex Mono\',monospace;font-size:13px;letter-spacing:.1em;color:#7FC4D8">{{ k.code }}</span>',
'                          <button onClick="{{ k.copy }}" style="{{ k.copyStyle }}">{{ k.copyLabel }}</button>',
'                        </div>'].join('\n'),
[
'                        <div style="padding:12px 14px;background:#121A21;border:1px solid #1D2831;border-radius:9px">',
'                          <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:baseline">',
'                            <span style="font-family:\'Noto Sans TC\',sans-serif;font-size:13.5px;color:#DFE6EB">{{ k.name }}</span>',
'                            <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ k.meta }}</span>',
'                            <span style="flex:1"></span>',
'                            <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.14em;color:#5A6874">邀請碼</span>',
'                            <span style="font-family:\'IBM Plex Mono\',monospace;font-size:13px;letter-spacing:.1em;color:#7FC4D8">{{ k.code }}</span>',
'                            <button onClick="{{ k.copy }}" style="{{ k.copyStyle }}">{{ k.copyLabel }}</button>',
'                            <button onClick="{{ k.toggleEdit }}" style="{{ k.editStyle }}">{{ k.editLabel }}</button>',
'                          </div>',
'                          <sc-if value="{{ k.editing }}" hint-placeholder-val="{{ false }}">',
'                            <div style="margin-top:12px;padding-top:12px;border-top:1px solid #1D2831">',
'                              <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:stretch">',
'                                <sc-for list="{{ k.fields }}" as="kf" hint-placeholder-count="5">',
'                                  <label style="{{ kf.wrap }}">',
'                                    <span style="display:block;font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.14em;color:#5A6874;margin-bottom:5px">{{ kf.label }}</span>',
'                                    <input value="{{ kf.value }}" onChange="{{ kf.set }}" placeholder="{{ kf.ph }}" style="{{ kf.input }}">',
'                                  </label>',
'                                </sc-for>',
'                              </div>',
'                              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:11px;align-items:center">',
'                                <button onClick="{{ k.save }}" style="{{ k.saveStyle }}">{{ k.saveLabel }}</button>',
'                                <button onClick="{{ k.cancel }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:9px 15px;background:none;border:1px solid #1D2831;color:#8393A0;cursor:pointer;border-radius:6px">取消</button>',
'                                <span style="flex:1"></span>',
'                                <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ k.delHint }}</span>',
'                                <input value="{{ k.delText }}" onChange="{{ k.setDelText }}" placeholder="{{ k.delPh }}" style="flex:0 1 210px;min-width:150px;padding:9px 11px;background:#0C1116;border:1px solid #3A2226;border-radius:6px;color:#DFE6EB;font-family:\'Noto Sans TC\',sans-serif;font-size:12.5px;outline:none">',
'                                <button onClick="{{ k.remove }}" style="{{ k.delStyle }}">刪掉這個班</button>',
'                              </div>',
'                            </div>',
'                          </sc-if>',
'                        </div>'].join('\n'));

/* 30. S-01：標頭放這一層的 BOSS；「這一層怎麼走」收進按鈕，只留「下一件要做的事」 */
must([
'                  <div style="flex:1;min-width:200px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.26em;color:#8A8073">DEPTH {{ depthCode }} · 目前所在</div>',
'                    <div style="font:900 33px/1.2 \'C11\';letter-spacing:.08em;margin-top:9px;color:#F2EADA">{{ layerName }}</div>',
'                    <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:6px;text-wrap:pretty">{{ layerHard }}</div>',
'                  </div>'].join('\n'),
[
'                  <div style="flex:1;min-width:200px">',
'                    <div style="font:400 11px/1 \'C11\';letter-spacing:.26em;color:#8A8073">DEPTH {{ depthCode }} · 目前所在</div>',
'                    <div style="font:900 33px/1.2 \'C11\';letter-spacing:.08em;margin-top:9px;color:#F2EADA">{{ layerName }}</div>',
'                    <div style="font:400 22px/1.7 \'C11\';color:#8A8073;margin-top:6px;text-wrap:pretty">{{ layerHard }}</div>',
'                  </div>',
'                  <sc-if value="{{ hasHomeBoss }}" hint-placeholder-val="{{ true }}">',
'                    <div style="{{ homeBossBox }}">',
'                      <span style="{{ homeBossArt }}"></span>',
'                      <span style="min-width:0">',
'                        <span style="display:block;font:400 11px/1 \'C11\';letter-spacing:.2em;color:{{ homeBossKickerColor }}">{{ homeBossKicker }}</span>',
'                        <span style="display:block;font:700 22px/1.3 \'C11\';color:{{ homeBossNameColor }};margin-top:6px">{{ homeBossName }}</span>',
'                        <span style="display:block;font:400 11px/1.6 \'C11\';color:#8A8073;margin-top:5px;text-wrap:pretty">{{ homeBossNote }}</span>',
'                      </span>',
'                    </div>',
'                  </sc-if>'].join('\n'));

must([
'              <div style="margin:20px var(--pad) 0;padding:18px 19px;background:linear-gradient(150deg,rgba(233,179,65,.07),transparent 58%),#14110E;border:1px solid #3A3026">',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一層怎麼走</div>',
'                <div style="display:flex;flex-direction:column;gap:10px;margin-top:14px">',
'                  <sc-for list="{{ ruleSteps }}" as="rs" hint-placeholder-count="3">',
'                    <div style="{{ rs.box }}">',
'                      <span style="{{ rs.num }}">{{ rs.n }}</span>',
'                      <span style="flex:1;min-width:180px">',
'                        <span style="display:block;font:700 22px/1.4 \'C11\';color:{{ rs.color }}">{{ rs.title }}</span>',
'                        <span style="display:block;font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:5px;text-wrap:pretty">{{ rs.desc }}</span>',
'                      </span>',
'                      <span style="{{ rs.stateStyle }}">{{ rs.state }}</span>',
'                    </div>',
'                  </sc-for>',
'                </div>',
'                <div style="margin-top:16px;padding-top:14px;border-top:1px solid #26211C">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">下一件要做的事</div>'].join('\n'),
[
'              <div style="margin:20px var(--pad) 0;padding:18px 19px;background:linear-gradient(150deg,rgba(233,179,65,.07),transparent 58%),#14110E;border:1px solid #3A3026">',
'                <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px">',
'                  <span style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一層的進度</span>',
'                  <span style="font:700 22px/1 \'C11\';color:#F2EADA">{{ ruleProgress }}</span>',
'                  <span style="flex:1"></span>',
'                  <button onClick="{{ openLayerHow }}" style="{{ layerHowStyle }}">{{ layerHowLabel }}</button>',
'                </div>',
'                <div style="margin-top:16px;padding-top:14px;border-top:1px solid #26211C">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">下一件要做的事</div>'].join('\n'));

/* 31. S-06：底下列出相關的礦石／道具／寶物／守關生物，可以直接點過去 */
must([
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specFromLabel }}</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specFrom }}</div></div>',
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specDateLabel }}</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specDate }}</div></div>'].join('\n'),
[
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specFromLabel }}</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specFrom }}</div></div>',
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specDateLabel }}</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specDate }}</div></div>'].join('\n'));

must('              <div style="padding:var(--pad);display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start">',
[
'              <div style="padding:var(--pad);display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start">'].join('\n'));

/* 相關區塊接在整個 S-06 內容的最後 */
must([
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specDateLabel }}</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specDate }}</div></div>',
'                  </div>'].join('\n'),
[
'                    <div><div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#5F574C">{{ specDateLabel }}</div><div style="font:500 22px/1.5 \'C11\';margin-top:6px">{{ specDate }}</div></div>',
'                  </div>',
'                  <sc-if value="{{ hasSpecRelated }}" hint-placeholder-val="{{ true }}">',
'                    <div style="padding-top:15px;border-top:1px solid #221E19">',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">{{ specRelatedLabel }}</div>',
'                      <div style="font:400 11px/1.6 \'C11\';color:#6E665A;margin-top:6px;text-wrap:pretty">{{ specRelatedNote }}</div>',
'                      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:7px;margin-top:11px">',
'                        <sc-for list="{{ specRelated }}" as="sr" hint-placeholder-count="4">',
'                          <button onClick="{{ sr.open }}" style="{{ sr.style }}">',
'                            <span style="{{ sr.glyph }}"></span>',
'                            <span style="display:block;font:500 11px/1.4 \'C11\';margin-top:7px">{{ sr.name }}</span>',
'                            <span style="display:block;font:400 11px/1.3 \'C11\';color:#5F574C;margin-top:4px">{{ sr.kind }}</span>',
'                          </button>',
'                        </sc-for>',
'                      </div>',
'                    </div>',
'                  </sc-if>'].join('\n'));

/* 32. 說明一律收進按鈕：S-02 常見狀況、SUB 為什麼問這三題、甘特第一次用這一頁 */

/* S-02：常見狀況那一整塊 → 一顆鈕 */
must([
'              <div style="margin:18px var(--pad);padding:17px 19px;background:linear-gradient(140deg,rgba(233,179,65,.09),transparent 65%),#14110E;border:1px solid #3A3026">',
'                <div style="font:400 11px/1 \'C11\';letter-spacing:.2em;color:#E9B341;margin-bottom:12px">常見狀況 · 這一階段容易卡在哪</div>',
'                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(var(--card),1fr));gap:9px">',
'                  <sc-for list="{{ briefRows }}" as="b" hint-placeholder-count="3">',
'                    <div style="padding:12px 13px;background:rgba(0,0,0,.28);border-left:2px solid #3A3026">',
'                      <div style="font:500 22px/1.6 \'C11\';color:#E8E2D6;text-wrap:pretty">{{ b.what }}</div>',
'                      <div style="font:400 22px/1.5 \'C11\';color:{{ b.toolColor }};margin-top:9px">{{ b.tool }}</div>',
'                    </div>',
'                  </sc-for>',
'                </div>',
'              </div>'].join('\n'),
[
'              <div style="margin:14px var(--pad) 0;display:flex;flex-wrap:wrap;gap:10px;align-items:center">',
'                <button onClick="{{ openBrief }}" style="{{ briefBtnStyle }}">{{ briefBtnLabel }}</button>',
'              </div>'].join('\n'));

/* SUB：為什麼問這三題 → 一顆鈕，擺在三格上面 */
must([
'                <div style="padding:15px 17px;background:linear-gradient(140deg,rgba(233,179,65,.06),transparent 62%),#14110E;border:1px solid #3A3026">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">為什麼問這三題</div>',
'                  <div style="font:400 22px/1.7 \'C11\';color:#C3BAAA;margin-top:9px;text-wrap:pretty">{{ gateWhy }}</div>',
'                  <div style="display:flex;flex-direction:column;gap:7px;margin-top:13px">',
'                    <sc-for list="{{ gateWhyRows }}" as="w" hint-placeholder-count="3">',
'                      <div style="display:flex;gap:10px;align-items:flex-start">',
'                        <span style="font:600 11px/1 \'C11\';color:#0B0A09;background:#5A4A2C;padding:5px 7px;flex:none">{{ w.n }}</span>',
'                        <span style="font:400 22px/1.6 \'C11\';color:#8A8073;text-wrap:pretty">{{ w.t }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>'].join('\n'),
[
'                <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">',
'                  <button onClick="{{ openGateWhy }}" style="{{ gateWhyBtnStyle }}">{{ gateWhyBtnLabel }}</button>',
'                </div>',
'                <div style="display:none">'].join('\n'));

/* 甘特：第一次用這一頁 → 一顆鈕 */
must([
'              <sc-if value="{{ ganttFresh }}" hint-placeholder-val="{{ true }}">',
'                <div style="margin:16px var(--pad) 0;padding:15px 17px;background:linear-gradient(140deg,rgba(233,179,65,.09),transparent 65%),#14110E;border:1px solid #3A3026">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">第一次用這一頁</div>'].join('\n'),
[
'              <div style="margin:14px var(--pad) 0;display:flex;flex-wrap:wrap;gap:10px;align-items:center">',
'                <button onClick="{{ openGanttHow }}" style="{{ ganttHowBtnStyle }}">{{ ganttHowBtnLabel }}</button>',
'              </div>',
'              <sc-if value="{{ ganttNever }}" hint-placeholder-val="{{ false }}">',
'                <div style="margin:16px var(--pad) 0;padding:15px 17px;background:linear-gradient(140deg,rgba(233,179,65,.09),transparent 65%),#14110E;border:1px solid #3A3026">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">第一次用這一頁</div>'].join('\n'));

/* 33. 沙盒班級：開班時可以勾，班級列上標示，學生／老師端掛橫幅 */
must('                      <button onClick="{{ adm.createClass }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:10px 16px;background:#1E2024;border:1px solid #2A2E33;color:#DFE6EB;cursor:pointer;border-radius:6px">開一個班</button>',
[
'                      <button onClick="{{ adm.toggleNewSandbox }}" style="{{ adm.newSandboxStyle }}">{{ adm.newSandboxLabel }}</button>',
'                      <button onClick="{{ adm.createClass }}" style="font-family:\'IBM Plex Mono\',monospace;font-size:12px;padding:10px 16px;background:#1E2024;border:1px solid #2A2E33;color:#DFE6EB;cursor:pointer;border-radius:6px">開一個班</button>'].join('\n'));

must('                            <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ k.meta }}</span>',
[
'                            <span style="font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;color:#5A6874">{{ k.meta }}</span>',
'                            <sc-if value="{{ k.isSandbox }}" hint-placeholder-val="{{ false }}">',
'                              <span style="{{ k.sandboxChip }}">試用班 · 不進研究紀錄</span>',
'                            </sc-if>'].join('\n'));

must([
'                                  <label style="{{ kf.wrap }}">',
'                                    <span style="display:block;font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.14em;color:#5A6874;margin-bottom:5px">{{ kf.label }}</span>',
'                                    <input value="{{ kf.value }}" onChange="{{ kf.set }}" placeholder="{{ kf.ph }}" style="{{ kf.input }}">',
'                                  </label>',
'                                </sc-for>',
'                              </div>'].join('\n'),
[
'                                  <label style="{{ kf.wrap }}">',
'                                    <span style="display:block;font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.14em;color:#5A6874;margin-bottom:5px">{{ kf.label }}</span>',
'                                    <input value="{{ kf.value }}" onChange="{{ kf.set }}" placeholder="{{ kf.ph }}" style="{{ kf.input }}">',
'                                  </label>',
'                                </sc-for>',
'                              </div>',
'                              <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:11px">',
'                                <button onClick="{{ k.toggleSandbox }}" style="{{ k.sandboxBtnStyle }}">{{ k.sandboxBtnLabel }}</button>',
'                                <span style="flex:1;min-width:200px;font-family:\'IBM Plex Mono\',monospace;font-size:10.5px;line-height:1.8;color:#5A6874">{{ k.sandboxNote }}</span>',
'                              </div>'].join('\n'));

/* 學生端與老師端：在沙盒班級裡要看得出來 */
must('      <sc-if value="{{ momentOpen }}" hint-placeholder-val="{{ false }}">',
[
'      <sc-if value="{{ inSandbox }}" hint-placeholder-val="{{ false }}">',
'        <div style="{{ sandboxBarStyle }}">{{ sandboxBarText }}</div>',
'      </sc-if>',
'',
'      <sc-if value="{{ momentOpen }}" hint-placeholder-val="{{ false }}">'].join('\n'));

/* 34. 演練模式整套移除：原型工具列與研究者端的 DEMO 橫幅都拿掉 */
(function () {
  var NLx = String.fromCharCode(10);

  /* 頂部那一整條原型工具列 */
  var a = t.indexOf('  <sc-if value="{{ protoChrome }}" hint-placeholder-val="{{ false }}">');
  var b = t.indexOf('  <div style="{{ stageWrapStyle }}">');
  if (a < 0 || b < 0) { console.error('MISS 34 工具列', a, b); process.exit(1); }
  t = t.slice(0, a) + t.slice(b);

  /* 研究者端的 DEMO 橫幅 */
  var c = t.indexOf('                <sc-if value="{{ resVals.demoOn }}" hint-placeholder-val="{{ false }}">');
  if (c < 0) { console.error('MISS 34 橫幅'); process.exit(1); }
  var d = t.indexOf('                </sc-if>', c);
  if (d < 0) { console.error('MISS 34 橫幅結尾'); process.exit(1); }
  t = t.slice(0, c) + t.slice(d + '                </sc-if>'.length + 1);

  console.log('34. 演練模式的版面整套移除');
})();

/* 35. T-05：老師可以照自己的規劃改這一層的拆分名稱 */
must([
'                <div style="padding:14px 16px;background:rgba(0,0,0,.24);border:1px dashed #2E2822">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一項是哪一塊礦石　{{ veinCount }}</div>'].join('\n'),
[
'                <div style="padding:14px 16px;background:rgba(0,0,0,.24);border:1px dashed #2E2822">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一層的拆分</div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:7px;text-wrap:pretty">{{ veinRenameNote }}</div>',
'                  <div style="display:flex;flex-direction:column;gap:6px;margin-top:11px">',
'                    <sc-for list="{{ veinRenames }}" as="vr" hint-placeholder-count="4">',
'                      <div>',
'                        <div style="{{ vr.rowStyle }}">',
'                          <span style="font:500 22px/1.3 \'C11\';color:#E8E2D6;flex:1;min-width:120px">{{ vr.label }}</span>',
'                          <span style="font:400 11px/1 \'C11\';color:#6E665A;white-space:nowrap">{{ vr.mineral }}</span>',
'                          <sc-if value="{{ vr.isChanged }}" hint-placeholder-val="{{ false }}">',
'                            <span style="{{ vr.tagStyle }}">{{ vr.tag }}</span>',
'                          </sc-if>',
'                          <button onClick="{{ vr.toggle }}" style="{{ vr.toggleStyle }}">{{ vr.toggleLabel }}</button>',
'                        </div>',
'                        <sc-if value="{{ vr.open }}" hint-placeholder-val="{{ false }}">',
'                          <div style="padding:12px 13px;background:rgba(0,0,0,.34);border-left:2px solid #5A4A2C;margin-top:4px">',
'                            <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C">你要叫它什麼</div>',
'                            <input value="{{ vr.labelValue }}" onChange="{{ vr.setLabel }}" placeholder="{{ vr.labelPh }}" style="width:100%;margin-top:6px;padding:11px 12px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.4 \'C11\';outline:none">',
'                            <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C;margin-top:11px">你的說法（學生點開礦石會看到）</div>',
'                            <textarea onChange="{{ vr.setNote }}" value="{{ vr.noteValue }}" placeholder="{{ vr.notePh }}" style="width:100%;margin-top:6px;min-height:110px;padding:11px 12px;background:#0E0C0A;border:1px solid #2E2822;color:#E8E2D6;font:400 22px/1.6 \'C11\';resize:vertical;outline:none"></textarea>',
'                            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:11px;align-items:center">',
'                              <button onClick="{{ vr.save }}" style="font:500 22px/1 \'C11\';color:#0B0A09;background:#E9B341;border:none;padding:11px 17px;cursor:pointer">存起來</button>',
'                              <button onClick="{{ vr.reset }}" style="font:400 22px/1 \'C11\';color:#8A8073;background:none;border:1px solid #2E2822;padding:11px 15px;cursor:pointer">改回系統預設</button>',
'                              <span style="flex:1;min-width:150px;font:400 11px/1.6 \'C11\';color:#5F574C">預設是「{{ vr.origin }}」</span>',
'                            </div>',
'                          </div>',
'                        </sc-if>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                </div>',
'                <div style="padding:14px 16px;background:rgba(0,0,0,.24);border:1px dashed #2E2822;margin-top:14px">',
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一項是哪一塊礦石　{{ veinCount }}</div>'].join('\n'));

/* 36. 拆分名稱一組一份：先選組別 */
must([
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一層的拆分</div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:7px;text-wrap:pretty">{{ veinRenameNote }}</div>'].join('\n'),
[
'                  <div style="font:400 11px/1 \'C11\';letter-spacing:.18em;color:#E9B341">這一層的拆分</div>',
'                  <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-top:7px;text-wrap:pretty">{{ veinRenameNote }}</div>',
'                  <sc-if value="{{ hasMinTeams }}" hint-placeholder-val="{{ true }}">',
'                    <div style="margin-top:11px;padding-top:11px;border-top:1px solid #26211C">',
'                      <div style="font:400 11px/1 \'C11\';letter-spacing:.16em;color:#5F574C;margin-bottom:8px">改哪一組的</div>',
'                      <div style="display:flex;flex-wrap:wrap;gap:6px">',
'                        <sc-for list="{{ minTeamPicks }}" as="mt" hint-placeholder-count="2">',
'                          <button onClick="{{ mt.pick }}" style="{{ mt.style }}">{{ mt.label }}</button>',
'                        </sc-for>',
'                      </div>',
'                      <div style="font:400 11px/1.6 \'C11\';color:#E9B341;margin-top:9px;text-wrap:pretty">{{ minTeamNote }}</div>',
'                    </div>',
'                  </sc-if>'].join('\n'));

/* 37. T-05：這一項要發給誰 */
must('                <div>\n                  <div style="font:500 22px/1 \'C11\';margin-bottom:4px">要交的檔案與規格</div>',
[
'                <sc-if value="{{ hasTaskTargets }}" hint-placeholder-val="{{ true }}">',
'                  <div>',
'                    <div style="font:500 22px/1 \'C11\';margin-bottom:4px">這一項要發給誰</div>',
'                    <div style="font:400 22px/1.6 \'C11\';color:#8A8073;margin-bottom:9px;text-wrap:pretty">預設發給全班。有哪一組的專案不需要這一項，就只勾要給的那幾組——沒被指定的組看不到，關卡也不會被它卡住。</div>',
'                    <div style="display:flex;flex-wrap:wrap;gap:6px">',
'                      <button onClick="{{ taskTargetAll.pick }}" style="{{ taskTargetAll.style }}">{{ taskTargetAll.label }}</button>',
'                      <sc-for list="{{ taskTargetPicks }}" as="tt" hint-placeholder-count="3">',
'                        <button onClick="{{ tt.pick }}" style="{{ tt.style }}">{{ tt.label }}</button>',
'                      </sc-for>',
'                    </div>',
'                    <div style="font:400 11px/1.6 \'C11\';color:#E9B341;margin-top:9px;text-wrap:pretty">{{ taskTargetNote }}</div>',
'                  </div>',
'                </sc-if>',
'                <div>',
'                  <div style="font:500 22px/1 \'C11\';margin-bottom:4px">要交的檔案與規格</div>'].join('\n'));

/* 38. 生物還沒擊退時，明說還有東西沒揭曉 */
must([
'                  <sc-if value="{{ hasSpecRelated }}" hint-placeholder-val="{{ true }}">'].join('\n'),
[
'                  <sc-if value="{{ hasBossLocked }}" hint-placeholder-val="{{ false }}">',
'                    <div style="{{ bossLockedStyle }}">{{ bossLockedNote }}</div>',
'                  </sc-if>',
'                  <sc-if value="{{ hasSpecRelated }}" hint-placeholder-val="{{ true }}">'].join('\n'));

/* 39. 微光荒原：地表那一層照現實時間顯示天色，加上日月與時段 */
must('                        <span style="{{ m.stepsTagStyle }}">{{ m.stepsTag }}</span>',
[
'                        <span style="{{ m.stepsTagStyle }}">{{ m.stepsTag }}</span>',
'                        <sc-if value="{{ m.hasSky }}" hint-placeholder-val="{{ false }}">',
'                          <span style="{{ m.skyOrbStyle }}"></span>',
'                          <span style="{{ m.skyTagStyle }}">{{ m.skyTag }}</span>',
'                        </sc-if>'].join('\n'));

const Q = String.fromCharCode(39);
const QM = String.fromCharCode(65311);

/* 40. 地圖：貫穿五層的豎井／梯子那張大圖拿掉。
       改成一層一層各自橫向走完再往下——像橫向過關的關卡。 */
(function () {
  const re = /\n[ \t]*<svg viewBox="0 0 640 750"[\s\S]*?<\/svg>/;
  if (!re.test(t)) { console.error('MISS: 地圖豎井 SVG'); process.exit(1); }
  t = t.replace(re, '');
})();

/* 41. 舊的小人（釘在豎井格上的 PNG）收掉 */
must([
'                <sc-for list="{{ diggers }}" as="d" hint-placeholder-count="6">',
'                  <button onClick="{{ d.open }}" style="{{ d.style }}">',
'                    <span style="{{ d.tagStyle }}">{{ d.tag }}</span>',
'                    <span style="{{ d.figStyle }}"></span>',
'                  </button>',
'                </sc-for>'].join('\n'), '');

/* 42. 角色改站在自己那一層的通道上 */
must([
'                        <span style="{{ m.stepsStyle }}">',
'                          <sc-for list="{{ m.steps }}" as="st" hint-placeholder-count="6">',
'                            <span onClick="{{ st.open }}" style="{{ st.style }}">',
'                              <span style="{{ st.dotStyle }}">{{ st.mark }}</span>',
'                              <span style="{{ st.nameStyle }}">{{ st.name }}</span>',
'                            </span>',
'                          </sc-for>',
'                        </span>'].join('\n'),
[
'                        <span style="{{ m.stepsStyle }}">',
'                          <sc-for list="{{ m.steps }}" as="st" hint-placeholder-count="6">',
'                            <span onClick="{{ st.open }}" style="{{ st.style }}">',
'                              <span style="{{ st.dotStyle }}">{{ st.mark }}</span>',
'                              <span style="{{ st.nameStyle }}">{{ st.name }}</span>',
'                            </span>',
'                          </sc-for>',
'                        </span>',
'                        <sc-for list="{{ m.runners }}" as="rn" hint-placeholder-count="3">',
'                          <span onClick="{{ rn.open }}" style="{{ rn.style }}">',
'                            <span style="{{ rn.tagStyle }}">{{ rn.tag }}</span>',
'                            <span style="{{ rn.figStyle }}"></span>',
'                          </span>',
'                        </sc-for>'].join('\n'));

/* 43. 每一層點進去的介紹裡，補上層底那隻守關生物 */
must(
'                <div style="font:400 11px/1 ' + Q + 'C11' + Q + ';letter-spacing:.18em;color:#5F574C;margin-bottom:9px">礦物 · 一項任務一種礦</div>',
[
'                <sc-if value="{{ sel.hasBoss }}" hint-placeholder-val="{{ true }}">',
'                  <span onClick="{{ sel.openBoss }}" style="{{ sel.bossCardStyle }}">',
'                    <span style="{{ sel.bossArtStyle }}"></span>',
'                    <span style="display:flex;flex-direction:column;gap:5px;min-width:0;flex:1">',
'                      <span style="font:400 11px/1 ' + Q + 'C11' + Q + ';letter-spacing:.16em;color:{{ sel.bossKickerColor }}">{{ sel.bossKicker }}</span>',
'                      <span style="font:700 22px/1.3 ' + Q + 'C11' + Q + ';color:{{ sel.bossNameColor }}">{{ sel.bossName }}</span>',
'                      <span style="font:400 11px/1.7 ' + Q + 'C11' + Q + ';color:#8A8073;text-wrap:pretty">{{ sel.bossNote }}</span>',
'                    </span>',
'                    <span style="{{ sel.bossMoreStyle }}">' + QM + '</span>',
'                  </span>',
'                </sc-if>',
'                <div style="font:400 11px/1 ' + Q + 'C11' + Q + ';letter-spacing:.18em;color:#5F574C;margin-bottom:9px">礦物 · 一項任務一種礦</div>'].join('\n'));

/* 44. T-08 那張「過關給的寶物」換成層底的守關生物：外框與小標改成可換 */
must(
'                        <button onClick="{{ w.openTre }}" style="flex:1;min-width:210px;display:flex;gap:11px;padding:12px 14px;text-align:left;font:inherit;color:inherit;cursor:pointer;background:rgba(0,0,0,.28);border:none;border-left:2px solid #3A3026">',
'                        <button onClick="{{ w.openTre }}" style="{{ w.treCardStyle }}">');
must(
'                            <div style="font:400 11px/1 ' + Q + 'C11' + Q + ';letter-spacing:.16em;color:#5F574C">過關給的寶物</div>',
'                            <div style="font:400 11px/1 ' + Q + 'C11' + Q + ';letter-spacing:.16em;color:{{ w.treKickerColor }}">{{ w.treKicker }}</div>');

/* 45. 老師首頁補一塊「你寫的東西」：他寫的合格考量在學生那邊發生了什麼 */
must(
'              <sc-if value="{{ showTeacherLinks }}" hint-placeholder-val="{{ false }}">',
[
'              <sc-if value="{{ hasMirror }}" hint-placeholder-val="{{ true }}">',
'                <div style="{{ mirrorBox }}">',
'                  <div style="{{ mirrorKickStyle }}">{{ mirrorKick }}</div>',
'                  <div style="{{ mirrorHeadStyle }}">{{ mirrorHead }}</div>',
'                  <span style="{{ mirrorFateStyle }}"></span>',
'                  <div style="{{ mirrorLedeStyle }}">{{ mirrorLede }}</div>',
'                  <div style="{{ mirrorRowsStyle }}">',
'                    <sc-for list="{{ mirrorRows }}" as="mr" hint-placeholder-count="5">',
'                      <div style="{{ mr.rowStyle }}">',
'                        <span style="{{ mr.nameStyle }}">{{ mr.name }}</span>',
'                        <span style="{{ mr.barStyle }}"></span>',
'                        <span style="{{ mr.metaStyle }}">{{ mr.meta }}</span>',
'                      </div>',
'                    </sc-for>',
'                  </div>',
'                  <div style="{{ mirrorKeyStyle }}">{{ mirrorKey }}</div>',
'                  <sc-if value="{{ hasMirrorCase }}" hint-placeholder-val="{{ true }}">',
'                    <div style="{{ mirrorCaseBox }}">',
'                      <div style="{{ mirrorCaseQStyle }}">{{ mirrorCaseQ }}</div>',
'                      <div style="{{ mirrorCaseAStyle }}">{{ mirrorCaseA }}</div>',
'                    </div>',
'                  </sc-if>',
'                  <div style="{{ mirrorFootStyle }}">{{ mirrorFoot }}</div>',
'                </div>',
'              </sc-if>',
'              <sc-if value="{{ showTeacherLinks }}" hint-placeholder-val="{{ false }}">'].join('\n'));

/* 46. 啟動頁：標題底下是那座礦坑 */
must(
'            <div data-screen-label="C-01 啟動頁" style="height:100%;min-height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;background:radial-gradient(680px 420px at 50% 120%,rgba(233,179,65,.17),transparent 72%),#0B0A09;position:relative">',
'            <div data-screen-label="C-01 啟動頁" style="height:100%;min-height:500px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;background:radial-gradient(680px 420px at 50% 120%,rgba(233,179,65,.17),transparent 72%),#0B0A09;position:relative;overflow:hidden;isolation:isolate">');
must(
'              <div style="position:absolute;inset:0;background-image:repeating-linear-gradient(180deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px);pointer-events:none"></div>',
[
'              <span style="{{ bootSceneStyle }}"></span>',
'              <span style="{{ bootSkyStyle }}"></span>',
'              <span style="{{ bootStrataStyle }}"></span>',
'              <sc-for list="{{ bootGhosts }}" as="bgh" hint-placeholder-count="4">',
'                <span style="{{ bgh.style }}"></span>',
'              </sc-for>',
'              <span style="{{ bootWalkerStyle }}"></span>',
'              <div style="position:absolute;inset:0;background-image:repeating-linear-gradient(180deg,rgba(255,255,255,.018) 0 1px,transparent 1px 3px);pointer-events:none"></div>'].join('\n'));

/* 47. 啟動頁那顆羅盤改成自己畫的（指針要會動，PNG 動不了） */
must(
'              <span style="display:block;width:84px;height:84px;margin:0 auto 22px;background:url(assets/jlz/tool-compass.png) center/contain no-repeat;image-rendering:pixelated;filter:drop-shadow(0 0 22px rgba(233,179,65,.4))"></span>',
'              <span data-jlz-orb style="{{ bootOrbStyle }}">' +
'<span style="{{ bootNeedleStyle }}"></span></span>');

/* 48. 寶物不是「過關就給」，是層底那一隻留下的 */
must(
'                    <div style="font:400 11px/1.6 ' + Q + 'C11' + Q + ';color:#5F574C;margin-top:7px">關卡通過就給，不看做得多好。</div>',
'                    <div style="font:400 11px/1.6 ' + Q + 'C11' + Q + ';color:#5F574C;margin-top:7px">{{ sel.treFrom }}</div>');

/* 49. 學生首頁補一條「你在這裡」：地圖上他所在那一層，原封不動 */
must(
'              <div style="margin:20px var(--pad) 0;padding:18px 19px;background:linear-gradient(150deg,rgba(233,179,65,.07),transparent 58%),#14110E;border:1px solid #3A3026">',
[
'              <sc-if value="{{ hasHomeBand }}" hint-placeholder-val="{{ true }}">',
'                <div style="margin:20px var(--pad) 0">',
'                  <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:9px">',
'                    <span style="font:400 11px/1 ' + Q + 'C11' + Q + ';letter-spacing:.2em;color:#5F574C">你在這裡</span>',
'                    <span style="flex:1;height:1px;background:#221E19"></span>',
'                    <button onClick="{{ goHomeMap }}" style="font:400 11px/1 ' + Q + 'C11' + Q + ';letter-spacing:.1em;color:#E9B341;background:none;border:1px solid #3A3026;padding:6px 10px;cursor:pointer;white-space:nowrap">看整張地圖</button>',
'                  </div>',
'                  <div style="position:relative;border:1px solid #26211C;overflow:hidden">',
'                    <span style="{{ homeBand.bandStyle }}">',
'                      <span style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,5,4,.94) 0,rgba(6,5,4,.82) 158px,rgba(6,5,4,.26) 282px,rgba(6,5,4,.06) 100%)"></span>',
'                      <span style="position:relative;display:flex;flex-direction:column;justify-content:flex-start;padding:11px 14px 0;width:var(--mcol);flex:none">',
'                        <span style="font:600 11px/1 ' + Q + 'C11' + Q + ';letter-spacing:.18em;color:#B6AC9C">{{ homeBand.code }}</span>',
'                        <span style="{{ homeBand.nameStyle }}">{{ homeBand.nameShown }}</span>',
'                        <span style="{{ homeBand.stateStyle }}">{{ homeBand.state }}</span>',
'                      </span>',
'                      <span style="{{ homeBand.stepsTagStyle }}">{{ homeBand.stepsTag }}</span>',
'                      <sc-if value="{{ homeBand.hasSky }}" hint-placeholder-val="{{ false }}">',
'                        <span style="{{ homeBand.skyOrbStyle }}"></span>',
'                        <span style="{{ homeBand.skyTagStyle }}">{{ homeBand.skyTag }}</span>',
'                      </sc-if>',
'                      <span style="{{ homeBand.stepsStyle }}">',
'                        <sc-for list="{{ homeBand.steps }}" as="hs" hint-placeholder-count="5">',
'                          <span onClick="{{ hs.open }}" style="{{ hs.style }}">',
'                            <span style="{{ hs.dotStyle }}">{{ hs.mark }}</span>',
'                            <span style="{{ hs.nameStyle }}">{{ hs.name }}</span>',
'                          </span>',
'                        </sc-for>',
'                      </span>',
'                      <sc-for list="{{ homeBand.runners }}" as="hr" hint-placeholder-count="2">',
'                        <span onClick="{{ hr.open }}" style="{{ hr.style }}">',
'                          <span style="{{ hr.tagStyle }}">{{ hr.tag }}</span>',
'                          <span style="{{ hr.figStyle }}"></span>',
'                        </span>',
'                      </sc-for>',
'                    </span>',
'                  </div>',
'                  <div style="font:400 11px/1.7 ' + Q + 'C11' + Q + ';color:#8A8073;margin-top:9px;text-wrap:pretty">{{ homeBandNote }}</div>',
'                </div>',
'              </sc-if>',
'              <div style="margin:20px var(--pad) 0;padding:18px 19px;background:linear-gradient(150deg,rgba(233,179,65,.07),transparent 58%),#14110E;border:1px solid #3A3026">'].join('\n'));

/* 50. 學生首頁右上角那隻可以點開介紹 */
must([
'                    <div style="{{ homeBossBox }}">',
'                      <span style="{{ homeBossArt }}"></span>'].join('\n'),
[
'                    <span onClick="{{ openHomeBoss }}" style="{{ homeBossBox }}">',
'                      <span style="{{ homeBossArt }}"></span>'].join('\n'));
must([
'                        <span style="display:block;font:400 11px/1.6 ' + Q + 'C11' + Q + ';color:#8A8073;margin-top:5px;text-wrap:pretty">{{ homeBossNote }}</span>',
'                      </span>',
'                    </div>'].join('\n'),
[
'                        <span style="display:block;font:400 11px/1.6 ' + Q + 'C11' + Q + ';color:#8A8073;margin-top:5px;text-wrap:pretty">{{ homeBossNote }}</span>',
'                      </span>',
'                      <span style="{{ homeBossMore }}">' + String.fromCharCode(65311) + '</span>',
'                    </span>'].join('\n'));

fs.writeFileSync('build_tpl_live.txt', t);
console.log('patched ok, length =', t.length);
