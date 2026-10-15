// =========================================================
// HIMPALUBI — Komponen Header & Footer Bersama
// Memuat partials/header.html dan partials/footer.html ke slot
// serta menangani interaktivitas navbar, dropdown, dan aksesibilitas.
// =========================================================

// Halaman 404 bisa dibuka dari alamat bertingkat (mis. /himpalubi/a/b), jadi jalur relatif
// harus diawali alamat dasar situs (atribut data-base pada <body>).
function perbaikiJalurRelatif(root) {
  const base = document.body.dataset.base;
  if (!base || !root) return;
  root.querySelectorAll("[href],[src],[srcset]").forEach((el) => {
    ["href", "src", "srcset"].forEach((attr) => {
      const v = el.getAttribute(attr);
      if (v && !/^(https?:|mailto:|tel:|data:|#|\/)/i.test(v)) el.setAttribute(attr, base + v);
    });
  });
}

async function muatKomponen() {
  const BASE = document.body.dataset.base || "";
  const headerSlot = document.getElementById("site-header-slot");
  const footerSlot = document.getElementById("site-footer-slot");

  if (headerSlot) {
    try {
      const res = await fetch(BASE + "partials/header.html");
      if (res.ok) {
        headerSlot.innerHTML = await res.text();
        perbaikiJalurRelatif(headerSlot);
        tandaiMenuAktif();
        pasangHamburger();
        pasangDropdown();
        if (typeof pasangPencarian === "function") pasangPencarian("tombol-search");
        if (typeof muatTickerBerjalan === "function") muatTickerBerjalan();
      }
    } catch (e) {
      console.error("Gagal memuat header", e);
    }
  }

  if (footerSlot) {
    try {
      const res = await fetch(BASE + "partials/footer.html");
      if (res.ok) {
        footerSlot.innerHTML = await res.text();
        perbaikiJalurRelatif(footerSlot);
        const elTahun = document.getElementById("tahun");
        if (elTahun) elTahun.textContent = new Date().getFullYear();
        if (typeof muatPengaturanFooter === "function") muatPengaturanFooter();
        if (typeof muatJaringanKampus === "function") muatJaringanKampus();
      }
    } catch (e) {
      console.error("Gagal memuat footer", e);
    }
  }
}

function tandaiMenuAktif() {
  const halaman = document.body.dataset.page;
  if (!halaman) return;

  // 1. Desktop Nav Items
  const linkDesktop = document.querySelector(`.main-nav-container a[data-page="${halaman}"]`);
  if (linkDesktop) {
    linkDesktop.setAttribute("aria-current", "page");
    linkDesktop.classList.remove("text-secondary");
    linkDesktop.classList.add("text-primary-container", "font-bold", "border-b-2", "border-primary-container");
  }

  // Tandai kelompok navigasi yang menaungi halaman saat ini.
  if (["tentang", "struktur", "program-kerja"].includes(halaman)) {
    const btnTentang = document.getElementById("btn-dropdown-tentang");
    if (btnTentang) {
      btnTentang.classList.remove("text-secondary");
      btnTentang.classList.add("text-primary-container", "font-bold");
    }
  }
  if (["kegiatan", "galeri"].includes(halaman)) {
    const btnKegiatan = document.getElementById("btn-dropdown-kegiatan");
    if (btnKegiatan) {
      btnKegiatan.classList.remove("text-secondary");
      btnKegiatan.classList.add("text-primary-container", "font-bold");
    }
  }
  if (halaman === "kampus") {
    const btnOrganisasi = document.getElementById("btn-dropdown-organisasi");
    if (btnOrganisasi) {
      btnOrganisasi.classList.remove("text-secondary");
      btnOrganisasi.classList.add("text-primary-container", "font-bold");
    }
  }

  // 2. Mobile Drawer Nav Items
  const linkMobile = document.querySelector(`#mobile-nav-panel a[data-page="${halaman}"]`);
  if (linkMobile) {
    linkMobile.setAttribute("aria-current", "page");
    linkMobile.classList.add("font-semibold", "text-primary-container", "bg-surface-container");
  }

  // 3. Mobile Bottom Nav Items
  const linkBottom = document.querySelector(`.bottom-nav-item[data-page="${halaman}"]`);
  if (linkBottom) {
    linkBottom.setAttribute("aria-current", "page");
    linkBottom.classList.remove("text-secondary");
    linkBottom.classList.add("text-primary-container", "font-semibold");
    const icon = linkBottom.querySelector(".material-symbols-outlined");
    if (icon) icon.classList.add("icon-fill");
  }
}

function pasangHamburger() {
  const tombol = document.getElementById("tombol-menu");
  const panel = document.getElementById("mobile-nav-panel");
  const icon = document.getElementById("mobile-menu-icon");
  if (!tombol || !panel) return;

  // Saat menu terbuka: halaman di belakangnya tidak ikut ter-scroll, fokus pindah ke menu.
  function kunciScroll(aktif) {
    document.body.style.overflow = aktif ? "hidden" : "";
  }

  function toggle() {
    const isHidden = panel.classList.toggle("hidden");
    tombol.setAttribute("aria-expanded", !isHidden);
    if (icon) icon.textContent = isHidden ? "menu" : "close";
    kunciScroll(!isHidden);
    if (!isHidden) {
      const pertama = panel.querySelector("a, button");
      if (pertama) pertama.focus({ preventScroll: true });
    }
  }

  function tutup() {
    panel.classList.add("hidden");
    tombol.setAttribute("aria-expanded", "false");
    if (icon) icon.textContent = "menu";
    kunciScroll(false);
  }

  // Layar melebar ke mode desktop: tutup menu mobile agar scroll tidak terkunci.
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 1280px)").matches && !panel.classList.contains("hidden")) tutup();
  });

  tombol.addEventListener("click", (e) => {
    e.stopPropagation();
    toggle();
  });

  // Klik di luar menutup panel mobile
  document.addEventListener("click", (e) => {
    if (!panel.contains(e.target) && !tombol.contains(e.target)) {
      tutup();
    }
  });

  // Tombol Escape menutup panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.classList.contains("hidden")) {
      tutup();
      tombol.focus();
    }
  });
}

