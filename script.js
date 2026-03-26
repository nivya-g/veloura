// ===== BACKEND CONFIG + HELPER =====
const API_BASE = "http://localhost:4000";

async function sendEnquiry({ name, email, message }) {
  const res = await fetch(`${API_BASE}/api/enquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "FAILED");
  return data;
}
/* ===== THEME TOGGLE ===== */
(function themeInit() {
  const html = document.documentElement;
  const saved = localStorage.getItem("veloura-theme");
  if (saved) html.setAttribute("data-theme", saved);
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const next =
        html.getAttribute("data-theme") === "dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      localStorage.setItem("veloura-theme", next);
    });
  }
})();

/* ===== CURRENCY ===== */
const Currency = (() => {
  // Base is AUD
  const RATES = { AUD: 1, USD: 0.66 }; // adjust as needed
  const LOCALES = { AUD: "en-AU", USD: "en-US" };
  let cur = localStorage.getItem("veloura-currency") || "AUD";

  function setCurrency(next) {
    if (!RATES[next]) return;
    cur = next;
    localStorage.setItem("veloura-currency", cur);
    renderAllPrices();
    Cart.render();
  }
  function convertFromAUD(aud) {
    return aud * (RATES[cur] || 1);
  }
  function fmt(amount) {
    return new Intl.NumberFormat(LOCALES[cur], {
      style: "currency",
      currency: cur,
    }).format(amount);
  }
  function renderAllPrices() {
    document.querySelectorAll(".price[data-currency], .price").forEach((el) => {
      const card = el.closest("[data-price]");
      if (!card) return;
      const baseAud = parseFloat(card.dataset.price || "0");
      el.textContent = fmt(convertFromAUD(baseAud));
    });
    const modalPrice = document.getElementById("m-price");
    if (modalPrice) {
      const modal = document.getElementById("product-modal");
      const title = document.getElementById("m-title")?.textContent?.trim();
      const card = Array.from(document.querySelectorAll(".product-card")).find(
        (c) => (c.dataset.name || "") === title
      );
      if (card)
        modalPrice.textContent = fmt(
          convertFromAUD(parseFloat(card.dataset.price || "0"))
        );
    }
    const sel = document.getElementById("currency");
    if (sel) sel.value = cur;
  }
  function initControl() {
    const sel = document.getElementById("currency");
    if (sel) {
      sel.value = cur;
      sel.addEventListener("change", (e) => setCurrency(e.target.value));
    }
    renderAllPrices();
  }
  function current() {
    return cur;
  }
  return { initControl, fmt, convertFromAUD, current };
})();
document.addEventListener("DOMContentLoaded", Currency.initControl);

/* ===== TOAST ===== */
function showToast(msg = "Item added to cart!") {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = "1";
  el.style.transform = "translateX(-50%) translateY(-4px)";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(-50%)";
  }, 1600);
}

/* ===== CART STATE ===== */
const Cart = (() => {
  const key = "veloura-cart";
  let items = JSON.parse(localStorage.getItem(key) || "[]"); // [{id,name,price(AUD),qty,img}]
  const save = () => localStorage.setItem(key, JSON.stringify(items));
  const totalQty = () => items.reduce((a, b) => a + b.qty, 0);
  const totalPriceAUD = () => items.reduce((a, b) => a + b.qty * b.price, 0);

  function add(prod) {
    const existing = items.find((x) => x.id === prod.id);
    if (existing) existing.qty += 1;
    else items.push({ ...prod, qty: 1 });
    save();
    render();
    showToast("Added to cart");
  }
  function inc(id) {
    const it = items.find((x) => x.id === id);
    if (it) {
      it.qty++;
      save();
      render();
    }
  }
  function dec(id) {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    it.qty--;
    if (it.qty <= 0) items = items.filter((x) => x.id !== id);
    save();
    render();
  }
  function remove(id) {
    items = items.filter((x) => x.id !== id);
    save();
    render();
  }
  function render() {
    const badge = document.getElementById("cart-badge");
    if (badge) badge.textContent = totalQty();
    const wrap = document.getElementById("cart-items");
    if (!wrap) return;
    wrap.innerHTML = items.length ? "" : "<p>Your cart is empty.</p>";
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <img src="${it.img}" alt="${it.name}" />
        <div>
          <strong>${it.name}</strong>
          <div class="muted">${Currency.fmt(
            Currency.convertFromAUD(it.price)
          )}</div>
        </div>
        <div class="qty">
          <button data-dec="${it.id}">-</button>
          <span>${it.qty}</span>
          <button data-inc="${it.id}">+</button>
          <button title="Remove" data-remove="${
            it.id
          }" style="margin-left:.4rem">✕</button>
        </div>`;
      wrap.appendChild(row);
    });
    const total = document.getElementById("cart-total");
    if (total)
      total.textContent = Currency.fmt(
        Currency.convertFromAUD(totalPriceAUD())
      );
  }
  function open() {
    document.getElementById("cart-drawer")?.classList.add("open");
  }
  function close() {
    document.getElementById("cart-drawer")?.classList.remove("open");
  }
  function bind() {
    document.getElementById("cart-button")?.addEventListener("click", open);
    document.getElementById("cart-close")?.addEventListener("click", close);
    document.getElementById("cart-backdrop")?.addEventListener("click", close);
    document.getElementById("checkout")?.addEventListener("click", () => {
      window.location.href = "checkout.html";
    });
    document.getElementById("cart-items")?.addEventListener("click", (e) => {
      const t = e.target;
      if (t.dataset.inc) inc(t.dataset.inc);
      if (t.dataset.dec) dec(t.dataset.dec);
      if (t.dataset.remove) remove(t.dataset.remove);
    });
    render();
  }
  function getItems() {
    return items.slice();
  }
  return { add, bind, render, getItems };
})();
document.addEventListener("DOMContentLoaded", Cart.bind);

