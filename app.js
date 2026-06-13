// ─────────────────────────────────────────────────────────────
//  Fahad Saleem Portfolio  ·  app.js
//
//  SECURITY MODEL
//  ──────────────
//  • The edit button is completely invisible to everyone.
//  • To access edit mode, press:  Ctrl + Shift + E
//    on any page. A password prompt will appear.
//    Only you know this shortcut + password combination.
//  • The password is NEVER stored in plain text. Only its SHA-256
//    hash is in this file. Even if someone reads this code they
//    cannot reverse the hash to get the real password.
//  • To change your password:
//      1. Go to: https://emn178.github.io/online-tools/sha256.html
//      2. Type your new password and copy the hash
//      3. Replace ADMIN_HASH below with your new hash
//
//  IMAGES — How they work
//  ───────────────────────
//  When you upload an image on the live site (in edit mode),
//  it goes directly to Cloudinary and gets a permanent public URL.
//  That URL is saved so ALL visitors worldwide see your images.
//  You only need to upload each image ONCE on the live site.
// ─────────────────────────────────────────────────────────────

// SHA-256 hash of your admin password (the real password is never stored here).
// To change your password: hash your new one at https://emn178.github.io/online-tools/sha256.html
// then replace ADMIN_HASH below with the new hash.
const ADMIN_HASH = 'c5f454eb6440bdc836166458fc452ed5b51606e2fe764c5044847f3ef6e9fbbb';

// ── Cloudinary config ─────────────────────────────────────────
// Images upload directly from browser → Cloudinary → permanent public URL
// No server, no code change, no GitHub needed for new images
const CLOUDINARY_CLOUD = 'dcjlfnia4';
const CLOUDINARY_PRESET = 'portfolio_upload';

async function uploadToCloudinary(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`);

    // Show upload progress
    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = function() {
      if (xhr.status === 200) {
        const res = JSON.parse(xhr.responseText);
        resolve(res.secure_url); // permanent HTTPS URL visible to everyone
      } else {
        reject(new Error('Upload failed: ' + xhr.statusText));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}

// Show/hide upload progress overlay
function showUploadProgress(msg) {
  let overlay = document.getElementById('uploadOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'uploadOverlay';
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:9999;
      background:rgba(11,13,16,0.88); backdrop-filter:blur(6px);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      color:#f2f0ea; font-family:'JetBrains Mono','Courier New',monospace; font-size:14px;
      gap:16px;
    `;
    overlay.innerHTML = `
      <div id="uploadMsg" style="letter-spacing:0.05em"></div>
      <div style="width:220px;height:4px;background:#272b33;border-radius:2px;overflow:hidden">
        <div id="uploadBar" style="height:100%;width:0%;background:#c9a35a;transition:width 0.2s;border-radius:2px"></div>
      </div>
      <div id="uploadPct" style="color:#9b9ea7;font-size:12px">0%</div>
    `;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';
  document.getElementById('uploadMsg').textContent = msg;
  document.getElementById('uploadBar').style.width = '0%';
  document.getElementById('uploadPct').textContent = '0%';
}

function updateUploadProgress(pct) {
  const bar = document.getElementById('uploadBar');
  const pctEl = document.getElementById('uploadPct');
  if (bar) bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
}

function hideUploadProgress() {
  const overlay = document.getElementById('uploadOverlay');
  if (overlay) overlay.style.display = 'none';
}

// ── SHA-256 helper (built-in browser crypto) ─────────────────
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Secret admin access via URL hash ─────────────────────────
// Navigate to yoursite.com/#admin to reveal the edit button
function checkAdminHash() {
  if (window.location.hash === '#admin') {
    // Clean the URL so #admin doesn't stay visible
    history.replaceState(null, '', window.location.pathname);
    activateEditMode();
  }
}

