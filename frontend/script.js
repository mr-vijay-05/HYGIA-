/**
 * HYGIA - UNIFIED CLIENT CONTROLLER
 * Supports Home (index.html), My Records (records.html), and Health Timeline (timeline.html)
 */

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

document.addEventListener('DOMContentLoaded', () => {
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
  // 6. Upload Modal & AI Chat Modal
  // ---------------------------------------------------------------------------
  const uploadModal = document.getElementById('uploadModal');
  const closeUploadModal = document.getElementById('closeUploadModal');
  const cancelUploadBtn = document.getElementById('cancelUploadBtn');
  const confirmUploadBtn = document.getElementById('confirmUploadBtn');
  const btnUploadRecords = document.getElementById('btnUploadRecords');
  const btnScanCamera = document.getElementById('btnScanCamera');
  const sidebarUploadBtn = document.getElementById('sidebarUploadBtn');
  const dropZone = document.getElementById('dropZone');
  const fileUploadInput = document.getElementById('fileUploadInput');
  const filesPreview = document.getElementById('filesPreview');

  [btnUploadRecords, btnScanCamera, sidebarUploadBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        if (filesPreview) filesPreview.innerHTML = '';
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


  // Store the selected files for the upload action.
  let selectedFiles = [];

  if (dropZone && fileUploadInput) {
    dropZone.addEventListener('click', () => fileUploadInput.click());

    fileUploadInput.addEventListener('change', (event) => {
      selectedFiles = Array.from(event.target.files || []);

      if (filesPreview) {
        filesPreview.innerHTML = '';

        selectedFiles.forEach((file) => {
          const item = document.createElement('div');
          item.className = 'file-preview-item';

          const name = document.createElement('span');
          name.textContent = `📄 ${file.name}`;

          const status = document.createElement('span');
          status.textContent = 'Ready';
          status.style.color = '#15803D';
          status.style.fontWeight = '600';

          item.append(name, status);
          filesPreview.appendChild(item);
        });
      }
    });
  }

  if (confirmUploadBtn) {
    confirmUploadBtn.addEventListener('click', async () => {
      if (!selectedFiles.length) {
        alert('Please select a PDF or image first.');
        return;
      }

      // Use a real patient ID from your HYGIA database.
      // This is a temporary development setting.
      const patientId = window.HYGIA_PATIENT_ID;

      if (!patientId) {
        alert('Patient ID is not configured yet.');
        return;
      }

      const originalText = confirmUploadBtn.textContent;
      confirmUploadBtn.disabled = true;
      confirmUploadBtn.textContent = 'Uploading...';

      try {
        const uploadedDocuments = [];

        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append('patient_id', patientId);
          formData.append('file', file);

          const response = await fetch(
            'http://127.0.0.1:8000/api/v1/documents/upload',
            {
              method: 'POST',
              body: formData
            }
          );

          const result = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(
              result.detail || `Upload failed (${response.status})`
            );
          }

          uploadedDocuments.push(result);
        }

        alert(
          `Successfully uploaded ${uploadedDocuments.length} document(s).`
        );

        selectedFiles = [];
        fileUploadInput.value = '';
        if (filesPreview) filesPreview.innerHTML = '';
        closeModal(uploadModal);

        console.log('Uploaded documents:', uploadedDocuments);
      } catch (error) {
        console.error('HYGIA upload error:', error);
        alert(`Upload failed: ${error.message}`);
      } finally {
        confirmUploadBtn.disabled = false;
        confirmUploadBtn.textContent = originalText;
      }
    });
  }

  // AI Chat Modal
  const btnAskAI = document.getElementById('btnAskAI');
  const btnGetInsights = document.getElementById('btnGetInsights');
  const openChatBtn = document.getElementById('openChatBtn');
  const aiChatModal = document.getElementById('aiChatModal');
  const closeAiChatModal = document.getElementById('closeAiChatModal');
  const aiChatThread = document.getElementById('aiChatThread');
  const modalAiInput = document.getElementById('modalAiInput');
  const modalAiSendBtn = document.getElementById('modalAiSendBtn');

  function triggerAiChat() {
    openModal(aiChatModal);
    if (aiChatThread && aiChatThread.children.length === 0) {
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble bot';
      bubble.innerHTML = `Hello Kavin! I have analyzed your entire timeline from 12 Sep 2017 to 24 Jun 2018 (9 visits, 8 treatments, and 8 consultation notes). What questions do you have about your health journey?`;
      aiChatThread.appendChild(bubble);
    }
  }

  [btnAskAI, btnGetInsights, openChatBtn].forEach(btn => {
    if (btn) btn.addEventListener('click', triggerAiChat);
  });

  if (closeAiChatModal) closeAiChatModal.addEventListener('click', () => closeModal(aiChatModal));
  if (aiChatModal) {
    aiChatModal.addEventListener('click', (e) => {
      if (e.target === aiChatModal) closeModal(aiChatModal);
    });
  }

  function sendChatMessage() {
    if (!modalAiInput || !aiChatThread) return;
    const text = modalAiInput.value.trim();
    if (!text) return;
    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.innerText = text;
    aiChatThread.appendChild(userBubble);
    modalAiInput.value = '';

    setTimeout(() => {
      const botBubble = document.createElement('div');
      botBubble.className = 'chat-bubble bot';
      botBubble.innerHTML = `Timeline Summary:
Your allergy immunotherapy schedule at Salem Hospital is progressing on track with consistent compliance. No new adverse events or medications conflict across your clinical timeline.`;
      aiChatThread.appendChild(botBubble);
      aiChatThread.scrollTop = aiChatThread.scrollHeight;
    }, 600);
  }

  if (modalAiSendBtn) modalAiSendBtn.addEventListener('click', sendChatMessage);
  if (modalAiInput) {
    modalAiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }
});
