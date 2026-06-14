// ═══════════════════════════════════════════════════════════════
//  Fahad Saleem — Portfolio  |  app.js
//  Edit access : Ctrl + Shift + E  →  password prompt
//  Password    : stored as SHA-256 hash only (not plain text)
//  Images      : uploaded directly to Cloudinary → permanent URL
// ═══════════════════════════════════════════════════════════════

// ── Config ───────────────────────────────────────────────────
// SHA-256 hash of your password — to change: emn178.github.io/online-tools/sha256.html
const ADMIN_HASH        = 'c5f454eb6440bdc836166458fc452ed5b51606e2fe764c5044847f3ef6e9fbbb';
const CLOUDINARY_CLOUD  = 'dcjlfnia4';
const CLOUDINARY_PRESET = 'portfolio_upload';

// ── State ────────────────────────────────────────────────────
let editUnlocked = false;   // true only after correct password this session
let isEditMode   = false;   // current edit state

// ── SHA-256 via browser crypto API ───────────────────────────
async function sha256(msg) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── IndexedDB (unlimited storage) ────────────────────────────
let _db = null;
function openDB() {
  return new Promise((res, rej) => {
    if (_db) { res(_db); return; }
    const r = indexedDB.open('fahad_portfolio_v4', 1);
    r.onupgradeneeded = e => e.target.result.createObjectStore('kv');
    r.onsuccess = e => { _db = e.target.result; res(_db); };
    r.onerror   = e => rej(e.target.error);
  });
}
async function dbSet(k, v) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx = d.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(v, k);
    tx.oncomplete = res;
    tx.onerror    = e => rej(e.target.error);
  });
}
async function dbGet(k) {
  const d = await openDB();
  return new Promise((res, rej) => {
    const tx  = d.transaction('kv', 'readonly');
    const req = tx.objectStore('kv').get(k);
    req.onsuccess = e => res(e.target.result ?? null);
    req.onerror   = e => rej(e.target.error);
  });
}

// ── Cloudinary direct upload ──────────────────────────────────
async function uploadToCloudinary(file) {
  showOverlay('Uploading ' + file.name + '…');
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_PRESET);
  return new Promise((res, rej) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', 'https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD + '/image/upload');
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100));
    };
    xhr.onload = () => {
      hideOverlay();
      if (xhr.status === 200) {
        res(JSON.parse(xhr.responseText).secure_url);
      } else {
        rej(new Error('Upload failed — ' + xhr.statusText));
      }
    };
    xhr.onerror = () => { hideOverlay(); rej(new Error('Network error')); };
    xhr.send(fd);
  });
}

function showOverlay(msg) {
  document.getElementById('uploadMsg').textContent  = msg;
  document.getElementById('uploadBar').style.width  = '0%';
  document.getElementById('uploadPct').textContent  = '0%';
  document.getElementById('uploadOverlay').style.display = 'flex';
}
function setProgress(p) {
  document.getElementById('uploadBar').style.width = p + '%';
  document.getElementById('uploadPct').textContent = p + '%';
}
function hideOverlay() {
  document.getElementById('uploadOverlay').style.display = 'none';
}

// ── Admin / Edit mode ─────────────────────────────────────────
// The edit button is invisible to everyone.
// Only you know: press Ctrl+Shift+E → enter password → edit mode starts.
// On every page reload the button is hidden again — must re-enter password.

document.addEventListener('keydown', async function(e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'E') {
    e.preventDefault();
    if (!editUnlocked) {
      // First time this session — ask for password
      const pw = prompt('🔐 Enter admin password:');
      if (!pw) return;
      const hash = await sha256(pw);
      if (hash !== ADMIN_HASH) { alert('❌ Wrong password.'); return; }
      editUnlocked = true;
    }
    // Toggle edit mode on/off
    setEditMode(!isEditMode);
  }
});

// Called by the "Done editing" button
function toggleEdit() {
  if (!editUnlocked) return;
  setEditMode(!isEditMode);
}

function setEditMode(on) {
  isEditMode = on;
  document.body.classList.toggle('edit-mode', on);

  // Show button only while editing — hide when done
  const btn = document.getElementById('editToggle');
  if (btn) {
    btn.style.display = on ? 'inline-block' : 'none';
    btn.textContent   = '✓ Done editing';
    btn.classList.toggle('active', on);
  }

  // Make text fields editable / read-only
  const editableFields = [
    '#heroName', '#heroTag', '#aboutP1', '#aboutP2', '#aboutP3'
  ];
  editableFields.forEach(sel => {
    const el = document.querySelector(sel);
    if (el) el.contentEditable = on ? 'true' : 'false';
  });
  document.querySelectorAll(
    '.project-card h3, .project-card .desc, .project-card .tech,' +
    '.exp-item h3, .exp-item p,' +
    '.education-item h3, .education-item .institution,' +
    '.education-item .duration, .education-item .details'
  ).forEach(el => { el.contentEditable = on ? 'true' : 'false'; });

  if (!on) saveAll();
}

