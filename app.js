// ============================================================
//  Fahad Saleem Portfolio — app.js
//  Storage : IndexedDB (no size limit)
//  Security: Edit mode hidden — access via yoursite.com/#admin
// ============================================================

// ── Secret admin access ──────────────────────────────────────
// The edit button is invisible to everyone.
// To access edit mode: open the site and type  #admin  in the URL
// e.g. https://yourusername.github.io/fahad-portfolio/#admin
// Then enter the password in the prompt.
// Change ADMIN_PASSWORD below to your own secret password.
const ADMIN_PASSWORD = 'FahadDev@2024!';

window.addEventListener('hashchange', function(){
  if(window.location.hash === '#admin'){
    history.replaceState(null, '', window.location.pathname); // clean URL
    showEditButton();
  }
});
window.addEventListener('load', function(){
  if(window.location.hash === '#admin'){
    history.replaceState(null, '', window.location.pathname);
    showEditButton();
  }
  loadAll();
  checkAvatarViewBtn();
  ['resume','cv'].forEach(t => refreshDocUI(t));
});

function showEditButton(){
  document.getElementById('editToggle').style.display = 'inline-block';
}

// ── IndexedDB setup ─────────────────────────────────────────
const DB_NAME    = 'fahad_portfolio_db';
const DB_VERSION = 1;
const STORE_NAME = 'portfolio_data';
let db = null;

function openDB(){
  return new Promise((resolve, reject) => {
    if(db){ resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains(STORE_NAME))
        d.createObjectStore(STORE_NAME);
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbSet(key, value){
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = resolve;
    tx.onerror = e => reject(e.target.error);
  });
}

async function dbGet(key){
  const d = await openDB();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = e => resolve(e.target.result ?? null);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Editable field IDs ───────────────────────────────────────
const EDITABLE_IDS = ['heroName','heroTag','aboutP1','aboutP2','aboutP3'];

// ── Edit mode ────────────────────────────────────────────────
function toggleEdit(){
  const body = document.body;
  const isOn = body.classList.contains('edit-mode');
  if(!isOn){
    const pw = prompt('🔐 Enter admin password:');
    if(pw === null) return;
    if(pw !== ADMIN_PASSWORD){
      alert('❌ Wrong password.');
      return;
    }
  }
  const on = body.classList.toggle('edit-mode');
  const btn = document.getElementById('editToggle');
  btn.classList.toggle('active', on);
  btn.textContent = on ? '✓ Done editing' : '✏️ Edit mode';
  EDITABLE_IDS.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.setAttribute('contenteditable', on ? 'true' : 'false');
  });
  document.querySelectorAll('.project-card h3, .project-card .desc, .project-card .tech, .exp-item h3, .exp-item p').forEach(el => {
    el.setAttribute('contenteditable', on ? 'true' : 'false');
  });
  if(!on){ saveAll(); }
}

// ── Utility ──────────────────────────────────────────────────
function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Remove items ─────────────────────────────────────────────
// Works for ANY removable element — finds the right container automatically
function removeItem(btn){
  const selectors = [
    '.skill-pill', '.project-card', '.achievement',
    '.exp-item', '.learning-item', '.education-item', '.contact-item'
  ];
  let target = null;
  for(const sel of selectors){
    target = btn.closest(sel);
    if(target) break;
  }
  if(!target){ return; }
  target.remove();
  checkAchievementsEmpty();
  checkEducationEmpty();
  saveAll();
}

// Alias — used by learning buttons in HTML
function removeLearning(btn){
  removeItem(btn);
}

// ── Click highlight ──────────────────────────────────────────
document.addEventListener('click', function(e){
  const target = e.target;
  const el = target.closest('button, a, .skill-pill, .learning-item, .project-card, .achievement, .exp-item, .education-item, .contact-item, label');
  if(!el) return;
  el.classList.remove('clicked');
  void el.offsetWidth;
  el.classList.add('clicked');
  setTimeout(() => el.classList.remove('clicked'), 600);
});

// ── Save / Load ──────────────────────────────────────────────
async function saveAll(){
  const get = id => { const el = document.getElementById(id); return el ? el.innerHTML : ''; };
  const txt = id => { const el = document.getElementById(id); return el ? el.textContent : ''; };
  const data = {
    heroName:         txt('heroName'),
    heroTag:          txt('heroTag'),
    aboutP1:          txt('aboutP1'),
    aboutP2:          txt('aboutP2'),
    aboutP3:          txt('aboutP3'),
    skillsList:       get('skillsList'),
    projectsGrid:     get('projectsGrid'),
    expList:          get('expList'),
    learningGrid:     get('learningGrid'),
    educationGrid:    get('educationGrid'),
    achievementsList: get('achievementsList'),
    contactInfoGrid:  get('contactInfoGrid'),
  };
  try { await dbSet('main', data); } catch(e){ console.error('Save failed', e); }
}

