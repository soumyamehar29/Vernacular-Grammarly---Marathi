/* ======================================================
   Marathi Grammarly — Main Application Script
====================================================== */

    // ===== DOM Elements =====
    const inputTextarea = document.getElementById('inputTextarea');
    const charCount = document.getElementById('charCount');
    const keyboardContainer = document.getElementById('keyboardContainer');
    const keyboardToggle = document.getElementById('keyboardToggle');
    const submitBtn = document.getElementById('submitBtn');
    const outputDisplay = document.getElementById('outputDisplay');
    const loadingContainer = document.getElementById('loadingContainer');
    const errorContainer = document.getElementById('errorContainer');
    const diffSection = document.getElementById('diffSection');
    const diffDisplay = document.getElementById('diffDisplay');
    const copyBtnRow = document.getElementById('copyBtnRow');
    const copyBtn = document.getElementById('copyBtn');
    const toast = document.getElementById('toast');

    let correctedText = '';

    // ===== Keyboard Data =====
    const keyboardLayout = {
      vowels: ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ए', 'ऐ', 'ओ', 'औ', 'अं', 'अः'],
      matras: ['ा', 'ि', 'ी', 'ु', 'ू', 'े', 'ै', 'ो', 'ौ', 'ं', 'ः', '्'],
      consonants1: ['क', 'ख', 'ग', 'घ', 'ङ', 'च', 'छ', 'ज', 'झ', 'ञ'],
      consonants2: ['ट', 'ठ', 'ड', 'ढ', 'ण', 'त', 'थ', 'द', 'ध', 'न'],
      consonants3: ['प', 'फ', 'ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'श'],
      consonants4: ['ष', 'स', 'ह', 'ळ', 'क्ष', 'ज्ञ', 'ॐ', '।', '॥']
    };

    // ===== Initialize Keyboard =====
    function buildKeyboard() {
      const rows = {
        vowelRow: keyboardLayout.vowels,
        matraRow: keyboardLayout.matras,
        consonantRow1: keyboardLayout.consonants1,
        consonantRow2: keyboardLayout.consonants2,
        consonantRow3: keyboardLayout.consonants3,
        consonantRow4: keyboardLayout.consonants4
      };

      for (const [rowId, chars] of Object.entries(rows)) {
        const rowEl = document.getElementById(rowId);
        chars.forEach(char => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'key-btn';
          btn.textContent = char;
          btn.setAttribute('aria-label', char);
          btn.addEventListener('click', () => insertCharacter(char));
          rowEl.appendChild(btn);
        });
      }

      // Utility Row
      const utilityRow = document.getElementById('utilityRow');

      const backspaceBtn = document.createElement('button');
      backspaceBtn.type = 'button';
      backspaceBtn.className = 'key-btn utility-key';
      backspaceBtn.textContent = '← Backspace';
      backspaceBtn.addEventListener('click', handleBackspace);
      utilityRow.appendChild(backspaceBtn);

      const spaceBtn = document.createElement('button');
      spaceBtn.type = 'button';
      spaceBtn.className = 'key-btn utility-key space-key';
      spaceBtn.textContent = 'Space';
      spaceBtn.addEventListener('click', () => insertCharacter(' '));
      utilityRow.appendChild(spaceBtn);

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'key-btn utility-key';
      clearBtn.textContent = 'Clear All';
      clearBtn.addEventListener('click', () => {
        inputTextarea.value = '';
        inputTextarea.focus();
        updateCharCount();
      });
      utilityRow.appendChild(clearBtn);
    }

    // ===== Character Insertion at Cursor =====
    function insertCharacter(char) {
      const start = inputTextarea.selectionStart;
      const end = inputTextarea.selectionEnd;
      const text = inputTextarea.value;
      inputTextarea.value = text.substring(0, start) + char + text.substring(end);
      const newPos = start + char.length;
      inputTextarea.setSelectionRange(newPos, newPos);
      inputTextarea.focus();
      updateCharCount();
    }

    function handleBackspace() {
      const start = inputTextarea.selectionStart;
      const end = inputTextarea.selectionEnd;
      const text = inputTextarea.value;

      if (start !== end) {
        inputTextarea.value = text.substring(0, start) + text.substring(end);
        inputTextarea.setSelectionRange(start, start);
      } else if (start > 0) {
        inputTextarea.value = text.substring(0, start - 1) + text.substring(start);
        inputTextarea.setSelectionRange(start - 1, start - 1);
      }
      inputTextarea.focus();
      updateCharCount();
    }

    // ===== Character Count =====
    function updateCharCount() {
      const len = inputTextarea.value.length;
      charCount.textContent = `${len} character${len !== 1 ? 's' : ''}`;
    }

    inputTextarea.addEventListener('input', updateCharCount);

    // ===== Keyboard Toggle =====
    keyboardToggle.addEventListener('click', () => {
      keyboardContainer.classList.toggle('collapsed');
      const isCollapsed = keyboardContainer.classList.contains('collapsed');
      keyboardToggle.textContent = isCollapsed ? 'Show ▼' : 'Hide ▲';
    });

    // ===== Show Toast =====
    function showToast(message, duration = 3000) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), duration);
    }

    // ===== UI State Management =====
    function showLoading() {
      outputDisplay.classList.add('hidden');
      errorContainer.classList.remove('active');
      loadingContainer.classList.add('active');
      diffSection.classList.add('hidden');
      copyBtnRow.classList.add('hidden');
    }

    function showError(mrMsg, hiMsg, enMsg) {
      loadingContainer.classList.remove('active');
      outputDisplay.classList.add('hidden');
      errorContainer.classList.add('active');
      document.getElementById('errorMsgMr').textContent = mrMsg;
      document.getElementById('errorMsgHi').textContent = hiMsg;
      document.getElementById('errorMsgEn').textContent = enMsg;
      diffSection.classList.add('hidden');
      copyBtnRow.classList.add('hidden');
    }

    function showOutput(text, originalText) {
      correctedText = text;
      loadingContainer.classList.remove('active');
      errorContainer.classList.remove('active');

      outputDisplay.classList.remove('hidden', 'empty', 'fade-in');
      outputDisplay.textContent = text;
      // Trigger reflow for animation
      void outputDisplay.offsetWidth;
      outputDisplay.classList.add('fade-in');

      // Generate diff
      generateDiff(originalText, text);
      diffSection.classList.remove('hidden');
      copyBtnRow.classList.remove('hidden');
    }

    // ===== Diff Generation =====
    function generateDiff(original, corrected) {
      const origWords = original.trim().split(/(\s+)/);
      const corrWords = corrected.trim().split(/(\s+)/);

      // Use a simple LCS-based word diff
      const diff = computeWordDiff(origWords, corrWords);
      diffDisplay.innerHTML = '';

      if (diff.every(d => d.type === 'same')) {
        diffDisplay.innerHTML = '<span style="color: #4CAF50; font-family: var(--font-ui); font-size: 0.85rem;">✅ कोणतेही बदल नाहीत / कोई बदलाव नहीं / No changes needed</span>';
        return;
      }

      diff.forEach(d => {
        const span = document.createElement('span');
        if (d.type === 'removed') {
          span.className = 'diff-word-removed';
          span.textContent = d.value;
        } else if (d.type === 'added') {
          span.className = 'diff-word-added';
          span.textContent = d.value;
        } else {
          span.className = 'diff-word-same';
          span.textContent = d.value;
        }
        diffDisplay.appendChild(span);
      });
    }

    function computeWordDiff(a, b) {
      const n = a.length;
      const m = b.length;

      // Build LCS table
      const dp = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }

      // Backtrack to produce diff
      const result = [];
      let i = n, j = m;
      while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
          result.unshift({ type: 'same', value: a[i - 1] });
          i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
          result.unshift({ type: 'added', value: b[j - 1] });
          j--;
        } else {
          result.unshift({ type: 'removed', value: a[i - 1] });
          i--;
        }
      }

      return result;
    }

    // ===== Copy to Clipboard =====
    copyBtn.addEventListener('click', async () => {
      if (!correctedText) return;
      try {
        await navigator.clipboard.writeText(correctedText);
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Copied! ✓
        `;
        showToast('कॉपी केले! / Copied!');
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            Copy / कॉपी
          `;
        }, 2000);
      } catch (err) {
        showToast('Copy failed. Try selecting and copying manually.');
      }
    });

    // ===== Submit to Gemini API =====
    submitBtn.addEventListener('click', handleSubmit);

    async function handleSubmit() {
      const text = inputTextarea.value.trim();
      if (!text) {
        showToast('⚠️ कृपया मजकूर लिहा / Please enter text');
        inputTextarea.focus();
        return;
      }

      submitBtn.disabled = true;
      showLoading();

      try {
        const result = await window.API.callBackendAPI(text);
        showOutput(result, text);
      } catch (err) {
        console.error('API Error:', err);
        const { mrMsg, hiMsg, enMsg } = window.API.getErrorMessages(err);
        showError(mrMsg, hiMsg, enMsg + ' [Raw: ' + err.message + ']');
      } finally {
        submitBtn.disabled = false;
      }
    }

    // ===== Allow Ctrl+Enter to submit =====
    inputTextarea.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    });

    // ===== Initialize =====
    buildKeyboard();