async function activateEditMode() {
  const pw = prompt('🔐 Enter admin password:');
  if (pw === null) return;
  const hash = await sha256(pw);
  if (hash !== ADMIN_HASH) {
    alert('❌ Wrong password.');
    return;
  }
  // Show the edit button and enter edit mode
  const btn = document.getElementById('editToggle');
  btn.style.display = 'inline-block';
  enableEditMode(true);
}

// ── Edit mode toggle ──────────────────────────────────────────
const EDITABLE_SELECTORS = [
  '#heroName', '#heroTag', '#aboutP1', '#aboutP2', '#aboutP3'
];

function enableEditMode(on) {
  document.body.classList.toggle('edit-mode', on);
  const btn = document.getElementById('editToggle');
  if (btn) {
    btn.textContent = on ? '✓ Done editing' : '✏️ Edit mode';
    btn.classList.toggle('active', on);
  }
  EDITABLE_SELECTORS.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.setAttribute('contenteditable', on ? 'true' : 'false');
  });
  document.querySelectorAll(
    '.education-item h3, .education-item .institution, .education-item .duration, .education-item .details, ' +
    '.project-card h3, .project-card .desc, .project-card .tech, ' +
    '.exp-item h3, .exp-item p'
  ).forEach(el => el.setAttribute('contenteditable', on ? 'true' : 'false'));
  if (!on) saveAll();
}

// The toggle button calls this (only visible after #admin flow)
function toggleEdit() {
  const isOn = document.body.classList.contains('edit-mode');
  enableEditMode(!isOn);
}

// ── IndexedDB ────────────────────────────────────────────────
const DB_NAME = 'fahad_portfolio_db';
const DB_VER  = 2;
const STORE   = 'data';
let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE);
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

async function dbSet(key, value) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = res;
    tx.onerror = e => rej(e.target.error);
  });
}

async function dbGet(key) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx  = d.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = e => res(e.target.result ?? null);
    req.onerror   = e => rej(e.target.error);
  });
}

// ── Save all content to IndexedDB ────────────────────────────
async function saveAll() {
  const g   = id => { const e = document.getElementById(id); return e ? e.innerHTML : ''; };
  const txt = id => { const e = document.getElementById(id); return e ? e.textContent : ''; };
  const data = {
    heroName:         txt('heroName'),
    heroTag:          txt('heroTag'),
    aboutP1:          txt('aboutP1'),
    aboutP2:          txt('aboutP2'),
    aboutP3:          txt('aboutP3'),
    skillsList:       g('skillsList'),
    projectsGrid:     g('projectsGrid'),
    expList:          g('expList'),
    learningGrid:     g('learningGrid'),
    educationGrid:    g('educationGrid'),
    achievementsList: g('achievementsList'),
    contactInfoGrid:  g('contactInfoGrid'),
  };
  try { await dbSet('main', data); } catch(e) { console.error('Save failed', e); }
}