async function loadAll(){
  try {
    await openDB();
    const data = await dbGet('main');
    if(data){
      const set = (id, val) => { const el = document.getElementById(id); if(el && val) el.innerHTML = val; };
      const setTxt = (id, val) => { const el = document.getElementById(id); if(el && val) el.textContent = val; };
      setTxt('heroName', data.heroName);
      setTxt('heroTag',  data.heroTag);
      setTxt('aboutP1',  data.aboutP1);
      setTxt('aboutP2',  data.aboutP2);
      setTxt('aboutP3',  data.aboutP3);
      set('skillsList',       data.skillsList);
      set('projectsGrid',     data.projectsGrid);
      set('expList',          data.expList);
      set('learningGrid',     data.learningGrid);
      set('educationGrid',    data.educationGrid);
      set('achievementsList', data.achievementsList);
      set('contactInfoGrid',  data.contactInfoGrid);
      checkAchievementsEmpty();
      checkEducationEmpty();
    }

    // Load avatar
    const avatarUrl = await dbGet('avatar');
    if(avatarUrl){
      const img = document.getElementById('avatarImg');
      if(img){ img.src = avatarUrl; document.getElementById('avatar').classList.add('has-img'); }
      checkAvatarViewBtn();
    }

    // Load docs
    for(const type of ['resume','cv']){
      const doc = await dbGet('doc_' + type);
      if(doc){ docStore[type] = doc; refreshDocUI(type); }
    }

    // Reload cert images by data-cert-id
    document.querySelectorAll('[data-cert-id]').forEach(async el => {
      const uid = el.dataset.certId;
      const url = await dbGet('cert_' + uid);
      if(url){
        const thumb = el.querySelector('.cert-thumb');
        const viewBtn = el.querySelector('.cert-view-btn');
        if(thumb){ thumb.src = url; thumb.style.display = 'block'; }
        if(viewBtn) viewBtn.style.display = 'inline';
      }
    });

  } catch(e){ console.error('loadAll error', e); }
}

// ── Avatar ───────────────────────────────────────────────────
function handleAvatarUpload(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 3*1024*1024){ alert('Keep profile photo under 3 MB.'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const url = e.target.result;
    document.getElementById('avatarImg').src = url;
    document.getElementById('avatar').classList.add('has-img');
    checkAvatarViewBtn();
    await dbSet('avatar', url);
  };
  reader.readAsDataURL(file);
}

function checkAvatarViewBtn(){
  const btn = document.getElementById('avatarViewBtn');
  if(btn) btn.style.display = document.getElementById('avatar').classList.contains('has-img') ? 'flex' : 'none';
}

function openAvatarLightbox(){
  const img = document.getElementById('avatarImg');
  if(!img || !img.src) return;
  document.getElementById('avatarLightboxImg').src = img.src;
  document.getElementById('avatarLightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAvatarLightbox(){
  document.getElementById('avatarLightbox').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Cert lightbox ────────────────────────────────────────────
function openCertLightbox(src){
  document.getElementById('certLightboxImg').src = src;
  document.getElementById('certLightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCertLightbox(){
  document.getElementById('certLightbox').classList.remove('open');
  document.body.style.overflow = '';
}
async function openCertLightboxById(uid){
  const url = await dbGet('cert_' + uid);
  if(url) openCertLightbox(url);
}

document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){ closeAvatarLightbox(); closeCertLightbox(); }
});

// ── Skills ───────────────────────────────────────────────────
function addSkill(){
  const input = document.getElementById('newSkillInput');
  const val = input.value.trim();
  if(!val) return;
  const pill = document.createElement('span');
  pill.className = 'skill-pill';
  pill.innerHTML = escapeHtml(val) + '<button class="rm" onclick="removeItem(this)">×</button>';
  document.getElementById('skillsList').appendChild(pill);
  input.value = '';
  saveAll();
}