/* ===== FILTER / SEARCH / SORT (Collections) ===== */
(function catalog() {
  const grid = document.getElementById("grid");
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll(".product-card"));
  const input = document.getElementById("search");
  const filters = document.getElementById("filters");
  const sortSel = document.getElementById("sort");

  function apply() {
    const term = (input?.value || "").trim().toLowerCase();
    const active =
      filters?.querySelector(".chip.active")?.dataset.filter || "all";

    let list = [...cards];

    if (active !== "all")
      list = list.filter((c) => c.dataset.category === active);
    if (term)
      list = list.filter((c) =>
        (c.dataset.name || "").toLowerCase().includes(term)
      );

    const by = sortSel?.value || "featured";
    list.sort((a, b) => {
      const pa = parseFloat(a.dataset.price),
        pb = parseFloat(b.dataset.price);
      const na = (a.dataset.name || "").toLowerCase(),
        nb = (b.dataset.name || "").toLowerCase();
      if (by === "price-asc") return pa - pb;
      if (by === "price-desc") return pb - pa;
      if (by === "name-asc") return na.localeCompare(nb);
      if (by === "name-desc") return nb.localeCompare(na);
      return 0;
    });

    cards.forEach((c) => (c.style.display = "none"));
    list.forEach((c) => {
      c.style.display = "block";
      grid.appendChild(c);
    });
    Currency.initControl(); // refresh prices after re-order
  }

  input?.addEventListener("input", apply);
  sortSel?.addEventListener("change", apply);
  filters?.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    filters
      .querySelectorAll(".chip")
      .forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    apply();
  });

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-cart");
    if (!btn) return;
    const card = btn.closest(".product-card");
    if (!card) return;
    Cart.add({
      id: btn.dataset.id,
      name: card.dataset.name,
      price: parseFloat(card.dataset.price), // base AUD
      img: card.querySelector("img")?.getAttribute("src") || "",
    });
  });

  apply();
})();

