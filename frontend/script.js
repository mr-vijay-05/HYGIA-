/**
 * HYGIA - UNIFIED CLIENT CONTROLLER
 * Supports Home (index.html), My Records (records.html), and Health Timeline (timeline.html)
 */

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

document.addEventListener('DOMContentLoaded', () => {
  // ---------------------------------------------------------------------------
  // 0. Global Session & Active Patient Synchronization
  // ---------------------------------------------------------------------------
  const storedPatientId = localStorage.getItem('hygia_patient_id');
  if (storedPatientId) {
    window.HYGIA_PATIENT_ID = storedPatientId;
  }

  // Synchronize stored user with profile header
  const storedUserJson = localStorage.getItem('hygia_user');
  if (storedUserJson) {
    try {
      const user = JSON.parse(storedUserJson);
      const userNameEls = document.querySelectorAll('.user-name, .hero-greeting-name');
      userNameEls.forEach(el => {
        if (el.classList.contains('hero-greeting-name')) {
          el.innerHTML = `${user.name.split(' ')[0]} <span class="wave-emoji">👋</span>`;
        } else {
          el.textContent = user.name;
        }
      });

      const userRoleEl = document.querySelector('.user-role');
      if (userRoleEl) {
        userRoleEl.textContent = user.role === 'family' ? 'Family Caregiver' : 'Personal Account';
      }

      if (user.avatar) {
        const avatarImgs = document.querySelectorAll('.user-avatar-img');
        avatarImgs.forEach(img => { img.src = user.avatar; });
      }
    } catch (e) {
      console.warn('Could not parse stored user profile:', e);
    }
  }

  // Clear session on Sign Out links
  const signOutLinks = document.querySelectorAll('a[href="login.html"]');
  signOutLinks.forEach(link => {
    link.addEventListener('click', () => {
      localStorage.removeItem('hygia_user');
      localStorage.removeItem('hygia_patient_id');
      delete window.HYGIA_PATIENT_ID;
    });
  });

  // ---------------------------------------------------------------------------
  // 1. Dropdowns (Notifications & User Profile)
  // ---------------------------------------------------------------------------
  const notifToggle = document.getElementById('notifToggle');
  const notifDropdown = document.getElementById('notifDropdown');
  const userProfileBtn = document.getElementById('userProfileBtn');
  const profileDropdown = document.getElementById('profileDropdown');
  const langToggle = document.getElementById('langToggle');
  const langDropdown = document.getElementById('langDropdown');
  const langWrapper = document.getElementById('langWrapper');
  const currentLangLabel = document.getElementById('currentLangLabel');
  const langItems = document.querySelectorAll('.lang-item');

  // Language Dropdown
  if (langToggle && langDropdown && langWrapper) {
    langToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      langWrapper.classList.toggle('active');
      if (notifDropdown) notifDropdown.classList.remove('active');
      if (profileDropdown) profileDropdown.classList.remove('active');
    });
    langDropdown.addEventListener('click', (e) => e.stopPropagation());

    langItems.forEach(item => {
      item.addEventListener('click', () => {
        langItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        const code = item.dataset.lang ? item.dataset.lang.toUpperCase() : 'EN';
        if (currentLangLabel) currentLangLabel.textContent = code;
        langWrapper.classList.remove('active');
      });
    });
  }

  // Notifications Dropdown
  if (notifToggle && notifDropdown) {
    notifToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle('active');
      if (profileDropdown) profileDropdown.classList.remove('active');
      if (langWrapper) langWrapper.classList.remove('active');
    });
    notifDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  // User Profile Dropdown
  if (userProfileBtn && profileDropdown) {
    userProfileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle('active');
      if (notifDropdown) notifDropdown.classList.remove('active');
      if (langWrapper) langWrapper.classList.remove('active');
    });
    profileDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  document.addEventListener('click', () => {
    if (notifDropdown) notifDropdown.classList.remove('active');
    if (profileDropdown) profileDropdown.classList.remove('active');
    if (langWrapper) langWrapper.classList.remove('active');
  });

  // ---------------------------------------------------------------------------
  // 2. Global Search Live Filter
  // ---------------------------------------------------------------------------
  const searchInput = document.getElementById('globalSearchInput');
  const timelineFeedRows = document.querySelectorAll('.timeline-feed-row, .timeline-row');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      timelineFeedRows.forEach(row => {
        const text = row.innerText.toLowerCase();
        if (!term || text.includes(term)) {
          row.style.display = 'flex';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Filter Pills for Records Page
  // ---------------------------------------------------------------------------
  const filterPills = document.querySelectorAll('.filter-pill');
  if (filterPills.length > 0) {
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const category = pill.dataset.category;
        timelineFeedRows.forEach(row => {
          const type = row.dataset.type;
          if (category === 'all' || type === category) {
            row.style.display = 'flex';
          } else {
            row.style.display = 'none';
          }
        });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Timeline Event Selection & Inspector on Health Timeline Page
  // ---------------------------------------------------------------------------
  const selIcon = document.getElementById('selIcon');
  const selTitle = document.getElementById('selTitle');
  const selSubtitle = document.getElementById('selSubtitle');
  const selBadge = document.getElementById('selBadge');
  const selReason = document.getElementById('selReason');
  const selLocation = document.getElementById('selLocation');
  const selType = document.getElementById('selType');
  const selExpTerm = document.getElementById('selExpTerm');
  const selExpClarity = document.getElementById('selExpClarity');

  const timelineEventDetails = {
    visit: {
      title: 'Doctor Visit',
      subtitle: '24 Jun 2018 • Salem Hospital',
      badgeClass: 'badge-visit-completed',
      badgeText: 'Visit Completed',
      reason: 'Allergy-related symptoms',
      location: 'Salem Hospital',
      type: 'Clinic visit (Outpatient)',
      term: 'Encounter (outpatient procedure)',
      clarity: 'This means a visit to a hospital or clinic without staying overnight (you did not stay as an inpatient).',
      iconHtml: `
        <svg viewBox="0 0 24 24" fill="none" stroke="#F05A28" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      `
    },
    treatment: {
      title: 'Allergy Treatment (Injection)',
      subtitle: '24 Jun 2018 • Salem Hospital',
      badgeClass: 'badge-treatment-completed',
      badgeText: 'Treatment Completed',
      reason: 'Allergen Immunotherapy (SCIT)',
      location: 'Salem Hospital (Treatment Rm 3)',
      type: 'Subcutaneous Procedure',
      term: 'Desensitization Protocol (CPT 95115)',
      clarity: 'Professional administration of gradual antigen doses to desensitize the respiratory immune response.',
      iconHtml: `
        <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m18 2 4 4"></path>
          <path d="m17 7 3-3"></path>
          <path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-1.6-1.6c-1-1-1-2.5 0-3.4L14 4"></path>
          <path d="m9 11 4 4"></path>
        </svg>
      `
    },
    notes: {
      title: "Doctor's Notes",
      subtitle: '24 Jun 2018 • Dr. Sarah Jenkins',
      badgeClass: 'badge-report-available',
      badgeText: 'Report Available',
      reason: 'Post-consultation follow-up',
      location: 'Salem Hospital',
      type: 'Clinical Progress Note',
      term: 'SOAP Consultation Summary',
      clarity: 'Physician notes detailing physical exam, clear breath sounds, and medication guidance.',
      iconHtml: `
        <svg viewBox="0 0 24 24" fill="none" stroke="#9333EA" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      `
    },
    sinus: {
      title: 'Viral Sinus Infection',
      subtitle: '11 Feb 2018 • Salem Hospital',
      badgeClass: 'badge-resolved',
      badgeText: 'Resolved',
      reason: 'Acute nasal congestion & fever',
      location: 'Salem Hospital Urgent Care',
      type: 'Acute Respiratory Diagnosis',
      term: 'Acute Viral Rhinosinusitis',
      clarity: 'Inflammation of the paranasal sinuses caused by a common respiratory virus; completely healed without recurrence.',
      iconHtml: `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4v7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <path d="M11 12.5C9.5 12 7.5 11.5 5.5 13C3.5 14.5 3 17 3.5 19C4 21 6 22 8.5 22C10.5 22 11.5 20.5 11.5 19V12.5Z" opacity="0.85"/>
          <path d="M13 12.5C14.5 12 16.5 11.5 18.5 13C20.5 14.5 21 17 20.5 19C20 21 18 22 15.5 22C13.5 22 12.5 20.5 12.5 19V12.5Z" opacity="0.85"/>
        </svg>
      `
    },
    oral: {
      title: 'Oral Health Education',
      subtitle: '11 Feb 2018 • Preventive Dental Clinic',
      badgeClass: 'badge-treatment-completed',
      badgeText: 'Completed',
      reason: 'Routine oral & airway screening',
      location: 'Salem Dental Wing',
      type: 'Preventive Care',
      term: 'Prophylactic Hygiene & Assessment',
      clarity: 'Guidance and preventive evaluation regarding oral hygiene and its connection to seasonal allergy management.',
      iconHtml: `
        <svg viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      `
    }
  };

  const timelineRows = document.querySelectorAll('.timeline-feed-row');
  timelineRows.forEach(row => {
    row.addEventListener('click', () => {
      timelineRows.forEach(r => r.classList.remove('active-event'));
      row.classList.add('active-event');
      const type = row.dataset.type || 'visit';
      const data = timelineEventDetails[type] || timelineEventDetails.visit;

      if (selIcon) selIcon.innerHTML = data.iconHtml;
      if (selTitle) selTitle.innerText = data.title;
      if (selSubtitle) {
        const parts = data.subtitle.split('•');
        selSubtitle.innerHTML = `${parts[0]} <span class="bullet">•</span> ${parts[1] || 'Salem Hospital'}`;
      }
      if (selBadge) {
        selBadge.className = `badge ${data.badgeClass}`;
        selBadge.innerText = data.badgeText;
      }
      if (selReason) selReason.innerText = data.reason;
      if (selLocation) selLocation.innerText = data.location;
      if (selType) selType.innerText = data.type;
      if (selExpTerm) selExpTerm.innerText = data.term;
      if (selExpClarity) selExpClarity.innerText = data.clarity;
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Add Health Event Modal
  // ---------------------------------------------------------------------------
  const btnAddHealthEvent = document.getElementById('btnAddHealthEvent');
  const addEventModal = document.getElementById('addEventModal');
  const closeAddEventModal = document.getElementById('closeAddEventModal');
  const cancelAddEventBtn = document.getElementById('cancelAddEventBtn');
  const saveAddEventBtn = document.getElementById('saveAddEventBtn');
  const timelineStream = document.getElementById('timelineStream');

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (btnAddHealthEvent) {
    btnAddHealthEvent.addEventListener('click', () => openModal(addEventModal));
  }
  if (closeAddEventModal) closeAddEventModal.addEventListener('click', () => closeModal(addEventModal));
  if (cancelAddEventBtn) cancelAddEventBtn.addEventListener('click', () => closeModal(addEventModal));
  if (addEventModal) {
    addEventModal.addEventListener('click', (e) => {
      if (e.target === addEventModal) closeModal(addEventModal);
    });
  }

  if (saveAddEventBtn && timelineStream) {
    saveAddEventBtn.addEventListener('click', () => {
      const title = document.getElementById('newEventTitle').value.trim() || 'New Health Event';
      const loc = document.getElementById('newEventLocation').value.trim() || 'Salem Hospital';
      const notes = document.getElementById('newEventNotes').value.trim() || 'Consultation details recorded.';

      const newBlock = document.createElement('div');
      newBlock.className = 'timeline-date-block';
      newBlock.innerHTML = `
        <div class="date-header-row">
          <span class="date-dot-solid"></span>
          <span class="date-header-label">Today</span>
        </div>
        <div class="date-events-wrapper">
          <div class="timeline-feed-row active-event" data-type="visit">
            <div class="feed-line-col">
              <span class="feed-node-dot"></span>
              <div class="feed-connect-line"></div>
            </div>
            <div class="feed-content-box" style="background:#FFF9F5; border:1px solid #FFE4D6;">
              <div class="timeline-icon-box orange-icon-box">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              </div>
              <div class="feed-text-col">
                <h4 class="feed-title">${title}</h4>
                <p class="feed-meta">Visit • ${loc}</p>
                <p class="feed-note">${notes}</p>
              </div>
              <div class="feed-badge-col">
                <span class="badge badge-visit-completed">Scheduled</span>
                <svg class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </div>
            </div>
          </div>
        </div>
      `;
      timelineStream.prepend(newBlock);
      closeModal(addEventModal);
      alert('New health event added to your timeline!');
    });
  }

  // ---------------------------------------------------------------------------
  // 6. DASHBOARD QUICK ACTIONS & MODAL CONTROLLERS
  // ---------------------------------------------------------------------------

  // Unified Toast Notifier
  function showDashboardToast(message, type = 'success') {
    const container = document.getElementById('dashboardToastContainer') || document.getElementById('toastContainer');
    if (!container) {
      alert(message);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `login-toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span><strong>${icon}</strong> ${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s reverse forwards ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // Active Patient ID Resolver (Verifies against database and avoids stale IDs)
  async function verifyPatientExists(patientId) {
    if (!patientId) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${patientId}`);
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  async function ensureActivePatientId() {
    // 1. Verify window-cached ID if present
    if (window.HYGIA_PATIENT_ID) {
      const valid = await verifyPatientExists(window.HYGIA_PATIENT_ID);
      if (valid) return window.HYGIA_PATIENT_ID;
      delete window.HYGIA_PATIENT_ID;
      localStorage.removeItem('hygia_patient_id');
    }

    // 2. Verify stored ID in localStorage
    const stored = localStorage.getItem('hygia_patient_id');
    if (stored) {
      const valid = await verifyPatientExists(stored);
      if (valid) {
        window.HYGIA_PATIENT_ID = stored;
        return stored;
      }
      localStorage.removeItem('hygia_patient_id');
    }

    try {
      const storedUserJson = localStorage.getItem('hygia_user');
      let currentUserName = 'Patient';
      if (storedUserJson) {
        try {
          const parsed = JSON.parse(storedUserJson);
          if (parsed.name) currentUserName = parsed.name;
        } catch (e) {}
      }

      // 3. Query existing patients from backend
      const res = await fetch(`${API_BASE_URL}/patients`);
      if (res.ok) {
        const patients = await res.json();
        if (Array.isArray(patients) && patients.length > 0) {
          const matched = patients.find(p => p.display_name && p.display_name.toLowerCase().includes(currentUserName.toLowerCase()));
          const selected = matched || patients[0];
          if (selected && selected.id) {
            window.HYGIA_PATIENT_ID = selected.id;
            localStorage.setItem('hygia_patient_id', selected.id);
            return selected.id;
          }
        }
      }

      // 4. Create patient if none found in database
      const createRes = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: currentUserName })
      });
      if (createRes.ok) {
        const newPatient = await createRes.json();
        window.HYGIA_PATIENT_ID = newPatient.id;
        localStorage.setItem('hygia_patient_id', newPatient.id);
        return newPatient.id;
      }
    } catch (err) {
      console.warn('Patient synchronization note:', err);
    }

    return null;
  }

  // Prepend new live event to Dashboard / Records / Timeline
  function prependTimelineItem({ title, category, meta, note, badgeText, badgeType, observations }) {
    const timelineList = document.getElementById('timelineList');
    if (!timelineList) return;

    const row = document.createElement('div');
    row.className = 'timeline-row timeline-row-flash';
    row.dataset.type = category || 'lab';
    row.style.background = '#FFF9F5';
    row.style.borderRadius = '12px';
    row.style.padding = '14px 16px';
    row.style.marginBottom = '14px';
    row.style.border = '1px solid #FFEDD5';
    row.style.boxShadow = '0 2px 8px rgba(240, 90, 40, 0.08)';

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    let badgeStyle = 'background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A;';
    if (badgeType === 'success') {
      badgeStyle = 'background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0;';
    } else if (badgeType === 'info') {
      badgeStyle = 'background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE;';
    } else if (badgeType === 'error') {
      badgeStyle = 'background: #FEE2E2; color: #DC2626; border: 1px solid #FECACA;';
    }

    let obsSnippet = '';
    if (Array.isArray(observations) && observations.length > 0) {
      const items = observations.slice(0, 3).map(obs => {
        const val = obs.value_text || (obs.value_numeric !== null && obs.value_numeric !== undefined ? obs.value_numeric : '');
        const unit = obs.unit ? ` ${obs.unit}` : '';
        const ref = obs.reference_range ? ` (Ref: ${obs.reference_range})` : '';
        return `<span style="display:inline-block; margin-right:6px; margin-top:4px; font-size:11.5px; padding:3px 8px; background:#FFFFFF; border:1px solid #E2E8F0; border-radius:6px; color:#1E293B;"><strong>${obs.name}:</strong> ${val}${unit}${ref} <em style="color:#D97706; font-size:10.5px;">(Pending Review)</em></span>`;
      }).join('');
      const more = observations.length > 3 ? `<span style="font-size:11px; color:#64748B; margin-left:4px;">+${observations.length - 3} more</span>` : '';
      obsSnippet = `<div style="margin-top:8px; display:flex; flex-wrap:wrap; align-items:center;">${items}${more}</div>`;
    }

    row.innerHTML = `
      <div class="timeline-date-col">
        <span class="timeline-date" style="color: #EA580C; font-weight: 700;">Just Now</span>
        <span style="font-size: 11px; color: #64748B;">${dateStr}</span>
      </div>
      <div class="timeline-line-track">
        <span class="timeline-dot" style="border-color: #EA580C; background: #EA580C;"></span>
        <div class="timeline-vertical-line"></div>
      </div>
      <div class="timeline-item-body">
        <div class="timeline-icon-box orange-icon-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <div class="timeline-title-wrap">
          <h4 class="timeline-title">${title}</h4>
          <span class="badge" style="${badgeStyle}">${badgeText || 'Pending Review'}</span>
        </div>
        <p class="timeline-meta">${meta || 'Uploaded • Hygia Vault'}</p>
        <p class="timeline-note">${note || 'Document securely indexed and added to health history.'}</p>
        ${obsSnippet}
      </div>
    `;

    const firstChild = timelineList.firstChild;
    if (firstChild) {
      timelineList.insertBefore(row, firstChild);
    } else {
      timelineList.appendChild(row);
    }
  }

  // ===========================================================================
  // TILE 1: UPLOAD RECORDS MODAL LOGIC & MULTI-STAGE ANALYSIS PIPELINE
  // ===========================================================================
  const uploadModal = document.getElementById('uploadModal');
  const closeUploadModal = document.getElementById('closeUploadModal');
  const cancelUploadBtn = document.getElementById('cancelUploadBtn');
  const confirmUploadBtn = document.getElementById('confirmUploadBtn');
  const btnUploadRecords = document.getElementById('btnUploadRecords');
  const sidebarUploadBtn = document.getElementById('sidebarUploadBtn');
  const dropZone = document.getElementById('dropZone');
  const fileUploadInput = document.getElementById('fileUploadInput');
  const filesPreview = document.getElementById('filesPreview');
  const uploadDocType = document.getElementById('uploadDocType');

  const ALLOWED_UPLOAD_EXTS = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ALLOWED_UPLOAD_MIMES = ['application/pdf', 'image/jpeg', 'image/png'];
  const MAX_UPLOAD_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

  let selectedUploadFiles = [];
  let isUploadInProgress = false;

  function validateUploadCandidate(file) {
    if (!file) return { valid: false, message: 'Invalid file reference.' };
    const name = file.name || 'unnamed';
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : '';

    if (!ALLOWED_UPLOAD_EXTS.includes(ext)) {
      return {
        valid: false,
        message: `"${name}" is unsupported. Only PDF, JPG, JPEG, and PNG files are allowed.`
      };
    }

    if (file.type && !ALLOWED_UPLOAD_MIMES.includes(file.type)) {
      return {
        valid: false,
        message: `"${name}" has incompatible type (${file.type}). Supported types: PDF, JPG, PNG.`
      };
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        message: `"${name}" exceeds the 15 MB limit (${sizeMb} MB). Please choose a file under 15 MB.`
      };
    }

    if (file.size === 0) {
      return {
        valid: false,
        message: `"${name}" is empty (0 bytes).`
      };
    }

    return { valid: true };
  }

  function addFilesToUploadQueue(fileList) {
    if (!fileList || !fileList.length) return;
    const incoming = Array.from(fileList);
    let addedCount = 0;

    incoming.forEach(file => {
      const validation = validateUploadCandidate(file);
      if (!validation.valid) {
        showDashboardToast(validation.message, 'warning');
        return;
      }

      const duplicate = selectedUploadFiles.some(
        f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
      );
      if (duplicate) {
        showDashboardToast(`"${file.name}" is already in the queue.`, 'info');
        return;
      }

      selectedUploadFiles.push(file);
      addedCount++;
    });

    if (addedCount > 0) {
      renderUploadPreviews();
    }
  }

  function renderUploadPreviews() {
    if (!filesPreview) return;
    filesPreview.innerHTML = '';

    if (selectedUploadFiles.length === 0) return;

    selectedUploadFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'file-preview-item';
      item.style.display = 'flex';
      item.style.alignItems = 'center';
      item.style.justifyContent = 'space-between';
      item.style.padding = '8px 12px';
      item.style.background = '#F8FAFC';
      item.style.borderRadius = '8px';
      item.style.marginTop = '6px';
      item.style.fontSize = '12.5px';
      item.style.border = '1px solid #E2E8F0';

      const isPdf = file.name.toLowerCase().endsWith('.pdf');
      const fileIcon = isPdf ? '📄' : '🖼️';
      const sizeStr = file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

      item.innerHTML = `
        <div style="display:flex; align-items:center; gap:8px; overflow:hidden; text-overflow:ellipsis;">
          <span style="font-size:16px;">${fileIcon}</span>
          <span style="font-weight:600; color:#1E293B; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${file.name}">${file.name}</span>
          <span style="color:#64748B; font-size:11px;">(${sizeStr})</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="preview-file-status" style="color:#15803D; font-weight:600; font-size:11.5px;">Ready</span>
          <button type="button" class="btn-remove-file" data-index="${index}" style="background:none; border:none; color:#EF4444; font-size:18px; cursor:pointer; padding:0 4px; line-height:1;" title="Remove file">&times;</button>
        </div>
      `;

      filesPreview.appendChild(item);
    });

    filesPreview.querySelectorAll('.btn-remove-file').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        selectedUploadFiles.splice(idx, 1);
        if (fileUploadInput) fileUploadInput.value = '';
        renderUploadPreviews();
      });
    });
  }

  [btnUploadRecords, sidebarUploadBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        selectedUploadFiles = [];
        if (fileUploadInput) fileUploadInput.value = '';
        renderUploadPreviews();
        openModal(uploadModal);
      });
    }
  });

  if (closeUploadModal) closeUploadModal.addEventListener('click', () => closeModal(uploadModal));
  if (cancelUploadBtn) cancelUploadBtn.addEventListener('click', () => closeModal(uploadModal));
  if (uploadModal) {
    uploadModal.addEventListener('click', (e) => {
      if (e.target === uploadModal) closeModal(uploadModal);
    });
  }

  if (dropZone && fileUploadInput) {
    dropZone.addEventListener('click', () => fileUploadInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        addFilesToUploadQueue(e.dataTransfer.files);
      }
    });

    fileUploadInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length) {
        addFilesToUploadQueue(e.target.files);
      }
    });
  }

  if (confirmUploadBtn) {
    confirmUploadBtn.addEventListener('click', async () => {
      if (isUploadInProgress) return;

      if (!selectedUploadFiles || selectedUploadFiles.length === 0) {
        showDashboardToast('Please select a PDF report or medical image first.', 'info');
        return;
      }

      isUploadInProgress = true;
      const originalText = confirmUploadBtn.textContent;
      confirmUploadBtn.disabled = true;

      try {
        confirmUploadBtn.textContent = 'Verifying active patient...';
        const patientId = await ensureActivePatientId();

        if (!patientId) {
          showDashboardToast('Active patient account could not be verified. Please check backend connection.', 'error');
          return;
        }

        const categoryLabel = uploadDocType ? uploadDocType.options[uploadDocType.selectedIndex].text : 'Medical Record';
        const categoryValue = uploadDocType ? uploadDocType.value : 'lab';
        const totalFiles = selectedUploadFiles.length;
        let successfulUploads = 0;
        let totalObservationsExtracted = 0;
        const uploadErrors = [];

        for (let i = 0; i < totalFiles; i++) {
          const file = selectedUploadFiles[i];
          const progressPrefix = totalFiles > 1 ? `[${i + 1}/${totalFiles}] ` : '';

          // 1. Upload file using FormData (let browser set multipart boundary)
          confirmUploadBtn.textContent = `${progressPrefix}Uploading ${file.name}...`;

          const formData = new FormData();
          formData.append('patient_id', patientId);
          formData.append('file', file);

          let uploadRes;
          let docData;
          try {
            uploadRes = await fetch(`${API_BASE_URL}/documents/upload`, {
              method: 'POST',
              body: formData
            });

            if (!uploadRes.ok) {
              const errJson = await uploadRes.json().catch(() => ({}));
              let msg = errJson.detail || `Upload failed (HTTP ${uploadRes.status})`;
              if (uploadRes.status === 404) msg = `Patient ID not found (${msg})`;
              else if (uploadRes.status === 413) msg = `File exceeds 15 MB limit (${msg})`;
              else if (uploadRes.status === 415) msg = `Unsupported media type (${msg})`;
              throw new Error(msg);
            }

            docData = await uploadRes.json();
            successfulUploads++;
          } catch (uploadErr) {
            console.error(`Upload error for ${file.name}:`, uploadErr);
            uploadErrors.push(`${file.name}: ${uploadErr.message}`);
            showDashboardToast(`Failed to upload "${file.name}": ${uploadErr.message}`, 'error');
            continue;
          }

          const documentId = docData.id;

          // 2. Extract Text via backend endpoint
          confirmUploadBtn.textContent = `${progressPrefix}Extracting text...`;
          let textExtractionSucceeded = false;
          let extractResult = null;

          try {
            const extRes = await fetch(`${API_BASE_URL}/documents/${documentId}/extract`);
            if (extRes.ok) {
              extractResult = await extRes.json();
              textExtractionSucceeded = true;
            } else {
              const extErr = await extRes.json().catch(() => ({}));
              console.warn(`Text extraction warning for ${file.name}:`, extErr);
            }
          } catch (extErr) {
            console.warn(`Text extraction network error for ${file.name}:`, extErr);
          }

          // 3. Extract Observations for pending clinical review
          let observationResult = null;
          let observationsSaved = 0;

          if (textExtractionSucceeded) {
            confirmUploadBtn.textContent = `${progressPrefix}Preparing observations for review...`;
            try {
              const obsRes = await fetch(`${API_BASE_URL}/documents/${documentId}/observations/extract`, {
                method: 'POST'
              });
              if (obsRes.ok) {
                observationResult = await obsRes.json();
                observationsSaved = observationResult.observations_saved || 0;
                totalObservationsExtracted += observationsSaved;
              } else {
                const obsErr = await obsRes.json().catch(() => ({}));
                console.warn(`Observation extraction warning for ${file.name}:`, obsErr);
              }
            } catch (obsErr) {
              console.warn(`Observation extraction network error for ${file.name}:`, obsErr);
            }
          }

          // 4. Update UI & Timeline using genuine backend response
          const sizeKb = (file.size / 1024).toFixed(0);
          const shortDocId = documentId ? documentId.slice(0, 8) : '';
          let badgeText = 'Uploaded';
          let badgeType = 'info';
          let noteText = 'Document archived in Hygia Vault.';

          if (observationsSaved > 0) {
            badgeText = `Pending Review (${observationsSaved})`;
            badgeType = 'warning';
            noteText = `${observationsSaved} candidate observation(s) extracted. Pending clinical verification.`;
          } else if (textExtractionSucceeded) {
            badgeText = 'Text Extracted (Pending Review)';
            badgeType = 'info';
            noteText = `Text extracted (${extractResult?.character_count || 0} characters). No structured lab parameters found.`;
          } else {
            badgeText = 'Uploaded (OCR Pending)';
            badgeType = 'warning';
            noteText = 'Document saved to vault; automated text extraction was incomplete.';
          }

          prependTimelineItem({
            title: file.name.replace(/\.[^/.]+$/, ''),
            category: categoryValue,
            meta: `${categoryLabel} • ${sizeKb} KB • Doc #${shortDocId}`,
            note: noteText,
            badgeText: badgeText,
            badgeType: badgeType,
            observations: observationResult?.observations || []
          });
        }

        // 5. Final user notifications and modal cleanup
        if (successfulUploads > 0) {
          if (totalObservationsExtracted > 0) {
            showDashboardToast(`Uploaded ${successfulUploads} document(s). Extracted ${totalObservationsExtracted} candidate observation(s) for review.`, 'success');
          } else if (uploadErrors.length === 0) {
            showDashboardToast(`Successfully uploaded ${successfulUploads} document(s) to Hygia Vault.`, 'success');
          } else {
            showDashboardToast(`Uploaded ${successfulUploads} document(s) with ${uploadErrors.length} failure(s).`, 'warning');
          }

          selectedUploadFiles = [];
          if (fileUploadInput) fileUploadInput.value = '';
          renderUploadPreviews();
          closeModal(uploadModal);
        } else if (uploadErrors.length > 0) {
          showDashboardToast(`Uploads failed: ${uploadErrors.join('; ')}`, 'error');
        }

      } catch (err) {
        console.error('HYGIA Upload error:', err);
        showDashboardToast(`Upload error: ${err.message}`, 'error');
      } finally {
        confirmUploadBtn.disabled = false;
        confirmUploadBtn.textContent = originalText;
        isUploadInProgress = false;
      }
    });
  }

  // ===========================================================================
  // TILE 2: SCAN WITH CAMERA MODAL LOGIC
  // ===========================================================================
  const btnScanCamera = document.getElementById('btnScanCamera');
  const cameraScanModal = document.getElementById('cameraScanModal');
  const closeCameraScanModal = document.getElementById('closeCameraScanModal');
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const cameraFrameGuide = document.getElementById('cameraFrameGuide');
  const cameraStatusOverlay = document.getElementById('cameraStatusOverlay');
  const cameraLiveControls = document.getElementById('cameraLiveControls');
  const cameraSnapshotActions = document.getElementById('cameraSnapshotActions');
  const btnCaptureSnapshot = document.getElementById('btnCaptureSnapshot');
  const btnRetakeSnapshot = document.getElementById('btnRetakeSnapshot');
  const btnConfirmCameraScan = document.getElementById('btnConfirmCameraScan');
  const btnFlipCamera = document.getElementById('btnFlipCamera');
  const btnUploadFileFallback = document.getElementById('btnUploadFileFallback');
  const cameraFileInput = document.getElementById('cameraFileInput');
  const cameraDocType = document.getElementById('cameraDocType');

  let activeCameraStream = null;
  let currentCameraFacing = 'environment'; // default rear camera
  let capturedBlob = null;

  async function startCameraStream() {
    if (!cameraVideo) return;

    // Reset UI to live stream mode
    if (cameraVideo) cameraVideo.style.display = 'block';
    if (cameraCanvas) cameraCanvas.style.display = 'none';
    if (cameraFrameGuide) cameraFrameGuide.style.display = 'block';
    if (cameraLiveControls) cameraLiveControls.style.display = 'flex';
    if (cameraSnapshotActions) cameraSnapshotActions.style.display = 'none';
    if (cameraStatusOverlay) {
      cameraStatusOverlay.innerHTML = '<span>● Initializing Camera...</span>';
    }

    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera streaming not supported on this browser.');
      }

      const constraints = {
        video: {
          facingMode: { ideal: currentCameraFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      activeCameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      cameraVideo.srcObject = activeCameraStream;
      await cameraVideo.play();

      if (cameraStatusOverlay) {
        cameraStatusOverlay.innerHTML = '<span>● Live Document Detection Ready</span>';
      }
    } catch (err) {
      console.warn('Camera stream error / fallback:', err);
      if (cameraStatusOverlay) {
        cameraStatusOverlay.innerHTML = '<span style="color:#FED7AA;">● Camera preview unavailable. Use "Choose Photo" below.</span>';
      }
      showDashboardToast('Webcam not accessible. You can pick an image file directly.', 'info');
    }
  }

  function stopCameraStream() {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach(track => track.stop());
      activeCameraStream = null;
    }
    if (cameraVideo) {
      cameraVideo.srcObject = null;
    }
  }

  function handleSnapshotCapture() {
    if (!cameraVideo || !cameraCanvas) return;

    const width = cameraVideo.videoWidth || 640;
    const height = cameraVideo.videoHeight || 480;

    cameraCanvas.width = width;
    cameraCanvas.height = height;
    const ctx = cameraCanvas.getContext('2d');
    ctx.drawImage(cameraVideo, 0, 0, width, height);

    // Switch view to captured frame
    cameraVideo.style.display = 'none';
    cameraCanvas.style.display = 'block';
    if (cameraFrameGuide) cameraFrameGuide.style.display = 'none';
    if (cameraLiveControls) cameraLiveControls.style.display = 'none';
    if (cameraSnapshotActions) cameraSnapshotActions.style.display = 'flex';

    if (cameraStatusOverlay) {
      cameraStatusOverlay.innerHTML = '<span style="color: #4ADE80;">✓ Record Snapshot Frozen</span>';
    }

    cameraCanvas.toBlob((blob) => {
      capturedBlob = blob;
    }, 'image/jpeg', 0.95);
  }

  if (btnScanCamera && cameraScanModal) {
    btnScanCamera.addEventListener('click', () => {
      openModal(cameraScanModal);
      startCameraStream();
    });
  }

  if (closeCameraScanModal && cameraScanModal) {
    closeCameraScanModal.addEventListener('click', () => {
      stopCameraStream();
      closeModal(cameraScanModal);
    });
  }

  if (cameraScanModal) {
    cameraScanModal.addEventListener('click', (e) => {
      if (e.target === cameraScanModal) {
        stopCameraStream();
        closeModal(cameraScanModal);
      }
    });
  }

  if (btnCaptureSnapshot) {
    btnCaptureSnapshot.addEventListener('click', handleSnapshotCapture);
  }

  if (btnRetakeSnapshot) {
    btnRetakeSnapshot.addEventListener('click', () => {
      capturedBlob = null;
      startCameraStream();
    });
  }

  if (btnFlipCamera) {
    btnFlipCamera.addEventListener('click', () => {
      currentCameraFacing = currentCameraFacing === 'environment' ? 'user' : 'environment';
      startCameraStream();
    });
  }

  if (btnUploadFileFallback && cameraFileInput) {
    btnUploadFileFallback.addEventListener('click', () => cameraFileInput.click());

    cameraFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          if (cameraCanvas) {
            cameraCanvas.width = img.width;
            cameraCanvas.height = img.height;
            const ctx = cameraCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            if (cameraVideo) cameraVideo.style.display = 'none';
            cameraCanvas.style.display = 'block';
            if (cameraFrameGuide) cameraFrameGuide.style.display = 'none';
            if (cameraLiveControls) cameraLiveControls.style.display = 'none';
            if (cameraSnapshotActions) cameraSnapshotActions.style.display = 'flex';

            if (cameraStatusOverlay) {
              cameraStatusOverlay.innerHTML = '<span style="color: #4ADE80;">✓ Photo Loaded from Device</span>';
            }

            cameraCanvas.toBlob((blob) => {
              capturedBlob = blob;
            }, 'image/jpeg', 0.95);
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnConfirmCameraScan) {
    btnConfirmCameraScan.addEventListener('click', async () => {
      if (!capturedBlob && cameraCanvas) {
        await new Promise(resolve => {
          cameraCanvas.toBlob((b) => {
            capturedBlob = b;
            resolve();
          }, 'image/jpeg', 0.95);
        });
      }

      if (!capturedBlob) {
        showDashboardToast('Please capture or select a photo first.', 'info');
        return;
      }

      const origText = btnConfirmCameraScan.textContent;
      btnConfirmCameraScan.disabled = true;
      btnConfirmCameraScan.textContent = 'Saving & Extracting Text...';

      try {
        btnConfirmCameraScan.textContent = 'Verifying patient profile...';
        const patientId = await ensureActivePatientId();

        if (!patientId) {
          showDashboardToast('Unable to verify active patient. Please check backend connection.', 'error');
          return;
        }

        const typeSelect = document.getElementById('cameraDocType');
        const docTypeLabel = typeSelect ? typeSelect.options[typeSelect.selectedIndex].text : 'Prescription';
        const docTypeValue = typeSelect ? typeSelect.value : 'prescription';

        const filename = `Scan_${docTypeValue}_${Date.now()}.jpg`;
        const scannedFile = new File([capturedBlob], filename, { type: 'image/jpeg' });

        btnConfirmCameraScan.textContent = 'Uploading scan to vault...';
        const formData = new FormData();
        formData.append('patient_id', patientId);
        formData.append('file', scannedFile);

        const res = await fetch(`${API_BASE_URL}/documents/upload`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.detail || `Upload failed (${res.status})`);
        }

        const docData = await res.json();
        const documentId = docData.id;

        // OCR Text Extraction
        btnConfirmCameraScan.textContent = 'Running OCR extraction...';
        let textExtracted = false;
        let extractData = null;
        try {
          const extRes = await fetch(`${API_BASE_URL}/documents/${documentId}/extract`);
          if (extRes.ok) {
            extractData = await extRes.json();
            textExtracted = true;
          }
        } catch (e) {
          console.warn('Camera scan OCR note:', e);
        }

        // Observation Extraction
        let obsData = null;
        let observationsCount = 0;
        if (textExtracted) {
          btnConfirmCameraScan.textContent = 'Preparing observations for review...';
          try {
            const obsRes = await fetch(`${API_BASE_URL}/documents/${documentId}/observations/extract`, {
              method: 'POST'
            });
            if (obsRes.ok) {
              obsData = await obsRes.json();
              observationsCount = obsData.observations_saved || 0;
            }
          } catch (e) {
            console.warn('Camera scan observation note:', e);
          }
        }

        let badgeText = 'Uploaded';
        let badgeType = 'info';
        let noteText = 'Camera scan archived in vault.';

        if (observationsCount > 0) {
          badgeText = `Pending Review (${observationsCount})`;
          badgeType = 'warning';
          noteText = `${observationsCount} candidate observation(s) extracted from scan. Pending clinical verification.`;
        } else if (textExtracted) {
          badgeText = 'OCR Extracted (Pending Review)';
          badgeType = 'info';
          noteText = `OCR text extraction completed (${extractData?.character_count || 0} characters).`;
        }

        prependTimelineItem({
          title: `Camera Scan • ${docTypeLabel}`,
          category: docTypeValue,
          meta: `Captured via Camera • ${docTypeLabel} • Doc #${documentId ? documentId.slice(0, 8) : ''}`,
          note: noteText,
          badgeText: badgeText,
          badgeType: badgeType,
          observations: obsData?.observations || []
        });

        showDashboardToast(`Camera scan saved to Hygia Vault successfully!`, 'success');

        stopCameraStream();
        closeModal(cameraScanModal);
        capturedBlob = null;

      } catch (err) {
        console.error('Camera scan upload error:', err);
        showDashboardToast(`Scan upload error: ${err.message}`, 'error');
      } finally {
        btnConfirmCameraScan.disabled = false;
        btnConfirmCameraScan.textContent = origText;
      }
    });
  }

  // ===========================================================================
  // TILE 3: ASK HYGIA AI HEALTH COPILOT MODAL LOGIC
  // ===========================================================================
  const btnAskAI = document.getElementById('btnAskAI');
  const btnGetInsights = document.getElementById('btnGetInsights');
  const openChatBtn = document.getElementById('openChatBtn');
  const navAiAssistant = document.getElementById('navAiAssistant');
  const aiChatModal = document.getElementById('aiChatModal');
  const closeAiChatModal = document.getElementById('closeAiChatModal');
  const aiChatThread = document.getElementById('aiChatThread');
  const modalAiInput = document.getElementById('modalAiInput');
  const modalAiSendBtn = document.getElementById('modalAiSendBtn');
  const modalAiChatForm = document.getElementById('modalAiChatForm');
  const modalAttachBtn = document.getElementById('modalAttachBtn');

  const aiAnswers = {
    priya: "<strong>Priya S (Wife, 28 yrs):</strong> Recent records include Doctor's Notes (20 Jun 2024) from Salem Hospital for seasonal asthma consultation. Prescribed <em>Levocetirizine 5mg</em> and <em>Budecort inhaler</em> as needed. Next review in 3 months.",
    advik: "<strong>Advik (Son, 8 yrs):</strong> Vaccination completed on 18 Jun 2024 (DTaP Booster &amp; Typhoid vaccine) at City Clinic. Upcoming: Annual routine pediatric checkup on 28 Jun 2024 at 11:30 AM.",
    lakshmi: "<strong>Lakshmi (Mother, 54 yrs):</strong> Blood test completed on 12 Jun 2024 at Apollo Diagnostics (HbA1c: 6.2%, Fasting Blood Sugar: 118 mg/dL). Next follow-up blood test scheduled on 02 Jul 2024 at 09:00 AM.",
    appointments: "<strong>Upcoming Family Appointments:</strong><br>1) <em>Kavin S:</em> Allergy Follow-up on 26 Jun 10:00 AM<br>2) <em>Advik:</em> Pediatric Checkup on 28 Jun 11:30 AM<br>3) <em>Lakshmi:</em> Blood Sugar Review on 02 Jul 09:00 AM.",
    recurring: "<strong>Family Health Insights:</strong> 1 recurring pattern identified — Seasonal allergic rhinitis / dust sensitivity shared across Kavin S and Priya S during monsoon weather transitions. Preventative HEPA air purification and scheduled antihistamines recommended.",
    sinus: "<strong>Viral Sinus Infection (2018):</strong> Fully resolved. Completed 7-day saline rinse and course of decongestants. Mucosal membranes restored with no secondary chronic sinusitis detected.",
    immuno: "<strong>Immunotherapy Desensitization:</strong> Subcutaneous allergen extracts given in escalating micro-doses to retrain your immune system against dust mite and grass pollen allergens. Your 9 completed injection cycles have reduced peak sensitivity symptoms by ~70%.",
    summary: "<strong>Comprehensive Health Summary for Kavin S:</strong><br>• 9 total verified clinical encounters logged in timeline<br>• 8 completed immunotherapy sessions at Salem Hospital<br>• Seasonal allergy under controlled desensitization<br>• Vitals &amp; lab markers within normal reference range.",
    default: "I have indexed all verified medical records in your timeline. Lab values, doctor notes, and prescription instructions are organized and ready. Ask me any question regarding your medications, follow-ups, or symptoms."
  };

  function triggerAiChat(initialUserQuery) {
    if (aiChatModal) {
      openModal(aiChatModal);

      if (aiChatThread && aiChatThread.children.length === 0) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble bot';
        bubble.innerHTML = `Hello Kavin! I am your <strong>Hygia Health Copilot</strong>. I have indexed records for your whole family (Kavin, Priya, Advik, Lakshmi). How can I assist your health decisions today?`;
        aiChatThread.appendChild(bubble);
      }

      if (initialUserQuery && typeof initialUserQuery === 'string' && initialUserQuery.trim()) {
        sendChatMessage(initialUserQuery.trim());
      }
    }
  }

  [btnAskAI, btnGetInsights, openChatBtn, navAiAssistant].forEach(btn => {
    if (btn) btn.addEventListener('click', () => triggerAiChat());
  });

  if (closeAiChatModal) closeAiChatModal.addEventListener('click', () => closeModal(aiChatModal));
  if (aiChatModal) {
    aiChatModal.addEventListener('click', (e) => {
      if (e.target === aiChatModal) closeModal(aiChatModal);
    });
  }

  function sendChatMessage(customText) {
    if (!aiChatThread) return;
    const text = customText || (modalAiInput ? modalAiInput.value.trim() : '');
    if (!text) return;

    // Append user bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.innerText = text;
    aiChatThread.appendChild(userBubble);

    if (modalAiInput) modalAiInput.value = '';
    aiChatThread.scrollTop = aiChatThread.scrollHeight;

    // Typing placeholder
    const typingBubble = document.createElement('div');
    typingBubble.className = 'chat-bubble bot';
    typingBubble.innerHTML = `<span style="opacity: 0.7; font-style: italic;">Hygia AI is reviewing your clinical records...</span>`;
    aiChatThread.appendChild(typingBubble);
    aiChatThread.scrollTop = aiChatThread.scrollHeight;

    const lower = text.toLowerCase();
    let reply = aiAnswers.default;
    if (lower.includes('priya') || lower.includes('wife')) reply = aiAnswers.priya;
    else if (lower.includes('advik') || lower.includes('son') || lower.includes('vaccin')) reply = aiAnswers.advik;
    else if (lower.includes('lakshmi') || lower.includes('mother') || lower.includes('blood') || lower.includes('sugar')) reply = aiAnswers.lakshmi;
    else if (lower.includes('appoint') || lower.includes('schedule')) reply = aiAnswers.appointments;
    else if (lower.includes('recur') || lower.includes('pattern')) reply = aiAnswers.recurring;
    else if (lower.includes('sinus') || lower.includes('infection')) reply = aiAnswers.sinus;
    else if (lower.includes('immuno') || lower.includes('allergy') || lower.includes('desensitiz')) reply = aiAnswers.immuno;
    else if (lower.includes('summar') || lower.includes('history') || lower.includes('overview')) reply = aiAnswers.summary;

    setTimeout(() => {
      typingBubble.innerHTML = reply;
      aiChatThread.scrollTop = aiChatThread.scrollHeight;
    }, 450);
  }

  // Suggestion chips in modal
  document.querySelectorAll('#aiChatModal .prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.query || chip.innerText.trim();
      if (modalAiInput) modalAiInput.value = q;
      sendChatMessage(q);
    });
  });

  if (modalAiChatForm) {
    modalAiChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendChatMessage();
    });
  } else if (modalAiSendBtn) {
    modalAiSendBtn.addEventListener('click', () => sendChatMessage());
  }

  if (modalAiInput) {
    modalAiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  if (modalAttachBtn) {
    modalAttachBtn.addEventListener('click', () => {
      closeModal(aiChatModal);
      if (uploadModal) {
        openModal(uploadModal);
        showDashboardToast('Select a document to attach for AI review.', 'info');
      }
    });
  }

  // ===========================================================================
  // TILE 4: ADD FAMILY MEMBER MODAL LOGIC
  // ===========================================================================
  const btnAddFamily = document.getElementById('btnAddFamily');
  const openAddFamilyModalBtn = document.getElementById('openAddFamilyModalBtn');
  const addFamilyModal = document.getElementById('addFamilyModal');
  const closeAddFamilyModal = document.getElementById('closeAddFamilyModal');
  const cancelAddFamily = document.getElementById('cancelAddFamily');
  const addFamilyForm = document.getElementById('addFamilyForm');
  const submitAddFamilyBtn = document.getElementById('submitAddFamilyBtn');

  [btnAddFamily, openAddFamilyModalBtn].forEach(btn => {
    if (btn && addFamilyModal) {
      btn.addEventListener('click', () => {
        if (addFamilyForm) addFamilyForm.reset();
        openModal(addFamilyModal);
      });
    }
  });

  if (closeAddFamilyModal && addFamilyModal) {
    closeAddFamilyModal.addEventListener('click', () => closeModal(addFamilyModal));
  }
  if (cancelAddFamily && addFamilyModal) {
    cancelAddFamily.addEventListener('click', () => closeModal(addFamilyModal));
  }
  if (addFamilyModal) {
    addFamilyModal.addEventListener('click', (e) => {
      if (e.target === addFamilyModal) closeModal(addFamilyModal);
    });
  }

  if (addFamilyForm) {
    addFamilyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nameInput = document.getElementById('fmName');
      const relationInput = document.getElementById('fmRelation');
      const genderInput = document.getElementById('fmGender');
      const ageInput = document.getElementById('fmAge');
      const bloodInput = document.getElementById('fmBloodGroup');
      const accessInput = document.getElementById('fmAccess');

      const name = nameInput ? nameInput.value.trim() : '';
      const relation = relationInput ? relationInput.value : 'Spouse';
      const gender = genderInput ? genderInput.value : 'Other';
      const age = ageInput ? ageInput.value.trim() : '30';
      const blood = bloodInput ? bloodInput.value : 'O+';
      const access = accessInput ? accessInput.value : 'Full Access';

      if (!name) {
        showDashboardToast('Please enter member full name.', 'info');
        if (nameInput) nameInput.focus();
        return;
      }

      if (submitAddFamilyBtn) {
        submitAddFamilyBtn.disabled = true;
        submitAddFamilyBtn.textContent = 'Registering Member...';
      }

      try {
        let createdPatient = null;
        try {
          const res = await fetch(`${API_BASE_URL}/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: `${name} (${relation})` })
          });
          if (res.ok) {
            createdPatient = await res.json();
          }
        } catch (apiErr) {
          console.warn('Backend patient registration note:', apiErr);
        }

        // Save member in local storage
        const newMember = {
          id: createdPatient ? createdPatient.id : 'fm_' + Date.now(),
          name,
          relation,
          gender,
          age,
          bloodGroup: blood,
          access,
          addedAt: new Date().toISOString()
        };

        const existingMembers = JSON.parse(localStorage.getItem('hygia_family_members') || '[]');
        existingMembers.push(newMember);
        localStorage.setItem('hygia_family_members', JSON.stringify(existingMembers));

        // If on family page with grid, render card dynamically
        const grid = document.querySelector('.family-cards-grid');
        if (grid) {
          const card = document.createElement('div');
          card.className = 'family-member-card';
          card.innerHTML = `
            <div class="member-card-left">
              <div class="member-avatar-img" style="background: linear-gradient(135deg, #FFEDD5, #FED7AA); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #EA580C; font-size: 15px;">
                ${name.charAt(0)}
              </div>
              <div class="member-info-col">
                <h4 class="member-name">${name}</h4>
                <p class="member-relation-role">${relation}</p>
                <p class="member-meta-text">${gender} <span class="bullet">•</span> ${age} yrs <span class="bullet">•</span> ${blood}</p>
              </div>
            </div>
            <svg class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          `;

          card.addEventListener('click', () => {
            document.querySelectorAll('.family-member-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
          });

          grid.appendChild(card);
        }

        // Update any family count indicator on page
        const countHeader = document.querySelector('.family-section-header .section-title');
        if (countHeader) {
          const count = document.querySelectorAll('.family-member-card').length;
          countHeader.textContent = `Family Members (${count})`;
        }

        const profileFamilyLink = document.querySelector('.profile-dropdown a[href="#family"]');
        if (profileFamilyLink) {
          const totalCount = 3 + existingMembers.length;
          profileFamilyLink.textContent = `Family Profiles (${totalCount})`;
        }

        showDashboardToast(`${name} (${relation}) added to your family circle and synchronized!`, 'success');

        addFamilyForm.reset();
        closeModal(addFamilyModal);

      } catch (err) {
        console.error('Add family error:', err);
        showDashboardToast(`Error adding family member: ${err.message}`, 'error');
      } finally {
        if (submitAddFamilyBtn) {
          submitAddFamilyBtn.disabled = false;
          submitAddFamilyBtn.textContent = 'Add Member & Sync Profile';
        }
      }
    });
  }

  // Family AI Prompts Chips (on family.html)
  const familyAiChips = document.querySelectorAll('.family-ai-prompts-row .ai-chip-btn');
  const familyAiInput = document.getElementById('familyAiInput');
  const familyAiForm = document.getElementById('familyAiForm');
  const familyAttachBtn = document.querySelector('.family-attach-btn');

  if (familyAiChips && familyAiChips.length > 0) {
    familyAiChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.dataset.query || chip.innerText.trim();
        if (familyAiInput) familyAiInput.value = query;
        triggerAiChat(query);
      });
    });
  }

  // Family AI Input Form
  if (familyAiForm) {
    familyAiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = familyAiInput ? familyAiInput.value.trim() : '';
      if (val) {
        triggerAiChat(val);
        if (familyAiInput) familyAiInput.value = '';
      }
    });
  }

  if (familyAttachBtn) {
    familyAttachBtn.addEventListener('click', () => {
      alert('Attach medical document or lab report for family health analysis.');
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Production Login Page Logic (Role Switching, Real Auth & Backend Sync)
  // ---------------------------------------------------------------------------
  const roleSwitcher = document.getElementById('roleSwitcher');
  const roleTabs = document.querySelectorAll('.role-tab');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const loginPassword = document.getElementById('loginPassword');
  const eyeIcon = document.getElementById('eyeIcon');
  const loginForm = document.getElementById('loginForm');
  const loginEmail = document.getElementById('loginEmail');
  const loginEmailLabel = document.getElementById('loginEmailLabel');
  const signInSubmitBtn = document.getElementById('signInSubmitBtn');
  const signInBtnText = document.getElementById('signInBtnText');
  const cardTitle = document.getElementById('cardTitle');
  const cardSubtitle = document.getElementById('cardSubtitle');
  const toastContainer = document.getElementById('toastContainer');

  // Check live API server status
  const apiStatusPill = document.getElementById('apiStatusPill');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  if (apiStatusPill) {
    fetch(`${API_BASE_URL}/health`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'healthy') {
          if (statusDot) {
            statusDot.style.backgroundColor = '#10B981';
            statusDot.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.25)';
          }
          if (statusText) statusText.textContent = `API Connected (v${data.version || '0.1.0'})`;
        }
      })
      .catch(() => {
        if (statusDot) {
          statusDot.style.backgroundColor = '#F59E0B';
          statusDot.style.boxShadow = '0 0 0 2px rgba(245, 158, 11, 0.25)';
        }
        if (statusText) {
          statusText.textContent = 'Server Offline';
          statusText.style.color = '#B45309';
        }
      });
  }

  // Toast helper
  function showToast(message, type = 'success') {
    if (!toastContainer) {
      alert(message);
      return;
    }
    const toast = document.createElement('div');
    toast.className = `login-toast toast-${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span><strong>${icon}</strong> ${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = 'toastIn 0.3s reverse forwards ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  let activeRole = 'patient';

  function setRole(role) {
    activeRole = role;
    roleTabs.forEach(t => {
      const isCurrent = t.dataset.role === role;
      t.classList.toggle('active', isCurrent);
      t.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    if (role === 'family') {
      if (cardTitle) cardTitle.textContent = 'Family Portal';
      if (cardSubtitle) cardSubtitle.textContent = 'Sign in to monitor and assist family members';
      if (loginEmailLabel) loginEmailLabel.textContent = 'Caregiver Email or Phone';
      if (loginEmail) loginEmail.placeholder = 'Enter family caregiver email or mobile';
      if (signInBtnText) signInBtnText.textContent = 'Sign In as Family Member';
    } else {
      if (cardTitle) cardTitle.textContent = 'Welcome Back';
      if (cardSubtitle) cardSubtitle.textContent = 'Sign in to access your personal health records';
      if (loginEmailLabel) loginEmailLabel.textContent = 'Email or Phone Number';
      if (loginEmail) loginEmail.placeholder = 'Enter your email or phone number';
      if (signInBtnText) signInBtnText.textContent = 'Sign In as Patient';
    }
  }

  if (roleTabs.length > 0) {
    roleTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const role = tab.dataset.role || 'patient';
        setRole(role);
      });
    });
  }

  // Password visibility toggle
  if (togglePasswordBtn && loginPassword) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = loginPassword.type === 'password';
      loginPassword.type = isPassword ? 'text' : 'password';
      if (eyeIcon) {
        if (isPassword) {
          eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          `;
        } else {
          eyeIcon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          `;
        }
      }
    });
  }

  // Handle Login submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const emailVal = loginEmail ? loginEmail.value.trim() : '';
      const passVal = loginPassword ? loginPassword.value.trim() : '';

      if (!emailVal) {
        showToast('Please enter your email or phone number.', 'error');
        if (loginEmail) loginEmail.focus();
        return;
      }
      if (!passVal) {
        showToast('Please enter your password.', 'error');
        if (loginPassword) loginPassword.focus();
        return;
      }
      if (passVal.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        if (loginPassword) loginPassword.focus();
        return;
      }

      if (signInSubmitBtn) {
        signInSubmitBtn.classList.add('loading');
        signInSubmitBtn.disabled = true;
      }

      try {
        const registeredUsers = JSON.parse(localStorage.getItem('hygia_registered_users') || '[]');
        const existingAccount = registeredUsers.find(
          u => u.email && u.email.toLowerCase() === emailVal.toLowerCase()
        );

        if (existingAccount && existingAccount.password && existingAccount.password !== passVal) {
          showToast('Incorrect password. Please try again.', 'error');
          if (loginPassword) {
            loginPassword.focus();
            loginPassword.select();
          }
          if (signInSubmitBtn) {
            signInSubmitBtn.classList.remove('loading');
            signInSubmitBtn.disabled = false;
          }
          return;
        }

        // Determine user display name from account or email
        let displayName = '';
        if (existingAccount && existingAccount.name) {
          displayName = existingAccount.name;
        } else if (emailVal.includes('@')) {
          const userPart = emailVal.split('@')[0];
          displayName = userPart
            .replace(/[._\-+]/g, ' ')
            .split(' ')
            .filter(Boolean)
            .map(s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
            .join(' ');
        } else {
          displayName = emailVal;
        }

        let patientId = existingAccount ? existingAccount.patient_id : null;

        // Verify or create patient in backend API
        try {
          if (!patientId) {
            const listRes = await fetch(`${API_BASE_URL}/patients`);
            if (listRes.ok) {
              const patients = await listRes.json();
              const existing = patients.find(
                p => p.display_name && p.display_name.toLowerCase() === displayName.toLowerCase()
              );
              if (existing) {
                patientId = existing.id;
              }
            }
          }

          if (!patientId) {
            const createRes = await fetch(`${API_BASE_URL}/patients`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ display_name: displayName })
            });
            if (createRes.ok) {
              const newPatient = await createRes.json();
              patientId = newPatient.id;
            }
          }
        } catch (apiErr) {
          console.warn('Backend API note:', apiErr);
        }

        // Save / update in registered registry
        if (!existingAccount) {
          registeredUsers.push({
            name: displayName,
            email: emailVal,
            password: passVal,
            role: activeRole,
            patient_id: patientId,
            registeredAt: new Date().toISOString()
          });
          localStorage.setItem('hygia_registered_users', JSON.stringify(registeredUsers));
        }

        const userSession = {
          name: displayName,
          email: emailVal,
          role: activeRole,
          patient_id: patientId,
          avatar: activeRole === 'family' ? 'assets/priya_avatar.jpg' : 'assets/user_avatar.jpg',
          loggedInAt: new Date().toISOString()
        };

        localStorage.setItem('hygia_user', JSON.stringify(userSession));
        if (patientId) {
          localStorage.setItem('hygia_patient_id', patientId);
          window.HYGIA_PATIENT_ID = patientId;
        }

        showToast(`Welcome back, ${displayName}! Redirecting...`, 'success');

        setTimeout(() => {
          if (activeRole === 'family') {
            window.location.href = 'family.html';
          } else {
            window.location.href = 'index.html';
          }
        }, 600);

      } catch (err) {
        console.error('Login error:', err);
        showToast('Login encountered a problem. Please try again.', 'error');
        if (signInSubmitBtn) {
          signInSubmitBtn.classList.remove('loading');
          signInSubmitBtn.disabled = false;
        }
      }
    });
  }

  // Social Sign-in handlers
  ['googleLoginBtn', 'appleLoginBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => {
        const provider = id.includes('google') ? 'Google' : 'Apple';
        const enteredEmail = prompt(`Sign in with ${provider}:\nPlease enter your email address:`);
        if (!enteredEmail || !enteredEmail.trim()) return;

        if (loginEmail) loginEmail.value = enteredEmail.trim();
        if (loginPassword) loginPassword.value = 'sso-authenticated-pass';
        if (loginForm) loginForm.dispatchEvent(new Event('submit'));
      });
    }
  });

  // Modal helpers
  function openLoginModal(modal) {
    if (modal) {
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeLoginModal(modal) {
    if (modal) {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }
  }

  // 1. Create Account Modal
  const createAccountModal = document.getElementById('createAccountModal');
  const openRegisterModalBtn = document.getElementById('openRegisterModalBtn');
  const closeRegisterModal = document.getElementById('closeRegisterModal');
  const cancelRegisterBtn = document.getElementById('cancelRegisterBtn');
  const registerForm = document.getElementById('registerForm');

  if (openRegisterModalBtn && createAccountModal) {
    openRegisterModalBtn.addEventListener('click', () => openLoginModal(createAccountModal));
  }
  if (closeRegisterModal) closeRegisterModal.addEventListener('click', () => closeLoginModal(createAccountModal));
  if (cancelRegisterBtn) cancelRegisterBtn.addEventListener('click', () => closeLoginModal(createAccountModal));
  if (createAccountModal) {
    createAccountModal.addEventListener('click', (e) => {
      if (e.target === createAccountModal) closeLoginModal(createAccountModal);
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regDisplayName').value.trim();
      const role = document.getElementById('regRole').value;
      const email = document.getElementById('regEmail').value.trim();
      const pass = document.getElementById('regPassword') ? document.getElementById('regPassword').value : '';

      if (!name) {
        showToast('Please enter your full name.', 'error');
        return;
      }
      if (!email) {
        showToast('Please enter your email.', 'error');
        return;
      }
      if (pass.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
      }

      const submitBtn = document.getElementById('submitRegisterBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Profile...';
      }

      try {
        let newPatientId = null;
        try {
          const res = await fetch(`${API_BASE_URL}/patients`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ display_name: name })
          });
          if (res.ok) {
            const data = await res.json();
            newPatientId = data.id;
          }
        } catch (apiErr) {
          console.warn('Backend API note:', apiErr);
        }

        const registeredUsers = JSON.parse(localStorage.getItem('hygia_registered_users') || '[]');
        const existingIdx = registeredUsers.findIndex(u => u.email && u.email.toLowerCase() === email.toLowerCase());
        const userRecord = {
          name,
          email,
          password: pass,
          role,
          patient_id: newPatientId,
          registeredAt: new Date().toISOString()
        };

        if (existingIdx >= 0) {
          registeredUsers[existingIdx] = userRecord;
        } else {
          registeredUsers.push(userRecord);
        }
        localStorage.setItem('hygia_registered_users', JSON.stringify(registeredUsers));

        const userSession = {
          name: name,
          email: email,
          role: role,
          patient_id: newPatientId,
          avatar: role === 'family' ? 'assets/priya_avatar.jpg' : 'assets/user_avatar.jpg',
          loggedInAt: new Date().toISOString()
        };

        localStorage.setItem('hygia_user', JSON.stringify(userSession));
        if (newPatientId) {
          localStorage.setItem('hygia_patient_id', newPatientId);
          window.HYGIA_PATIENT_ID = newPatientId;
        }

        showToast(`Profile created for ${name}! Entering portal...`, 'success');
        closeLoginModal(createAccountModal);

        setTimeout(() => {
          window.location.href = role === 'family' ? 'family.html' : 'index.html';
        }, 700);

      } catch (err) {
        showToast('Registration error. Please try again.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Profile & Continue';
        }
      }
    });
  }

  // 2. Forgot Password Modal
  const forgotPasswordModal = document.getElementById('forgotPasswordModal');
  const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
  const closeForgotModal = document.getElementById('closeForgotModal');
  const cancelForgotBtn = document.getElementById('cancelForgotBtn');
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');

  if (forgotPasswordBtn && forgotPasswordModal) {
    forgotPasswordBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openLoginModal(forgotPasswordModal);
    });
  }
  if (closeForgotModal) closeForgotModal.addEventListener('click', () => closeLoginModal(forgotPasswordModal));
  if (cancelForgotBtn) cancelForgotBtn.addEventListener('click', () => closeLoginModal(forgotPasswordModal));
  if (forgotPasswordModal) {
    forgotPasswordModal.addEventListener('click', (e) => {
      if (e.target === forgotPasswordModal) closeLoginModal(forgotPasswordModal);
    });
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('resetEmail').value;
      showToast(`Recovery link sent to ${email}`, 'success');
      closeLoginModal(forgotPasswordModal);
    });
  }

  // 3. Need Help? Modal
  const needHelpModal = document.getElementById('needHelpModal');
  const needHelpBtn = document.getElementById('needHelpBtn');
  const closeNeedHelpModal = document.getElementById('closeNeedHelpModal');
  const gotItHelpBtn = document.getElementById('gotItHelpBtn');

  if (needHelpBtn && needHelpModal) {
    needHelpBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openLoginModal(needHelpModal);
    });
  }
  if (closeNeedHelpModal) closeNeedHelpModal.addEventListener('click', () => closeLoginModal(needHelpModal));
  if (gotItHelpBtn) gotItHelpBtn.addEventListener('click', () => closeLoginModal(needHelpModal));
  if (needHelpModal) {
    needHelpModal.addEventListener('click', (e) => {
      if (e.target === needHelpModal) closeLoginModal(needHelpModal);
    });
  }


  // ---------------------------------------------------------------------------
  // 7. Dedicated AI Assistant Page Controller (assistant.html)
  // ---------------------------------------------------------------------------
  const aiWorkspaceDefault = document.getElementById('aiWorkspaceDefault');
  const aiConversationThread = document.getElementById('aiConversationThread');
  const aiComposerForm = document.getElementById('aiComposerForm');
  const composerTextInput = document.getElementById('composerTextInput');
  const composerSendBtn = document.getElementById('composerSendBtn');
  const composerAttachBtn = document.getElementById('composerAttachBtn');
  const aiDropzone = document.getElementById('aiDropzone');
  const btnBrowseFiles = document.getElementById('btnBrowseFiles');
  const aiFileUploadInput = document.getElementById('aiFileUploadInput');
  const uploadedChipsRow = document.getElementById('uploadedChipsRow');
  const btnRefreshPrompts = document.getElementById('btnRefreshPrompts');
  const examplesContainer = document.getElementById('examplesContainer');
  const aiQuickCards = document.querySelectorAll('.ai-quick-card');
  const exampleQuoteCards = document.querySelectorAll('.example-quote-card');
  const recentFileItems = document.querySelectorAll('.recent-file-item');

  const assistantKnowledge = {
    summary: "📋 **Health Records Summary (Kavin S)**:\n\n• **Total Events**: 9 clinic encounters & 8 completed immunotherapy injection procedures at Salem Hospital (Sep 2017 – Jun 2018).\n• **Primary Diagnosis**: Allergic rhinitis & environmental hypersensitivity.\n• **Status**: Immunotherapy course successfully completed with optimal compliance. Viral sinusitis episode in Feb 2018 is fully resolved.",
    condition: "❤️ **Health Condition Explanation**:\n\n• **Allergic Rhinitis**: Inflammation of the nasal membranes triggered by environmental allergens (dust mites, grass pollen).\n• **Mechanism**: Your immune system produces IgE antibodies causing histamine release, leading to congestion and sneezing.\n• **Management**: Allergen immunotherapy gradually desensitizes your response over time.",
    trends: "📈 **Health Trends & Immunotherapy Progress**:\n\n• **Treatment Adherence**: 100% attendance across 8 SCIT injection sessions.\n• **Symptom Score**: Reduced by ~68% between Oct 2017 and Jun 2018.\n• **Vitals Stability**: Resting blood pressure (118/76 mmHg) and pulse (72 bpm) consistently normal at all appointments.",
    appointments: "📅 **Upcoming Appointments & Follow-ups**:\n\n1. **Kavin S**: Allergy Follow-up at Salem Hospital — 26 Jun 2024 at 10:00 AM.\n2. **Advik (Son)**: Routine Pediatric Checkup at City Clinic — 28 Jun 2024 at 11:30 AM.\n3. **Lakshmi (Mother)**: Fasting Blood Test at Apollo Diagnostics — 02 Jul 2024 at 09:00 AM.",
    prescription: "💊 **Prescription in Plain English**:\n\n• **Levocetirizine (5mg)**: Once daily at bedtime. Non-drowsy antihistamine that blocks allergic reactions.\n• **Budecort Inhaler (100mcg)**: 1 puff twice daily after meals. Corticosteroid that reduces airway inflammation without systemic side-effects.",
    visits: "🩺 **Summary of Last 3 Doctor Visits**:\n\n1. **24 Jun 2018**: Outpatient follow-up with Dr. Sarah Jenkins. Lungs clear, completed 8th injection cycle.\n2. **01 Jun 2018**: Routine clinic consultation and vitals check.\n3. **05 May 2018**: Allergen immunotherapy maintenance administration.",
    allergy: "🌿 **Allergy Treatment History**:\n\nInitiated on 12 Sep 2017 following skin prick test confirmation for house dust and grass allergens. 8 subcutaneous injection doses administered at Salem Hospital without adverse local reactions.",
    default: "Thank you for asking! Based on your verified health records and diagnostic files, your vital markers are healthy and your allergy treatment milestones are up to date. How else can I assist your health care today?"
  };

  function sendAssistantPageQuery(userQuery) {
    if (!userQuery || !userQuery.trim()) return;
    const cleanText = userQuery.trim();

    // Transition workspace from hero to conversation
    if (aiWorkspaceDefault && aiConversationThread) {
      aiWorkspaceDefault.style.display = 'none';
      aiConversationThread.style.display = 'flex';
    }

    // Append user message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-chat-msg user';
    userMsg.innerText = cleanText;
    aiConversationThread.appendChild(userMsg);
    if (composerTextInput) composerTextInput.value = '';
    if (composerSendBtn) composerSendBtn.classList.remove('active');

    aiConversationThread.scrollTop = aiConversationThread.scrollHeight;

    // Simulate AI clinical reasoning
    setTimeout(() => {
      const lower = cleanText.toLowerCase();
      let answer = assistantKnowledge.default;
      if (lower.includes('summar') && (lower.includes('record') || lower.includes('health') || lower.includes('history'))) {
        answer = assistantKnowledge.summary;
      } else if (lower.includes('last 3') || lower.includes('visits')) {
        answer = assistantKnowledge.visits;
      } else if (lower.includes('condition') || lower.includes('explain')) {
        answer = assistantKnowledge.condition;
      } else if (lower.includes('trend')) {
        answer = assistantKnowledge.trends;
      } else if (lower.includes('appoint')) {
        answer = assistantKnowledge.appointments;
      } else if (lower.includes('prescript')) {
        answer = assistantKnowledge.prescription;
      } else if (lower.includes('allergy') || lower.includes('immuno')) {
        answer = assistantKnowledge.allergy;
      } else if (lower.includes('lab') || lower.includes('file') || lower.includes('report') || lower.includes('doctor note')) {
        answer = "📄 **Analysis of Selected Medical Record**:\n• Document status: Verified by Hospital Health Information System.\n• Key finding: All normal baseline ranges observed. Compliance score is optimal.";
      }

      const botMsg = document.createElement('div');
      botMsg.className = 'ai-chat-msg bot';
      botMsg.innerHTML = answer.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      aiConversationThread.appendChild(botMsg);
      aiConversationThread.scrollTop = aiConversationThread.scrollHeight;
    }, 450);
  }

  // Quick Action Cards
  if (aiQuickCards.length > 0) {
    aiQuickCards.forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.dataset.prompt;
        sendAssistantPageQuery(prompt);
      });
    });
  }

  // Example Quotes
  if (exampleQuoteCards.length > 0) {
    exampleQuoteCards.forEach(card => {
      card.addEventListener('click', () => {
        const prompt = card.dataset.prompt || card.innerText.replace(/[“”"]/g, '').trim();
        sendAssistantPageQuery(prompt);
      });
    });
  }

  // Recent Files Clicks
  if (recentFileItems.length > 0) {
    recentFileItems.forEach(item => {
      item.addEventListener('click', () => {
        const filename = item.dataset.filename || item.querySelector('.file-item-name')?.textContent || 'Medical File';
        sendAssistantPageQuery(`Please analyze and summarize ${filename}`);
      });
    });
  }

  // Composer Form
  if (aiComposerForm) {
    aiComposerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = composerTextInput ? composerTextInput.value : '';
      sendAssistantPageQuery(text);
    });
  }

  if (composerTextInput) {
    composerTextInput.addEventListener('input', () => {
      if (composerSendBtn) {
        if (composerTextInput.value.trim().length > 0) {
          composerSendBtn.classList.add('active');
        } else {
          composerSendBtn.classList.remove('active');
        }
      }
    });
  }

  if (composerAttachBtn) {
    composerAttachBtn.addEventListener('click', () => {
      if (aiFileUploadInput) aiFileUploadInput.click();
    });
  }

  // File Upload Handlers
  function handleUploadedAiFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    if (uploadedChipsRow) {
      Array.from(fileList).forEach(f => {
        const chip = document.createElement('span');
        chip.className = 'uploaded-file-chip';
        chip.innerHTML = `📄 ${f.name} <span style="font-weight:700; color:#16A34A;">✓</span>`;
        uploadedChipsRow.appendChild(chip);
      });
    }

    setTimeout(() => {
      const fileName = fileList[0].name;
      sendAssistantPageQuery(`I have uploaded: ${fileName}. Please summarize findings and highlight any abnormalities.`);
    }, 600);
  }

  if (btnBrowseFiles && aiFileUploadInput) {
    btnBrowseFiles.addEventListener('click', (e) => {
      e.stopPropagation();
      aiFileUploadInput.click();
    });
  }

  if (aiDropzone && aiFileUploadInput) {
    aiDropzone.addEventListener('click', () => aiFileUploadInput.click());
    aiDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      aiDropzone.classList.add('dragover');
    });
    aiDropzone.addEventListener('dragleave', () => aiDropzone.classList.remove('dragover'));
    aiDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      aiDropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleUploadedAiFiles(e.dataTransfer.files);
      }
    });

    aiFileUploadInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleUploadedAiFiles(e.target.files);
      }
    });
  }

  // Refresh Examples Rotator
  const promptBatches = [
    [
      { icon: 'doc-blue', text: '“Summarize my last 3 doctor visits.”', prompt: 'Summarize my last 3 doctor visits.' },
      { icon: 'pill-green', text: '“Explain this prescription in simple words.”', prompt: 'Explain this prescription in simple words.' },
      { icon: 'chart-orange', text: '“Show my allergy treatment history.”', prompt: 'Show my allergy treatment history.' },
      { icon: 'cal-orange', text: '“What are my upcoming appointments?”', prompt: 'What are my upcoming appointments?' }
    ],
    [
      { icon: 'doc-blue', text: '“Are there any drug interactions with Levocetirizine?”', prompt: 'Are there any drug interactions with Levocetirizine?' },
      { icon: 'chart-orange', text: '“How have my allergy symptoms improved this year?”', prompt: 'How have my allergy symptoms improved this year?' },
      { icon: 'pill-green', text: '“What should I do if I miss an injection dose?”', prompt: 'What should I do if I miss an injection dose?' },
      { icon: 'cal-orange', text: '“When is my next immunotherapy review scheduled?”', prompt: 'When is my next immunotherapy review scheduled?' }
    ],
    [
      { icon: 'doc-blue', text: '“List all lab reports from June 2024.”', prompt: 'List all lab reports from June 2024.' },
      { icon: 'pill-green', text: '“Compare my latest blood test with baseline.”', prompt: 'Compare my latest blood test with baseline.' },
      { icon: 'cal-orange', text: '“Summarize my son Advik’s vaccine record.”', prompt: 'Summarize my son Advik’s vaccine record.' },
      { icon: 'chart-orange', text: '“Explain my sinus infection recovery timeline.”', prompt: 'Explain my sinus infection recovery timeline.' }
    ]
  ];
  let currentBatchIndex = 0;

  if (btnRefreshPrompts && examplesContainer) {
    btnRefreshPrompts.addEventListener('click', () => {
      currentBatchIndex = (currentBatchIndex + 1) % promptBatches.length;
      const batch = promptBatches[currentBatchIndex];
      examplesContainer.innerHTML = '';
      batch.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'example-quote-card';
        btn.dataset.prompt = item.prompt;
        btn.innerHTML = `
          <div class="example-icon-box ${item.icon}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <span class="example-quote-text">${item.text}</span>
        `;
        btn.addEventListener('click', () => sendAssistantPageQuery(item.prompt));
        examplesContainer.appendChild(btn);
      });
    });
  }


  // ---------------------------------------------------------------------------
  // 8. Universal Floating Corner AI Chatbot Widget (Always Available on All Pages)
  // ---------------------------------------------------------------------------
  function initFloatingChatbot() {
    if (document.body.classList.contains('login-body')) {
      return;
    }
    let wrapper = document.getElementById('floatingChatbotWrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.id = 'floatingChatbotWrapper';
      wrapper.className = 'floating-chatbot-wrapper';
      wrapper.innerHTML = `
        <!-- Floating Chat Window -->
        <div class="floating-chatbot-window" id="floatingChatWindow">
          <div class="floating-chat-header">
            <div class="floating-chat-brand">
              <div class="floating-chat-avatar-badge">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
                </svg>
              </div>
              <div class="floating-chat-title-group">
                <span class="floating-chat-title">Hygia AI Assistant</span>
                <span class="floating-chat-status">
                  <span class="floating-status-dot"></span> Online &amp; Ready
                </span>
              </div>
            </div>
            <button class="floating-chat-close-btn" id="floatingChatCloseBtn" aria-label="Close Chat">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <!-- Quick Suggestion Pills -->
          <div class="floating-chat-quick-prompts">
            <button class="floating-chat-pill" data-query="Summarize my health records">Summarize records</button>
            <button class="floating-chat-pill" data-query="Explain my allergy condition">Explain condition</button>
            <button class="floating-chat-pill" data-query="What are my upcoming appointments?">Appointments</button>
            <button class="floating-chat-pill" data-query="Show Advik's vaccinations">Advik's vaccines</button>
            <button class="floating-chat-pill" data-query="Explain this prescription in simple words">Prescriptions</button>
          </div>

          <!-- Scrollable Chat Stream -->
          <div class="floating-chat-messages" id="floatingChatMessages">
            <div class="floating-bubble bot">
              👋 Hi Kavin! I'm your Hygia AI Assistant. Ask me anything about your clinic visits, prescriptions, appointments, or family health records!
            </div>
          </div>

          <!-- Input Composer Bar -->
          <div class="floating-chat-footer">
            <form class="floating-chat-input-bar" id="floatingChatForm">
              <button type="button" class="floating-chat-attach-btn" id="floatingAttachBtn" title="Attach file or report">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                </svg>
              </button>
              <input type="text" class="floating-chat-input" id="floatingChatInput" placeholder="Ask a health question..." autocomplete="off">
              <button type="submit" class="floating-chat-send-btn" id="floatingSendBtn" aria-label="Send">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"></line>
                  <polyline points="5 12 12 5 19 12"></polyline>
                </svg>
              </button>
            </form>
          </div>
        </div>

        <!-- Pulsing Floating Circular Button -->
        <button class="floating-chatbot-trigger" id="floatingChatbotTrigger" aria-label="Open AI Assistant">
          <div class="floating-chatbot-pulse"></div>
          <!-- 4-Point Star Sparkle Icon -->
          <svg class="floating-chatbot-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z"/>
          </svg>
          <!-- Close Icon when open -->
          <svg class="floating-chatbot-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span class="floating-chatbot-tooltip">Ask Hygia AI ✦</span>
        </button>
      `;
      document.body.appendChild(wrapper);
    }

    const triggerBtn = document.getElementById('floatingChatbotTrigger');
    const closeBtn = document.getElementById('floatingChatCloseBtn');
    const chatMessages = document.getElementById('floatingChatMessages');
    const chatForm = document.getElementById('floatingChatForm');
    const chatInput = document.getElementById('floatingChatInput');
    const chatPills = wrapper.querySelectorAll('.floating-chat-pill');
    const attachBtn = document.getElementById('floatingAttachBtn');

    function toggleChat(forceOpen) {
      const isOpen = wrapper.classList.contains('open');
      if (forceOpen === true || (!isOpen && forceOpen !== false)) {
        wrapper.classList.add('open');
        setTimeout(() => {
          if (chatInput) chatInput.focus();
        }, 150);
      } else {
        wrapper.classList.remove('open');
      }
    }

    if (triggerBtn) {
      triggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChat();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChat(false);
      });
    }

    // Quick prompt pills
    chatPills.forEach(pill => {
      pill.addEventListener('click', () => {
        const query = pill.dataset.query || pill.innerText.trim();
        sendFloatingMessage(query);
      });
    });

    // Form submit
    if (chatForm) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = chatInput ? chatInput.value.trim() : '';
        if (val) {
          sendFloatingMessage(val);
          if (chatInput) chatInput.value = '';
        }
      });
    }

    if (attachBtn) {
      attachBtn.addEventListener('click', () => {
        alert('Attach medical file or report for instant AI analysis.');
      });
    }

    function sendFloatingMessage(text) {
      if (!text || !chatMessages) return;

      // Append user bubble
      const userBubble = document.createElement('div');
      userBubble.className = 'floating-bubble user';
      userBubble.innerText = text;
      chatMessages.appendChild(userBubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Add typing indicator
      const typingInd = document.createElement('div');
      typingInd.className = 'floating-typing-indicator';
      typingInd.innerHTML = `
        <span class="floating-typing-dot"></span>
        <span class="floating-typing-dot"></span>
        <span class="floating-typing-dot"></span>
      `;
      chatMessages.appendChild(typingInd);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      // Determine response from knowledge dictionary
      const lower = text.toLowerCase();
      let reply = "I have analyzed your medical records. Everything is on schedule, and no critical contraindications were detected across your history.";

      if (lower.includes('summar') || lower.includes('history')) {
        reply = "You have 9 clinic visits and 8 completed immunotherapy sessions at Salem Hospital. Your viral sinus infection from Feb 2018 is fully resolved, and compliance is 100%.";
      } else if (lower.includes('condition') || lower.includes('allergy')) {
        reply = "Diagnosed with Allergic Rhinitis (dust and pollen sensitivity). The subcutaneous immunotherapy course desensitizes your immune system to minimize inflammatory symptoms.";
      } else if (lower.includes('appoint')) {
        reply = "Upcoming appointments: 1) Kavin S: Allergy follow-up on 26 Jun 10:00 AM. 2) Advik: Pediatric checkup on 28 Jun 11:30 AM. 3) Lakshmi: Fasting blood test on 02 Jul 09:00 AM.";
      } else if (lower.includes('advik') || lower.includes('vaccin')) {
        reply = "Advik completed his DTaP Booster and Typhoid vaccinations on 18 Jun 2024 at City Clinic. Routine pediatric exam scheduled on 28 Jun at 11:30 AM.";
      } else if (lower.includes('prescript') || lower.includes('med')) {
        reply = "Current guidance: Levocetirizine 5mg at bedtime as an antihistamine, plus Budecort inhaler 100mcg twice daily for respiratory airway protection.";
      }

      setTimeout(() => {
        if (typingInd.parentNode) typingInd.parentNode.removeChild(typingInd);
        const botBubble = document.createElement('div');
        botBubble.className = 'floating-bubble bot';
        botBubble.innerHTML = reply;
        chatMessages.appendChild(botBubble);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }, 550);
    }

    // Expose globally so other buttons can trigger it
    window.openFloatingHygiaChat = function(query) {
      toggleChat(true);
      if (query) {
        sendFloatingMessage(query);
      }
    };

    // Connect existing AI buttons to open the floating chat
    [btnAskAI, btnGetInsights, openChatBtn].forEach(b => {
      if (b) {
        b.addEventListener('click', (e) => {
          e.preventDefault();
          window.openFloatingHygiaChat();
        });
      }
    });
  }


  /* ==========================================================================
     9. APPOINTMENTS PAGE CONTROLLER (appointments.html)
     ========================================================================== */
  function initAppointmentsPage() {
    const doctorCardsList = document.getElementById('doctorCardsList');
    if (!doctorCardsList) return; // Not on appointments page

    const doctorsData = {
      'priya-raman': {
        name: 'Dr. Priya Raman',
        specialty: 'Allergist & Immunologist',
        hospital: 'Salem Multispeciality Hospital',
        experience: '12 years',
        rating: '4.8',
        reviews: '(320 reviews)',
        distance: '2.4 km',
        focus: 'Allergy Treatment, Immunotherapy',
        bio: 'Dr. Priya Raman specializes in the diagnosis and treatment of allergies, asthma, and immunological conditions. She has extensive experience in allergy immunotherapy and personalized treatment plans.'
      },
      'aravind-kumar': {
        name: 'Dr. Aravind Kumar',
        specialty: 'ENT Specialist (Allergy Care)',
        hospital: 'KMCH Salem',
        experience: '10 years',
        rating: '4.6',
        reviews: '(210 reviews)',
        distance: '4.1 km',
        focus: 'Chronic Rhinitis, Sinusitis & Allergy Management',
        bio: 'Dr. Aravind Kumar is a senior ENT surgeon specializing in allergic rhinitis, endoscopic sinus procedures, and comprehensive airway allergy care.'
      },
      'nithya-s': {
        name: 'Dr. Nithya S',
        specialty: 'Pulmonologist (Allergy & Asthma)',
        hospital: 'Sri Ramakrishna Hospital, Salem',
        experience: '15 years',
        rating: '4.5',
        reviews: '(189 reviews)',
        distance: '5.8 km',
        focus: 'Adult & Pediatric Asthma, Lung Function Testing',
        bio: 'Dr. Nithya S is a specialist in respiratory medicine, allergic bronchopulmonary conditions, and spirometry diagnostics with over 15 years of clinical practice.'
      },
      'karthik-subramanian': {
        name: 'Dr. Karthik Subramanian',
        specialty: 'General Physician (Allergy Treatment)',
        hospital: 'Salem Government Hospital',
        experience: '8 years',
        rating: '4.3',
        reviews: '(142 reviews)',
        distance: '3.1 km',
        focus: 'Preventive Healthcare, Seasonal Allergies & Primary Care',
        bio: 'Dr. Karthik Subramanian provides evidence-based primary medical care, focusing on prompt diagnosis and management of seasonal allergies and immune health.'
      },
      'meena-lakshmi': {
        name: 'Dr. Meena Lakshmi',
        specialty: 'Dermatologist (Allergy & Skin)',
        hospital: 'Apollo Clinic, Salem',
        experience: '11 years',
        rating: '4.4',
        reviews: '(178 reviews)',
        distance: '6.2 km',
        focus: 'Contact Dermatitis, Urticaria & Skin Patch Testing',
        bio: 'Dr. Meena Lakshmi is a consultant dermatologist focusing on allergic skin reactions, eczema, hives, and advanced patch testing for allergen identification.'
      }
    };

    let selectedDoctorId = 'priya-raman';
    let selectedDate = 'Tuesday, Oct 13, 2026';
    let selectedSlot = '09:00 AM';

    const panelDoctorName = document.getElementById('panelDoctorName');
    const panelDoctorSpecialty = document.getElementById('panelDoctorSpecialty');
    const panelDoctorHospital = document.getElementById('panelDoctorHospital');
    const panelDoctorRating = document.getElementById('panelDoctorRating');
    const panelDoctorReviews = document.getElementById('panelDoctorReviews');
    const panelDoctorExp = document.getElementById('panelDoctorExp');
    const panelDoctorFocus = document.getElementById('panelDoctorFocus');
    const panelDoctorDist = document.getElementById('panelDoctorDist');
    const panelDoctorBio = document.getElementById('panelDoctorBio');

    function updateDoctorPanel(docId) {
      const doc = doctorsData[docId];
      if (!doc) return;
      selectedDoctorId = docId;

      if (panelDoctorName) panelDoctorName.textContent = doc.name;
      if (panelDoctorSpecialty) panelDoctorSpecialty.textContent = doc.specialty;
      if (panelDoctorHospital) {
        panelDoctorHospital.innerHTML = `
          <svg class="hospital-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2"></rect>
            <path d="M9 3v18"></path>
            <path d="M15 3v18"></path>
            <path d="M3 9h18"></path>
            <path d="M3 15h18"></path>
          </svg>
          <span>${doc.hospital}</span>
        `;
      }
      if (panelDoctorRating) panelDoctorRating.textContent = doc.rating;
      if (panelDoctorReviews) panelDoctorReviews.textContent = doc.reviews;
      if (panelDoctorExp) panelDoctorExp.textContent = doc.experience;
      if (panelDoctorFocus) panelDoctorFocus.textContent = doc.focus;
      if (panelDoctorDist) panelDoctorDist.textContent = doc.distance;
      if (panelDoctorBio) panelDoctorBio.textContent = doc.bio;

      // Update card active classes
      const allCards = doctorCardsList.querySelectorAll('.doctor-card');
      allCards.forEach(card => {
        const isCurrent = card.getAttribute('data-doctor-id') === docId;
        card.classList.toggle('selected', isCurrent);
        const bookBtn = card.querySelector('.btn-card-book');
        if (bookBtn) {
          bookBtn.classList.toggle('active-card-btn', isCurrent);
        }
      });
    }

    // Card click events
    doctorCardsList.addEventListener('click', (e) => {
      const card = e.target.closest('.doctor-card');
      if (card) {
        const docId = card.getAttribute('data-doctor-id');
        updateDoctorPanel(docId);
      }
    });

    // Detail tabs switching
    const tabLinks = document.querySelectorAll('.doctor-detail-tabs .tab-link');
    tabLinks.forEach(tab => {
      tab.addEventListener('click', () => {
        tabLinks.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const tabType = tab.getAttribute('data-tab');
        const doc = doctorsData[selectedDoctorId];
        if (panelDoctorBio && doc) {
          if (tabType === 'about') {
            panelDoctorBio.textContent = doc.bio;
          } else if (tabType === 'services') {
            panelDoctorBio.textContent = `Specialized clinical services offered by ${doc.name}: Comprehensive allergy profile blood panels, Sublingual/Subcutaneous Immunotherapy (SCIT), Spirometry airway diagnostics, Skin prick tests, and custom desensitization protocols.`;
          } else if (tabType === 'reviews') {
            panelDoctorBio.textContent = `“Dr. Priya Raman provided the clearest explanation of my IgE antibody levels and allergy immunotherapy schedule. Symptoms improved remarkably in 4 weeks!” — Patient Review (Verified)`;
          } else if (tabType === 'location') {
            panelDoctorBio.textContent = `Consultation OPD located at ${doc.hospital}, 2nd Floor Diagnostic Wing. Ample parking, dedicated allergy assessment lab, and wheel-chair accessible entry.`;
          }
        }
      });
    });

    // Day slot picker
    const daySlotBtns = document.querySelectorAll('.day-slot-btn');
    daySlotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        daySlotBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const dayName = btn.getAttribute('data-day-name') || 'Tuesday';
        const dayNum = btn.getAttribute('data-day-num') || '13';
        selectedDate = `${dayName}, Oct ${dayNum}, 2026`;
      });
    });

    // Time slot picker
    const timeSlotBtns = document.querySelectorAll('.time-slot-btn');
    timeSlotBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        timeSlotBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSlot = btn.getAttribute('data-slot') || '09:00 AM';
      });
    });

    // Search query input live filter
    const treatmentQueryInput = document.getElementById('treatmentQueryInput');
    const clearSearchQuery = document.getElementById('clearSearchQuery');
    if (treatmentQueryInput) {
      treatmentQueryInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        const allCards = doctorCardsList.querySelectorAll('.doctor-card');
        allCards.forEach(card => {
          const docId = card.getAttribute('data-doctor-id');
          const doc = doctorsData[docId];
          if (!doc) return;
          const match = doc.name.toLowerCase().includes(val) || 
                        doc.specialty.toLowerCase().includes(val) || 
                        doc.focus.toLowerCase().includes(val) || 
                        doc.hospital.toLowerCase().includes(val);
          card.style.display = match ? 'flex' : 'none';
        });
      });
    }

    if (clearSearchQuery && treatmentQueryInput) {
      clearSearchQuery.addEventListener('click', () => {
        treatmentQueryInput.value = '';
        treatmentQueryInput.dispatchEvent(new Event('input'));
        treatmentQueryInput.focus();
      });
    }

    // Dropdown filters (Location, Radius, Date)
    function setupDropdown(btnId, menuId, textId) {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      const text = document.getElementById(textId);
      if (!btn || !menu) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShow = menu.classList.contains('show');
        document.querySelectorAll('.filter-dropdown-menu').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.filter-dropdown-btn').forEach(b => b.classList.remove('active'));
        if (!isShow) {
          menu.classList.add('show');
          btn.classList.add('active');
        }
      });

      menu.querySelectorAll('.filter-option').forEach(opt => {
        opt.addEventListener('click', () => {
          menu.querySelectorAll('.filter-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          if (text) text.textContent = opt.textContent;
          menu.classList.remove('show');
          btn.classList.remove('active');
        });
      });
    }

    setupDropdown('locationFilterBtn', 'locationMenu', 'selectedLocationText');
    setupDropdown('radiusFilterBtn', 'radiusMenu', 'selectedRadiusText');
    setupDropdown('dateFilterBtn', 'dateMenu', 'selectedDateFilterText');

    document.addEventListener('click', () => {
      document.querySelectorAll('.filter-dropdown-menu').forEach(m => m.classList.remove('show'));
      document.querySelectorAll('.filter-dropdown-btn').forEach(b => b.classList.remove('active'));
    });

    // Doctor Sorting
    const doctorSortSelect = document.getElementById('doctorSortSelect');
    if (doctorSortSelect && doctorCardsList) {
      doctorSortSelect.addEventListener('change', () => {
        const val = doctorSortSelect.value;
        const cards = Array.from(doctorCardsList.querySelectorAll('.doctor-card'));
        cards.sort((a, b) => {
          const docA = doctorsData[a.getAttribute('data-doctor-id')];
          const docB = doctorsData[b.getAttribute('data-doctor-id')];
          if (!docA || !docB) return 0;
          if (val === 'rating') return parseFloat(docB.rating) - parseFloat(docA.rating);
          if (val === 'distance') return parseFloat(docA.distance) - parseFloat(docB.distance);
          if (val === 'experience') return parseInt(docB.experience) - parseInt(docA.experience);
          return 0; // relevance / default
        });
        cards.forEach(card => doctorCardsList.appendChild(card));
      });
    }

    // Month Navigation
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    let currentMonthIdx = 9; // October
    let currentYear = 2026;

    function updateMonthDisplay() {
      if (currentMonthDisplay) {
        currentMonthDisplay.textContent = `${months[currentMonthIdx]} ${currentYear}`;
      }
    }

    if (prevMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        currentMonthIdx--;
        if (currentMonthIdx < 0) { currentMonthIdx = 11; currentYear--; }
        updateMonthDisplay();
      });
    }
    if (nextMonthBtn) {
      nextMonthBtn.addEventListener('click', () => {
        currentMonthIdx++;
        if (currentMonthIdx > 11) { currentMonthIdx = 0; currentYear++; }
        updateMonthDisplay();
      });
    }

    // Sync header globalSearchInput with treatmentQueryInput
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput && treatmentQueryInput) {
      globalSearchInput.addEventListener('input', (e) => {
        treatmentQueryInput.value = e.target.value;
        treatmentQueryInput.dispatchEvent(new Event('input'));
      });
    }

    // Sidebar Book CTA
    const sidebarBookCta = document.getElementById('sidebarBookCta');
    if (sidebarBookCta) {
      sidebarBookCta.addEventListener('click', (e) => {
        e.preventDefault();
        const card = document.getElementById('doctorBookingCard');
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    }

    // Booking Confirmation Modal
    const btnConfirmBooking = document.getElementById('btnConfirmBooking');
    const bookingConfirmModal = document.getElementById('bookingConfirmModal');
    const closeConfirmModal = document.getElementById('closeConfirmModal');
    const btnAddToCalendar = document.getElementById('btnAddToCalendar');

    if (btnConfirmBooking && bookingConfirmModal) {
      btnConfirmBooking.addEventListener('click', () => {
        const doc = doctorsData[selectedDoctorId] || doctorsData['priya-raman'];
        const ticketDoctorName = document.getElementById('ticketDoctorName');
        const ticketDoctorSpecialty = document.getElementById('ticketDoctorSpecialty');
        const ticketHospital = document.getElementById('ticketHospital');
        const ticketDate = document.getElementById('ticketDate');
        const ticketTime = document.getElementById('ticketTime');
        const ticketBookingId = document.getElementById('ticketBookingId');

        if (ticketDoctorName) ticketDoctorName.textContent = doc.name;
        if (ticketDoctorSpecialty) ticketDoctorSpecialty.textContent = doc.specialty;
        if (ticketHospital) ticketHospital.textContent = doc.hospital;
        if (ticketDate) ticketDate.textContent = selectedDate;
        if (ticketTime) ticketTime.textContent = selectedSlot;
        if (ticketBookingId) {
          const randNum = Math.floor(1000 + Math.random() * 9000);
          const bookingId = `HYG-APT-${randNum}`;
          ticketBookingId.textContent = bookingId;

          // Save appointment to localStorage
          try {
            const storedApts = JSON.parse(localStorage.getItem('hygia_appointments') || '[]');
            storedApts.push({
              id: bookingId,
              doctor: doc.name,
              specialty: doc.specialty,
              hospital: doc.hospital,
              date: selectedDate,
              time: selectedSlot,
              patient: 'Kavin S',
              timestamp: new Date().toISOString()
            });
            localStorage.setItem('hygia_appointments', JSON.stringify(storedApts));
          } catch (e) {
            console.warn('Could not save booking:', e);
          }
        }

        bookingConfirmModal.style.display = 'flex';
      });
    }

    if (closeConfirmModal && bookingConfirmModal) {
      closeConfirmModal.addEventListener('click', () => {
        bookingConfirmModal.style.display = 'none';
      });
    }

    if (bookingConfirmModal) {
      bookingConfirmModal.addEventListener('click', (e) => {
        if (e.target === bookingConfirmModal) {
          bookingConfirmModal.style.display = 'none';
        }
      });
    }

    if (btnAddToCalendar) {
      btnAddToCalendar.addEventListener('click', () => {
        btnAddToCalendar.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Added to Calendar!</span>
        `;
        setTimeout(() => {
          btnAddToCalendar.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Add to Calendar</span>
          `;
        }, 2200);
      });
    }
  }

  initFloatingChatbot();
  initAppointmentsPage();
});

fetch("http://127.0.0.1:8000/openapi.json")
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log("HYGIA backend connected!");
    console.log("Available API paths:", Object.keys(data.paths));
  })
  .catch(error => {
    console.error("HYGIA backend connection failed:", error);
  });