// ── Projects ─────────────────────────────────────────────────
function addProject(){
  const name = prompt('Project name:');
  if(!name || !name.trim()) return;
  const desc = prompt('Short description:') || '';
  const tech = prompt('Technologies (comma-separated):') || '';
  const div = document.createElement('div');
  div.className = 'project-card';
  div.innerHTML = `
    <h3 contenteditable="false">${escapeHtml(name.trim())}</h3>
    <p class="desc" contenteditable="false">${escapeHtml(desc.trim())}</p>
    <p class="tech" contenteditable="false">${escapeHtml(tech.trim())}</p>
    <div class="project-links">
      <a href="#" target="_blank" rel="noopener">▶ Demo</a>
      <a href="#" target="_blank" rel="noopener">⌥ GitHub</a>
    </div>
    <div class="project-actions">
      <label class="action-btn">📷 Image<input type="file" accept="image/*" style="display:none" onchange="handleProjectThumbUpload(event,this)"></label>
      <button class="action-btn" onclick="editProjectLinks(this)">🔗 Links</button>
      <button class="rm-project" onclick="removeItem(this)">remove</button>
    </div>`;
  document.getElementById('projectsGrid').appendChild(div);
  saveAll();
}

function editProjectLinks(btn){
  const card  = btn.closest('.project-card');
  const links = card.querySelectorAll('.project-links a');
  const demo  = links[0];
  const gh    = links[1];
  const ghUrl   = prompt('GitHub URL:', gh.getAttribute('href') !== '#' ? gh.getAttribute('href') : '');
  if(ghUrl !== null) gh.setAttribute('href', ghUrl.trim() || '#');
  const demoUrl = prompt('Demo URL:', demo.getAttribute('href') !== '#' ? demo.getAttribute('href') : '');
  if(demoUrl !== null) demo.setAttribute('href', demoUrl.trim() || '#');
  saveAll();
}

function handleProjectThumbUpload(event, input){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 2*1024*1024){ alert('Keep project image under 2 MB.'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const card = input.closest('.project-card');
    let img = card.querySelector('.project-thumb');
    if(!img){
      img = document.createElement('img');
      img.className = 'project-thumb';
      card.insertBefore(img, card.firstChild);
    }
    img.src = e.target.result;
    await saveAll();
  };
  reader.readAsDataURL(file);
}

// ── Experience ───────────────────────────────────────────────
function addExperience(){
  const title = prompt('Job title / role:');
  if(!title || !title.trim()) return;
  const desc = prompt('Description:') || '';
  const div = document.createElement('div');
  div.className = 'exp-item';
  div.innerHTML = `<h3 contenteditable="false">${escapeHtml(title.trim())}</h3>
    <p contenteditable="false">${escapeHtml(desc.trim())}</p>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
  document.getElementById('expList').appendChild(div);
  saveAll();
}

// ── Learning ─────────────────────────────────────────────────
function addLearning(){
  const topic = prompt('New learning topic:');
  if(!topic || !topic.trim()) return;
  const grid   = document.getElementById('learningGrid');
  const addBtn = grid.querySelector('.add-learning-btn');
  const div    = document.createElement('div');
  div.className = 'learning-item';
  div.innerHTML = escapeHtml(topic.trim()) + '<button class="rm-learn" onclick="removeItem(this)">remove</button>';
  grid.insertBefore(div, addBtn);
  saveAll();
}

// ── Certifications ───────────────────────────────────────────
function checkAchievementsEmpty(){
  const list  = document.getElementById('achievementsList');
  const empty = document.getElementById('achievementsEmpty');
  if(!list || !empty) return;
  empty.style.display = list.querySelector('.achievement') ? 'none' : 'block';
}

function addAchievement(){
  const input = document.getElementById('newAchievementInput');
  const val   = input.value.trim();
  if(!val) return;
  const uid = 'c' + Date.now();
  const div = document.createElement('div');
  div.className = 'achievement';
  div.dataset.certId = uid;
  div.innerHTML = `
    <div class="cert-img-placeholder">
      <span class="no-img-label">No image</span>
    </div>
    <span style="flex:1">${escapeHtml(val)}</span>
    <button class="cert-view-btn" style="display:none" onclick="openCertLightboxById('${uid}')">View</button>
    <label class="cert-upload-lbl" title="Upload certificate image">📎 Add image
      <input type="file" accept="image/*" style="display:none" onchange="handleCertImg(event,this,'${uid}')">
    </label>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
  document.getElementById('achievementsList').appendChild(div);
  input.value = '';
  checkAchievementsEmpty();
  saveAll();
}

