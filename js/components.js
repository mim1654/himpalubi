// =========================================================
// HIMPALUBI — Komponen Header & Footer Bersama
// Memuat partials/header.html dan partials/footer.html ke slot
// serta menangani interaktivitas navbar, dropdown, dan aksesibilitas.
// =========================================================

async function muatKomponen() {
  const headerSlot = document.getElementById("site-header-slot");
  const footerSlot = document.getElementById("site-footer-slot");

  if (headerSlot) {
    try {
      let res = await fetch("partials/header.html");
      if (!res.ok) res = await fetch("header.html");
      if (res.ok) {
        headerSlot.innerHTML = await res.text();
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
      let res = await fetch("partials/footer.html");
      if (!res.ok) res = await fetch("footer.html");
      if (res.ok) {
        footerSlot.innerHTML = await res.text();
        const elTahun = document.getElementById("tahun");
        if (elTahun) elTahun.textContent = new Date().getFullYear();
        if (typeof muatPengaturanFooter === "function") muatPengaturanFooter();
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

  // Jika halaman adalah submenu Tentang (profil/struktur/program-kerja)
  if (["tentang", "struktur", "program-kerja"].includes(halaman)) {
    const btnTentang = document.getElementById("btn-dropdown-tentang");
    if (btnTentang) {
      btnTentang.classList.remove("text-secondary");
      btnTentang.classList.add("text-primary-container", "font-bold");
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

  function toggle() {
    const isHidden = panel.classList.toggle("hidden");
    tombol.setAttribute("aria-expanded", !isHidden);
    if (icon) icon.textContent = isHidden ? "menu" : "close";
  }

  function tutup() {
    panel.classList.add("hidden");
    tombol.setAttribute("aria-expanded", "false");
    if (icon) icon.textContent = "menu";
  }

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
  const tombol = document.getElementById("btn-dropdown-tentang");
  const dropdown = document.getElementById("nav-dropdown-tentang");
  if (!tombol || !dropdown) return;

  const wrapper = dropdown.querySelector(".dropdown-menu-wrapper");

  function buka() {
    if (wrapper) wrapper.classList.remove("hidden");
    tombol.setAttribute("aria-expanded", "true");
  }

  function tutup(kembalikanFokus) {
    if (wrapper) wrapper.classList.add("hidden");
    tombol.setAttribute("aria-expanded", "false");
    if (kembalikanFokus) tombol.focus();
  }

  tombol.addEventListener("click", (e) => {
    e.stopPropagation();
    const expanded = tombol.getAttribute("aria-expanded") === "true";
    if (expanded) tutup(false);
    else buka();
  });

  // Klik di luar menutup dropdown
  document.addEventListener("click", (e) => {
    if (!dropdown.contains(e.target)) tutup(false);
  });

  // Escape key closes dropdown
  dropdown.addEventListener("keydown", (e) => {
    if (e.key === "Escape") tutup(true);
  });

  // Focusout logic
  dropdown.addEventListener("focusout", (e) => {
    if (!dropdown.contains(e.relatedTarget)) tutup(false);
  });
}

document.addEventListener("DOMContentLoaded", muatKomponen);
