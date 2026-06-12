// ============================================================
//  Fahad Saleem Portfolio — app.js
//  Storage: IndexedDB (no size limit — handles images & PDFs)
// ============================================================

const EDITABLE_IDS = ['heroName','heroTag','aboutP1','aboutP2','aboutP3'];

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
    req.onsuccess = e => resolve(e.target.result);
    req.onerror   = e => reject(e.target.error);
  });
}

// ── Save / Load ──────────────────────────────────────────────
async function saveAll(){
  const data = {
    hero: {
      name: document.getElementById('heroName').textContent,
      tag:  document.getElementById('heroTag').textContent
    },
    about: {
      p1: document.getElementById('aboutP1').textContent,
      p2: document.getElementById('aboutP2').textContent,
      p3: document.getElementById('aboutP3').textContent
    },
    skillsList:       document.getElementById('skillsList').innerHTML,
    projectsGrid:     document.getElementById('projectsGrid').innerHTML,
    expList:          document.getElementById('expList').innerHTML,
    learningGrid:     document.getElementById('learningGrid').innerHTML,
    educationGrid:    document.getElementById('educationGrid').innerHTML,
    achievementsList: document.getElementById('achievementsList').innerHTML,
    contactInfoGrid:  document.getElementById('contactInfoGrid').innerHTML,
  };
  try {
    await dbSet('main', data);
  } catch(e){
    alert('Could not save data: ' + e.message);
  }
}

async function saveAvatar(dataUrl){
  try { await dbSet('avatar', dataUrl); } catch(e){ console.error('Avatar save failed', e); }
}

async function saveCertImage(certId, dataUrl){
  try { await dbSet('cert_' + certId, dataUrl); } catch(e){ console.error('Cert save failed', e); }
}

async function saveDoc(type, obj){
  // obj = { name, data (base64 dataUrl), size }
  try { await dbSet('doc_' + type, obj); } catch(e){ console.error('Doc save failed', e); }
}

async function loadAll(){
  try {
    await openDB();
    const data = await dbGet('main');
    if(data){
      if(data.hero){
        if(data.hero.name) document.getElementById('heroName').textContent = data.hero.name;
        if(data.hero.tag)  document.getElementById('heroTag').textContent  = data.hero.tag;
      }
      if(data.about){
        if(data.about.p1) document.getElementById('aboutP1').textContent = data.about.p1;
        if(data.about.p2) document.getElementById('aboutP2').textContent = data.about.p2;
        if(data.about.p3) document.getElementById('aboutP3').textContent = data.about.p3;
      }
      if(data.skillsList)       document.getElementById('skillsList').innerHTML       = data.skillsList;
      if(data.projectsGrid)     document.getElementById('projectsGrid').innerHTML     = data.projectsGrid;
      if(data.expList)          document.getElementById('expList').innerHTML           = data.expList;
      if(data.learningGrid)     document.getElementById('learningGrid').innerHTML     = data.learningGrid;
      if(data.educationGrid)    document.getElementById('educationGrid').innerHTML    = data.educationGrid;
      if(data.achievementsList){
        document.getElementById('achievementsList').innerHTML = data.achievementsList;
        checkAchievementsEmpty();
      }
      if(data.contactInfoGrid)  document.getElementById('contactInfoGrid').innerHTML  = data.contactInfoGrid;
    }

    // Load avatar
    const avatarUrl = await dbGet('avatar');
    if(avatarUrl){
      const img = document.getElementById('avatarImg');
      img.src = avatarUrl;
      document.getElementById('avatar').classList.add('has-img');
      checkAvatarViewBtn();
    }

    // Load cert images (find all cert elements by data-cert-id)
    document.querySelectorAll('[data-cert-id]').forEach(async el => {
      const certId = el.dataset.certId;
      const url = await dbGet('cert_' + certId);
      if(url){
        const thumb = el.querySelector('.cert-thumb');
        const viewBtn = el.querySelector('.cert-view-btn');
        if(thumb){ thumb.src = url; thumb.style.display = 'block'; }
        if(viewBtn) viewBtn.style.display = 'inline';
      }
    });

    // Load documents
    for(const type of ['resume','cv']){
      const doc = await dbGet('doc_' + type);
      if(doc){ docStore[type] = doc; refreshDocUI(type); }
    }

  } catch(e){ console.error('loadAll error', e); }
}