async function handleCertImg(event, input, uid){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ alert('Keep certificate image under 5 MB.'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const url = e.target.result;
    const item        = input.closest('.achievement');
    const placeholder = item.querySelector('.cert-img-placeholder');
    const viewBtn     = item.querySelector('.cert-view-btn');
    if(placeholder){
      placeholder.outerHTML = `<img class="cert-thumb" src="${url}" alt="certificate" onclick="openCertLightbox(this.src)">`;
    }
    if(viewBtn) viewBtn.style.display = 'inline';
    await dbSet('cert_' + uid, url);
    await saveAll();
  };
  reader.readAsDataURL(file);
}

// ── Education ────────────────────────────────────────────────
function checkEducationEmpty(){
  const grid  = document.getElementById('educationGrid');
  const empty = document.getElementById('educationEmpty');
  if(!grid || !empty) return;
  empty.style.display = grid.querySelector('.education-item') ? 'none' : 'block';
}

function addEducation(){
  const degree = prompt('Degree / qualification:');
  if(!degree || !degree.trim()) return;
  const inst  = prompt('Institution:') || '';
  const years = prompt('Years (e.g. 2020-2024):') || '';
  const uid   = 'edu_' + Date.now();
  const div   = document.createElement('div');
  div.className = 'education-item';
  div.innerHTML = `
    <div class="edu-main">
      <h3>${escapeHtml(degree.trim())}</h3>
      <p>${escapeHtml(inst.trim())}</p>
      <span class="edu-years">${escapeHtml(years.trim())}</span>
    </div>
    <div class="edu-result-wrap">
      <span class="no-result-label">No result image</span>
    </div>
    <label class="cert-upload-lbl result-upload-lbl" title="Upload result image">📎 Add result
      <input type="file" accept="image/*" style="display:none" onchange="handleEducationResult(event,this,'${uid}')">
    </label>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
  document.getElementById('educationGrid').appendChild(div);
  checkEducationEmpty();
  saveAll();
}

async function handleEducationResult(event, input, uid){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ alert('Keep result image under 5 MB.'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const url  = e.target.result;
    const item = input.closest('.education-item');
    const wrap = item.querySelector('.edu-result-wrap');
    if(wrap){
      wrap.innerHTML = `<img class="cert-thumb" src="${url}" alt="result" onclick="openCertLightbox(this.src)">
        <button class="cert-view-btn" onclick="openCertLightbox(this.previousElementSibling.src)">View</button>`;
    }
    await dbSet('cert_' + uid, url);
    await saveAll();
  };
  reader.readAsDataURL(file);
}

// ── Contact ──────────────────────────────────────────────────
function addContact(){
  const label = prompt('Label (e.g. Phone, LinkedIn):');
  if(!label || !label.trim()) return;
  const val = prompt('Value / URL:') || '';
  const div = document.createElement('div');
  div.className = 'contact-item';
  div.innerHTML = `<span class="contact-label">${escapeHtml(label.trim())}</span>
    <span class="contact-val">${escapeHtml(val.trim())}</span>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
  document.getElementById('contactInfoGrid').appendChild(div);
  saveAll();
}

// ── Documents ────────────────────────────────────────────────
const docStore = { resume: null, cv: null };

async function handleDocUpload(event, type){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = async function(e){
    const doc = { name: file.name, data: e.target.result, size: file.size };
    docStore[type] = doc;
    refreshDocUI(type);
    await dbSet('doc_' + type, doc);
  };
  reader.readAsDataURL(file);
}

function refreshDocUI(type){
  const doc    = docStore[type];
  const meta   = document.getElementById(type + 'Meta');
  const openBtn= document.getElementById(type + 'OpenBtn');
  const rmBtn  = document.getElementById(type + 'RmBtn');
  if(!meta) return;
  if(doc){
    const kb = Math.round(doc.size / 1024);
    meta.textContent = doc.name + ' — ' + (kb > 1024 ? (kb/1024).toFixed(1)+' MB' : kb+' KB');
    if(openBtn) openBtn.style.display = 'inline-block';
    if(rmBtn)   rmBtn.style.display   = '';   // controlled by CSS edit-only
  } else {
    meta.textContent = 'No file uploaded';
    if(openBtn) openBtn.style.display = 'none';
    if(rmBtn)   rmBtn.style.display   = 'none';
  }
}

function openDoc(type){
  const doc = docStore[type];
  if(!doc){ alert('No file uploaded yet.'); return; }
  const win = window.open();
  win.document.write(`<iframe src="${doc.data}" style="width:100%;height:100vh;border:none"></iframe>`);
}

async function removeDoc(type){
  if(!confirm('Remove this document?')) return;
  docStore[type] = null;
  refreshDocUI(type);
  await dbSet('doc_' + type, null);
}
