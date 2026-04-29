// Navigation scroll effect
const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// Mobile menu toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

if (navToggle && navLinks) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    const spans = navToggle.querySelectorAll('span');
    spans[0].style.transform = isOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
    spans[1].style.opacity  = isOpen ? '0' : '';
    spans[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px, -5px)' : '';
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.querySelectorAll('span').forEach(s => {
        s.style.transform = '';
        s.style.opacity = '';
      });
    });
  });
}

// Contact form — opens mail client as fallback
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name    = document.getElementById('name')?.value || '';
    const company = document.getElementById('company')?.value || '';
    const subject = document.getElementById('subject')?.value || 'Henvendelse fra hjemmeside';
    const message = document.getElementById('message')?.value || '';

    const body = encodeURIComponent(
      `Navn: ${name}\nVirksomhed: ${company}\n\n${message}`
    );
    window.location.href = `mailto:hello@henningkristensen.com?subject=${encodeURIComponent(subject)}&body=${body}`;

    const btn = contactForm.querySelector('.btn-form');
    if (btn) {
      const original = btn.textContent;
      btn.textContent = 'Tak! Din mail-klient åbner… ✓';
      btn.style.background = '#10b981';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = original;
        btn.style.background = '';
        btn.disabled = false;
      }, 4000);
    }
  });
}