async function resetSite(){
  if(!confirm('⚠️ This will clear all your saved data and reset the portfolio. Are you sure?')) return;
  try {
    const d = await openDB();
    await new Promise((res, rej) => {
      const tx = d.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = res;
      tx.onerror = rej;
    });
    location.reload();
  } catch(e){ alert('Reset failed: ' + e.message); }
}

// ── Doc store (in-memory reference; blobs in IndexedDB) ─────
const docStore = { resume: null, cv: null };

// ── Edit mode ────────────────────────────────────────────────
function toggleEdit(){
  const body = document.body;
  const isCurrentlyEditMode = body.classList.contains('edit-mode');
  if(!isCurrentlyEditMode){
    const password = prompt('🔐 Enter admin password to edit your portfolio:');
    if(password === null) return;
    const ADMIN_PASSWORD = 'fahad123';
    if(password !== ADMIN_PASSWORD){
      alert('❌ Incorrect password! Only the website owner can edit.');
      return;
    }
  }
  const on = body.classList.toggle('edit-mode');
  document.getElementById('editToggle').classList.toggle('active', on);
  document.getElementById('editToggle').textContent = on ? '✓ Done editing' : '✏️ Edit mode';
  EDITABLE_IDS.forEach(id => {
    document.getElementById(id).setAttribute('contenteditable', on);
  });
  document.querySelectorAll('.project-card h3, .project-card .desc, .project-card .tech, .exp-item h3, .exp-item p').forEach(el => {
    el.setAttribute('contenteditable', on);
  });
  if(!on){ alert('✅ Changes saved successfully!'); saveAll(); }
}

// ── Utility ──────────────────────────────────────────────────
function removeItem(btn){
  let el = btn.closest('.skill-pill')    ||
           btn.closest('.project-card')  ||
           btn.closest('.achievement')   ||
           btn.closest('.exp-item')      ||
           btn.closest('.learning-item') ||
           btn.closest('.education-item')||
           btn.closest('.contact-item');
  if(!el){ console.error('removeItem: target not found'); return; }
  if(confirm('Remove this item?')){ el.remove(); checkAchievementsEmpty(); checkEducationEmpty(); saveAll(); }
}

function removeLearning(btn){
  const item = btn.closest('.learning-item');
  if(item && confirm('Remove this learning topic?')){ item.remove(); saveAll(); }
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function escapeAttr(str){
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Click highlight (ripple) ─────────────────────────────────
document.addEventListener('click', function(e){
  const target = e.target;
  const ripplable = target.closest('button, a, .skill-pill, .learning-item, .project-card, .nav-links a, section, .achievement, .exp-item, .education-item, .contact-item, label');
  if(!ripplable) return;
  ripplable.classList.remove('clicked');
  void ripplable.offsetWidth; // reflow
  ripplable.classList.add('clicked');
  setTimeout(() => ripplable.classList.remove('clicked'), 600);
});

// ── Avatar ───────────────────────────────────────────────────
function handleAvatarUpload(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 3 * 1024 * 1024){ alert('Please choose an image smaller than 3MB.'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const img = document.getElementById('avatarImg');
    img.src = e.target.result;
    document.getElementById('avatar').classList.add('has-img');
    checkAvatarViewBtn();
    await saveAvatar(e.target.result);
  };
  reader.readAsDataURL(file);
}

function checkAvatarViewBtn(){
  const avatar = document.getElementById('avatar');
  const btn = document.getElementById('avatarViewBtn');
  if(btn) btn.style.display = avatar.classList.contains('has-img') ? 'flex' : 'none';
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

document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){ closeAvatarLightbox(); closeCertLightbox(); }
});

// ── Skills ───────────────────────────────────────────────────
function addSkill(){
  const input = document.getElementById('newSkillInput');
  const val = input.value.trim();
  if(!val) return;
  const pill = document.createElement('div');
  pill.className = 'skill-pill';
  pill.innerHTML = escapeHtml(val) + '<button class="rm" onclick="removeItem(this)">×</button>';
  document.getElementById('skillsList').appendChild(pill);
  input.value = '';
  saveAll();
}

