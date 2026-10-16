'use strict';
// Cloud is opt-in. Revisions prevent a second device from silently replacing newer progress.
const CLOUD_API = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8093' : 'https://case-clicker.88-218-121-40.sslip.io';
const CLOUD_KEY = 'caseclicker.cloud.v1';
let cloudSession = null;
try { cloudSession = JSON.parse(localStorage.getItem(CLOUD_KEY)); } catch {}
const cloud = { ready: false, busy: false, updated: 0, message: '', by: 'net', rows: null, me: null };
function cloudRemember() {
  if (cloudSession) localStorage.setItem(CLOUD_KEY, JSON.stringify(cloudSession));
  else localStorage.removeItem(CLOUD_KEY);
}
async function cloudRequest(path, method = 'GET', data) {
  const res = await fetch(CLOUD_API + '/api/' + path, {
    method, headers: { 'Content-Type': 'application/json', ...(cloudSession ? { Authorization: 'Bearer ' + cloudSession.token } : {}) },
    body: data == null ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(15000),
  });
  const result = await res.json();
  if (!res.ok) { const e = new Error(result.error || 'Ошибка облака'); e.status = res.status; throw e; }
  return result;
}
function validCloudSave(raw) {
  const o = JSON.parse(raw);
  if (!o || o.v !== 2 || !Number.isFinite(o.money) || o.money < 0 || !Array.isArray(o.inv) || !o.st || !o.up || !o.set) throw new Error('Неверное сохранение');
  return o;
}
function renderCloud() {
  const panel = $('#cloudPanel'); if (!panel) return;
  panel.innerHTML = `<h2>☁ Облако и рейтинг</h2><p class="muted">Войдите с тем же ником на другом устройстве и загрузите прогресс. После выбора сохранения облако обновляется раз в минуту.</p>
    ${cloudSession ? `<p>Игрок: <b>${esc(cloudSession.name)}</b></p><div class="game-row">
      <button class="btn primary" id="cloudPush" ${cloud.busy ? 'disabled' : ''}>Сохранить в облако</button>
      <button class="btn" id="cloudPull" ${cloud.busy ? 'disabled' : ''}>Загрузить из облака</button>
      <button class="btn ghost" id="cloudLogout" ${cloud.busy ? 'disabled' : ''}>Выйти</button></div>` : `<form id="cloudAuth" class="game-row">
      <input id="cloudName" aria-label="Ник" placeholder="Ник (3–20 символов)" minlength="3" maxlength="20" autocomplete="username" required>
      <input id="cloudPassword" aria-label="Пароль" type="password" placeholder="Пароль (от 6 символов)" minlength="6" maxlength="200" autocomplete="current-password" required>
      <button class="btn primary" type="submit" ${cloud.busy ? 'disabled' : ''}>Войти</button><button class="btn" id="cloudRegister" type="button" ${cloud.busy ? 'disabled' : ''}>Регистрация</button></form>`}
    <p id="cloudStatus" class="muted small" role="status">${esc(cloud.message || 'Локальное сохранение продолжает работать без интернета.')}</p>
    <div class="game-row"><h3>Рейтинг игроков</h3><select id="cloudBoard" aria-label="Рейтинг по показателю">
      ${Object.entries({net:'Капитал',best:'Лучший дроп',opened:'Открытия',battles:'Победы в батлах',rank:'Звание'}).map(([k,v])=>`<option value="${k}" ${cloud.by===k?'selected':''}>${v}</option>`).join('')}</select><button class="btn" id="cloudRefresh">Обновить</button></div>
    <p class="muted small">Рейтинг любительский: прогресс считается в браузере. Ник и рекорды видны другим игрокам.</p>
    <div id="cloudLeaders">${cloud.rows ? cloud.rows.length ? `<div class="cloud-table">${cloud.rows.map((r,k)=>`<div><span>${k+1}. ${esc(r.name)}</span><b>${esc(cloud.by==='net'||cloud.by==='best'?fmt(r.value):cloud.by==='rank'?r.rank_name:String(r.value))}</b>${cloud.by==='best'?`<small>${esc(r.best_name)}</small>`:''}</div>`).join('')}</div>` : '<p class="muted">Пока нет рекордов. Сохраните прогресс в облако первым.</p>' : '<p class="muted">Нажмите «Обновить», чтобы увидеть рейтинг.</p>'}
    ${cloud.me?`<p>Ваше место: <b>${cloud.me.place}</b></p>`:''}</div>`;
  $('#cloudAuth')?.addEventListener('submit', e => { e.preventDefault(); cloudAuth('login'); });
  $('#cloudRegister')?.addEventListener('click', () => { if ($('#cloudAuth').reportValidity()) cloudAuth('register'); });
  $('#cloudPush')?.addEventListener('click', () => cloudChoose('push'));
  $('#cloudPull')?.addEventListener('click', () => cloudChoose('pull'));
  $('#cloudLogout')?.addEventListener('click', async () => {
    try { await cloudRequest('logout', 'POST'); } catch {}
    cloudSession = null; cloud.ready = false; cloud.message = 'Вы вышли. Прогресс остался в этом браузере.'; cloudRemember(); renderCloud();
  });
  $('#cloudBoard').onchange = e => { cloud.by = e.target.value; cloudLeaders(); };
  $('#cloudRefresh').onclick = cloudLeaders;
}
async function cloudRun(fn) {
  if (cloud.busy) return;
  cloud.busy = true;
  try { await fn(); }
  catch (e) {
    if (e.status === 409 || e.status === 401) cloud.ready = false;
    cloud.message = e.status === 409 ? 'На другом устройстве есть более новое сохранение. Выберите, какой прогресс оставить.' : e.message === 'Failed to fetch' ? 'Нет связи с облаком. Прогресс сохранён в браузере.' : e.message;
  } finally { cloud.busy = false; if (curTab === 'profile') renderCloud(); }
}
async function cloudAuth(action) {
  const name = $('#cloudName').value.trim(), password = $('#cloudPassword').value;
  await cloudRun(async () => {
    const r = await cloudRequest(action, 'POST', { name, password });
    cloudSession = { token: r.token, name: r.name, revision: null }; cloud.ready = false; cloudRemember();
    const remote = await cloudRequest('save'); cloud.updated = remote.updated;
    cloud.message = remote.save ? 'Сохранение найдено. Выберите: загрузить его или сохранить текущий прогресс вместо него.' : 'Облако пустое. Нажмите «Сохранить в облако», чтобы включить автосохранение.';
  });
}
function cloudStats() {
  return { net: S.money + S.inv.reduce((sum,x)=>sum+priceOf(x),0), best: S.st.best?.p || 0,
    best_name: S.st.best?.k || '', opened: S.st.opened, battles: S.st.battleWins, rank: rankOf()+1, rank_name: RANKS[rankOf()][0] };
}
async function cloudUpload(revision) {
  save();
  const result = await cloudRequest('save', 'PUT', { save: localStorage.getItem(SAVE_KEY), stats: cloudStats(), expected: revision });
  cloudSession.revision = result.updated; cloud.updated = result.updated; cloud.ready = true; cloudRemember();
  cloud.message = 'Сохранено в облаке: ' + new Date(result.updated).toLocaleTimeString('ru') + '. Автосохранение включено.';
}
function cloudChoose(action) {
  cloudRun(async () => {
    const remote = await cloudRequest('save');
    if (action === 'pull' && !remote.save) { cloud.message = 'В облаке пока нет сохранения.'; return; }
    if (action === 'pull') validCloudSave(remote.save);
    const info = remote.save ? validCloudSave(remote.save) : null;
    modal(`<h2>${action==='pull'?'Загрузить прогресс?':'Сохранить текущий прогресс?'}</h2>
      <p class="muted">В браузере: ${fmt(S.money)}, ${S.inv.length} предметов, ${S.st.opened} открытий.</p>
      <p class="muted">${info?`В облаке: ${fmt(info.money)}, ${info.inv.length} предметов, ${info.st.opened} открытий.`:'Облако пустое.'}</p>
      <p>${action==='pull'?'Прогресс в браузере будет заменён. Его резервная копия останется на этом устройстве.':'Текущий прогресс заменит облачный. Далее он будет сохраняться автоматически.'}</p>
      <div class="modal-actions"><button class="btn primary" id="cloudConfirm">${action==='pull'?'Загрузить':'Сохранить'}</button><button class="btn" data-close>Отмена</button></div>`, box => {
      $('#cloudConfirm',box).onclick = () => { closeModal(); cloudRun(async () => {
        if (action === 'push') await cloudUpload(remote.updated);
        else {
          save(); localStorage.setItem('caseclicker.before-cloud', localStorage.getItem(SAVE_KEY));
          cloudSession.revision = remote.updated; cloudRemember();
          localStorage.setItem(SAVE_KEY, remote.save); replacingSave = true; location.reload();
        }
      }); };
    });
  });
}
async function cloudLeaders() {
  try { const r = await cloudRequest('top?by='+cloud.by); cloud.rows=r.rows; cloud.me=r.me; }
  catch { cloud.message='Рейтинг временно недоступен. Попробуйте позже.'; }
  if (curTab==='profile') renderCloud();
}
const profileWithCloud = RENDER.profile;
RENDER.profile = () => { profileWithCloud(); renderCloud(); };
setInterval(() => { if (cloudSession && cloud.ready && !document.hidden) cloudRun(() => cloudUpload(cloudSession.revision)); }, 60000);
if (cloudSession) cloudRun(async () => {
  const remote = await cloudRequest('save'); cloud.updated = remote.updated;
  cloud.ready = cloudSession.revision === remote.updated && remote.updated > 0;
  cloud.message = cloud.ready ? 'Облако подключено. Автосохранение раз в минуту.' : 'Выберите сохранение: в облаке может быть прогресс с другого устройства.';
});
