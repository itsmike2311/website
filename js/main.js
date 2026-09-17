(function () {
  'use strict';

  /* ------------------------------------------------------------------
     Utilities
     ------------------------------------------------------------------ */
  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      var args = arguments;
      var ctx = this;
      t = setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    initHeaderOffsets();
    initMobileNav();
    initFaqAccordion();
    initHeroOffers();
    initContactForm();
    initFooterYear();
  });

  /* ------------------------------------------------------------------
     Keep fixed header / mobile nav / body offset in sync with the
     ACTUAL rendered height of the top bar + header (they can wrap to
     two lines on very narrow screens).
     ------------------------------------------------------------------ */
  function initHeaderOffsets() {
    var topbar = document.querySelector('.cd-topbar');
    var header = document.querySelector('.cd-header');
    var mobileNav = document.getElementById('mobileNav');
    // Target .cd-page rather than document.body: on the live site this
    // class lives on a wrapper <div> (GoHighLevel controls <body> itself),
    // while the local preview happens to put it directly on <body>.
    var pageRoot = document.querySelector('.cd-page');

    function sync() {
      var topbarHeight = topbar ? topbar.offsetHeight : 0;
      var headerHeight = header ? header.offsetHeight : 0;
      var total = topbarHeight + headerHeight;

      if (header) header.style.top = topbarHeight + 'px';
      if (mobileNav) mobileNav.style.top = total + 'px';
      document.documentElement.style.setProperty('--header-height', total + 'px');
      if (pageRoot) pageRoot.style.paddingTop = total + 'px';

      var styleTag = document.getElementById('cd-scroll-margin-style');
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'cd-scroll-margin-style';
        document.head.appendChild(styleTag);
      }
      styleTag.textContent = '.cd-page section[id]{scroll-margin-top:' + (total + 16) + 'px;}';
    }

    sync();
    window.addEventListener('load', sync);
    window.addEventListener('resize', debounce(sync, 150));
  }

  /* ------------------------------------------------------------------
     Mobile nav drawer
     ------------------------------------------------------------------ */
  function initMobileNav() {
    var toggle = document.getElementById('menuToggle');
    var nav = document.getElementById('mobileNav');
    if (!toggle || !nav) return;

    function closeNav() {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
      nav.classList.remove('is-open');
    }

    function openNav() {
      toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close menu');
      nav.classList.add('is-open');
    }

    toggle.addEventListener('click', function () {
      var isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeNav();
        toggle.focus();
      }
    });
  }

  /* ------------------------------------------------------------------
     FAQ accordion
     ------------------------------------------------------------------ */
  function initFaqAccordion() {
    var questions = document.querySelectorAll('.cd-faq-item__question');
    questions.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var expanded = btn.getAttribute('aria-expanded') === 'true';
        var answerId = btn.getAttribute('aria-controls');
        var answer = document.getElementById(answerId);
        btn.setAttribute('aria-expanded', String(!expanded));
        if (answer) answer.setAttribute('data-open', String(!expanded));
      });
    });
  }

  /* ------------------------------------------------------------------
     Hero offer cards -> scroll to contact form and preselect the offer.
     Each card has data-offer (label matching a <select> option) and
     data-href (a placeholder to swap for a real GHL funnel URL later).
     While data-href still contains "REPLACE-WITH-FUNNEL-LINK", clicking
     an offer scrolls to the on-page appointment form and pre-fills it,
     so the offers are live and collecting leads today.
     ------------------------------------------------------------------ */
  function initHeroOffers() {
    var offers = document.querySelectorAll('.cd-offer');
    var offerSelect = document.getElementById('cd-offer');

    offers.forEach(function (card) {
      card.addEventListener('click', function () {
        var href = card.getAttribute('data-href') || '';
        var label = card.getAttribute('data-offer') || '';

        var isPlaceholder = href.indexOf('REPLACE-WITH-FUNNEL-LINK') !== -1 || href.charAt(0) === '#' || href === '';

        if (!isPlaceholder) {
          // A real funnel URL has been wired in — go straight there.
          window.location.href = href;
          return;
        }

        if (offerSelect && label) {
          offerSelect.value = label;
        }

        var contact = document.getElementById('contact');
        if (contact) {
          contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        var nameField = document.getElementById('cd-name');
        if (nameField) {
          window.setTimeout(function () {
            nameField.focus();
          }, 400);
        }
      });
    });
  }

  /* ------------------------------------------------------------------
     Appointment form: client-side validation + submit handling.

     TODO (GoHighLevel setup): this demo prevents the default page
     submit and shows a success message locally. Point it at a real
     destination by either:
       1) Replacing this form with a native GHL form/survey element, or
       2) Setting FORM_ENDPOINT_URL below to a GHL inbound webhook /
          Zapier / Make.com URL that creates a contact + opportunity.
     ------------------------------------------------------------------ */
  var FORM_ENDPOINT_URL = ''; // e.g. 'https://services.leadconnectorhq.com/hooks/xxxxx'

  function initContactForm() {
    var form = document.getElementById('appointmentForm');
    if (!form) return;

    var status = document.getElementById('formStatus');
    var submitBtn = document.getElementById('formSubmit');

    var validators = {
      'cd-name': function (value) {
        return value.trim().length > 0;
      },
      'cd-phone': function (value) {
        var digits = value.replace(/\D/g, '');
        return digits.length >= 10;
      },
      'cd-email': function (value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
      }
    };

    function setFieldError(fieldId, hasError) {
      var wrapper = document.getElementById('field-' + fieldId.replace('cd-', ''));
      if (wrapper) wrapper.classList.toggle('cd-field--error', hasError);
    }

    Object.keys(validators).forEach(function (id) {
      var input = document.getElementById(id);
      if (!input) return;
      input.addEventListener('blur', function () {
        var valid = validators[id](input.value);
        setFieldError(id, !valid);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var isValid = true;
      Object.keys(validators).forEach(function (id) {
        var input = document.getElementById(id);
        if (!input) return;
        var valid = validators[id](input.value);
        setFieldError(id, !valid);
        if (!valid) isValid = false;
      });

      var consent = document.getElementById('cd-consent');
      if (consent && !consent.checked) {
        isValid = false;
      }

      showStatus('', null);

      if (!isValid) {
        showStatus('Please fill out all required fields correctly.', 'error');
        return;
      }

      var formData = new FormData(form);
      var payload = {};
      formData.forEach(function (value, key) {
        payload[key] = value;
      });

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';

      var finish = function (success) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request Appointment';
        if (success) {
          showStatus("Thanks! We've received your request and will contact you shortly to confirm.", 'success');
          form.reset();
        } else {
          showStatus('Something went wrong sending your request. Please call us at (805) 523-3216.', 'error');
        }
      };

      if (FORM_ENDPOINT_URL) {
        fetch(FORM_ENDPOINT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(function (res) {
            finish(res.ok);
          })
          .catch(function () {
            finish(false);
          });
      } else {
        // No endpoint configured yet — treat as success so the on-page
        // experience works today; wire FORM_ENDPOINT_URL above once a
        // GHL webhook/automation destination exists.
        window.setTimeout(function () {
          finish(true);
        }, 500);
      }
    });

    function showStatus(message, type) {
      if (!status) return;
      status.textContent = message;
      status.className = 'cd-form__status';
      if (type) {
        status.classList.add('is-visible', 'cd-form__status--' + type);
      }
    }
  }

  function initFooterYear() {
    var el = document.getElementById('cdYear');
    if (el) el.textContent = String(new Date().getFullYear());
  }
})();