// ── Projects ─────────────────────────────────────────────────
function handleThumbUpload(event, btn){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 2 * 1024 * 1024){ alert('Keep project image under 2MB.'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const card = btn.closest('.project-card');
    let thumb = card.querySelector('.project-thumb');
    if(!thumb){
      thumb = document.createElement('img');
      thumb.className = 'project-thumb';
      card.prepend(thumb);
    }
    thumb.src = e.target.result;
    await saveAll();
  };
  reader.readAsDataURL(file);
}

function addProject(){
  const name = prompt('Project name:');
  if(!name || !name.trim()) return;
  const desc = prompt('Short description:') || '';
  const tech = prompt('Technologies used (comma-separated):') || '';
  const id = 'proj_' + Date.now();
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
      <label class="action-btn">📷 Image<input type="file" accept="image/*" style="display:none" onchange="handleThumbUpload(event,this)"></label>
      <button class="action-btn" onclick="editProjectLinks(this)">🔗 Links</button>
      <button class="rm-project" onclick="removeItem(this)">remove</button>
    </div>`;
  document.getElementById('projectsGrid').appendChild(div);
  saveAll();
}

function editProjectLinks(btn){
  const card = btn.closest('.project-card');
  const links = card.querySelectorAll('.project-links a');
  const demoLink   = links[0];
  const githubLink = links[1];
  const repoUrl = prompt('GitHub repository URL:', (githubLink && githubLink.getAttribute('href') !== '#') ? githubLink.getAttribute('href') : 'https://github.com/');
  if(repoUrl !== null && repoUrl.trim()) githubLink.setAttribute('href', repoUrl.trim());
  const videoUrl = prompt('Demo/LinkedIn URL:', (demoLink && demoLink.getAttribute('href') !== '#') ? demoLink.getAttribute('href') : 'https://linkedin.com/');
  if(videoUrl !== null && videoUrl.trim()) demoLink.setAttribute('href', videoUrl.trim());
  saveAll();
}

function handleProjectThumbUpload(event, input){
  const file = event.target.files[0];
  if(!file) return;
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
  const grid = document.getElementById('learningGrid');
  const addBtn = grid.querySelector('.add-learning-btn');
  const div = document.createElement('div');
  div.className = 'learning-item';
  div.innerHTML = escapeHtml(topic.trim()) + '<button class="rm-learn" onclick="removeLearning(this)">remove</button>';
  grid.insertBefore(div, addBtn);
  saveAll();
}

// ── Certifications ───────────────────────────────────────────
function checkAchievementsEmpty(){
  const list  = document.getElementById('achievementsList');
  const empty = document.getElementById('achievementsEmpty');
  if(!list || !empty) return;
  const hasItems = list.querySelector('.achievement');
  empty.style.display = hasItems ? 'none' : 'block';
}

function buildAchievementHTML(label, uid){
  return `<div class="cert-img-placeholder" data-uid="${uid}">
      <span class="no-img-label">No image</span>
    </div>
    <span class="cert-label" style="flex:1">${escapeHtml(label)}</span>
    <button class="cert-view-btn" style="display:none" onclick="openCertLightboxById('${uid}')">View</button>
    <label class="cert-upload-lbl" title="Upload certificate image">📎 Add image
      <input type="file" accept="image/*" style="display:none" onchange="handleCertImg(event,this,'${uid}')">
    </label>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
}

function addAchievement(){
  const input = document.getElementById('newAchievementInput');
  const val = input.value.trim();
  if(!val) return;
  const uid = 'cert_' + Date.now();
  const div = document.createElement('div');
  div.className = 'achievement';
  div.dataset.certId = uid;
  div.innerHTML = buildAchievementHTML(val, uid);
  document.getElementById('achievementsList').appendChild(div);
  input.value = '';
  checkAchievementsEmpty();
  saveAll();
}