// ── Load all content from IndexedDB ──────────────────────────
async function loadAll() {
  try {
    await openDB();
    const data = await dbGet('main');
    if (data) {
      const set = (id, val) => { const e = document.getElementById(id); if (e && val) e.innerHTML  = val; };
      const txt = (id, val) => { const e = document.getElementById(id); if (e && val) e.textContent = val; };
      txt('heroName', data.heroName);
      txt('heroTag',  data.heroTag);
      txt('aboutP1',  data.aboutP1);
      txt('aboutP2',  data.aboutP2);
      txt('aboutP3',  data.aboutP3);
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

    // ── Load avatar URL from IDB ──────────────────────────
    const avatarUrl = await dbGet('avatar');
    if (avatarUrl) {
      const img = document.getElementById('avatarImg');
      if (img) { img.src = avatarUrl; img.style.display = 'block'; }
      document.getElementById('avatar')?.classList.add('has-img');
      checkAvatarViewBtn();
    }

    // ── Load ALL result-thumb images by data-uid ──────────
    // This covers both education results and cert thumbs
    document.querySelectorAll('[data-uid]').forEach(async el => {
      const uid = el.dataset.uid;
      const url = await dbGet('img_' + uid);
      if (url) {
        el.src = url;
        el.style.display = 'block';
        // If there's a paired view button, show it
        const viewBtn = el.nextElementSibling;
        if (viewBtn && viewBtn.classList.contains('result-view-btn')) {
          viewBtn.style.display = 'inline-block';
        }
      }
    });

    // ── Load cert images by data-cert-id ─────────────────
    document.querySelectorAll('[data-cert-id]').forEach(async el => {
      const uid = el.dataset.certId;
      const url = await dbGet('img_cert_' + uid);
      if (url) {
        const thumb = el.querySelector('.cert-thumb');
        if (thumb) { thumb.src = url; thumb.style.display = 'block'; }
        const viewBtn = el.querySelector('.cert-view-btn');
        if (viewBtn) viewBtn.style.display = 'inline';
      }
    });

    // ── Load project thumbnails ───────────────────────────
    document.querySelectorAll('.project-card[data-proj-id]').forEach(async el => {
      const uid = el.dataset.projId;
      const url = await dbGet('img_proj_' + uid);
      if (url) {
        let thumb = el.querySelector('.project-thumb');
        if (!thumb) {
          thumb = document.createElement('img');
          thumb.className = 'project-thumb';
          el.insertBefore(thumb, el.firstChild);
        }
        thumb.src = url;
      }
    });

    // ── Load documents ────────────────────────────────────
    for (const type of ['resume', 'cv']) {
      const doc = await dbGet('doc_' + type);
      if (doc) { docStore[type] = doc; refreshDocUI(type); }
    }

  } catch(e) { console.error('loadAll error', e); }
}

// ── Utility ──────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Remove items ─────────────────────────────────────────────
function removeItem(btn) {
  const TARGETS = [
    '.skill-pill', '.project-card', '.achievement',
    '.exp-item', '.learning-item', '.education-item', '.contact-item'
  ];
  let target = null;
  for (const sel of TARGETS) {
    target = btn.closest(sel);
    if (target) break;
  }
  if (!target) return;
  target.remove();
  checkAchievementsEmpty();
  checkEducationEmpty();
  saveAll();
}

function removeLearning(btn) { removeItem(btn); }

// ── Click highlight (ripple ring on every interactive element) ─
document.addEventListener('click', function(e) {
  const el = e.target.closest(
    'button, a, .skill-pill, .learning-item, .project-card, .achievement, .exp-item, .education-item, .contact-item, label'
  );
  if (!el) return;
  el.classList.remove('clicked');
  void el.offsetWidth; // force reflow to restart animation
  el.classList.add('clicked');
  setTimeout(() => el.classList.remove('clicked'), 600);
});

// ── Avatar ────────────────────────────────────────────────────
async function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    showUploadProgress('Uploading profile photo…');
    const url = await uploadToCloudinary(file, p => updateUploadProgress(p));
    hideUploadProgress();
    const img = document.getElementById('avatarImg');
    if (img) { img.src = url; img.style.display = 'block'; }
    document.getElementById('avatar')?.classList.add('has-img');
    checkAvatarViewBtn();
    await dbSet('avatar', url); // store URL (not base64) — tiny, loads for everyone
  } catch(e) {
    hideUploadProgress();
    alert('Upload failed. Check your internet connection and try again.');
    console.error(e);
  }
}

function checkAvatarViewBtn() {
  const btn = document.getElementById('avatarViewBtn');
  if (btn) btn.style.display = document.getElementById('avatar')?.classList.contains('has-img') ? 'flex' : 'none';
}

