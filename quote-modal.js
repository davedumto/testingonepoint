/* OnePoint — shared 3-step quote modal.
   Include on any page with: <script src="../quote-modal.js"></script>
   Open it with:             openQM('Auto', { zip: '30022' });
   Close it with:             closeQM();
*/
(function () {
  var PRODUCTS = [
    'Auto', 'Classic / Antique Car', 'ATV', 'Motorcycle', 'RV & Travel Trailer',
    'Boat & Watercraft', 'Snowmobile', 'Scooter',
    'Homeowners', 'Condo', 'Mobile Home', 'Renters', 'Flood', 'Landlord', 'Umbrella',
    'General Liability', 'Commercial Property', 'Business Owners Policy (BOP)',
    'Commercial Auto', 'Trucking', 'Garage Insurance', 'Workers\' Compensation',
    'Commercial Umbrella', 'Professional Liability / E&O', 'Malpractice Insurance',
    'Cyber Insurance', 'Liquor Liability', 'Sport Insurance', 'Event Insurance', 'Travel Insurance',
    'Disability Income (Overview)', 'Individual Disability Income',
    'Short-Term Disability', 'Long-Term Disability', 'Group Disability',
    'Business Overhead Expense Disability',
    'Health Insurance (Marketplace)', 'Life Insurance (Term)', 'Life Insurance (Whole)',
    'Final Expense', 'Long-Term Care'
  ];

  var MODAL_HTML =
    '<div class="qm-backdrop" id="qmBackdrop" onclick="qmBackdropClick(event)">' +
      '<div class="qm-modal" role="dialog" aria-labelledby="qmTitle">' +
        '<div class="qm-header">' +
          '<div>' +
            '<div class="qm-kicker" id="qmKicker">Free quote · 60-second form</div>' +
            '<h3 id="qmTitle">Start your insurance quote</h3>' +
          '</div>' +
          '<div class="qm-call">Prefer to talk?<br><a href="tel:888-899-8117">1-888-899-8117</a></div>' +
          '<button type="button" class="qm-close" onclick="closeQM()" aria-label="Close">&times;</button>' +
        '</div>' +
        '<div class="qm-progress">' +
          '<div class="qm-prog-step active" data-step="1"><span class="qm-prog-num">1</span><span class="qm-prog-name">About you</span></div>' +
          '<div class="qm-prog-step" data-step="2"><span class="qm-prog-num">2</span><span class="qm-prog-name">Coverage</span></div>' +
          '<div class="qm-prog-step" data-step="3"><span class="qm-prog-num">3</span><span class="qm-prog-name">Finish</span></div>' +
        '</div>' +
        '<form id="qmForm" onsubmit="return false;">' +
          '<div class="qm-body">' +
            // Step 1
            '<div class="qm-step active" data-step="1">' +
              '<p class="qm-step-title">About you</p>' +
              '<p class="qm-step-sub">Just a few basics so a licensed advisor can reach out.</p>' +
              '<div class="qm-row">' +
                '<div class="qm-field"><label>First name <span class="req">*</span></label><input type="text" name="first" required></div>' +
                '<div class="qm-field"><label>Last name <span class="req">*</span></label><input type="text" name="last" required></div>' +
              '</div>' +
              '<div class="qm-row">' +
                '<div class="qm-field"><label>Email <span class="req">*</span></label><input type="email" name="email" required></div>' +
                '<div class="qm-field"><label>Phone <span class="req">*</span></label><input type="tel" name="phone" placeholder="(555) 123-4567" required></div>' +
              '</div>' +
              '<div class="qm-row">' +
                '<div class="qm-field"><label>Date of birth <span class="req">*</span></label><input type="date" name="dob" required></div>' +
                '<div class="qm-field"><label>ZIP code <span class="req">*</span></label><input type="text" name="zip" id="qmZip" maxlength="5" inputmode="numeric" required></div>' +
              '</div>' +
            '</div>' +
            // Step 2
            '<div class="qm-step" data-step="2">' +
              '<p class="qm-step-title">Coverage details</p>' +
              '<p class="qm-step-sub">Tell us what you need so we can match you to the right carrier.</p>' +
              '<div class="qm-row full">' +
                '<div class="qm-field">' +
                  '<label>What are you quoting? <span class="req">*</span></label>' +
                  '<select name="product" id="qmProduct" required></select>' +
                '</div>' +
              '</div>' +
              '<div class="qm-row">' +
                '<div class="qm-field"><label>Coverage start date <span class="req">*</span></label><input type="date" name="start" required></div>' +
                '<div class="qm-field"><label>Current carrier</label><input type="text" name="carrier" placeholder="If applicable"></div>' +
              '</div>' +
              '<div class="qm-row full">' +
                '<div class="qm-field">' +
                  '<label>How should we reach you first?</label>' +
                  '<div class="qm-radios">' +
                    '<label class="qm-radio checked"><input type="radio" name="contact" value="phone" checked> Phone call</label>' +
                    '<label class="qm-radio"><input type="radio" name="contact" value="email"> Email</label>' +
                    '<label class="qm-radio"><input type="radio" name="contact" value="text"> Text</label>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            // Step 3
            '<div class="qm-step" data-step="3">' +
              '<p class="qm-step-title">One more thing</p>' +
              '<p class="qm-step-sub">Anything we should know before an advisor calls? Then we submit your request.</p>' +
              '<div class="qm-row full">' +
                '<div class="qm-field">' +
                  '<label>Best time to reach you</label>' +
                  '<select name="time">' +
                    '<option>Anytime during business hours</option>' +
                    '<option>Morning (8am – 11am)</option>' +
                    '<option>Midday (11am – 2pm)</option>' +
                    '<option>Afternoon (2pm – 5pm)</option>' +
                    '<option>Evening (5pm – 7pm)</option>' +
                  '</select>' +
                '</div>' +
              '</div>' +
              '<div class="qm-row full">' +
                '<div class="qm-field">' +
                  '<label>Additional details</label>' +
                  '<textarea name="notes" placeholder="Specific coverage needs, budget, questions..."></textarea>' +
                '</div>' +
              '</div>' +
              '<div class="qm-consent">' +
                '<input type="checkbox" id="qmConsent" required>' +
                '<label for="qmConsent"><strong>I agree to be contacted by OnePoint Insurance Agency</strong> via phone, email, or text at the information provided, including via automated or prerecorded messages, about insurance products and services. Consent is not a condition of purchase. Message and data rates may apply. See our <a href="https://onepointinsuranceagency.com/privacypolicy" target="_blank">Privacy Policy</a> and <a href="https://onepointinsuranceagency.com/termofuse" target="_blank">Terms</a>.</label>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="qm-footer">' +
            '<button type="button" class="qm-btn-back" id="qmBackBtn" onclick="qmPrev()" disabled>&larr; Back</button>' +
            '<button type="button" class="qm-btn-next" id="qmNextBtn" onclick="qmNext()">Next <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
          '</div>' +
        '</form>' +
        '<div class="qm-success" id="qmSuccess">' +
          '<div class="qm-success-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>' +
          '<h3>Request received &mdash; thank you!</h3>' +
          '<p>A licensed OnePoint advisor will reach out within 1 business day to finalize your <span id="qmSuccessProduct">insurance</span> quote. Keep an eye on your inbox and phone.</p>' +
          '<button type="button" class="btn-close" onclick="closeQM()">Close</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  var qmStep = 1;

  function injectModal() {
    if (document.getElementById('qmBackdrop')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = MODAL_HTML;
    document.body.appendChild(wrap.firstElementChild);
    populateProducts();
    attachRadioListener();
  }

  function populateProducts() {
    var sel = document.getElementById('qmProduct');
    if (!sel) return;
    sel.innerHTML = '';
    PRODUCTS.forEach(function (p) {
      var o = document.createElement('option');
      o.value = p; o.textContent = p;
      sel.appendChild(o);
    });
  }

  function attachRadioListener() {
    document.addEventListener('change', function (e) {
      if (e.target && e.target.name === 'contact') {
        document.querySelectorAll('.qm-radio').forEach(function (r) {
          r.classList.toggle('checked', r.querySelector('input').checked);
        });
      }
    });
  }

  function render() {
    document.querySelectorAll('.qm-step').forEach(function (s) {
      s.classList.toggle('active', +s.dataset.step === qmStep);
    });
    document.querySelectorAll('.qm-prog-step').forEach(function (s) {
      var n = +s.dataset.step;
      s.classList.toggle('active', n === qmStep);
      s.classList.toggle('done', n < qmStep);
    });
    var back = document.getElementById('qmBackBtn');
    var next = document.getElementById('qmNextBtn');
    back.disabled = qmStep === 1;
    next.innerHTML = qmStep === 3
      ? 'Submit request <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>'
      : 'Next <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  }

  window.openQM = function (product, opts) {
    injectModal();
    qmStep = 1;
    document.getElementById('qmForm').reset();
    document.getElementById('qmForm').style.display = '';
    document.getElementById('qmSuccess').classList.remove('show');

    // Set product
    if (product) {
      var sel = document.getElementById('qmProduct');
      // Try exact match, fallback to contains
      var match = Array.from(sel.options).find(function (o) { return o.value === product; });
      if (!match) match = Array.from(sel.options).find(function (o) { return o.value.toLowerCase().indexOf(product.toLowerCase()) !== -1; });
      if (match) sel.value = match.value;
      document.getElementById('qmTitle').textContent = 'Quote ' + (match ? match.value : product);
      document.getElementById('qmSuccessProduct').textContent = (match ? match.value : product);
    }

    // Prefill from opts
    if (opts && opts.zip) {
      var zip = document.getElementById('qmZip');
      if (zip) zip.value = opts.zip;
    }

    document.getElementById('qmBackdrop').classList.add('open');
    document.body.style.overflow = 'hidden';
    render();
  };

  window.closeQM = function () {
    var bd = document.getElementById('qmBackdrop');
    if (bd) bd.classList.remove('open');
    document.body.style.overflow = '';
  };

  window.qmBackdropClick = function (e) {
    if (e.target && e.target.id === 'qmBackdrop') window.closeQM();
  };

  window.qmNext = function () {
    var step = document.querySelector('.qm-step[data-step="' + qmStep + '"]');
    if (!step) return;
    var inputs = step.querySelectorAll('input[required], select[required], textarea[required]');
    for (var i = 0; i < inputs.length; i++) {
      if (!inputs[i].checkValidity()) { inputs[i].reportValidity(); return; }
    }
    if (qmStep === 3) { window.qmSubmit(); return; }
    qmStep++;
    render();
  };

  window.qmPrev = function () {
    if (qmStep > 1) { qmStep--; render(); }
  };

  window.qmSubmit = function () {
    var consent = document.getElementById('qmConsent');
    if (!consent.checked) { consent.reportValidity(); return; }
    // Grab submission data
    var form = document.getElementById('qmForm');
    var fd = new FormData(form);
    var payload = {};
    fd.forEach(function (v, k) { payload[k] = v; });
    console.log('[OnePoint quote request]', payload);
    // In production: fetch('/api/quote', { method: 'POST', body: JSON.stringify(payload) })
    // For demo — show success state
    document.getElementById('qmForm').style.display = 'none';
    document.getElementById('qmSuccess').classList.add('show');
  };

  // ESC to close
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') window.closeQM();
  });

  // Inject immediately so any open() calls work
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectModal);
  } else {
    injectModal();
  }
})();