/* ===== PRODUCT QUICK VIEW MODAL ===== */
(function quickView() {
  const modal = document.getElementById("product-modal");
  if (!modal) return;
  const cardSel = ".product-card";
  const openBtns = document.querySelectorAll("[data-quick]");
  const mImg = document.getElementById("m-img");
  const mTitle = document.getElementById("m-title");
  const mDesc = document.getElementById("m-desc");
  const mPrice = document.getElementById("m-price");
  const mTags = document.getElementById("m-tags");
  const btnAdd = document.getElementById("m-add");

  let current = null;

  function open(card) {
    current = card;
    const name = card.dataset.name || "";
    const priceAud = parseFloat(card.dataset.price || "0");
    const img = card.querySelector("img")?.getAttribute("src") || "";
    const desc = card.dataset.desc || "—";
    const tags = (card.dataset.tags || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    mImg.src = img;
    mImg.alt = name;
    mTitle.textContent = name;
    mDesc.textContent = desc;
    mPrice.textContent = Currency.fmt(Currency.convertFromAUD(priceAud));
    mTags.innerHTML = "";
    tags.forEach((t) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      mTags.appendChild(tag);
    });

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function close() {
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(cardSel);
      if (card) open(card);
    });
  });

  document.getElementById("modal-close")?.addEventListener("click", close);
  document.getElementById("modal-backdrop")?.addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  btnAdd?.addEventListener("click", () => {
    if (!current) return;
    const id =
      current.querySelector(".add-cart")?.dataset.id ||
      current.dataset.name?.toLowerCase().replace(/\s+/g, "-");
    Cart.add({
      id,
      name: current.dataset.name,
      price: parseFloat(current.dataset.price || "0"), // base AUD
      img: current.querySelector("img")?.getAttribute("src") || "",
    });
  });
})();
/* ===== Testimonials carousel ===== */
(function testimonials() {
  const track = document.getElementById("t-track");
  const prev = document.getElementById("t-prev");
  const next = document.getElementById("t-next");
  if (!track) return;

  const step = () => {
    const card = track.querySelector(".t-card");
    if (!card) return 320;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.columnGap || style.gap || 16);
    return card.getBoundingClientRect().width + gap;
  };

  const scrollByStep = (dir = 1) =>
    track.scrollBy({ left: dir * step(), behavior: "smooth" });

  prev?.addEventListener("click", () => scrollByStep(-1));
  next?.addEventListener("click", () => scrollByStep(1));

  let auto = setInterval(() => scrollByStep(1), 4500);
  track.addEventListener("mouseenter", () => {
    clearInterval(auto);
    auto = null;
  });
  track.addEventListener("mouseleave", () => {
    if (!auto) auto = setInterval(() => scrollByStep(1), 4500);
  });
})();
/* ===== Animated counters under testimonials ===== */
(function counters() {
  const wrap = document.getElementById("t-stats");
  if (!wrap) return;
  const nums = [...wrap.querySelectorAll(".num")];
  let started = false;

  function animate(el, target, duration = 1400) {
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const val = Math.round(from + (target - from) * eased);
      el.textContent = val.toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started) {
          started = true;
          nums.forEach((n) =>
            animate(n, parseInt(n.dataset.target || "0", 10))
          );
          io.disconnect();
        }
      });
    },
    { threshold: 0.3 }
  );

  io.observe(wrap);
})();
// Modal open/close
// ===== ENQUIRY MODAL (backend) =====
(function () {
  const openBtn = document.getElementById("enquiryBtn");
  const modal = document.getElementById("enquiryModal");
  const closeEls = modal ? modal.querySelectorAll("[data-close-modal]") : [];
  const form = document.getElementById("enquiryForm");

  const openModal = () => {
    if (!modal) return;
    modal.classList.add("is-open");
    const firstInput = modal.querySelector('input[name="name"]');
    setTimeout(() => firstInput && firstInput.focus(), 50);
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove("is-open");
    document.body.style.overflow = "";
  };

  if (openBtn) openBtn.addEventListener("click", openModal);
  closeEls.forEach((el) => el.addEventListener("click", closeModal));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.elements["name"].value.trim();
      const email = form.elements["email"].value.trim();
      const message = form.elements["message"].value.trim();
      const btn = form.querySelector('button[type="submit"]');

      if (!name || !email || !message) {
        alert("Please fill in all fields.");
        return;
      }

      btn && (btn.disabled = true);
      try {
        await sendEnquiry({ name, email, message });
        form.reset();
        closeModal();
        showToast("Enquiry sent ✅");
      } catch (err) {
        console.error(err);
        alert("Sending failed. Try again.");
      } finally {
        btn && (btn.disabled = false);
      }
    });
  }
})();
// ===== CONTACT SECTION FORM (backend) =====
(function () {
  const form = document.getElementById("contactSectionForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.elements["name"].value.trim();
    const email = form.elements["email"].value.trim();
    const message = form.elements["message"].value.trim();
    const btn = form.querySelector('button[type="submit"]');

    if (!name || !email || !message) {
      alert("Please fill in all fields.");
      return;
    }

    btn && (btn.disabled = true);
    try {
      await sendEnquiry({ name, email, message });
      form.reset();
      showToast("Enquiry sent ✅");
    } catch (err) {
      console.error(err);
      alert("Sending failed. Try again.");
    } finally {
      btn && (btn.disabled = false);
    }
  });
})();