async function handleCertImg(event, input, uid){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 5 * 1024 * 1024){ alert('Please choose an image smaller than 5MB.'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const dataUrl = e.target.result;
    const achievement = input.closest('.achievement');
    const placeholder = achievement.querySelector('.cert-img-placeholder');
    const viewBtn = achievement.querySelector('.cert-view-btn');
    // Replace placeholder with thumbnail
    placeholder.outerHTML = `<img class="cert-thumb" src="${dataUrl}" alt="cert" onclick="openCertLightbox(this.src)" style="cursor:pointer">`;
    if(viewBtn) viewBtn.style.display = 'inline';
    await saveCertImage(uid, dataUrl);
    await saveAll();
  };
  reader.readAsDataURL(file);
}

async function openCertLightboxById(uid){
  const dataUrl = await dbGet('cert_' + uid);
  if(dataUrl) openCertLightbox(dataUrl);
}

// ── Education ────────────────────────────────────────────────
function checkEducationEmpty(){
  const grid  = document.getElementById('educationGrid');
  const empty = document.getElementById('educationEmpty');
  if(!grid || !empty) return;
  const hasItems = grid.querySelector('.education-item');
  empty.style.display = hasItems ? 'none' : 'block';
}

function addEducation(){
  const degree = prompt('Degree / qualification:');
  if(!degree || !degree.trim()) return;
  const inst  = prompt('Institution:') || '';
  const years = prompt('Years (e.g. 2020-2024):') || '';
  const div = document.createElement('div');
  div.className = 'education-item';
  div.innerHTML = `<div class="edu-main">
      <h3>${escapeHtml(degree.trim())}</h3>
      <p>${escapeHtml(inst.trim())}</p>
      <span class="edu-years">${escapeHtml(years.trim())}</span>
    </div>
    <div class="edu-result-wrap" id="result_${Date.now()}">
      <span class="no-result-label">No result image</span>
    </div>
    <label class="cert-upload-lbl result-upload-lbl" title="Upload result/transcript image">📎 Add result
      <input type="file" accept="image/*" style="display:none" onchange="handleEducationResult(event,this)">
    </label>
    <button class="rm" onclick="removeItem(this)">remove</button>`;
  document.getElementById('educationGrid').appendChild(div);
  checkEducationEmpty();
  saveAll();
}

async function handleEducationResult(event, input){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 5 * 1024 * 1024){ alert('Please choose an image smaller than 5MB.'); return; }
  const reader = new FileReader();
  reader.onload = async function(e){
    const dataUrl = e.target.result;
    const item = input.closest('.education-item');
    const wrap = item.querySelector('.edu-result-wrap');
    if(wrap){
      const uid = 'edu_' + Date.now();
      wrap.innerHTML = `<img class="cert-thumb" src="${dataUrl}" alt="result" onclick="openCertLightbox(this.src)" style="cursor:pointer">
        <button class="cert-view-btn" onclick="openCertLightbox(this.previousElementSibling.src)">View</button>`;
      await saveCertImage(uid, dataUrl);
    }
    await saveAll();
  };
  reader.readAsDataURL(file);
}

// ── Contact ──────────────────────────────────────────────────
function addContact(){
  const label = prompt('Contact label (e.g. Phone, LinkedIn):');
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

function handleContactItemClick(el){ /* handled by CSS */ }
function handleContactForm(e){ e.preventDefault(); }

// ── Documents (Resume / CV) ──────────────────────────────────
async function handleDocUpload(event, type){
  const file = event.target.files[0];
  if(!file) return;
  // No size limit warning — IndexedDB handles large files
  const reader = new FileReader();
  reader.onload = async function(e){
    const doc = { name: file.name, data: e.target.result, size: file.size };
    docStore[type] = doc;
    refreshDocUI(type);
    await saveDoc(type, doc);
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
    const display = kb > 1024 ? (kb/1024).toFixed(1) + ' MB' : kb + ' KB';
    meta.textContent = doc.name + ' — ' + display;
    if(openBtn) openBtn.style.display = 'inline-block';
    if(rmBtn)   rmBtn.style.display   = 'inline-block';
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
  try { await dbSet('doc_' + type, null); } catch(e){}
}

// ── Boot ─────────────────────────────────────────────────────
window.addEventListener('load', function(){
  loadAll();
  checkAvatarViewBtn();
  ['resume','cv'].forEach(t => refreshDocUI(t));
});
