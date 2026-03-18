// =============================================
//  NEU Library Visitor Log — script.js
// =============================================

import { db } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp,
  query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

  const loginCard   = document.getElementById('loginCard');
  const successCard = document.getElementById('successCard');
  const signInBtn   = document.getElementById('signInBtn');

  // ── Buttons ──────────────────────────────────
  signInBtn.addEventListener('click', handleSignIn);

  document.getElementById('adminBtn').addEventListener('click', () => {
    window.location.href = 'admin.html';
  });

  document.getElementById('signOutBtn').addEventListener('click', resetForm);

  // ── Live validation ───────────────────────────
  document.getElementById('email').addEventListener('input', function () {
    if (validateEmail(this.value)) clearError('email', 'emailError');
    document.getElementById('notRegisteredWarning').classList.add('hidden');
  });
  document.getElementById('reason').addEventListener('change', function () {
    if (this.value) clearError('reason', 'reasonError');
  });

  // ── Footer year ───────────────────────────────
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  // ── Card out animation ────────────────────────
  const s = document.createElement('style');
  s.textContent = `@keyframes cardOut{to{opacity:0;transform:translateY(-20px) scale(.97)}}`;
  document.head.appendChild(s);

  // ── Helpers ───────────────────────────────────
  function validateEmail(v) {
    return /^[^\s@]+@neu\.edu\.ph$/i.test(v.trim());
  }
  function showError(inputId, errorId) {
    document.getElementById(inputId).classList.add('invalid');
    document.getElementById(errorId).classList.add('show');
  }
  function clearError(inputId, errorId) {
    document.getElementById(inputId).classList.remove('invalid');
    document.getElementById(errorId).classList.remove('show');
  }
  function formatTime(date) {
    return date.toLocaleString('en-PH', {
      month:'short', day:'numeric', year:'numeric',
      hour:'2-digit', minute:'2-digit', hour12:true
    });
  }

  // ── Sign In ───────────────────────────────────
  async function handleSignIn() {
    const email  = document.getElementById('email').value.trim();
    const reason = document.getElementById('reason').value;

    let valid = true;
    if (!validateEmail(email)) { showError('email',  'emailError');  valid = false; }
    else clearError('email', 'emailError');
    if (!reason)               { showError('reason', 'reasonError'); valid = false; }
    else clearError('reason', 'reasonError');
    if (!valid) return;

    const reasonLabel = document.getElementById('reason')
      .options[document.getElementById('reason').selectedIndex].text;

    signInBtn.classList.add('loading');
    signInBtn.querySelector('.btn-text').textContent = 'Signing in…';

    try {
      // ── Check if email is blocked ─────────────────
      const blockedDocId = email.toLowerCase().replace(/\./g, '_');
      try {
        const { doc: fsDoc, getDoc } = await import(
          "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
        );
        const blockedSnap = await getDoc(fsDoc(db, 'blocked', blockedDocId));
        if (blockedSnap.exists()) {
          signInBtn.classList.remove('loading');
          signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';
          const warn = document.getElementById('notRegisteredWarning');
          warn.querySelector('span').textContent = 'Your email has been blocked. Please contact the library administrator.';
          warn.classList.remove('hidden');
          return;
        }
      } catch (e) {
        console.warn('Block check error:', e);
      }

      // ── Check if email is registered ─────────────
      const userQuery = query(
        collection(db, 'users'),
        where('email', '==', email.toLowerCase().trim())
      );
      let userSnap;
      try {
        userSnap = await getDocs(userQuery);
      } catch (queryErr) {
        console.warn('Could not verify registration, proceeding:', queryErr);
        userSnap = { empty: false, docs: [] };
      }

      if (userSnap.empty) {
        signInBtn.classList.remove('loading');
        signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';
        document.getElementById('notRegisteredWarning').classList.remove('hidden');
        return;
      }

      // Hide warning if previously shown
      document.getElementById('notRegisteredWarning').classList.add('hidden');

      // Get all data from registered user
      const userData     = userSnap.docs?.[0]?.data() || {};
      const programLabel = userData.program  || 'Unknown';
      const collegeLabel = userData.college  || 'Unknown';
      const fullName     = userData.fullName || email.split('@')[0];
      const yearLevel    = userData.yearLevel|| '';
      const type         = userData.type     || 'student';

      await addDoc(collection(db, 'visits'), {
        name:      fullName,
        email:     email.toLowerCase(),
        type:      type,
        program:   programLabel,
        college:   collegeLabel,
        yearLevel: yearLevel,
        reason:    reasonLabel,
        status:    'Active',
        timeIn:    serverTimestamp(),
        timeOut:   null,
        timestamp: serverTimestamp()
      });

      signInBtn.classList.remove('loading');
      signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';

      // Badge: TYPE — COLLEGE
      const typeLabel = type === 'faculty' ? 'Faculty / Staff' : 'Student';
      document.getElementById('successBadge').textContent =
        `${typeLabel} — ${collegeLabel}`;

      // Purpose pill
      document.getElementById('successPurpose').innerHTML =
        `📌 Purpose: ${reasonLabel}`;

      // Time on its own line
      document.getElementById('successTime').textContent = formatTime(new Date());

      loginCard.style.animation = 'cardOut 0.35s ease forwards';
      setTimeout(() => {
        loginCard.style.display = 'none';
        successCard.classList.add('visible');
      }, 330);

    } catch (err) {
      console.error('Firestore error:', err);
      signInBtn.classList.remove('loading');
      signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';
      alert('Error: ' + err.message);
    }
  }

  // ── Reset ─────────────────────────────────────
  function resetForm() {
    window.location.reload();
  }

});