// ── Utility ──────────────────────────────────────────────────
function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Remove items ──────────────────────────────────────────────
function removeItem(btn) {
  if (!isEditMode) return;
  const targets = [
    '.skill-pill', '.project-card', '.achievement',
    '.exp-item', '.learning-item', '.education-item', '.contact-item'
  ];
  let el = null;
  for (const t of targets) { el = btn.closest(t); if (el) break; }
  if (!el) return;
  el.remove();
  checkAchievementsEmpty();
  checkEducationEmpty();
  saveAll();
}
function removeLearning(btn) { removeItem(btn); }

function checkAchievementsEmpty() {
  const list  = document.getElementById('achievementsList');
  const empty = document.getElementById('achievementsEmpty');
  if (list && empty) empty.style.display = list.querySelector('.achievement') ? 'none' : 'block';
}
function checkEducationEmpty() {
  const grid  = document.getElementById('educationGrid');
  const empty = document.getElementById('educationEmpty');
  if (grid && empty) empty.style.display = grid.querySelector('.education-item') ? 'none' : 'block';
}

// ── Click ripple highlight ────────────────────────────────────
document.addEventListener('click', function(e) {
  const el = e.target.closest(
    'button, a, .skill-pill, .learning-item, .project-card, ' +
    '.achievement, .exp-item, .education-item, .contact-item, label'
  );
  if (!el) return;
  el.classList.remove('clicked');
  void el.offsetWidth;
  el.classList.add('clicked');
  setTimeout(() => el.classList.remove('clicked'), 600);
});

// ── Save all content ──────────────────────────────────────────
async function saveAll() {
  const g   = id => { const e = document.getElementById(id); return e ? e.innerHTML   : ''; };
  const txt = id => { const e = document.getElementById(id); return e ? e.textContent : ''; };
  try {
    await dbSet('content', {
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
    });
  } catch(err) { console.error('saveAll failed:', err); }
}