function pasangDropdown() {
  document.querySelectorAll(".has-dropdown").forEach(dropdown => {
    const tombol = dropdown.querySelector(".dropdown-toggle");
    const wrapper = dropdown.querySelector(".dropdown-menu-wrapper");
    if (!tombol || !wrapper) return;

    function buka() {
      wrapper.classList.remove("hidden");
      tombol.setAttribute("aria-expanded", "true");
    }
    function tutup(kembalikanFokus) {
      wrapper.classList.add("hidden");
      tombol.setAttribute("aria-expanded", "false");
      if (kembalikanFokus) tombol.focus();
    }

    tombol.addEventListener("click", event => {
      event.stopPropagation();
      if (tombol.getAttribute("aria-expanded") === "true") tutup(false);
      else buka();
    });
    document.addEventListener("click", event => {
      if (!dropdown.contains(event.target)) tutup(false);
    });
    dropdown.addEventListener("keydown", event => {
      if (event.key === "Escape") tutup(true);
    });
    dropdown.addEventListener("focusout", event => {
      if (!dropdown.contains(event.relatedTarget)) tutup(false);
    });
  });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", muatKomponen);
} else {
  muatKomponen();
}

// ================= Hero halaman: nama halaman dalam huruf Braille =================
// Dekorasi pelengkap: tanpa JS, hero tetap utuh. Titik dirender dari atribut data-braille.
(function pasangBrailleHero() {
  const POLA = {
    a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5],
    h: [1, 2, 5], i: [2, 4], j: [2, 4, 5], k: [1, 3], l: [1, 2, 3], m: [1, 3, 4],
    n: [1, 3, 4, 5], o: [1, 3, 5], p: [1, 2, 3, 4], q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5],
    s: [2, 3, 4], t: [2, 3, 4, 5], u: [1, 3, 6], v: [1, 2, 3, 6], w: [2, 4, 5, 6],
    x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6]
  };
  function render() {
    document.querySelectorAll("[data-braille]").forEach((el) => {
      const kata = (el.getAttribute("data-braille") || "").toLowerCase().replace(/[^a-z]/g, "");
      if (!kata || el.querySelector(".braille__cells")) return;
      let urut = 0;
      const sel = kata.split("").map((huruf) => {
        const aktif = POLA[huruf] || [];
        let dots = "";
        // grid mengalir per kolom: titik 1,2,3 (kiri) lalu 4,5,6 (kanan)
        for (let d = 1; d <= 6; d++) {
          const on = aktif.indexOf(d) !== -1;
          dots += `<span class="braille__dot${on ? " is-on" : ""}"${on ? ` style="--i:${urut++}"` : ""}></span>`;
        }
        return `<span class="braille__cell">${dots}</span>`;
      }).join("");
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", `Kata "${kata}" dalam huruf Braille`);
      el.innerHTML = `<div class="braille__cells" aria-hidden="true">${sel}</div>` +
        `<figcaption class="braille__caption" aria-hidden="true">Ditulis dalam huruf Braille: <strong>${kata}</strong></figcaption>`;
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
  else render();
})();