function openAvatarLightbox() {
  const img = document.getElementById('avatarImg');
  if (!img || !img.src) return;
  document.getElementById('avatarLightboxImg').src = img.src;
  document.getElementById('avatarLightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeAvatarLightbox() {
  document.getElementById('avatarLightbox').classList.remove('open');
  document.body.style.overflow = '';
}

// ── Cert / image lightbox ─────────────────────────────────────
function openCertLightbox(src) {
  document.getElementById('certLightboxImg').src = src;
  document.getElementById('certLightbox').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCertLightbox() {
  document.getElementById('certLightbox').classList.remove('open');
  document.body.style.overflow = '';
}
async function openCertLightboxById(uid) {
  const url = await dbGet('img_cert_' + uid);
  if (url) openCertLightbox(url);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAvatarLightbox(); closeCertLightbox(); }
});

// ── Skills ────────────────────────────────────────────────────
function addSkill() {
  const input = document.getElementById('newSkillInput');
  const val = input.value.trim();
  if (!val) return;
  const pill = document.createElement('span');
  pill.className = 'skill-pill';
  pill.innerHTML = escapeHtml(val) + '<button class="rm" onclick="removeItem(this)">×</button>';
  document.getElementById('skillsList').appendChild(pill);
  input.value = '';
  saveAll();
}

// ── Projects ──────────────────────────────────────────────────
function addProject() {
  const name = prompt('Project name:');
  if (!name?.trim()) return;
  const desc = prompt('Short description:') || '';
  const tech = prompt('Technologies (comma-separated):') || '';
  const uid  = 'p' + Date.now();
  const div  = document.createElement('div');
  div.className = 'project-card';
  div.dataset.projId = uid;
  div.innerHTML = `
    <h3 contenteditable="false">${escapeHtml(name.trim())}</h3>
    <p class="desc" contenteditable="false">${escapeHtml(desc.trim())}</p>
    <p class="tech" contenteditable="false">${escapeHtml(tech.trim())}</p>
    <div class="project-links">
      <a href="#" target="_blank" rel="noopener">▶ Demo</a>
      <a href="#" target="_blank" rel="noopener">⌥ GitHub</a>
    </div>
    <div class="project-actions">
      <label class="action-btn">📷 Image
        <input type="file" accept="image/*" style="display:none" onchange="handleProjectThumbUpload(event,this,'${uid}')">
      </label>
      <button class="action-btn" onclick="editProjectLinks(this)">🔗 Links</button>
      <button class="rm-project" onclick="removeItem(this)">remove</button>
    </div>`;
  document.getElementById('projectsGrid').appendChild(div);
  saveAll();
}

function editProjectLinks(btn) {
  const card  = btn.closest('.project-card');
  const links = card.querySelectorAll('.project-links a');
  const gh    = links[1];
  const demo  = links[0];
  const ghUrl   = prompt('GitHub URL:', gh.href !== location.href ? gh.href : '');
  if (ghUrl !== null) gh.href = ghUrl.trim() || '#';
  const demoUrl = prompt('Demo URL:', demo.href !== location.href ? demo.href : '');
  if (demoUrl !== null) demo.href = demoUrl.trim() || '#';
  saveAll();
}

async function handleProjectThumbUpload(event, input, uid) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    showUploadProgress('Uploading project image…');
    const url = await uploadToCloudinary(file, p => updateUploadProgress(p));
    hideUploadProgress();
    const card = (typeof input === 'string')
      ? document.querySelector(`[data-proj-id="${input}"]`)
      : input.closest('.project-card');
    let thumb = card?.querySelector('.project-thumb');
    if (!thumb) {
      thumb = document.createElement('img');
      thumb.className = 'project-thumb';
      card.insertBefore(thumb, card.firstChild);
    }
    thumb.src = url;
    const projUid = card.dataset.projId || uid;
    await dbSet('img_proj_' + projUid, url);
    await saveAll();
  } catch(e) {
    hideUploadProgress();
    alert('Upload failed. Check your internet connection and try again.');
    console.error(e);
  }
}