// ── Load all content ──────────────────────────────────────────
async function loadAll() {
  try {
    await openDB();
    const data = await dbGet('content');
    if (data) {
      const set = (id, v) => { const e = document.getElementById(id); if (e && v) e.innerHTML   = v; };
      const txt = (id, v) => { const e = document.getElementById(id); if (e && v) e.textContent = v; };
      txt('heroName', data.heroName); txt('heroTag', data.heroTag);
      txt('aboutP1',  data.aboutP1);  txt('aboutP2', data.aboutP2); txt('aboutP3', data.aboutP3);
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

    // Load avatar (stored as Cloudinary URL)
    const avatarUrl = await dbGet('avatar');
    if (avatarUrl) {
      const img = document.getElementById('avatarImg');
      if (img) { img.src = avatarUrl; img.style.display = 'block'; }
      document.getElementById('avatar')?.classList.add('has-img');
      updateAvatarBtn();
    }

    // Load project thumbnail images by data-proj-id
    document.querySelectorAll('.project-card[data-proj-id]').forEach(async card => {
      const url = await dbGet('proj_' + card.dataset.projId);
      if (url) {
        let img = card.querySelector('.project-thumb-img');
        if (img) { img.src = url; img.style.display = 'block'; }
      }
    });

    // Load education result images by data-uid on img elements
    document.querySelectorAll('img[data-uid]').forEach(async img => {
      const url = await dbGet('edu_' + img.dataset.uid);
      if (url) { img.src = url; img.style.display = 'block'; }
    });

    // Load certification images by data-cert-id on parent
    document.querySelectorAll('[data-cert-id]').forEach(async el => {
      const url = await dbGet('cert_' + el.dataset.certId);
      if (url) {
        const thumb = el.querySelector('.cert-thumb');
        const vb    = el.querySelector('.cert-view-btn');
        if (thumb) { thumb.src = url; thumb.style.display = 'block'; }
        if (vb)    vb.style.display = 'inline';
      }
    });

    // Load resume / CV
    for (const type of ['resume', 'cv']) {
      const doc = await dbGet('doc_' + type);
      if (doc) { docStore[type] = doc; refreshDocUI(type); }
    }

  } catch(err) { console.error('loadAll failed:', err); }
}

// ── Avatar ────────────────────────────────────────────────────
function updateAvatarBtn() {
  const btn = document.getElementById('avatarViewBtn');
  if (btn) btn.style.display = document.getElementById('avatar')?.classList.contains('has-img') ? 'flex' : 'none';
}

async function handleAvatarUpload(event) {
  const file = event.target.files[0]; if (!file) return;
  try {
    const url = await uploadToCloudinary(file);
    const img = document.getElementById('avatarImg');
    if (img) { img.src = url; img.style.display = 'block'; }
    document.getElementById('avatar')?.classList.add('has-img');
    updateAvatarBtn();
    await dbSet('avatar', url);
  } catch(e) { alert('Upload failed: ' + e.message); }
}

function openAvatarLightbox() {
  const src = document.getElementById('avatarImg')?.src;
  if (!src || src === window.location.href) return;
  document.getElementById('avatarLightboxImg').src = src;
  document.getElementById('avatarLightbox').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeAvatarLightbox() {
  document.getElementById('avatarLightbox').style.display = 'none';
  document.body.style.overflow = '';
}

// ── Cert / result lightbox ────────────────────────────────────
function openCertLightbox(src) {
  if (!src || src === window.location.href) return;
  document.getElementById('certLightboxImg').src = src;
  document.getElementById('certLightbox').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeCertLightbox() {
  document.getElementById('certLightbox').style.display = 'none';
  document.body.style.overflow = '';
}
async function openCertLightboxById(uid) {
  const url = await dbGet('cert_' + uid);
  if (url) openCertLightbox(url);
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAvatarLightbox(); closeCertLightbox(); }
});

// ── Skills ────────────────────────────────────────────────────
function addSkill() {
  const inp = document.getElementById('newSkillInput');
  const val = inp.value.trim(); if (!val) return;
  const pill = document.createElement('span');
  pill.className = 'skill-pill';
  pill.innerHTML = esc(val) + '<button class="rm" onclick="removeItem(this)">×</button>';
  document.getElementById('skillsList').appendChild(pill);
  inp.value = '';
  saveAll();
}

// ── Projects ──────────────────────────────────────────────────
function addProject() {
  const name = prompt('Project name:'); if (!name?.trim()) return;
  const desc = prompt('Short description:') || '';
  const tech = prompt('Tech stack (e.g. C++, SFML):') || '';
  const link = prompt('GitHub URL:') || '#';
  const uid  = 'proj_' + Date.now();
  const div  = document.createElement('div');
  div.className = 'project-card';
  div.dataset.projId = uid;
  div.innerHTML = `
    <button class="rm-project" onclick="removeItem(this)">remove</button>
    <div class="project-thumb-wrap">
      <img class="project-thumb-img" src="" alt="" style="display:none;width:100%;height:160px;object-fit:cover;border-radius:8px;margin-bottom:10px">
    </div>
    <h3 contenteditable="false">${esc(name.trim())}</h3>
    <p class="desc" contenteditable="false">${esc(desc.trim())}</p>
    <p class="tech" contenteditable="false">${esc(tech.trim())}</p>
    <div class="project-links">
      <a href="${esc(link)}" target="_blank" rel="noopener">⌥ GitHub</a>
    </div>
    <div class="project-actions">
      <label class="action-btn">📷 Add thumbnail
        <input type="file" accept="image/*" style="display:none" onchange="handleProjectThumb(event,this,'${uid}')">
      </label>
      <button class="action-btn" onclick="editProjectLinks(this)">🔗 Edit links</button>
    </div>`;
  document.getElementById('projectsGrid').appendChild(div);
  saveAll();
}

function editProjectLinks(btn) {
  const card  = btn.closest('.project-card');
  const links = card.querySelectorAll('.project-links a');
  links.forEach(a => {
    const newUrl = prompt('URL for "' + a.textContent + '":', a.href !== window.location.href ? a.href : '');
    if (newUrl !== null) a.href = newUrl.trim() || '#';
  });
  saveAll();
}

async function handleProjectThumb(event, input, uid) {
  const file = event.target.files[0]; if (!file) return;
  try {
    const url  = await uploadToCloudinary(file);
    const card = input.closest('.project-card');
    const img  = card?.querySelector('.project-thumb-img');
    if (img) { img.src = url; img.style.display = 'block'; }
    const projUid = card?.dataset?.projId || uid;
    await dbSet('proj_' + projUid, url);
    await saveAll();
  } catch(e) { alert('Upload failed: ' + e.message); }
}

// ── Experience ────────────────────────────────────────────────
function addExperience() {
  const title = prompt('Job title / role:'); if (!title?.trim()) return;
  const desc  = prompt('Description:') || '';
  const div   = document.createElement('div');
  div.className = 'exp-item';
  div.innerHTML = `
    <h3 contenteditable="false">${esc(title.trim())}</h3>
    <p contenteditable="false">${esc(desc.trim())}</p>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
  document.getElementById('expList').appendChild(div);
  saveAll();
}

// ── Learning ──────────────────────────────────────────────────
function addLearning() {
  const topic = prompt('Learning topic:'); if (!topic?.trim()) return;
  const grid  = document.getElementById('learningGrid');
  const addBtn = grid.querySelector('.add-learning-btn');
  const div   = document.createElement('div');
  div.className = 'learning-item';
  div.innerHTML = esc(topic.trim()) +
    '<button class="rm-learn" onclick="removeItem(this)">remove</button>';
  grid.insertBefore(div, addBtn);
  saveAll();
}

// ── Certifications ────────────────────────────────────────────
function addAchievement() {
  const inp = document.getElementById('newAchievementInput');
  const val = inp.value.trim(); if (!val) return;
  const uid = 'cert_' + Date.now();
  const div = document.createElement('div');
  div.className  = 'achievement';
  div.dataset.certId = uid;
  div.innerHTML = `
    <img class="cert-thumb" src="" alt="Certificate"
         style="display:none;width:40px;height:40px;border-radius:6px;object-fit:cover;cursor:pointer;flex-shrink:0"
         onclick="openCertLightbox(this.src)">
    <span style="flex:1">${esc(val)}</span>
    <button class="cert-view-btn"
            style="display:none;font-size:10px;color:#c9a35a;background:none;border:none;cursor:pointer;white-space:nowrap"
            onclick="openCertLightboxById('${uid}')">View cert</button>
    <label class="cert-upload-lbl"
           style="font-size:10px;color:#9b9ea7;cursor:pointer;display:none;white-space:nowrap">📎 Add image
      <input type="file" accept="image/*" style="display:none" onchange="handleCertImg(event,this,'${uid}')">
    </label>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
  document.getElementById('achievementsList').appendChild(div);
  inp.value = '';
  checkAchievementsEmpty();
  saveAll();
}

async function handleCertImg(event, input, uid) {
  const file = event.target.files[0]; if (!file) return;
  try {
    const url   = await uploadToCloudinary(file);
    const item  = input.closest('.achievement');
    const thumb = item?.querySelector('.cert-thumb');
    const vb    = item?.querySelector('.cert-view-btn');
    if (thumb) { thumb.src = url; thumb.style.display = 'block'; }
    if (vb)    vb.style.display = 'inline';
    await dbSet('cert_' + uid, url);
    await saveAll();
  } catch(e) { alert('Upload failed: ' + e.message); }
}

// ── Education ─────────────────────────────────────────────────
function addEducation() {
  const deg  = prompt('Degree / qualification:'); if (!deg?.trim()) return;
  const inst = prompt('Institution:') || '';
  const yrs  = prompt('Years (e.g. 2020-2024):') || '';
  const det  = prompt('Description:') || '';
  const uid  = 'edu_' + Date.now();
  const div  = document.createElement('div');
  div.className = 'education-item';
  div.dataset.eduId = uid;
  div.innerHTML = `
    <button class="rm-edu" onclick="removeItem(this)">remove</button>
    <div class="education-header">
      <h3 contenteditable="false">${esc(deg.trim())}</h3>
      <p class="institution" contenteditable="false">${esc(inst.trim())}</p>
      <p class="duration" contenteditable="false">${esc(yrs.trim())}</p>
    </div>
    <p class="details" contenteditable="false">${esc(det.trim())}</p>
    <div class="education-result-wrap">
      <img class="result-thumb" data-uid="${uid}" src="" alt="Result"
           style="display:none;width:80px;height:80px;object-fit:cover;border-radius:6px;cursor:pointer"
           onclick="openCertLightbox(this.src)">
      <div class="result-info">
        <span class="result-label">Result / Transcript</span>
        <label class="cert-upload-lbl result-upload-lbl"
               style="display:none;font-size:10px;color:#9b9ea7;cursor:pointer">Upload result
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
  const file = event.target.files[0]; if (!file) return;
  try {
    const url  = await uploadToCloudinary(file);
    const item = input.closest('.education-item');
    const img  = item?.querySelector('.result-thumb');
    const key  = img?.dataset?.uid || uid;
    if (img) { img.src = url; img.style.display = 'block'; }
    await dbSet('edu_' + key, url);
    await saveAll();
  } catch(e) { alert('Upload failed: ' + e.message); }
}

// ── Contact ───────────────────────────────────────────────────
function addContact() {
  const label = prompt('Label (e.g. Phone, Website):'); if (!label?.trim()) return;
  const val   = prompt('Value or URL:') || '';
  const div   = document.createElement('div');
  div.className = 'contact-item';
  div.innerHTML = `
    <span class="contact-label">${esc(label.trim())}</span>
    <span class="contact-val">${esc(val.trim())}</span>
    <button class="rm edit-only" onclick="removeItem(this)">×</button>`;
  document.getElementById('contactInfoGrid').appendChild(div);
  saveAll();
}

// ── Documents (Resume / CV) ───────────────────────────────────
const docStore = { resume: null, cv: null };

async function handleDocUpload(event, type) {
  if (!isEditMode) return;
  const file = event.target.files[0]; if (!file) return;
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
  const doc     = docStore[type];
  const meta    = document.getElementById(type + 'Meta');
  const openBtn = document.getElementById(type + 'OpenBtn');
  const rmBtn   = document.getElementById(type + 'RmBtn');
  if (!meta) return;
  if (doc) {
    const kb = Math.round(doc.size / 1024);
    meta.textContent = doc.name + ' — ' + (kb > 1024 ? (kb/1024).toFixed(1) + ' MB' : kb + ' KB');
    if (openBtn) openBtn.style.display = 'inline-block';
    if (rmBtn)   rmBtn.style.display   = '';
  } else {
    meta.textContent = 'No file uploaded yet';
    if (openBtn) openBtn.style.display = 'none';
    if (rmBtn)   rmBtn.style.display   = 'none';
  }
  if (type === 'resume') updateHeroResumeBtn();
}

function openDoc(type) {
  const doc = docStore[type];
  if (!doc) { alert('No document uploaded yet.'); return; }
  const win = window.open('', '_blank');
  if (!win) { alert('Pop-ups are blocked. Please allow pop-ups for this site.'); return; }
  win.document.write(
    '<html><body style="margin:0">' +
    '<iframe src="' + doc.data + '" style="width:100%;height:100vh;border:none"></iframe>' +
    '</body></html>'
  );
}

async function removeDoc(type) {
  if (!isEditMode) return;
  if (!confirm('Remove this document?')) return;
  docStore[type] = null;
  refreshDocUI(type);
  await dbSet('doc_' + type, null);
}



// ── Contact item click — opens link (NOT edit) ───────────────
function openContactLink(el) {
  if (isEditMode) return; // in edit mode, don't follow links
  const val = el.querySelector('.contact-value')?.textContent?.trim() || 
              el.querySelector('.contact-val')?.textContent?.trim() || '';
  const type = el.dataset.contactType || '';
  if (!val) return;
  let url = val;
  if (type === 'email' || val.includes('@')) url = 'mailto:' + val;
  else if (!val.startsWith('http')) url = 'https://' + val;
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ── Contact form send message (mailto) ───────────────────────
function handleContactForm(e) {
  e.preventDefault();
  const name    = document.getElementById('contactName')?.value?.trim() || '';
  const email   = document.getElementById('contactEmail')?.value?.trim() || '';
  const message = document.getElementById('contactMessage')?.value?.trim() || '';
  if (!name || !email || !message) { alert('Please fill all fields.'); return; }
  const subject = encodeURIComponent('Portfolio Contact from ' + name);
  const body    = encodeURIComponent('From: ' + name + '\nEmail: ' + email + '\n\n' + message);
  window.location.href = 'mailto:nexora.dev7@gmail.com?subject=' + subject + '&body=' + body;
}

// ── Highlight download resume button when doc is loaded ──────
function updateHeroResumeBtn() {
  const btn = document.getElementById('resumeBtnHero');
  if (!btn) return;
  if (docStore.resume) {
    btn.removeAttribute('disabled');
    btn.style.opacity = '1';
  } else {
    btn.style.opacity = '0.45';
  }
}

// ── Boot ──────────────────────────────────────────────────────
window.addEventListener('load', async function() {
  await loadAll();
  updateAvatarBtn();
  ['resume', 'cv'].forEach(t => refreshDocUI(t));
  updateHeroResumeBtn();
  // Edit button always hidden on load
  const btn = document.getElementById('editToggle');
  if (btn) btn.style.display = 'none';
});