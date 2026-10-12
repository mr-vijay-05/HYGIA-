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
  const navAiAssistant = document.getElementById('navAiAssistant');
  const aiChatModal = document.getElementById('aiChatModal');
  const closeAiChatModal = document.getElementById('closeAiChatModal');
  const aiChatThread = document.getElementById('aiChatThread');
  const modalAiInput = document.getElementById('modalAiInput');
  const modalAiSendBtn = document.getElementById('modalAiSendBtn');

  // AI responses dictionary for intelligent realistic simulation
  const aiAnswers = {
    priya: "Priya S (Wife, 28 yrs): Recent records include Doctor's Notes (20 Jun 2024) from Salem Hospital for seasonal asthma consultation. Prescribed Levocetirizine 5mg and Budecort inhaler as needed. Next review in 3 months.",
    advik: "Advik (Son, 8 yrs): Vaccination completed on 18 Jun 2024 (DTaP Booster & Typhoid vaccine) at City Clinic. Upcoming: Annual routine pediatric checkup on 28 Jun 2024 at 11:30 AM.",
    lakshmi: "Lakshmi (Mother, 54 yrs): Blood test completed on 12 Jun 2024 at Apollo Diagnostics (HbA1c: 6.2%, Fasting Blood Sugar: 118 mg/dL). Next follow-up blood test scheduled on 02 Jul 2024 at 09:00 AM.",
    appointments: "Upcoming family appointments: 1) Kavin S: Allergy Follow-up on 26 Jun 10:00 AM. 2) Advik: Routine Checkup on 28 Jun 11:30 AM. 3) Lakshmi: Blood Test on 02 Jul 09:00 AM.",
    recurring: "Family Health Insights: 1 recurring pattern identified — Seasonal allergic rhinitis / dust sensitivity shared across Kavin S and Priya S during June monsoon transition. Preventative air purification recommended.",
    default: "I have analyzed your family health records. All recent vaccinations, appointments, and diagnostic reports are organized and verified."
  };

  function triggerAiChat(initialUserQuery) {
    if (aiChatModal) {
      openModal(aiChatModal);
      if (aiChatThread && aiChatThread.children.length === 0) {
        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble bot';
        bubble.innerHTML = `Hello Kavin! I am your Hygia Health Assistant. I have indexed records for your whole family (Kavin, Priya, Advik, Lakshmi). How can I assist you today?`;
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

    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble user';
    userBubble.innerText = text;
    aiChatThread.appendChild(userBubble);
    if (modalAiInput) modalAiInput.value = '';

    const lower = text.toLowerCase();
    let reply = aiAnswers.default;
    if (lower.includes('priya')) reply = aiAnswers.priya;
    else if (lower.includes('advik') || lower.includes('vaccin')) reply = aiAnswers.advik;
    else if (lower.includes('lakshmi') || lower.includes('blood')) reply = aiAnswers.lakshmi;
    else if (lower.includes('appoint')) reply = aiAnswers.appointments;
    else if (lower.includes('recur')) reply = aiAnswers.recurring;
    else if (lower.includes('immuno') || lower.includes('allergy')) {
      reply = "Immunotherapy Desensitization: Allergen extracts are given in escalating doses to train your immune system. Your 9 completed injection cycles have reduced peak allergen sensitivity by approx. 70%.";
    } else if (lower.includes('summar')) {
      reply = "Health History Summary: You have 9 clinic visits, 8 completed subcutaneous immunotherapy treatments at Salem Hospital, with resolved viral sinusitis in 2018. Vital signs and compliance remain optimal.";
    }

    setTimeout(() => {
      const botBubble = document.createElement('div');
      botBubble.className = 'chat-bubble bot';
      botBubble.innerHTML = reply;
      aiChatThread.appendChild(botBubble);
      aiChatThread.scrollTop = aiChatThread.scrollHeight;
    }, 450);
  }

  if (modalAiSendBtn) modalAiSendBtn.addEventListener('click', () => sendChatMessage());
  if (modalAiInput) {
    modalAiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendChatMessage();
    });
  }

  // ---------------------------------------------------------------------------
  // Home Page AI Assistant Widget Logic
  // ---------------------------------------------------------------------------
  const homeAiForm = document.getElementById('aiChatForm');
  const homeAiInput = document.getElementById('aiChatInput');
  const homePromptChips = document.querySelectorAll('.prompt-chip');
  const attachFileBtn = document.getElementById('attachFileBtn');

  if (homePromptChips.length > 0) {
    homePromptChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.dataset.query || chip.innerText.trim();
        if (homeAiInput) {
          homeAiInput.value = query;
          homeAiInput.focus();
        }
        triggerAiChat(query);
      });
    });
  }

  if (homeAiForm) {
    homeAiForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = homeAiInput ? homeAiInput.value.trim() : '';
      if (val) {
        triggerAiChat(val);
        if (homeAiInput) homeAiInput.value = '';
      }
    });
  }

  if (attachFileBtn) {
    attachFileBtn.addEventListener('click', () => {
      const uploadModal = document.getElementById('uploadModal');
      if (uploadModal) openModal(uploadModal);
      else alert('Please select a PDF report or medical record image to attach.');
    });
  }

  // ---------------------------------------------------------------------------
  // Family Members Dashboard Logic
  // ---------------------------------------------------------------------------
  const familyCards = document.querySelectorAll('.family-member-card');
  const openAddFamilyModalBtn = document.getElementById('openAddFamilyModalBtn');
  const addFamilyModal = document.getElementById('addFamilyModal');
  const closeAddFamilyModal = document.getElementById('closeAddFamilyModal');
  const cancelAddFamily = document.getElementById('cancelAddFamily');
  const addFamilyForm = document.getElementById('addFamilyForm');
  const familyAiForm = document.getElementById('familyAiForm');
  const familyAiInput = document.getElementById('familyAiInput');
  const familyAiChips = document.querySelectorAll('.family-ai-prompts-row .ai-chip-btn');
  const familyAttachBtn = document.querySelector('.family-attach-btn');

  // Toggle active family member card
  if (familyCards.length > 0) {
    familyCards.forEach(card => {
      card.addEventListener('click', () => {
        familyCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const name = card.querySelector('.member-name')?.textContent || 'Family member';
        console.log(`Active profile switched to: ${name}`);
      });
    });
  }

  // Add Family Member Modal
  if (openAddFamilyModalBtn && addFamilyModal) {
    openAddFamilyModalBtn.addEventListener('click', () => openModal(addFamilyModal));
  }
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

  // Add Family Member Submission
  if (addFamilyForm) {
    addFamilyForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('fmName')?.value.trim();
      const relation = document.getElementById('fmRelation')?.value || 'Member';
      const gender = document.getElementById('fmGender')?.value || 'Other';
      const age = document.getElementById('fmAge')?.value || '30';

      if (!name) return;

      const grid = document.querySelector('.family-cards-grid');
      if (grid) {
        const newCard = document.createElement('div');
        newCard.className = 'family-member-card';
        newCard.innerHTML = `
          <div class="member-card-left">
            <div class="member-avatar-img" style="background: linear-gradient(135deg, #FFEDD5, #FED7AA); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #EA580C; font-size: 15px;">
              ${name.charAt(0)}
            </div>
            <div class="member-info-col">
              <h4 class="member-name">${name}</h4>
              <p class="member-relation-role">${relation}</p>
              <p class="member-meta-text">${gender} <span class="bullet">•</span> ${age} yrs</p>
            </div>
          </div>
          <svg class="chevron-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        `;

        newCard.addEventListener('click', () => {
          document.querySelectorAll('.family-member-card').forEach(c => c.classList.remove('active'));
          newCard.classList.add('active');
        });

        grid.appendChild(newCard);

        // Update count header
        const total = document.querySelectorAll('.family-member-card').length;
        const countHeader = document.querySelector('.family-section-header .section-title');
        if (countHeader) countHeader.textContent = `Family Members (${total})`;
      }

      addFamilyForm.reset();
      closeModal(addFamilyModal);
    });
  }

  // Family AI Prompts Chips
  if (familyAiChips.length > 0) {
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
  // 6. Login Page Logic (Role Switching & Password Visibility Toggle)
  // ---------------------------------------------------------------------------
  const roleSwitcher = document.getElementById('roleSwitcher');
  const roleTabs = document.querySelectorAll('.role-tab');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const loginPassword = document.getElementById('loginPassword');
  const eyeIcon = document.getElementById('eyeIcon');

  if (roleSwitcher && roleTabs.length > 0) {
    roleTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        roleTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const role = tab.dataset.role;
        const emailInput = document.getElementById('loginEmail');
        if (emailInput) {
          if (role === 'family') {
            emailInput.placeholder = 'Enter family member email or mobile';
            emailInput.value = 'family.member@example.com';
          } else {
            emailInput.placeholder = 'Enter your email or phone number';
            emailInput.value = 'kavin.s@example.com';
          }
        }
      });
    });
  }

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
          ticketBookingId.textContent = `HYG-APT-${randNum}`;
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