// ── Experience ────────────────────────────────────────────────
function addExperience() {
  const title = prompt('Job title / role:');
  if (!title?.trim()) return;
  const desc = prompt('Description:') || '';
  const div  = document.createElement('div');
  div.className = 'exp-item';
  div.innerHTML = `<h3 contenteditable="false">${escapeHtml(title.trim())}</h3>
    <p contenteditable="false">${escapeHtml(desc.trim())}</p>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
  document.getElementById('expList').appendChild(div);
  saveAll();
}

// ── Learning ──────────────────────────────────────────────────
function addLearning() {
  const topic = prompt('New learning topic:');
  if (!topic?.trim()) return;
  const grid   = document.getElementById('learningGrid');
  const addBtn = grid.querySelector('.add-learning-btn');
  const div    = document.createElement('div');
  div.className = 'learning-item';
  div.innerHTML = escapeHtml(topic.trim()) +
    '<button class="rm-learn" onclick="removeItem(this)">remove</button>';
  grid.insertBefore(div, addBtn);
  saveAll();
}

// ── Certifications ────────────────────────────────────────────
function checkAchievementsEmpty() {
  const list  = document.getElementById('achievementsList');
  const empty = document.getElementById('achievementsEmpty');
  if (!list || !empty) return;
  empty.style.display = list.querySelector('.achievement') ? 'none' : 'block';
}

function addAchievement() {
  const input = document.getElementById('newAchievementInput');
  const val   = input.value.trim();
  if (!val) return;
  const uid = 'cert_' + Date.now();
  const div = document.createElement('div');
  div.className  = 'achievement';
  div.dataset.certId = uid;
  div.innerHTML = `
    <div class="cert-img-placeholder">
      <span class="no-img-label">No img</span>
    </div>
    <img class="cert-thumb" data-uid="${uid}" src="" alt="certificate"
         style="display:none;cursor:pointer" onclick="openCertLightbox(this.src)">
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

async function handleCertImg(event, input, uid) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    showUploadProgress('Uploading certificate image…');
    const url = await uploadToCloudinary(file, p => updateUploadProgress(p));
    hideUploadProgress();
    const achievement = input.closest('.achievement');
    const placeholder = achievement.querySelector('.cert-img-placeholder');
    const thumb       = achievement.querySelector('.cert-thumb');
    const viewBtn     = achievement.querySelector('.cert-view-btn');
    if (placeholder) placeholder.style.display = 'none';
    if (thumb)  { thumb.src = url; thumb.style.display = 'block'; }
    if (viewBtn) viewBtn.style.display = 'inline';
    await dbSet('img_cert_' + uid, url);
    await saveAll();
  } catch(e) {
    hideUploadProgress();
    alert('Upload failed. Check your internet connection and try again.');
    console.error(e);
  }
}


// ── Education ─────────────────────────────────────────────────
function checkEducationEmpty() {
  const grid  = document.getElementById('educationGrid');
  const empty = document.getElementById('educationEmpty');
  if (!grid || !empty) return;
  empty.style.display = grid.querySelector('.education-item') ? 'none' : 'block';
}

function addEducation() {
  const degree = prompt('Degree / qualification:');
  if (!degree?.trim()) return;
  const inst   = prompt('Institution:') || '';
  const years  = prompt('Years (e.g. 2020–2024):') || '';
  const details = prompt('Details / description:') || '';
  const uid    = 'edu_' + Date.now();
  const div    = document.createElement('div');
  div.className = 'education-item';
  div.dataset.eduId = uid;
  div.innerHTML = `
    <button class="rm-edu" onclick="removeItem(this)">remove</button>
    <div class="education-header">
      <h3 contenteditable="false">${escapeHtml(degree.trim())}</h3>
      <p class="institution" contenteditable="false">${escapeHtml(inst.trim())}</p>
      <p class="duration" contenteditable="false">${escapeHtml(years.trim())}</p>
    </div>
    <p class="details" contenteditable="false">${escapeHtml(details.trim())}</p>
    <div class="education-result-wrap">
      <img class="result-thumb" data-uid="${uid}" src="" alt="Result"
           style="display:none;cursor:pointer" onclick="openCertLightbox(this.src)">
      <button class="result-view-btn" style="display:none"
              onclick="openCertLightbox(this.previousElementSibling.src)">View result</button>
      <div class="result-info">
        <span class="result-label">Result/Transcript</span>
        <label class="result-upload-lbl cert-upload-lbl">Upload result
          <input type="file" accept="image/*" style="display:none"
                 onchange="handleEducationResult(event,this,'${uid}')">
        </label>
      </div>
    </div>`;
  document.getElementById('educationGrid').appendChild(div);
  checkEducationEmpty();
  saveAll();
}

