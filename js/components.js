// Memuat header & footer bersama ke setiap halaman publik,
// lalu menyalakan menu hamburger (HP) dan dropdown "Tentang".

async function muatKomponen() {
  const headerSlot = document.getElementById("site-header-slot");
  const footerSlot = document.getElementById("site-footer-slot");

  if (headerSlot) {
    try {
      const res = await fetch("partials/header.html");
      headerSlot.innerHTML = await res.text();
      tandaiMenuAktif();
      pasangHamburger();
      pasangDropdown();
    } catch (e) {
      console.error("Gagal memuat header", e);
    }
  }

  if (footerSlot) {
    try {
      const res = await fetch("partials/footer.html");
      footerSlot.innerHTML = await res.text();
      const elTahun = document.getElementById("tahun");
      if (elTahun) elTahun.textContent = new Date().getFullYear();
      if (typeof muatPengaturanFooter === "function") muatPengaturanFooter();
    } catch (e) {
      console.error("Gagal memuat footer", e);
    }
  }
}

function tandaiMenuAktif() {
  const halaman = document.body.dataset.page;
  if (!halaman) return;
  const link = document.querySelector(`[data-page="${halaman}"]`);
  if (link) link.setAttribute("aria-current", "page");
}

function pasangHamburger() {
  const tombol = document.getElementById("tombol-menu");
  const nav = document.getElementById("nav-wrap");
  if (!tombol || !nav) return;
  tombol.addEventListener("click", () => {
    const buka = nav.classList.toggle("terbuka");
    tombol.setAttribute("aria-expanded", buka ? "true" : "false");
  });
}

function pasangDropdown() {
  const tombol = document.querySelector(".dropdown-toggle");
  const item = document.querySelector(".has-dropdown");
  if (!tombol || !item) return;
  tombol.addEventListener("click", (e) => {
    e.stopPropagation();
    const buka = item.classList.toggle("terbuka");
    tombol.setAttribute("aria-expanded", buka ? "true" : "false");
  });
  document.addEventListener("click", () => {
    item.classList.remove("terbuka");
    tombol.setAttribute("aria-expanded", "false");
  });
}

document.addEventListener("DOMContentLoaded", muatKomponen);
