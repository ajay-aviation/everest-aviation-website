// ===== Change this to your deployed backend URL when going live =====
const API_BASE = 'http://localhost:5000';

// Sticky topbar state
const topbar = document.getElementById('topbar');
window.addEventListener('scroll', () => {
  topbar.classList.toggle('scrolled', window.scrollY > 40);
});

// Mobile nav
const menuBtn = document.getElementById('menuBtn');
const nav = document.getElementById('nav');
menuBtn.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

// Reveal on scroll
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.15 });
revealEls.forEach(el => io.observe(el));

// Flight path plane follows scroll progress along the fixed left line
const planeWrap = document.getElementById('plane-wrap');
function updatePlane() {
  const scrollPct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  const x = window.innerWidth * 0.08 - 9;
  const y = Math.min(Math.max(scrollPct, 0), 1) * (window.innerHeight - 40) + 20;
  planeWrap.style.transform = `translate(${x}px, ${y}px) rotate(90deg)`;
}
window.addEventListener('scroll', updatePlane);
window.addEventListener('resize', updatePlane);
updatePlane();

// ---------- Contact form -> backend /api/enquiries ----------
const form = document.getElementById('enquiryForm');
const submitBtn = document.getElementById('submitBtn');
const formMsg = document.getElementById('formMsg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Honeypot check — if this hidden field got filled, it's a bot, silently drop it
  const honeypot = document.getElementById('f-honeypot');
  if (honeypot && honeypot.value.trim() !== '') {
    form.reset();
    return;
  }

  submitBtn.disabled = true;
  formMsg.textContent = '';
  formMsg.className = 'form-msg';

  const entry = {
    name: document.getElementById('f-name').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    phone: document.getElementById('f-phone').value.trim(),
    course: document.getElementById('f-course').value,
    message: document.getElementById('f-msg').value.trim(),
    website: honeypot ? honeypot.value : ''
  };

  try {
    const res = await fetch(`${API_BASE}/api/enquiries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to send enquiry');

    formMsg.textContent = 'Thank you — your enquiry has been received. Our team will reach out shortly.';
    formMsg.classList.add('ok');
    form.reset();
  } catch (err) {
    formMsg.textContent = err.message || 'Something went wrong. Please try again or call us directly.';
    formMsg.classList.add('err');
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Admin panel: fetch enquiries from backend (protected) ----------
const adminToggle = document.getElementById('adminToggle');
const adminPanel = document.getElementById('adminPanel');
const adminList = document.getElementById('adminList');
let adminKey = null;

adminToggle.addEventListener('click', async () => {
  adminPanel.classList.toggle('open');
  if (!adminPanel.classList.contains('open')) return;

  if (!adminKey) {
    adminKey = window.prompt('Enter admin key to view enquiries:');
    if (!adminKey) { adminPanel.classList.remove('open'); return; }
  }
  loadEnquiries();
});

async function loadEnquiries() {
  adminList.innerHTML = '<div class="admin-empty">Loading…</div>';
  try {
    const res = await fetch(`${API_BASE}/api/enquiries`, {
      headers: { 'x-admin-key': adminKey }
    });
    const data = await res.json();
    if (res.status === 401) {
      adminKey = null;
      adminList.innerHTML = '<div class="admin-empty">Incorrect admin key.</div>';
      return;
    }
    if (!data.ok || !data.enquiries || data.enquiries.length === 0) {
      adminList.innerHTML = '<div class="admin-empty">No enquiries yet.</div>';
      return;
    }
    adminList.innerHTML = data.enquiries.slice(0, 30).map(en => `
      <div class="admin-entry">
        <div class="n">${escapeHtml(en.name || 'Unnamed')}</div>
        <div class="d">${escapeHtml(en.course || '')}<br>${escapeHtml(en.phone || '')} · ${escapeHtml(en.email || '')}</div>
      </div>
    `).join('');
  } catch (err) {
    adminList.innerHTML = '<div class="admin-empty">Could not reach the server. Is the backend running?</div>';
  }
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ---------- Payment: Razorpay checkout ----------
const payForm = document.getElementById('payForm');
const payStatus = document.getElementById('payStatus');
const payBtn = document.getElementById('payBtn');

if (payForm) {
  payForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    payBtn.disabled = true;
    payStatus.textContent = 'Preparing secure payment…';
    payStatus.className = 'pay-status';

    const name = document.getElementById('p-name').value.trim();
    const email = document.getElementById('p-email').value.trim();
    const course = document.getElementById('f-course').value || 'General Enquiry';
    const amount = Number(document.getElementById('p-amount').value) || 500;

    try {
      const orderRes = await fetch(`${API_BASE}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, name, email, course })
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.ok) throw new Error(orderData.error || 'Could not start payment');

      const options = {
        key: orderData.key_id,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Everest Aviation Academy',
        description: `Registration fee — ${course}`,
        order_id: orderData.order.id,
        prefill: { name, email },
        theme: { color: '#c9a860' },
        handler: async function (response) {
          payStatus.textContent = 'Verifying payment…';
          try {
            const verifyRes = await fetch(`${API_BASE}/api/payments/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...response, name, email, course })
            });
            const verifyData = await verifyRes.json();
            if (verifyData.ok) {
              payStatus.textContent = 'Payment successful! We will confirm your seat shortly.';
              payStatus.classList.add('ok');
            } else {
              payStatus.textContent = 'Payment could not be verified. Please contact us with your payment ID.';
              payStatus.classList.add('err');
            }
          } catch {
            payStatus.textContent = 'Payment made, but verification failed. Please contact us.';
            payStatus.classList.add('err');
          }
        },
        modal: {
          ondismiss: function () {
            payStatus.textContent = 'Payment cancelled.';
          }
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();
    } catch (err) {
      payStatus.textContent = err.message || 'Payment gateway is not set up yet.';
      payStatus.classList.add('err');
    } finally {
      payBtn.disabled = false;
    }
  });
}

// ---------- Cursor ambient glow ----------
const cursorGlow = document.getElementById('cursor-glow');
if (cursorGlow && window.matchMedia('(hover:hover)').matches) {
  window.addEventListener('mousemove', (e) => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
    cursorGlow.classList.add('active');
  });
  document.addEventListener('mouseleave', () => cursorGlow.classList.remove('active'));
}

// ---------- Animated count-up stats ----------
const statEls = document.querySelectorAll('.hero-stats .num[data-count]');
let statsAnimated = false;
function animateStats() {
  if (statsAnimated) return;
  statsAnimated = true;
  statEls.forEach(el => {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}
if (statEls.length) {
  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) animateStats(); });
  }, { threshold: 0.4 });
  statsObserver.observe(document.querySelector('.hero-stats'));
}

// ---------- Course detail modal ----------
const COURSE_DATA = {
  aht: {
    route: 'CAREER', title: 'Aviation, Hospitality & Tourism Management', duration: '14 Months', mode: 'Full-time, Classroom + Practical',
    intro: 'A comprehensive flagship program combining aviation service standards, hospitality operations and tourism management — designed for students who want maximum career flexibility across airlines, hotels and travel companies.',
    highlights: ['Airline & airport customer service standards', 'Front office & guest relationship management', 'Grooming, etiquette and communication skills', 'Travel documentation, ticketing & tour planning', 'Crisis handling and service recovery', 'Industry visits and live project work'],
    careers: ['Flight Attendant / Airhostess', 'Airport Customer Service Executive', 'Hotel Front Office Executive', 'Travel Consultant', 'Guest Relations Officer'],
    eligibility: '10+2 (any stream) from a recognised board. Basic English communication skills preferred.'
  },
  airport: {
    route: 'AIRPORT', title: 'Airport Management & Customer Care', duration: '10 Months', mode: 'Full-time, Classroom + Practical',
    intro: 'Focused training in the day-to-day operations that keep an airport running smoothly — from passenger handling to customer relationship management.',
    highlights: ['Passenger check-in & boarding procedures', 'Airport security & regulatory basics', 'Handling special passengers & complaints', 'Customer relationship management systems', 'Airport terminal operations overview', 'Soft skills for high-pressure environments'],
    careers: ['Airport Customer Care Executive', 'Passenger Service Agent', 'Check-in Counter Executive', 'Airport Duty Officer (entry level)'],
    eligibility: '10+2 (any stream) from a recognised board. Comfortable working rotational shifts.'
  },
  ground: {
    route: 'GROUND', title: 'Airport Ground Services Management', duration: '6 Months', mode: 'Full-time, Classroom + Practical',
    intro: 'A specialised, hands-on program covering the essential ground functions that keep flights on schedule — baggage, ramp and cargo operations.',
    highlights: ['Baggage handling systems & procedures', 'Ramp safety and marshalling basics', 'Cargo & load management fundamentals', 'Ground support equipment overview', 'Turnaround coordination', 'Workplace safety standards'],
    careers: ['Ramp Agent', 'Baggage Handling Executive', 'Cargo Operations Assistant', 'Ground Support Coordinator'],
    eligibility: '10+2 from a recognised board. Physically fit for active, on-field roles.'
  },
  tourism: {
    route: 'TOURISM', title: 'Travel & Tourism Management', duration: '6 Months', mode: 'Full-time, Classroom + Practical',
    intro: 'Build the knowledge and skills to plan, sell and manage travel experiences — from domestic itineraries to international tour packages.',
    highlights: ['Tour planning & itinerary design', 'Ticketing and reservation systems', 'Destination knowledge (domestic & international)', 'Tour operations & vendor coordination', 'Customer consultation & sales skills', 'Travel documentation & visa basics'],
    careers: ['Tour Operator', 'Travel Consultant', 'Tour Coordinator', 'Destination Executive'],
    eligibility: '10+2 (any stream) from a recognised board.'
  },
  hospitality: {
    route: 'HOSPITALITY', title: 'Hospitality Management', duration: '6 Months', mode: 'Full-time, Classroom + Practical',
    intro: 'Professional training across hotel operations — from guest-facing front office roles to food & beverage service standards.',
    highlights: ['Front office operations & reservations', 'Food & beverage service standards', 'Housekeeping fundamentals', 'Guest relations & complaint handling', 'Hotel software & billing basics', 'Grooming and hospitality etiquette'],
    careers: ['Front Office Executive', 'Guest Relations Executive', 'F&B Service Associate', 'Housekeeping Supervisor'],
    eligibility: '10+2 (any stream) from a recognised board.'
  },
  logistics: {
    route: 'LOGISTICS', title: 'Supply Chain & Logistics Management', duration: '6 Months', mode: 'Full-time, Classroom + Practical',
    intro: 'Understand how goods move through global markets — from inventory control to logistics coordination — for a career in one of the fastest-growing sectors.',
    highlights: ['Supply chain fundamentals', 'Inventory & warehouse management', 'Logistics documentation', 'Freight & transportation basics', 'Vendor and dispatch coordination', 'Logistics software exposure'],
    careers: ['Logistics Executive', 'Warehouse Coordinator', 'Supply Chain Assistant', 'Dispatch Executive'],
    eligibility: '10+2 (any stream) from a recognised board.'
  }
};

const courseModal = document.getElementById('courseModal');
const modalClose = document.getElementById('modalClose');

document.querySelectorAll('.course-card[data-course]').forEach(card => {
  card.addEventListener('click', () => {
    const data = COURSE_DATA[card.dataset.course];
    if (!data || !courseModal) return;
    document.getElementById('modalRoute').innerHTML = `EAA <span class="line"></span> ${data.route}`;
    document.getElementById('modalTitle').textContent = data.title;
    document.getElementById('modalDuration').textContent = data.duration;
    document.getElementById('modalMode').textContent = data.mode;
    document.getElementById('modalIntro').textContent = data.intro;
    document.getElementById('modalHighlights').innerHTML = data.highlights.map(h => `<li>${h}</li>`).join('');
    document.getElementById('modalCareers').innerHTML = data.careers.map(c => `<li>${c}</li>`).join('');
    document.getElementById('modalEligibility').textContent = data.eligibility;
    document.getElementById('modalEnquire').onclick = () => {
      courseModal.classList.remove('open');
      const sel = document.getElementById('f-course');
      if (sel) {
        [...sel.options].forEach(opt => { if (opt.text === data.title) sel.value = data.title; });
      }
    };
    courseModal.classList.add('open');
  });
});
if (modalClose) modalClose.addEventListener('click', () => courseModal.classList.remove('open'));
if (courseModal) courseModal.addEventListener('click', (e) => { if (e.target === courseModal) courseModal.classList.remove('open'); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && courseModal) courseModal.classList.remove('open'); });

// ---------- Gallery lightbox ----------
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
document.querySelectorAll('.gallery-item').forEach(item => {
  item.addEventListener('click', () => {
    lightboxImg.src = item.dataset.full;
    lightboxImg.alt = item.querySelector('img').alt;
    lightbox.classList.add('open');
  });
});
if (lightboxClose) lightboxClose.addEventListener('click', () => lightbox.classList.remove('open'));
if (lightbox) lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('open'); });

// ---------- FAQ accordion ----------
document.querySelectorAll('.faq-item').forEach(item => {
  item.querySelector('.faq-q').addEventListener('click', () => {
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});