async function handleEducationResult(event, input, uid) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    showUploadProgress('Uploading result image…');
    const url = await uploadToCloudinary(file, p => updateUploadProgress(p));
    hideUploadProgress();
    const item     = input.closest('.education-item');
    const resultImg = item.querySelector('.result-thumb');
    const viewBtn   = item.querySelector('.result-view-btn');
    const imgUid    = (resultImg && resultImg.dataset.uid) ? resultImg.dataset.uid : uid;
    if (resultImg) { resultImg.src = url; resultImg.style.display = 'block'; }
    if (viewBtn)   { viewBtn.style.display = 'inline-block'; }
    await dbSet('img_' + imgUid, url);
    await saveAll();
  } catch(e) {
    hideUploadProgress();
    alert('Upload failed. Check your internet connection and try again.');
    console.error(e);
  }
}


// ── Contact ───────────────────────────────────────────────────
function addContact() {
  const label = prompt('Label (e.g. Phone, LinkedIn):');
  if (!label?.trim()) return;
  const val = prompt('Value / URL:') || '';
  const div = document.createElement('div');
  div.className = 'contact-item';
  div.innerHTML = `<span class="contact-label">${escapeHtml(label.trim())}</span>
    <span class="contact-val">${escapeHtml(val.trim())}</span>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
  document.getElementById('contactInfoGrid').appendChild(div);
  saveAll();
}

// ── Documents (Resume / CV) ────────────────────────────────────
const docStore = { resume: null, cv: null };

async function handleDocUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async function(e) {
    const doc = { name: file.name, data: e.target.result, size: file.size };
    docStore[type] = doc;
    refreshDocUI(type);
    await dbSet('doc_' + type, doc);
  };
  reader.readAsDataURL(file);
}

function refreshDocUI(type) {
  const doc    = docStore[type];
  const meta   = document.getElementById(type + 'Meta');
  const openBtn = document.getElementById(type + 'OpenBtn');
  const rmBtn  = document.getElementById(type + 'RmBtn');
  if (!meta) return;
  if (doc) {
    const kb = Math.round(doc.size / 1024);
    meta.textContent = doc.name + ' — ' + (kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : kb + ' KB');
    if (openBtn) openBtn.style.display = 'inline-block';
    if (rmBtn)   rmBtn.style.display   = '';
  } else {
    meta.textContent = 'No file uploaded';
    if (openBtn) openBtn.style.display = 'none';
    if (rmBtn)   rmBtn.style.display   = 'none';
  }
}

function openDoc(type) {
  const doc = docStore[type];
  if (!doc) { alert('No file uploaded yet.'); return; }
  const win = window.open();
  win.document.write(`<iframe src="${doc.data}" style="width:100%;height:100vh;border:none"></iframe>`);
}

async function removeDoc(type) {
  if (!confirm('Remove this document?')) return;
  docStore[type] = null;
  refreshDocUI(type);
  await dbSet('doc_' + type, null);
}

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('load', async function() {
  await loadAll();
  checkAvatarViewBtn();
  ['resume', 'cv'].forEach(t => refreshDocUI(t));
});

// ── Secret keyboard shortcut to access edit mode ──────────────
// Press Ctrl + Shift + E  (only you know this)
// Completely invisible — no button, no URL, no hint on the page
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'E') {
    activateEditMode();
  }
});
