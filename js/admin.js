// ================= UTIL BERSAMA =================
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Keamanan URL: hanya izinkan http(s), data:image, atau path relatif; semua karakter atribut di-escape.
function urlGambarAman(u) {
  const s = String(u === null || u === undefined ? "" : u).trim();
  if (!s) return "";
  const adaSkema = /^[a-z][a-z0-9+.-]*:/i.test(s);
  const aman = /^https?:\/\//i.test(s) || /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,]/i.test(s) || (!adaSkema && !s.startsWith("//"));
  return aman ? escapeHtml(s) : "";
}
function urlTautanAman(u) {
  const s = String(u === null || u === undefined ? "" : u).trim();
  return /^https?:\/\//i.test(s) ? s : "";
}

// ================= TOAST NOTIFIKASI POPUP (FLOATING TOAST) =================
function tampilkanToast(pesan, jenis = "sukses") {
  let wrap = document.getElementById("admin-toast-container");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "admin-toast-container";
    wrap.className = "fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0";
    document.body.appendChild(wrap);
  }

  const toast = document.createElement("div");
  const isGagal = jenis === "gagal" || jenis === "error";
  const iconName = isGagal ? "error" : "check_circle";
  const iconColor = isGagal ? "text-error bg-error-container" : "text-emerald-700 bg-emerald-100";
  const borderColor = isGagal ? "border-error/20" : "border-emerald-500/20";

  toast.className = `pointer-events-auto flex items-start gap-3 p-3.5 bg-surface-container-lowest text-on-surface rounded-2xl shadow-xl border ${borderColor} transition-all duration-300 transform translate-y-[-10px] opacity-0 select-none`;
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");

  toast.innerHTML = `
    <div class="w-8 h-8 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0 mt-0.5">
      <span class="material-symbols-outlined text-[18px]">${iconName}</span>
    </div>
    <div class="min-w-0 flex-1 py-0.5">
      <p class="text-xs sm:text-sm font-semibold text-on-surface leading-tight">${isGagal ? "Perhatian" : "Berhasil"}</p>
      <p class="text-xs text-secondary mt-0.5 leading-snug">${escapeHtml(pesan)}</p>
    </div>
    <button type="button" class="w-6 h-6 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container-low flex items-center justify-center cursor-pointer transition-colors" aria-label="Tutup notifikasi">
      <span class="material-symbols-outlined text-[16px]">close</span>
    </button>
  `;

  const tutup = () => {
    toast.classList.add("opacity-0", "translate-x-4");
    setTimeout(() => toast.remove(), 250);
  };

  toast.querySelector("button")?.addEventListener("click", tutup);
  wrap.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-[-10px]", "opacity-0");
  });

  setTimeout(tutup, 3800);
}

// ================= UTIL: TOMBOL TOGGLE SANDI =================
function pasangTogglePassword(inputId, tombolId) {
  const input = document.getElementById(inputId);
  const tombol = document.getElementById(tombolId);
  if (!input || !tombol) return;
  tombol.addEventListener("click", () => {
    const kini = input.type === "password";
    input.type = kini ? "text" : "password";
    tombol.textContent = kini ? "Sembunyikan" : "Lihat";
  });
}

// ================= LOGIN =================
function pasangFormLogin(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  if (new URLSearchParams(window.location.search).get("akses") === "ditolak") {
    const pesanAwal = document.getElementById("pesan-login");
    if (pesanAwal) {
      pesanAwal.className = "form-message error";
      pesanAwal.textContent = "Akun ini tidak memiliki akses admin. Hubungi Admin Utama untuk mendapat undangan.";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pesanEl = document.getElementById("pesan-login");
    const tombol = form.querySelector("button[type=submit]");
    tombol.disabled = true;
    tombol.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
      <span>Memproses Masuk...</span>
    `;

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.password.value,
    });

    tombol.disabled = false;
    tombol.innerHTML = `
      <span>Masuk ke Dashboard</span>
      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
    `;

    if (error) {
      if (error.message && error.message.toLowerCase().includes("email not confirmed")) {
        pesanEl.className = "form-message error";
        pesanEl.textContent = "Email belum dikonfirmasi. Cek kotak masuk atau spam untuk tautan konfirmasi Supabase.";
      } else {
        pesanEl.className = "form-message error";
        pesanEl.textContent = "Email atau kata sandi yang Anda masukkan salah.";
      }
      return;
    }
    window.location.href = "dashboard.html";
  });
}

// Mengembalikan true jika pengguna adalah admin. Bila bukan admin: logout lalu arahkan ke login.
// Jika pengecekan gagal karena jaringan/server, pengguna TIDAK dikeluarkan (RLS tetap melindungi data).
async function wajibLogin() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
    return false;
  }
  const { data: baris, error } = await supabaseClient
    .from("admin_users")
    .select("id")
    .eq("id", data.session.user.id)
    .limit(1);
  if (error) {
    console.warn("Gagal memverifikasi peran admin:", error.message);
    return true;
  }
  if (!baris || baris.length === 0) {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html?akses=ditolak";
    return false;
  }
  return true;
}

// ================= MODAL KONFIRMASI UNIVERSAL (POPUP) =================
function tampilkanModalKonfirmasi({
  judul = "Konfirmasi Tindakan",
  pesan = "",
  teksKonfirmasi = "Ya",
  teksBatal = "Tidak",
  tipe = "danger",
  ikon = "warning",
  onKonfirmasi = () => {}
}) {
  const modalLama = document.getElementById("modal-konfirmasi-aksi");
  if (modalLama) modalLama.remove();

  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs transition-opacity duration-200 animate-fadeIn";
  overlay.id = "modal-konfirmasi-aksi";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const isDanger = tipe === "danger";
  const iconBg = isDanger ? "bg-error-container text-error" : "bg-primary-fixed text-primary";
  const btnConfirmClass = isDanger 
    ? "bg-error hover:bg-error/90 text-on-error shadow-sm hover:shadow-md" 
    : "bg-primary hover:bg-primary-container text-on-primary shadow-sm hover:shadow-md";

  const pesanHtml = pesan ? `<p class="text-xs sm:text-sm text-secondary mt-1.5 leading-relaxed">${escapeHtml(pesan)}</p>` : "";

  overlay.innerHTML = `
    <div class="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-5 sm:p-6 shadow-2xl border border-surface-container relative animate-fadeIn" onclick="event.stopPropagation()">
      <div class="flex items-center gap-3.5 mb-4">
        <div class="w-11 h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-[24px]">${ikon}</span>
        </div>
        <div class="min-w-0 flex-1">
          <h3 class="text-base sm:text-lg font-bold text-on-surface leading-snug">${escapeHtml(judul)}</h3>
          ${pesanHtml}
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-3.5 mt-2 border-t border-surface-container">
        <button type="button" id="btn-batal-konfirmasi" class="px-5 py-2 rounded-full border border-surface-container hover:bg-surface-container text-xs font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer min-h-[38px]">
          ${escapeHtml(teksBatal)}
        </button>
        <button type="button" id="btn-setuju-konfirmasi" class="px-6 py-2 rounded-full ${btnConfirmClass} text-xs font-semibold tracking-wide transition-all active:scale-[0.98] cursor-pointer min-h-[38px] flex items-center gap-1.5">
          <span>${escapeHtml(teksKonfirmasi)}</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const tutup = () => {
    overlay.remove();
    document.removeEventListener("keydown", esc);
  };
  const esc = (e) => {
    if (e.key === "Escape") tutup();
  };
  document.addEventListener("keydown", esc);

  overlay.querySelector("#btn-batal-konfirmasi")?.addEventListener("click", tutup);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) tutup();
  });

  const btnSetuju = overlay.querySelector("#btn-setuju-konfirmasi");
  btnSetuju?.addEventListener("click", async () => {
    btnSetuju.disabled = true;
    btnSetuju.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
      <span>Memproses...</span>
    `;
    try {
      await onKonfirmasi();
    } finally {
      tutup();
    }
  });
}

// ================= MODAL KONFIRMASI LOGOUT (POPUP) =================
function bukaModalKonfirmasiLogout() {
  tampilkanModalKonfirmasi({
    judul: "Apakah anda ingin keluar?",
    pesan: "",
    teksKonfirmasi: "Ya",
    teksBatal: "Tidak",
    ikon: "logout",
    tipe: "danger",
    onKonfirmasi: async () => {
      await supabaseClient.auth.signOut();
      window.location.href = "login.html";
    }
  });
}

function pasangTombolLogout(elId) {
  const handler = (e) => {
    e.preventDefault();
    bukaModalKonfirmasiLogout();
  };
  const el = document.getElementById(elId || "tombol-logout");
  if (el) el.addEventListener("click", handler);
  const navEl = document.getElementById("tombol-navbar-logout");
  if (navEl) navEl.addEventListener("click", handler);
}

async function tampilkanProfilAdmin() {
  const { data } = await supabaseClient.auth.getSession();
  const email = data?.session?.user?.email || "Admin";
  setTeks("admin-email", email);
  setTeks("admin-navbar-email", email);
  setTeks("admin-dropdown-email", email);
  const initial = email.charAt(0).toUpperCase();
  const av = document.getElementById("admin-avatar");
  if (av) av.textContent = initial;
  const navAv = document.getElementById("admin-navbar-avatar");
  if (navAv) navAv.textContent = initial;
  return email;
}

// ================= DAFTAR ADMIN BARU (admin/daftar.html) =================
function pasangFormDaftarAdmin(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pesanEl = document.getElementById("pesan-daftar");
    if (form.kode_undangan && form.kode_undangan.value.trim() === "") {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Kode undangan wajib diisi. Minta kode kepada Admin Utama.";
      form.kode_undangan.focus();
      return;
    }
    const tombol = form.querySelector("button[type=submit]");
    tombol.disabled = true;
    tombol.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[18px]">progress_activity</span>
      <span>Mendaftarkan...</span>
    `;

    const { error } = await supabaseClient.auth.signUp({
      email: form.email.value.trim(),
      password: form.password.value,
      options: { data: { kode_undangan: (form.kode_undangan ? form.kode_undangan.value.trim() : "") } },
    });

    tombol.disabled = false;
    tombol.innerHTML = `
      <span>Daftar Akun Admin</span>
      <span class="material-symbols-outlined text-[18px]" aria-hidden="true">check</span>
    `;

    if (error) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Pendaftaran gagal: " + error.message;
      return;
    }

    pesanEl.className = "form-message success";
    pesanEl.textContent = "Akun berhasil dibuat. Jika email dan kode undangan Anda benar, Anda dapat langsung masuk melalui halaman login.";
    form.reset();
  });
}

// ================= KELOLA ADMIN (Khusus Admin Utama) =================
async function renderKelolaAdminJikaUtama() {
  const { data: sesi } = await supabaseClient.auth.getSession();
  const uid = sesi?.session?.user?.id;
  if (!uid) return false;

  const { data: profilSaya } = await supabaseClient
    .from("admin_users")
    .select("peran")
    .eq("id", uid)
    .maybeSingle();

  if (!profilSaya || profilSaya.peran !== "utama") return false;

  const navSlot = document.getElementById("grup-admin-slot");
  if (navSlot) {
    navSlot.innerHTML = `
      <div>
        <p class="text-[11px] font-semibold text-secondary uppercase tracking-wider px-3 mb-1.5">Admin Utama</p>
        <ul class="space-y-1">
          <li>
            <a href="#kelola-admin" data-section="kelola-admin" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
              <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">admin_panel_settings</span>
              <span>Kelola Admin</span>
            </a>
          </li>
        </ul>
      </div>
    `;
  }

  const sectionSlot = document.getElementById("kelola-admin-slot");
  if (sectionSlot) {
    sectionSlot.innerHTML = `
      <section id="kelola-admin" class="admin-section">
        
        <div class="mb-6">
          <div class="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <span class="material-symbols-outlined text-[16px]">admin_panel_settings</span>
            <span>Hak Istimewa</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Kelola Hak Akses Admin</h1>
          <p class="text-sm text-secondary mt-1">Khusus Admin Utama: undang administrator baru, pantau akun aktif, dan atur kata sandi.</p>
        </div>

        <div class="bg-surface-container-lowest rounded-2xl p-6 border border-surface-container shadow-sm mb-6">
          <h2 class="text-lg font-bold text-on-surface tracking-tight mb-4">Undang Admin Baru</h2>
          <form id="form-undang-admin" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="sm:col-span-2">
              <label for="email-undangan" class="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">Email Calon Admin</label>
              <input type="email" id="email-undangan" name="email" required placeholder="nama@email.com" class="w-full px-4 py-2.5 bg-surface rounded-xl border border-surface-container text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
              <p class="text-[11px] text-secondary mt-1.5">Setelah diundang, berikan <strong>kode undangan</strong> yang muncul kepada yang bersangkutan, lalu minta membuka <strong>admin/daftar.html</strong> dengan email yang sama.</p>
            </div>
            <div class="flex items-end">
              <button type="submit" class="w-full py-2.5 px-6 rounded-full bg-primary hover:bg-primary-container text-on-primary text-sm font-semibold tracking-wide shadow-sm hover:shadow-md transition-all active:scale-[0.98] min-h-[44px]">
                Kirim Undangan
              </button>
            </div>
          </form>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div class="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden shadow-sm">
            <div class="p-4 bg-surface-container-low border-b border-surface-container">
              <h3 class="text-sm font-bold text-on-surface">Undangan Menunggu Klaim</h3>
            </div>
            <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Tabel undangan menunggu klaim">
              <table class="w-full text-left border-collapse text-sm">
                <thead>
                  <tr class="bg-surface-container-low border-b border-surface-container text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    <th scope="col" class="py-3 px-4">Email</th>
                    <th scope="col" class="py-3 px-4">Tanggal Diundang</th>
                    <th scope="col" class="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody id="tabel-undangan-admin" class="divide-y divide-surface-container text-on-surface" aria-live="polite">
                  <tr><td colspan="3" class="py-4 px-4 text-center text-secondary text-xs">Memuat data...</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden shadow-sm">
            <div class="p-4 bg-surface-container-low border-b border-surface-container">
              <h3 class="text-sm font-bold text-on-surface">Daftar Admin Aktif</h3>
            </div>
            <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Tabel admin aktif">
              <table class="w-full text-left border-collapse text-sm">
                <thead>
                  <tr class="bg-surface-container-low border-b border-surface-container text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    <th scope="col" class="py-3 px-4">Email</th>
                    <th scope="col" class="py-3 px-4">Peran</th>
                    <th scope="col" class="py-3 px-4">Terdaftar</th>
                    <th scope="col" class="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody id="tabel-admin-aktif" class="divide-y divide-surface-container text-on-surface" aria-live="polite">
                  <tr><td colspan="4" class="py-4 px-4 text-center text-secondary text-xs">Memuat data...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="bg-surface-container-lowest rounded-2xl border border-surface-container overflow-hidden shadow-sm">
          <div class="p-4 bg-surface-container-low border-b border-surface-container">
            <h3 class="text-sm font-bold text-on-surface">Riwayat Aktivitas Reset Sandi</h3>
          </div>
          <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Tabel riwayat reset sandi">
            <table class="w-full text-left border-collapse text-sm">
              <thead>
                <tr class="bg-surface-container-low border-b border-surface-container text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  <th scope="col" class="py-3 px-4">Dilakukan Oleh</th>
                  <th scope="col" class="py-3 px-4">Aktivitas</th>
                  <th scope="col" class="py-3 px-4 text-right">Waktu</th>
                </tr>
              </thead>
              <tbody id="tabel-riwayat-reset" class="divide-y divide-surface-container text-on-surface" aria-live="polite">
                <tr><td colspan="3" class="py-4 px-4 text-center text-secondary text-xs">Memuat riwayat...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;

    pasangFormUndangAdmin("form-undang-admin");
    muatUndanganAdmin();
    muatDaftarAdminAktifUtama();
    muatRiwayatResetSandi();

    // Pasang ulang handler navigasi agar mencakup menu dinamis admin utama
    pasangNavigasiTab();
  }

  return true;
}

// ================= SISTEM PAGINASI UNIVERSAL (MAKS 15 BARIS) =================
const BATAS_PER_HALAMAN = 15;
const _statusHalamanTabel = {};

function aturHalamanTabel(tabelId, nomorHalaman) {
  _statusHalamanTabel[tabelId] = nomorHalaman;
}

function ambilHalamanTabel(tabelId) {
  return _statusHalamanTabel[tabelId] || 1;
}

function renderBarisPaginasi(tabelId, totalData, halamanSaatIni, onGantiHalaman) {
  const tabelEl = document.getElementById(tabelId);
  if (!tabelEl) return;
  
  const cardContainer = tabelEl.closest(".bg-surface-container-lowest") || tabelEl.parentElement;
  let paginasiEl = document.getElementById(`paginasi-${tabelId}`);
  if (!paginasiEl) {
    paginasiEl = document.createElement("div");
    paginasiEl.id = `paginasi-${tabelId}`;
    paginasiEl.className = "px-4 py-3 bg-surface-container-low/60 border-t border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs";
    cardContainer.appendChild(paginasiEl);
  }

  if (totalData <= 0) {
    paginasiEl.innerHTML = "";
    paginasiEl.classList.add("hidden");
    return;
  }
  paginasiEl.classList.remove("hidden");

  const totalHalaman = Math.ceil(totalData / BATAS_PER_HALAMAN) || 1;
  const page = Math.min(Math.max(1, halamanSaatIni), totalHalaman);
  const awal = (page - 1) * BATAS_PER_HALAMAN + 1;
  const akhir = Math.min(page * BATAS_PER_HALAMAN, totalData);

  let tombolHalamanHtml = "";
  if (totalHalaman > 1) {
    for (let i = 1; i <= totalHalaman; i++) {
      if (i === 1 || i === totalHalaman || (i >= page - 1 && i <= page + 1)) {
        const aktif = i === page;
        tombolHalamanHtml += `
          <button type="button" data-page="${i}" class="min-w-[32px] h-8 px-2 rounded-lg flex items-center justify-center text-xs font-semibold transition-all cursor-pointer ${
            aktif 
              ? "bg-primary text-on-primary shadow-xs font-bold" 
              : "bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-surface-container"
          }">
            ${i}
          </button>
        `;
      } else if (i === page - 2 || i === page + 2) {
        tombolHalamanHtml += `<span class="w-5 text-center text-secondary font-bold select-none">&hellip;</span>`;
      }
    }
  }

  paginasiEl.innerHTML = `
    <div class="text-secondary font-medium flex items-center gap-1.5">
      <span>Menampilkan</span>
      <span class="font-bold text-on-surface">${awal}&ndash;${akhir}</span>
      <span>dari</span>
      <span class="font-bold text-on-surface">${totalData}</span>
      <span>data</span>
    </div>

    ${totalHalaman > 1 ? `
      <div class="flex items-center gap-1.5 self-end sm:self-auto">
        <button type="button" id="btn-prev-${tabelId}" class="px-2.5 h-8 rounded-lg flex items-center gap-1 text-xs font-semibold bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer" ${page <= 1 ? "disabled" : ""}>
          <span class="material-symbols-outlined text-[16px]">chevron_left</span>
          <span class="hidden sm:inline">Sebelumnya</span>
        </button>

        <div class="flex items-center gap-1">
          ${tombolHalamanHtml}
        </div>

        <button type="button" id="btn-next-${tabelId}" class="px-2.5 h-8 rounded-lg flex items-center gap-1 text-xs font-semibold bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-surface-container disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer" ${page >= totalHalaman ? "disabled" : ""}>
          <span class="hidden sm:inline">Selanjutnya</span>
          <span class="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    ` : ""}
  `;

  paginasiEl.querySelectorAll("button[data-page]").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetPage = parseInt(btn.dataset.page, 10);
      if (targetPage !== page) {
        aturHalamanTabel(tabelId, targetPage);
        onGantiHalaman(targetPage);
      }
    });
  });

  paginasiEl.querySelector(`#btn-prev-${tabelId}`)?.addEventListener("click", () => {
    if (page > 1) {
      aturHalamanTabel(tabelId, page - 1);
      onGantiHalaman(page - 1);
    }
  });

  paginasiEl.querySelector(`#btn-next-${tabelId}`)?.addEventListener("click", () => {
    if (page < totalHalaman) {
      aturHalamanTabel(tabelId, page + 1);
      onGantiHalaman(page + 1);
    }
  });
}

async function muatUndanganAdmin(page) {
  const el = document.getElementById("tabel-undangan-admin");
  if (!el) return;
  if (!page) page = ambilHalamanTabel("tabel-undangan-admin");
  aturHalamanTabel("tabel-undangan-admin", page);

  el.innerHTML = skeletonBarisTabel(3, 2);
  const { data, error } = await supabaseClient.from("admin_undangan").select("*").order("dibuat_pada", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="3" class="py-4 px-4 text-center text-error text-xs">Gagal memuat data.</td></tr>`; return; }

  const total = data ? data.length : 0;
  if (!total) {
    el.innerHTML = `<tr><td colspan="3">${emptyState("Tidak ada undangan", "Undangan yang belum diklaim akan muncul di sini.", { icon: "mail" })}</td></tr>`;
    renderBarisPaginasi("tabel-undangan-admin", 0, 1, () => {});
    return;
  }

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = data.slice(offset, offset + BATAS_PER_HALAMAN);

  el.innerHTML = paged.map(u => `
    <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
      <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(u.email)}${u.kode ? `<div class="mt-0.5 text-[11px] font-normal text-secondary">Kode undangan: <span class="font-mono font-semibold text-on-surface select-all">${escapeHtml(u.kode)}</span></div>` : ""}</td>
      <td class="py-3.5 px-4 text-secondary text-xs">${formatTanggal(u.dibuat_pada)}</td>
      <td class="py-3.5 px-4 text-right">
        <button type="button" onclick="batalkanUndangan('${u.email.replace(/'/g, "\\'")}')" title="Batalkan Undangan" aria-label="Batalkan Undangan" class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-error bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-error/20 cursor-pointer">
          <span class="material-symbols-outlined text-[18px]">cancel</span>
        </button>
      </td>
    </tr>
  `).join("");

  renderBarisPaginasi("tabel-undangan-admin", total, page, (hal) => muatUndanganAdmin(hal));
}

function pasangFormUndangAdmin(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const { data: sesiUndang } = await supabaseClient.auth.getSession();
    const emailAdminSaatIni = sesiUndang?.session?.user?.email || null;

    const { data: undanganBaru, error } = await supabaseClient.from("admin_undangan").insert({
      email,
      diundang_oleh: emailAdminSaatIni,
    }).select().single();

    if (error) {
      tampilkanToast(error.code === "23505" ? "Email tersebut sudah diundang sebelumnya." : "Gagal mengirimkan undangan.", "gagal");
      console.error(error);
      return;
    }

    const kodeBaru = undanganBaru && undanganBaru.kode;
    tampilkanToast(kodeBaru ? `Undangan dibuat untuk ${email}. Berikan kode ini kepada yang bersangkutan: ${kodeBaru}` : `Undangan berhasil terkirim untuk ${email}.`, "sukses");
    form.reset();
    muatUndanganAdmin();
  });
}

function batalkanUndangan(email) {
  tampilkanModalKonfirmasi({
    judul: "Batalkan Undangan Admin?",
    pesan: `Apakah Anda yakin ingin membatalkan undangan registrasi admin untuk ${email}?`,
    teksKonfirmasi: "Ya, Batalkan",
    teksBatal: "Kembali",
    ikon: "cancel",
    tipe: "danger",
    onKonfirmasi: async () => {
      const { error: errHapus } = await supabaseClient.from("admin_undangan").delete().eq("email", email);
      if (errHapus) { tampilkanToast("Gagal menghapus data: " + errHapus.message, "gagal"); console.error(errHapus); return; }
      muatUndanganAdmin();
      tampilkanToast(`Undangan untuk ${email} berhasil dibatalkan.`, "sukses");
    }
  });
}

async function muatDaftarAdminAktifUtama(page) {
  const el = document.getElementById("tabel-admin-aktif");
  if (!el) return;
  if (!page) page = ambilHalamanTabel("tabel-admin-aktif");
  aturHalamanTabel("tabel-admin-aktif", page);

  el.innerHTML = skeletonBarisTabel(4, 2);
  const { data, error } = await supabaseClient.from("admin_users").select("*").order("dibuat_pada");
  if (error) { el.innerHTML = `<tr><td colspan="4" class="py-4 px-4 text-center text-error text-xs">Gagal memuat data.</td></tr>`; return; }

  const total = data ? data.length : 0;
  if (!total) {
    el.innerHTML = `<tr><td colspan="4">${emptyState("Belum ada admin", "Undang admin pertama melalui formulir di atas.", { icon: "group_off" })}</td></tr>`;
    renderBarisPaginasi("tabel-admin-aktif", 0, 1, () => {});
    return;
  }

  const { data: sesi } = await supabaseClient.auth.getSession();
  const emailSaatIni = sesi?.session?.user?.email;

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = data.slice(offset, offset + BATAS_PER_HALAMAN);

  el.innerHTML = paged.map(a => `
    <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
      <td class="py-3.5 px-4 font-semibold text-on-surface">
        ${escapeHtml(a.email)}${a.email === emailSaatIni ? ' <span class="text-xs text-primary font-bold">(Anda)</span>' : ""}
      </td>
      <td class="py-3.5 px-4">
        ${a.peran === "utama" 
          ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-fixed text-on-primary-fixed border border-primary/20"><span class="material-symbols-outlined text-[14px]">shield_person</span>Utama</span>' 
          : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high text-secondary border border-surface-container"><span class="material-symbols-outlined text-[14px]">person</span>Admin</span>'}
      </td>
      <td class="py-3.5 px-4 text-secondary text-xs">${formatTanggal(a.dibuat_pada)}</td>
      <td class="py-3.5 px-4 text-right">
        ${a.peran === "utama" ? '<span class="text-xs text-secondary">-</span>' : `
          <div class="inline-flex items-center gap-1.5 justify-end">
            <button type="button" onclick="bukaModalResetSandi('${a.id}','${a.email.replace(/'/g, "\\'")}')" title="Reset Kata Sandi" aria-label="Reset Kata Sandi" class="w-8 h-8 rounded-lg flex items-center justify-center text-amber-700 bg-amber-50 hover:bg-amber-100 transition-all active:scale-95 focus:ring-2 focus:ring-amber-500/20 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">lock_reset</span>
            </button>
            <button type="button" onclick="cabutAksesAdmin('${a.id}','${a.email.replace(/'/g, "\\'")}')" title="Cabut Akses Admin" aria-label="Cabut Akses Admin" class="w-8 h-8 rounded-lg flex items-center justify-center text-error bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-error/20 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">person_remove</span>
            </button>
          </div>
        `}
      </td>
    </tr>
  `).join("");

  renderBarisPaginasi("tabel-admin-aktif", total, page, (hal) => muatDaftarAdminAktifUtama(hal));
}

function cabutAksesAdmin(id, email) {
  tampilkanModalKonfirmasi({
    judul: "Cabut Akses Admin?",
    pesan: `Cabut hak akses admin untuk ${email}? Akun login tidak dihapus, hanya akses ke dashboard admin yang dinonaktifkan.`,
    teksKonfirmasi: "Ya, Cabut Akses",
    teksBatal: "Batal",
    ikon: "person_remove",
    tipe: "danger",
    onKonfirmasi: async () => {
      const { error: errHapus } = await supabaseClient.from("admin_users").delete().eq("id", id);
      if (errHapus) { tampilkanToast("Gagal menghapus data: " + errHapus.message, "gagal"); console.error(errHapus); return; }
      tampilkanToast(`Akses admin untuk ${email} telah dicabut.`, "sukses");
      muatDaftarAdminAktifUtama();
    }
  });
}

// ---------- Modal Reset Sandi ----------
let _escapeHandlerResetSandi = null;

function bukaModalResetSandi(userId, email) {
  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs";
  overlay.id = "modal-reset-sandi";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-[22px]">lock_reset</span>
        </div>
        <div class="min-w-0">
          <h3 class="text-lg font-bold text-on-surface">Reset Sandi Akun</h3>
          <p class="text-xs text-secondary truncate">${escapeHtml(email)}</p>
        </div>
      </div>
      <div class="mb-5">
        <label for="input-sandi-baru" class="block text-xs font-semibold text-on-surface uppercase tracking-wider mb-1.5">Kata Sandi Baru</label>
        <div class="relative">
          <input type="password" id="input-sandi-baru" minlength="8" placeholder="Minimal 8 karakter" autocomplete="new-password" name="sandi-baru-${userId}" class="w-full pl-3.5 pr-20 py-2.5 bg-surface rounded-xl border border-surface-container text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
          <button type="button" id="tombol-lihat-sandi" class="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-semibold text-secondary hover:text-primary rounded-lg transition-colors">Lihat</button>
        </div>
      </div>
      <div class="flex items-center justify-end gap-3 pt-2">
        <button type="button" id="tombol-batal-reset" class="px-5 py-2.5 rounded-full border border-surface-container hover:bg-surface-container text-xs font-semibold text-secondary hover:text-on-surface transition-colors min-h-[40px]">Batal</button>
        <button type="button" id="tombol-konfirmasi-reset" class="px-6 py-2.5 rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold tracking-wide shadow-sm transition-all active:scale-[0.98] min-h-[40px]">Reset Sandi</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById("input-sandi-baru");
  if (input) input.focus();

  function tutupPakaiEscape(e) {
    if (e.key === "Escape") tutupModalResetSandi();
  }
  _escapeHandlerResetSandi = tutupPakaiEscape;
  document.addEventListener("keydown", tutupPakaiEscape);

  document.getElementById("tombol-lihat-sandi")?.addEventListener("click", () => {
    const tombol = document.getElementById("tombol-lihat-sandi");
    const kini = input.type === "password";
    input.type = kini ? "text" : "password";
    tombol.textContent = kini ? "Sembunyikan" : "Lihat";
  });

  document.getElementById("tombol-batal-reset")?.addEventListener("click", tutupModalResetSandi);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) tutupModalResetSandi(); });
  document.getElementById("tombol-konfirmasi-reset")?.addEventListener("click", () => konfirmasiResetSandi(userId, email));
}

function tutupModalResetSandi() {
  const overlay = document.getElementById("modal-reset-sandi");
  if (overlay) overlay.remove();
  if (_escapeHandlerResetSandi) {
    document.removeEventListener("keydown", _escapeHandlerResetSandi);
    _escapeHandlerResetSandi = null;
  }
}

async function konfirmasiResetSandi(userId, email) {
  const input = document.getElementById("input-sandi-baru");
  const sandiBaru = input?.value;

  if (!sandiBaru || sandiBaru.length < 8) {
    tampilkanToast("Kata sandi baru minimal 8 karakter.", "gagal");
    return;
  }

  const tombol = document.getElementById("tombol-konfirmasi-reset");
  tombol.disabled = true;
  tombol.textContent = "Memproses...";

  const { data: sesi } = await supabaseClient.auth.getSession();
  const token = sesi?.session?.access_token;
  if (!token) { tampilkanToast("Sesi tidak valid, silakan login ulang.", "gagal"); return; }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/reset-password-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ target_user_id: userId, password_baru: sandiBaru }),
    });
    const hasil = await res.json();

    if (!res.ok) {
      tampilkanToast(hasil.error || "Gagal mereset kata sandi.", "gagal");
      tombol.disabled = false;
      tombol.textContent = "Reset Sandi";
      return;
    }

    tampilkanToast(`Kata sandi akun ${email} berhasil direset.`, "sukses");
    tutupModalResetSandi();
    muatDaftarAdminAktifUtama();
    muatRiwayatResetSandi();
  } catch (e) {
    tampilkanToast("Gagal menghubungi server fungsi reset sandi.", "gagal");
    console.error(e);
    tombol.disabled = false;
    tombol.textContent = "Reset Sandi";
  }
}

async function muatRiwayatResetSandi(page) {
  const el = document.getElementById("tabel-riwayat-reset");
  if (!el) return;
  if (!page) page = ambilHalamanTabel("tabel-riwayat-reset");
  aturHalamanTabel("tabel-riwayat-reset", page);

  el.innerHTML = skeletonBarisTabel(3, 2);
  const { data, error } = await supabaseClient
    .from("admin_activity_log")
    .select("*")
    .order("waktu", { ascending: false });

  if (error) { el.innerHTML = `<tr><td colspan="3" class="py-4 px-4 text-center text-error text-xs">Gagal memuat riwayat.</td></tr>`; return; }

  const total = data ? data.length : 0;
  if (!total) {
    el.innerHTML = `<tr><td colspan="3">${emptyState("Belum ada riwayat", "Aktivitas reset sandi akan tercatat di sini.", { icon: "history" })}</td></tr>`;
    renderBarisPaginasi("tabel-riwayat-reset", 0, 1, () => {});
    return;
  }

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = data.slice(offset, offset + BATAS_PER_HALAMAN);

  el.innerHTML = paged.map(l => `
    <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
      <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(l.dilakukan_oleh_email || "-")}</td>
      <td class="py-3.5 px-4 text-secondary text-xs">Reset sandi untuk ${escapeHtml(l.target_email || "-")}</td>
      <td class="py-3.5 px-4 text-right text-secondary text-xs">${formatTanggal(l.waktu)}</td>
    </tr>
  `).join("");

  renderBarisPaginasi("tabel-riwayat-reset", total, page, (hal) => muatRiwayatResetSandi(hal));
}

// ================= UPLOAD FOTO (Supabase Storage) =================
function kompresGambar(file, maxDimensi = 1200, kualitas = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = reject;
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimensi || height > maxDimensi) {
        if (width > height) { height = Math.round(height * (maxDimensi / width)); width = maxDimensi; }
        else { width = Math.round(width * (maxDimensi / height)); height = maxDimensi; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", kualitas);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAKS_UKURAN_FILE = 5 * 1024 * 1024; // 5 MB

async function unggahFotoJikaAda(inputFileId, urlLama, maxDimensi = 1200) {
  const input = document.getElementById(inputFileId);
  if (!input || !input.files || !input.files[0]) return urlLama || null;

  const fileAsli = input.files[0];
  if (fileAsli.size > MAKS_UKURAN_FILE) {
    throw new Error(`Ukuran file "${fileAsli.name}" (${(fileAsli.size / (1024 * 1024)).toFixed(2)} MB) melebihi batas maksimal 5 MB.`);
  }

  const blobKecil = await kompresGambar(fileAsli, maxDimensi);
  const namaFile = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error } = await supabaseClient.storage.from("foto").upload(namaFile, blobKecil, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) {
    throw new Error("Gagal mengunggah foto: " + error.message);
  }
  const { data } = supabaseClient.storage.from("foto").getPublicUrl(namaFile);
  return data.publicUrl;
}

async function hapusFotoDariStorage(url) {
  if (!url || !url.includes("/storage/v1/object/public/foto/")) return;
  try {
    const namaFile = url.split("/storage/v1/object/public/foto/")[1];
    if (namaFile) await supabaseClient.storage.from("foto").remove([namaFile]);
  } catch (e) {
    console.error("Gagal menghapus foto lama:", e);
  }
}

function pasangPratinjauFoto(inputFileId, previewElId) {
  const input = document.getElementById(inputFileId);
  const preview = document.getElementById(previewElId);
  if (!input || !preview) return;
  input.addEventListener("change", () => {
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > MAKS_UKURAN_FILE) {
        tampilkanToast(`Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maksimal upload adalah 5 MB.`, "gagal");
        input.value = "";
        preview.innerHTML = "";
        return;
      }
      const url = URL.createObjectURL(file);
      preview.innerHTML = `
        <div class="inline-flex items-center gap-2 p-1.5 bg-surface-container-low rounded-xl border border-surface-container">
          <img src="${url}" alt="Pratinjau Foto" class="w-16 h-16 object-cover rounded-lg shadow-xs">
          <div class="flex flex-col text-xs pr-2">
            <span class="font-semibold text-on-surface">Foto baru dipilih</span>
            <span class="text-secondary">${(file.size / (1024 * 1024)).toFixed(2)} MB</span>
          </div>
        </div>
      `;
    }
  });
}

function tampilkanFotoLama(previewElId, url) {
  const preview = document.getElementById(previewElId);
  if (!preview) return;
  preview.innerHTML = url ? `
    <div class="inline-flex items-center gap-2 p-1.5 bg-surface-container-low rounded-xl border border-surface-container">
      <img src="${urlGambarAman(url)}" alt="Foto Saat Ini" class="w-16 h-16 object-cover rounded-lg shadow-xs">
      <span class="text-xs text-secondary pr-2">Foto saat ini</span>
    </div>
  ` : "";
}

function pasangImportExportAnggota() {
  const tombolTemplate = document.getElementById("tombol-unduh-template-anggota");
  const inputImport = document.getElementById("input-import-anggota");
  const tombolExport = document.getElementById("tombol-unduh-excel-anggota");
  const pesanEl = document.getElementById("pesan-import-anggota");

  if (tombolTemplate) {
    tombolTemplate.addEventListener("click", () => {
      const data = [
        { Nama: "Contoh Nama Anggota", NIM: "231F10014", Jabatan: "", Angkatan: "2023", Status: "Aktif" },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, "template-import-anggota-himpalubi.xlsx");
    });
  }

  if (inputImport) {
    inputImport.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > MAKS_UKURAN_FILE) {
        pesanEl.className = "form-message error";
        pesanEl.textContent = `Ukuran berkas terlalu besar (${(file.size / (1024 * 1024)).toFixed(2)} MB). Batas maksimal adalah 5 MB.`;
        inputImport.value = "";
        return;
      }
      pesanEl.className = "form-message info";
      pesanEl.textContent = "Membaca berkas data...";

      try {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows.length) {
          pesanEl.className = "form-message error";
          pesanEl.textContent = "Berkas kosong atau format kolom tidak dikenali.";
          return;
        }

        const payload = rows
          .filter(r => r.Nama || r.nama)
          .map(r => ({
            nama: String(r.Nama || r.nama || "").trim(),
            nim: r.NIM || r.nim ? String(r.NIM || r.nim).trim() : null,
            jabatan: r.Jabatan || r.jabatan ? String(r.Jabatan || r.jabatan).trim() : null,
            angkatan: r.Angkatan || r.angkatan ? String(r.Angkatan || r.angkatan).trim() : null,
            status: (r.Status || r.status || "Aktif").trim(),
            kategori: "Anggota",
          }));

        if (!payload.length) {
          pesanEl.className = "form-message error";
          pesanEl.textContent = "Tidak ada baris data valid (kolom Nama wajib diisi).";
          return;
        }

        const { error } = await supabaseClient.from("anggota").insert(payload);
        if (error) {
          pesanEl.className = "form-message error";
          pesanEl.textContent = "Gagal mengimpor: " + error.message;
          console.error(error);
          return;
        }

        pesanEl.className = "form-message success";
        pesanEl.textContent = `Sebanyak ${payload.length} data anggota berhasil diimpor.`;
        tampilkanToast(`${payload.length} data anggota ditambahkan.`, "sukses");
        inputImport.value = "";
        muatTabelOrang("Anggota", "tabel-anggota");
        muatRingkasan();
      } catch (err) {
        pesanEl.className = "form-message error";
        pesanEl.textContent = "Gagal membaca berkas. Pastikan format file .xlsx, .xls, atau .csv.";
        console.error(err);
      }
    });
  }

  if (tombolExport) {
    tombolExport.addEventListener("click", async () => {
      const { data, error } = await supabaseClient.from("anggota").select("*").eq("kategori", "Anggota").order("angkatan", { ascending: false });
      if (error || !data) { tampilkanToast("Gagal mengambil data anggota.", "gagal"); return; }

      const rows = data.map(a => ({
        Nama: a.nama,
        NIM: a.nim || "",
        Jabatan: a.jabatan || "",
        Angkatan: a.angkatan || "",
        Status: a.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Anggota");
      XLSX.writeFile(wb, `data-anggota-himpalubi-${new Date().toISOString().slice(0, 10)}.xlsx`);
    });
  }
}

// ================= TAB DALAM 1 SECTION (Kelola Konten) =================
function pasangSubTab(containerSelector) {
  if (window._subTabTerpasang) return;
  window._subTabTerpasang = true;

  document.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".tab-btn[data-tab-target]");
    if (!tabBtn) return;
    e.preventDefault();

    const targetId = tabBtn.dataset.tabTarget;
    const parentContainer = tabBtn.closest(".admin-section") || tabBtn.closest("main") || document;
    const tabSwitch = tabBtn.closest(".tab-switch") || parentContainer;

    tabSwitch.querySelectorAll(".tab-btn").forEach(btn => {
      const isAktif = btn === tabBtn;
      btn.classList.toggle("aktif", isAktif);
      btn.setAttribute("aria-selected", isAktif ? "true" : "false");
    });

    parentContainer.querySelectorAll(".tab-panel").forEach(panel => {
      const isTarget = panel.id === targetId;
      panel.hidden = !isTarget;
      panel.classList.toggle("aktif", isTarget);
    });
  });
}

// ================= UNDUH WORD (html-docx-js) =================
function buatDocxDanUnduh(html, namaFile) {
  const htmlLengkap = `<html><head><meta charset="utf-8"></head><body style="font-family: Calibri, Arial, sans-serif;">${html}</body></html>`;
  const blob = htmlDocx.asBlob(htmlLengkap);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function namaFileAman(teks) {
  return teks.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

async function unduhSatuKonten(id, kategori) {
  const { data, error } = await supabaseClient.from("berita").select("*").eq("id", id).single();
  if (error || !data) { tampilkanToast("Gagal mengambil data.", "gagal"); return; }
  const isiHtml = `
    <h1>${escapeHtml(data.judul)}</h1>
    <p><em>${formatTanggal(data.tanggal)}${data.penulis ? " &middot; " + escapeHtml(data.penulis) : ""}</em></p>
    ${(data.isi || "").split(/\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join("")}
  `;
  buatDocxDanUnduh(isiHtml, `${namaFileAman(data.judul)}.docx`);
}

async function unduhSatuProgram(id) {
  const { data, error } = await supabaseClient.from("program_kerja").select("*").eq("id", id).single();
  if (error || !data) { tampilkanToast("Gagal mengambil data program.", "gagal"); return; }
  const isiHtml = `
    <h1>${escapeHtml(data.nama_program)}</h1>
    <p><em>Divisi: ${escapeHtml(data.divisi)} &middot; Status: ${escapeHtml(data.status)}</em></p>
    ${data.deskripsi ? `<p>${escapeHtml(data.deskripsi)}</p>` : ""}
  `;
  buatDocxDanUnduh(isiHtml, `${namaFileAman(data.nama_program)}.docx`);
}

async function unduhSemuaKonten(kategori, namaTombolId) {
  const tombol = document.getElementById(namaTombolId);
  const labelAsli = tombol ? tombol.innerHTML : "";
  if (tombol) {
    tombol.disabled = true;
    tombol.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
      <span>Menyiapkan file...</span>
    `;
  }

  const { data, error } = await supabaseClient.from("berita").select("*").eq("kategori", kategori).order("tanggal", { ascending: false });

  if (tombol) {
    tombol.disabled = false;
    tombol.innerHTML = labelAsli;
  }

  if (error || !data || !data.length) { tampilkanToast(`Tidak ada ${kategori.toLowerCase()} untuk diunduh.`, "gagal"); return; }

  const isiHtml = data.map(b => `
    <h1>${escapeHtml(b.judul)}</h1>
    <p><em>${formatTanggal(b.tanggal)}${b.penulis ? " &middot; " + escapeHtml(b.penulis) : ""}</em></p>
    ${(b.isi || "").split(/\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join("")}
    <hr>
  `).join("");

  buatDocxDanUnduh(
    `<h1 style="text-align:center;">Kumpulan ${escapeHtml(kategori)} HIMPALUBI</h1><hr>${isiHtml}`,
    `kumpulan-${kategori.toLowerCase()}-himpalubi-${new Date().toISOString().slice(0, 10)}.docx`
  );
}

async function unduhSemuaProgram() {
  const tombol = document.getElementById("tombol-unduh-word-program");
  const labelAsli = tombol ? tombol.innerHTML : "";
  if (tombol) {
    tombol.disabled = true;
    tombol.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
      <span>Menyiapkan file...</span>
    `;
  }

  const { data, error } = await supabaseClient.from("program_kerja").select("*").order("divisi");

  if (tombol) {
    tombol.disabled = false;
    tombol.innerHTML = labelAsli;
  }

  if (error || !data || !data.length) { tampilkanToast("Tidak ada data program kerja untuk diunduh.", "gagal"); return; }

  const isiHtml = data.map(p => `
    <h1>${escapeHtml(p.nama_program)}</h1>
    <p><em>Divisi: ${escapeHtml(p.divisi)} &middot; Status: ${escapeHtml(p.status)}</em></p>
    ${p.deskripsi ? `<p>${escapeHtml(p.deskripsi)}</p>` : ""}
    <hr>
  `).join("");

  buatDocxDanUnduh(
    `<h1 style="text-align:center;">Kumpulan Program Kerja HIMPALUBI</h1><hr>${isiHtml}`,
    `kumpulan-program-kerja-himpalubi-${new Date().toISOString().slice(0, 10)}.docx`
  );
}

// ================= TEMPLATE MODULAR ADMIN (Fallback Bersih) =================
const adminSidebarTemplate = `
<aside 
  id="admin-sidebar" 
  class="admin-sidebar fixed lg:sticky top-0 left-0 z-50 lg:z-30 h-screen w-72 max-w-[85vw] bg-surface-container-lowest border-r border-surface-container flex flex-col p-4 sm:p-5 -translate-x-full lg:translate-x-0 transition-transform duration-300 ease-out shadow-lg lg:shadow-none overflow-hidden select-none">
  
  <!-- 1. FIXED BRAND HEADER (Logo tidak pernah ter-scroll) -->
  <div class="flex items-center justify-between pb-4 mb-2 border-b border-surface-container flex-shrink-0">
    <a href="#ringkasan" data-section="ringkasan" class="flex items-center gap-3 group">
      <picture>
        <source srcset="../img/logo.webp" type="image/webp">
        <img src="../img/logo.png" alt="Logo HIMPALUBI" width="40" height="40" class="w-10 h-10 rounded-full object-cover shadow-sm border border-surface-container group-hover:scale-105 transition-transform">
      </picture>
      <div class="flex flex-col">
        <span class="text-base font-extrabold text-on-surface tracking-tight leading-none">HIMPALUBI</span>
        <span class="text-[11px] text-primary font-semibold tracking-wide uppercase mt-1">UNIPAR Jember</span>
      </div>
    </a>

    <!-- Mobile Close Button inside Drawer -->
    <button 
      type="button" 
      id="tombol-tutup-sidebar" 
      class="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer" 
      aria-label="Tutup menu navigasi">
      <span class="material-symbols-outlined text-[20px]">close</span>
    </button>
  </div>

  <!-- 2. SCROLLABLE NAVIGATION MENU (Hanya area menu yang scrollable) -->
  <nav aria-label="Navigasi admin" class="flex-1 overflow-y-auto space-y-5 py-2 -mr-2 pr-2 custom-scrollbar">
    
    <!-- Grup 1: Utama -->
    <div>
      <p class="text-[11px] font-semibold text-secondary uppercase tracking-wider px-3 mb-1.5">Utama</p>
      <ul class="space-y-1">
        <li>
          <a href="#ringkasan" data-section="ringkasan" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors" aria-current="page">
            <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">dashboard</span>
            <span>Dashboard</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Grup 2: Konten -->
    <div>
      <p class="text-[11px] font-semibold text-secondary uppercase tracking-wider px-3 mb-1.5">Konten</p>
      <ul class="space-y-1">
        <li>
          <a href="#kelola-konten" data-section="kelola-konten" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">article</span>
            <span>Kelola Konten</span>
          </a>
        </li>
        <li>
          <a href="#kelola-galeri" data-section="kelola-galeri" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">photo_library</span>
            <span>Galeri</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Grup 3: Keanggotaan -->
    <div>
      <p class="text-[11px] font-semibold text-secondary uppercase tracking-wider px-3 mb-1.5">Keanggotaan</p>
      <ul class="space-y-1">
        <li>
          <a href="#kelola-anggota" data-section="kelola-anggota" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">groups</span>
            <span>Anggota</span>
          </a>
        </li>
        <li>
          <a href="#kelola-struktur" data-section="kelola-struktur" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">account_tree</span>
            <span>Struktur Pengurus</span>
          </a>
        </li>
        <li>
          <a href="#kelola-pendaftaran" data-section="kelola-pendaftaran" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">how_to_reg</span>
            <span>Pendaftaran</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Grup 4: Organisasi -->
    <div>
      <p class="text-[11px] font-semibold text-secondary uppercase tracking-wider px-3 mb-1.5">Organisasi</p>
      <ul class="space-y-1">
        <li>
          <a href="#kelola-faq" data-section="kelola-faq" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">quiz</span>
            <span>FAQ</span>
          </a>
        </li>
        <li>
          <a href="#kelola-testimoni" data-section="kelola-testimoni" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">format_quote</span>
            <span>Testimoni</span>
          </a>
        </li>
        <li>
          <a href="#kelola-pengaturan" data-section="kelola-pengaturan" class="admin-nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined nav-icon text-[20px] text-secondary">settings</span>
            <span>Pengaturan</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Dynamic Slot untuk Admin Utama -->
    <div id="grup-admin-slot"></div>

    <!-- Grup 5: Tautan Eksternal -->
    <div>
      <p class="text-[11px] font-semibold text-secondary uppercase tracking-wider px-3 mb-1.5">Tautan</p>
      <ul class="space-y-1">
        <li>
          <a href="../index.html" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-secondary hover:text-primary hover:bg-surface-container-low transition-colors">
            <span class="material-symbols-outlined text-[20px] text-secondary">open_in_new</span>
            <span>Lihat Website</span>
          </a>
        </li>
      </ul>
    </div>

  </nav>

</aside>
`;

const adminNavbarTemplate = `
<header id="admin-top-navbar" class="sticky top-0 z-40 h-16 bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 shadow-xs transition-all">
  <div class="flex items-center gap-3 min-w-0">
    <button 
      type="button" 
      id="tombol-buka-sidebar" 
      class="lg:hidden w-11 h-11 flex items-center justify-center rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 flex-shrink-0 cursor-pointer" 
      aria-label="Buka menu navigasi admin">
      <span class="material-symbols-outlined text-[24px]">menu</span>
    </button>
    <div class="flex items-center gap-2 min-w-0">
      <div class="hidden sm:flex items-center gap-2 text-xs font-semibold text-secondary">
        <a href="#ringkasan" data-section="ringkasan" class="hover:text-primary transition-colors flex items-center gap-1">
          <span class="material-symbols-outlined text-[16px]">admin_panel_settings</span>
          <span>Admin</span>
        </a>
        <span class="material-symbols-outlined text-[14px]">chevron_right</span>
      </div>
      <span id="admin-navbar-title" class="text-sm sm:text-base font-bold text-on-surface tracking-tight truncate">
        Dashboard Ringkasan
      </span>
    </div>
  </div>

  <div class="flex items-center gap-2 sm:gap-3 flex-shrink-0">
    <div class="relative" id="container-profil-navbar">
      <button 
        type="button" 
        id="btn-profil-navbar" 
        class="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-full hover:bg-surface-container-low border border-transparent hover:border-surface-container transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
        aria-expanded="false" 
        aria-haspopup="true"
        aria-label="Menu profil administrator">
        <span id="admin-navbar-avatar" class="w-9 h-9 rounded-full bg-primary-fixed text-primary font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-xs ring-2 ring-primary/10">
          A
        </span>
        <span class="hidden lg:flex flex-col text-left">
          <span id="admin-navbar-email" class="text-xs font-semibold text-on-surface max-w-[140px] truncate leading-tight">Admin</span>
          <span class="text-[10px] text-secondary leading-tight">Administrator</span>
        </span>
        <span class="material-symbols-outlined text-[18px] text-secondary transition-transform duration-200 hidden sm:inline" id="profil-navbar-caret">expand_more</span>
      </button>

      <div 
        id="menu-profil-navbar" 
        class="hidden absolute right-0 top-full mt-2 w-56 bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container p-1.5 z-50 transition-all"
        role="menu">
        <div class="px-3 py-2 border-b border-surface-container mb-1">
          <span class="text-[10px] font-medium text-secondary block uppercase tracking-wider">Masuk sebagai</span>
          <span id="admin-dropdown-email" class="text-xs font-bold text-on-surface block truncate">Memuat...</span>
        </div>
        <button 
          type="button" 
          id="btn-buka-modal-profil-navbar" 
          data-action="buka-modal-profil" 
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors text-left cursor-pointer"
          role="menuitem">
          <span class="material-symbols-outlined text-[18px] text-primary">key</span>
          <span>Edit Profil &amp; Ganti Sandi</span>
        </button>
        <a 
          href="../index.html" 
          target="_blank" rel="noopener noreferrer" 
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
          role="menuitem">
          <span class="material-symbols-outlined text-[18px]">open_in_new</span>
          <span>Lihat Website</span>
        </a>
        <div class="my-1 border-t border-surface-container"></div>
        <button 
          type="button" 
          id="tombol-navbar-logout" 
          class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-error hover:bg-error/10 transition-colors text-left cursor-pointer"
          role="menuitem">
          <span class="material-symbols-outlined text-[18px]">logout</span>
          <span>Keluar dari Akun</span>
        </button>
      </div>
    </div>
  </div>
</header>
`;

// ================= MODAL EDIT PROFIL & GANTI KATA SANDI =================
async function bukaModalEditProfil() {
  let modalContainer = document.getElementById("modal-edit-profil-container");
  if (!modalContainer) {
    modalContainer = document.createElement("div");
    modalContainer.id = "modal-edit-profil-container";
    document.body.appendChild(modalContainer);
  }

  let emailAdmin = "Admin";
  try {
    const { data: sesiData } = await supabaseClient.auth.getSession();
    emailAdmin = sesiData?.session?.user?.email || "Admin";
  } catch (e) {
    console.warn("Ambil sesi admin untuk modal:", e);
  }
  const initial = emailAdmin.charAt(0).toUpperCase();

  modalContainer.innerHTML = `
    <div 
      id="backdrop-modal-profil" 
      class="fixed inset-0 bg-on-surface/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-opacity duration-200"
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="judul-modal-profil">
      
      <div 
        class="bg-surface-container-lowest rounded-2xl border border-surface-container shadow-2xl w-full max-w-md p-6 relative overflow-hidden transition-all transform animate-fadeIn"
        onclick="event.stopPropagation()">
        
        <!-- Header Modal -->
        <div class="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-surface-container">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
              <span class="material-symbols-outlined text-[22px]">manage_accounts</span>
            </div>
            <div>
              <h2 id="judul-modal-profil" class="text-base sm:text-lg font-bold text-on-surface tracking-tight leading-tight">
                Edit Profil &amp; Ganti Sandi
              </h2>
              <p class="text-xs text-secondary mt-0.5">Kelola akun dan perbarui kata sandi login admin.</p>
            </div>
          </div>
          
          <button 
            type="button" 
            id="btn-tutup-modal-profil" 
            class="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer" 
            aria-label="Tutup modal profil">
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <!-- Info Akun Saat Ini -->
        <div class="bg-surface-container-low/70 rounded-xl p-3.5 border border-surface-container mb-5 flex items-center gap-3">
          <div class="w-11 h-11 rounded-full bg-primary text-on-primary font-bold flex items-center justify-center text-sm flex-shrink-0 shadow-xs ring-2 ring-primary/20">
            ${initial}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-xs font-bold text-on-surface truncate">${escapeHtml(emailAdmin)}</span>
              <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-fixed text-on-primary-fixed-variant">Admin</span>
            </div>
            <p class="text-[11px] text-secondary">Akun aktif terotentikasi di HIMPALUBI</p>
          </div>
        </div>

        <!-- Feedback Message Area -->
        <div id="pesan-modal-profil" class="hidden form-message" role="alert"></div>

        <!-- Form Ganti Sandi -->
        <form id="form-edit-profil-sandi" class="space-y-4">
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="input-sandi-baru" class="block text-xs font-semibold text-on-surface uppercase tracking-wider">
                Kata Sandi Baru
              </label>
              <button type="button" id="btn-toggle-sandi-baru" class="text-[11px] font-medium text-primary hover:underline cursor-pointer focus:outline-none">
                Lihat
              </button>
            </div>
            <div class="relative">
              <input 
                type="password" 
                id="input-sandi-baru" 
                name="sandi_baru" 
                required 
                minlength="6" 
                placeholder="Minimal 6 karakter..." 
                class="w-full px-3.5 py-2.5 bg-surface rounded-xl border border-surface-container text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
            </div>
          </div>

          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label for="input-konfirmasi-sandi" class="block text-xs font-semibold text-on-surface uppercase tracking-wider">
                Konfirmasi Kata Sandi Baru
              </label>
              <button type="button" id="btn-toggle-konfirmasi-sandi" class="text-[11px] font-medium text-primary hover:underline cursor-pointer focus:outline-none">
                Lihat
              </button>
            </div>
            <div class="relative">
              <input 
                type="password" 
                id="input-konfirmasi-sandi" 
                name="konfirmasi_sandi" 
                required 
                minlength="6" 
                placeholder="Ulangi kata sandi baru..." 
                class="w-full px-3.5 py-2.5 bg-surface rounded-xl border border-surface-container text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
            </div>
          </div>

          <!-- Tombol Aksi -->
          <div class="pt-2 flex items-center justify-end gap-2.5 border-t border-surface-container">
            <button 
              type="button" 
              id="btn-batal-modal-profil" 
              class="px-4 py-2 rounded-full border border-surface-container text-xs font-semibold text-secondary hover:text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer min-h-[40px]">
              Batal
            </button>
            <button 
              type="submit" 
              id="btn-simpan-modal-profil" 
              class="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold tracking-wide shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer min-h-[40px]">
              <span class="material-symbols-outlined text-[16px]">save</span>
              <span>Simpan Kata Sandi</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  `;

  // Attach toggle visibility
  pasangTogglePassword("input-sandi-baru", "btn-toggle-sandi-baru");
  pasangTogglePassword("input-konfirmasi-sandi", "btn-toggle-konfirmasi-sandi");

  // Close handlers
  const tutupModal = () => {
    modalContainer.innerHTML = "";
  };

  document.getElementById("btn-tutup-modal-profil")?.addEventListener("click", tutupModal);
  document.getElementById("btn-batal-modal-profil")?.addEventListener("click", tutupModal);
  document.getElementById("backdrop-modal-profil")?.addEventListener("click", (e) => {
    if (e.target.id === "backdrop-modal-profil") tutupModal();
  });

  // Handle Form Submit
  const form = document.getElementById("form-edit-profil-sandi");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const pesanEl = document.getElementById("pesan-modal-profil");
      const btnSimpan = document.getElementById("btn-simpan-modal-profil");
      const sandiBaru = form.sandi_baru.value;
      const konfirmasi = form.konfirmasi_sandi.value;

      pesanEl.classList.add("hidden");
      pesanEl.textContent = "";

      if (sandiBaru.length < 6) {
        pesanEl.className = "form-message error";
        pesanEl.textContent = "Kata sandi baru minimal harus 6 karakter.";
        pesanEl.classList.remove("hidden");
        return;
      }

      if (sandiBaru !== konfirmasi) {
        pesanEl.className = "form-message error";
        pesanEl.textContent = "Konfirmasi kata sandi tidak cocok dengan kata sandi baru.";
        pesanEl.classList.remove("hidden");
        return;
      }

      btnSimpan.disabled = true;
      btnSimpan.innerHTML = `
        <span class="inline-block animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
        <span>Memperbarui...</span>
      `;

      try {
        const { error } = await supabaseClient.auth.updateUser({
          password: sandiBaru,
        });

        btnSimpan.disabled = false;
        btnSimpan.innerHTML = `
          <span class="material-symbols-outlined text-[16px]">save</span>
          <span>Simpan Kata Sandi</span>
        `;

        if (error) {
          pesanEl.className = "form-message error";
          pesanEl.textContent = "Gagal memperbarui kata sandi: " + (error.message || "Terjadi kesalahan.");
          pesanEl.classList.remove("hidden");
          return;
        }

        pesanEl.className = "form-message success";
        pesanEl.textContent = "Kata sandi berhasil diperbarui! Silakan gunakan kata sandi baru untuk login berikutnya.";
        pesanEl.classList.remove("hidden");
        tampilkanToast("Kata sandi berhasil diperbarui.", "sukses");
        form.reset();

        setTimeout(() => {
          tutupModal();
        }, 1800);
      } catch (err) {
        btnSimpan.disabled = false;
        btnSimpan.innerHTML = `
          <span class="material-symbols-outlined text-[16px]">save</span>
          <span>Simpan Kata Sandi</span>
        `;
        pesanEl.className = "form-message error";
        pesanEl.textContent = "Terjadi galat tak terduga: " + (err.message || err);
        pesanEl.classList.remove("hidden");
      }
    });
  }
}

// ================= DROPDOWN PROFIL (Navbar & Sidebar) =================
function pasangDropdownProfil() {
  if (window._dropdownProfilTerpasang) return;
  window._dropdownProfilTerpasang = true;

  function tutupSemuaDropdownProfil() {
    const menuNav = document.getElementById("menu-profil-navbar");
    const caretNav = document.getElementById("profil-navbar-caret");
    const btnNav = document.getElementById("btn-profil-navbar");
    if (menuNav) menuNav.classList.add("hidden");
    if (caretNav) caretNav.classList.remove("rotate-180");
    if (btnNav) btnNav.setAttribute("aria-expanded", "false");

    const menuSide = document.getElementById("menu-profil-sidebar");
    const caretSide = document.getElementById("profil-sidebar-caret");
    const btnSide = document.getElementById("btn-profil-sidebar");
    if (menuSide) menuSide.classList.add("hidden");
    if (caretSide) caretSide.classList.remove("rotate-180");
    if (btnSide) btnSide.setAttribute("aria-expanded", "false");
  }

  document.addEventListener("click", (e) => {
    // 1. Trigger Modal Edit Profil & Ganti Sandi
    const btnBukaModal = e.target.closest("[data-action='buka-modal-profil']");
    if (btnBukaModal) {
      e.preventDefault();
      tutupSemuaDropdownProfil();
      bukaModalEditProfil();
      return;
    }

    // 2. Trigger Dropdown Navbar
    const btnNav = e.target.closest("#btn-profil-navbar");
    if (btnNav) {
      e.preventDefault();
      e.stopPropagation();
      const menuNav = document.getElementById("menu-profil-navbar");
      const caretNav = document.getElementById("profil-navbar-caret");
      if (menuNav) {
        const isHidden = menuNav.classList.toggle("hidden");
        btnNav.setAttribute("aria-expanded", !isHidden);
        if (caretNav) caretNav.classList.toggle("rotate-180", !isHidden);
      }
      return;
    }

    // 3. Trigger Dropdown Sidebar
    const btnSide = e.target.closest("#btn-profil-sidebar");
    if (btnSide) {
      e.preventDefault();
      e.stopPropagation();
      const menuSide = document.getElementById("menu-profil-sidebar");
      const caretSide = document.getElementById("profil-sidebar-caret");
      if (menuSide) {
        const isHidden = menuSide.classList.toggle("hidden");
        btnSide.setAttribute("aria-expanded", !isHidden);
        if (caretSide) caretSide.classList.toggle("rotate-180", !isHidden);
      }
      return;
    }

    // 4. Tombol logout -> buka modal konfirmasi
    const tombolLogout = e.target.closest("#tombol-logout, #tombol-navbar-logout");
    if (tombolLogout) {
      e.preventDefault();
      tutupSemuaDropdownProfil();
      bukaModalKonfirmasiLogout();
      return;
    }

    // 5. Klik di luar atau klik item menu menutup dropdown
    if (!e.target.closest("#container-profil-navbar, #container-profil-sidebar")) {
      tutupSemuaDropdownProfil();
    } else if (e.target.closest("a[role='menuitem'], button[role='menuitem']")) {
      tutupSemuaDropdownProfil();
    }
  });

  // Tombol Escape menutup semua dropdown & modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      tutupSemuaDropdownProfil();
      const modalBackdrop = document.getElementById("backdrop-modal-profil");
      if (modalBackdrop) {
        const modalContainer = document.getElementById("modal-edit-profil-container");
        if (modalContainer) modalContainer.innerHTML = "";
      }
    }
  });
}

// ================= MEMUAT PARTIAL NAVBAR & SIDEBAR =================
async function muatKomponenAdmin() {
  const sidebarSlot = document.getElementById("admin-sidebar-slot");
  const navbarSlot = document.getElementById("admin-navbar-slot");

  if (sidebarSlot && !sidebarSlot.hasChildNodes()) {
    try {
      let res = await fetch("partials/sidebar.html");
      if (!res.ok) res = await fetch("admin/partials/sidebar.html");
      if (res.ok) {
        sidebarSlot.innerHTML = await res.text();
      } else {
        sidebarSlot.innerHTML = adminSidebarTemplate;
      }
    } catch (e) {
      sidebarSlot.innerHTML = adminSidebarTemplate;
    }
  }

  if (navbarSlot && !navbarSlot.hasChildNodes()) {
    try {
      let res = await fetch("partials/navbar.html");
      if (!res.ok) res = await fetch("admin/partials/navbar.html");
      if (res.ok) {
        navbarSlot.innerHTML = await res.text();
      } else {
        navbarSlot.innerHTML = adminNavbarTemplate;
      }
    } catch (e) {
      navbarSlot.innerHTML = adminNavbarTemplate;
    }
  }

  pasangNavigasiTab();
  pasangDrawerMobile();
  pasangSubTab();
  pasangDropdownProfil();
  tampilkanProfilAdmin();
}

// ================= SIDEBAR NAVIGASI SECTION =================
const judulSeksiAdmin = {
  "ringkasan": "Dashboard Ringkasan",
  "kelola-konten": "Kelola Konten & Publikasi",
  "kelola-galeri": "Galeri Dokumentasi",
  "kelola-anggota": "Manajemen Data Anggota",
  "kelola-struktur": "Struktur Pengurus Organisasi",
  "kelola-pendaftaran": "Pendaftaran Calon Anggota",
  "kelola-faq": "Tanya Jawab (FAQ)",
  "kelola-testimoni": "Testimoni Sivitas",
  "kelola-pengaturan": "Pengaturan Umum Website",
  "kelola-admin": "Kelola Hak Akses Admin"
};

function tampilkanBagianAdmin(idBagian) {
  if (!idBagian) return;
  const targetSection = document.getElementById(idBagian);
  if (!targetSection) return;

  const sections = document.querySelectorAll(".admin-section");
  sections.forEach(s => s.classList.toggle("aktif", s.id === idBagian));

  const allNavLinks = document.querySelectorAll("a[data-section]");
  allNavLinks.forEach(l => {
    if (l.dataset.section === idBagian) {
      l.setAttribute("aria-current", "page");
    } else {
      l.removeAttribute("aria-current");
    }
  });

  const titleEl = document.getElementById("admin-navbar-title");
  if (titleEl && judulSeksiAdmin[idBagian]) {
    titleEl.textContent = judulSeksiAdmin[idBagian];
  }

  window.scrollTo({ top: 0, behavior: "instant" });
  if (window.location.hash !== `#${idBagian}`) {
    history.replaceState(null, "", `#${idBagian}`);
  }
  tutupDrawerMobile();
}

function pasangNavigasiTab() {
  if (window._navigasiTabTerpasang) {
    const awal = window.location.hash.replace("#", "");
    const bagianAwal = (awal && document.getElementById(awal)) ? awal : "ringkasan";
    tampilkanBagianAdmin(bagianAwal);
    return;
  }
  window._navigasiTabTerpasang = true;

  // 1. Event delegation untuk semua tautan menu sidebar dan tombol data-section
  document.addEventListener("click", (e) => {
    const link = e.target.closest("a[data-section]");
    if (link && link.dataset.section) {
      e.preventDefault();
      tampilkanBagianAdmin(link.dataset.section);
    }
  });

  // 2. Hashchange listener untuk bookmark / back-forward browser
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "");
    if (hash && document.getElementById(hash)) {
      tampilkanBagianAdmin(hash);
    }
  });

  // 3. Muat tampilan awal
  const awal = window.location.hash.replace("#", "");
  const bagianAwal = (awal && document.getElementById(awal)) ? awal : "ringkasan";
  tampilkanBagianAdmin(bagianAwal);
}

// ================= MOBILE DRAWER =================
function pasangDrawerMobile() {
  if (window._drawerMobileTerpasang) return;
  window._drawerMobileTerpasang = true;

  document.addEventListener("click", (e) => {
    const tombolBuka = e.target.closest("#tombol-buka-sidebar");
    if (tombolBuka) {
      e.preventDefault();
      bukaDrawerMobile();
      return;
    }

    const tombolTutup = e.target.closest("#tombol-tutup-sidebar");
    if (tombolTutup) {
      e.preventDefault();
      tutupDrawerMobile();
      return;
    }

    const backdrop = e.target.closest("#admin-drawer-backdrop");
    if (backdrop) {
      e.preventDefault();
      tutupDrawerMobile();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") tutupDrawerMobile();
  });
}

function bukaDrawerMobile() {
  const sidebar = document.getElementById("admin-sidebar");
  const backdrop = document.getElementById("admin-drawer-backdrop");
  if (sidebar) sidebar.classList.add("terbuka");
  if (backdrop) {
    backdrop.classList.remove("hidden");
    requestAnimationFrame(() => {
      backdrop.classList.add("terbuka");
    });
  }
}

function tutupDrawerMobile() {
  const sidebar = document.getElementById("admin-sidebar");
  const backdrop = document.getElementById("admin-drawer-backdrop");
  if (sidebar) sidebar.classList.remove("terbuka");
  if (backdrop) {
    backdrop.classList.remove("terbuka");
    setTimeout(() => {
      if (!backdrop.classList.contains("terbuka")) {
        backdrop.classList.add("hidden");
      }
    }, 200);
  }
}

// Auto-inisialisasi komponen admin saat dokumen siap
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      muatKomponenAdmin();
    });
  } else {
    muatKomponenAdmin();
  }
}

// ================= DASHBOARD: RINGKASAN =================
async function muatRingkasan() {
  ["jumlah-anggota", "jumlah-pengurus", "jumlah-berita", "jumlah-kegiatan", "jumlah-pendaftar"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<span class="skeleton skeleton-text" style="width:2em; height:1.5rem; display:inline-block;"></span>`;
  });
  const elTerbaruAwal = document.getElementById("pendaftar-terbaru");
  if (elTerbaruAwal) elTerbaruAwal.innerHTML = skeletonBarisTabel(3, 3);

  const [anggota, pengurus, berita, kegiatan, pendaftar] = await Promise.all([
    supabaseClient.from("anggota").select("id", { count: "exact", head: true }).eq("kategori", "Anggota").eq("status", "Aktif"),
    supabaseClient.from("anggota").select("id", { count: "exact", head: true }).eq("kategori", "Pengurus").eq("status", "Aktif"),
    supabaseClient.from("berita").select("id", { count: "exact", head: true }).eq("kategori", "Berita"),
    supabaseClient.from("berita").select("id", { count: "exact", head: true }).eq("kategori", "Kegiatan"),
    supabaseClient.from("pendaftaran").select("id", { count: "exact", head: true }).eq("status", "Menunggu"),
  ]);
  setTeks("jumlah-anggota", anggota.count ?? 0);
  setTeks("jumlah-pengurus", pengurus.count ?? 0);
  setTeks("jumlah-berita", berita.count ?? 0);
  setTeks("jumlah-kegiatan", kegiatan.count ?? 0);
  setTeks("jumlah-pendaftar", pendaftar.count ?? 0);

  const { data: terbaru } = await supabaseClient
    .from("pendaftaran")
    .select("*")
    .order("created_at", { ascending: false });

  const el = document.getElementById("pendaftar-terbaru");
  if (el && terbaru) {
    const listTerbaru = [...terbaru].sort((a, b) => {
      const aMenunggu = a.status === "Menunggu" ? 0 : 1;
      const bMenunggu = b.status === "Menunggu" ? 0 : 1;
      if (aMenunggu !== bMenunggu) return aMenunggu - bMenunggu;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }).slice(0, 5);

    el.innerHTML = listTerbaru.length
      ? listTerbaru.map(p => `
          <tr class="hover:bg-surface-container-low transition-colors">
            <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(p.nama)}</td>
            <td class="py-3.5 px-4 text-secondary text-xs">${formatTanggal(p.created_at)}</td>
            <td class="py-3.5 px-4">${badgeStatus(p.status)}</td>
          </tr>`).join("")
      : `<tr><td colspan="3">${emptyState("Belum ada pendaftar", "Data pendaftar baru akan muncul di sini.", { icon: "person_search" })}</td></tr>`;
  }
}

// ================= BERITA & KEGIATAN =================
const KONTEN_CONFIG = {
  Berita: { formId: "form-berita", judulFormId: "judul-form-berita", tabelElId: "tabel-berita", labelTambah: "Tambah Berita Baru", labelEdit: "Edit Berita", fotoInputId: "foto_url", fotoPreviewId: "preview-foto_url" },
  Kegiatan: { formId: "form-kegiatan", judulFormId: "judul-form-kegiatan", tabelElId: "tabel-kegiatan", labelTambah: "Tambah Kegiatan Baru", labelEdit: "Edit Kegiatan", fotoInputId: "foto_url-kegiatan", fotoPreviewId: "preview-foto_url-kegiatan" },
};

async function muatTabelKonten(kategori, tabelElId, page) {
  const el = document.getElementById(tabelElId);
  if (!el) return;
  if (!page) page = ambilHalamanTabel(tabelElId);
  aturHalamanTabel(tabelElId, page);

  el.innerHTML = skeletonBarisTabel(4, 3);
  const { data, error } = await supabaseClient.from("berita").select("*").eq("kategori", kategori).order("tanggal", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="4" class="py-4 px-4 text-center text-error text-xs">Gagal memuat data.</td></tr>`; return; }

  const total = data ? data.length : 0;
  if (!total) {
    el.innerHTML = `<tr><td colspan="4">${emptyState(`Belum ada ${kategori.toLowerCase()}`, "Tambahkan publikasi baru melalui formulir di atas.", { icon: "post_add" })}</td></tr>`;
    renderBarisPaginasi(tabelElId, 0, 1, () => {});
    return;
  }

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = data.slice(offset, offset + BATAS_PER_HALAMAN);

  el.innerHTML = paged.map(b => `
    <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
      <td class="py-3.5 px-4 font-semibold text-on-surface">
        <div class="line-clamp-2 max-w-md">${escapeHtml(b.judul)}</div>
      </td>
      <td class="py-3.5 px-4 text-secondary text-xs whitespace-nowrap">${formatTanggal(b.tanggal)}</td>
      <td class="py-3.5 px-4 text-secondary text-xs">${escapeHtml(b.penulis || "-")}</td>
      <td class="py-3.5 px-4 text-right">
        <div class="inline-flex items-center gap-1.5 justify-end">
          <button type="button" onclick="editKonten('${b.id}','${kategori}')" title="Edit ${kategori}" aria-label="Edit ${kategori}" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all active:scale-95 focus:ring-2 focus:ring-primary/20 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button type="button" onclick="unduhSatuKonten('${b.id}','${kategori}')" title="Unduh Dokumen Word" aria-label="Unduh Dokumen Word" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all active:scale-95 focus:ring-2 focus:ring-primary/20 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">download</span>
          </button>
          <button type="button" onclick="hapusKonten('${b.id}','${kategori}')" title="Hapus ${kategori}" aria-label="Hapus ${kategori}" class="w-8 h-8 rounded-lg flex items-center justify-center text-error bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-error/20 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  renderBarisPaginasi(tabelElId, total, page, (hal) => muatTabelKonten(kategori, tabelElId, hal));
}

function pasangFormKonten(formId, kategori) {
  const form = document.getElementById(formId);
  if (!form) return;
  const cfg = KONTEN_CONFIG[kategori];
  pasangPratinjauFoto(cfg.fotoInputId, cfg.fotoPreviewId);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const tombolSimpan = form.querySelector("button[type=submit]");
    tombolSimpan.disabled = true;
    tombolSimpan.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
      <span>Menyimpan...</span>
    `;

    let fotoUrl;
    try {
      fotoUrl = await unggahFotoJikaAda(cfg.fotoInputId, form.dataset.fotoLama || null);
    } catch (err) {
      tampilkanToast(err.message, "gagal");
      tombolSimpan.disabled = false;
      tombolSimpan.textContent = "Simpan " + kategori;
      return;
    }

    const payload = {
      judul: form.judul.value.trim(),
      isi: form.isi.value.trim(),
      tanggal: form.tanggal.value,
      penulis: form.penulis.value.trim(),
      foto_url: fotoUrl,
      kategori,
    };
    // Kategori kegiatan: hanya dikirim bila dipilih (atau dikosongkan saat mengedit data yang sudah punya kategori),
    // supaya penyimpanan tetap berjalan walau SQL tahap 15 belum dijalankan.
    if (form.jenis_kegiatan) {
      if (form.jenis_kegiatan.value) payload.jenis_kegiatan = form.jenis_kegiatan.value;
      else if (id && form.dataset.jenisLama) payload.jenis_kegiatan = null;
    }
    const query = id
      ? supabaseClient.from("berita").update(payload).eq("id", id)
      : supabaseClient.from("berita").insert(payload);

    const { error } = await query;
    tombolSimpan.disabled = false;
    tombolSimpan.textContent = "Simpan " + kategori;
    if (error) {
      const kolomBelumAda = /jenis_kegiatan/.test(error.message || "");
      tampilkanToast(kolomBelumAda ? "Kolom kategori kegiatan belum ada di database. Jalankan SQL tahap 15 di Supabase, atau simpan tanpa kategori." : "Gagal menyimpan data.", "gagal");
      console.error(error);
      return;
    }

    const fotoLama = form.dataset.fotoLama;
    if (fotoLama && fotoLama !== fotoUrl) hapusFotoDariStorage(fotoLama);

    tampilkanToast(id ? "Perubahan berhasil disimpan." : "Data baru berhasil ditambahkan.", "sukses");
    form.reset();
    form.tanggal.valueAsDate = new Date();
    delete form.dataset.editId;
    delete form.dataset.fotoLama;
    delete form.dataset.jenisLama;
    document.getElementById(cfg.fotoPreviewId).innerHTML = "";
    document.getElementById(cfg.judulFormId).textContent = cfg.labelTambah;
    muatTabelKonten(kategori, cfg.tabelElId);
    muatRingkasan();
  });
}

async function editKonten(id, kategori) {
  const cfg = KONTEN_CONFIG[kategori];
  const { data } = await supabaseClient.from("berita").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.getElementById(cfg.formId);
  form.judul.value = data.judul;
  form.isi.value = data.isi;
  form.tanggal.value = data.tanggal;
  form.penulis.value = data.penulis || "";
  if (form.jenis_kegiatan) {
    form.jenis_kegiatan.value = data.jenis_kegiatan || "";
    form.dataset.jenisLama = data.jenis_kegiatan || "";
  }
  form.dataset.fotoLama = data.foto_url || "";
  tampilkanFotoLama(cfg.fotoPreviewId, data.foto_url);
  form.dataset.editId = id;
  document.getElementById(cfg.judulFormId).textContent = cfg.labelEdit;
  form.scrollIntoView({ behavior: "smooth" });
}

function hapusKonten(id, kategori) {
  tampilkanModalKonfirmasi({
    judul: `Hapus Data ${kategori}?`,
    pesan: `Apakah Anda yakin ingin menghapus data ${kategori.toLowerCase()} ini? Data dan berkas foto terkait akan dihapus secara permanen.`,
    teksKonfirmasi: "Ya, Hapus",
    teksBatal: "Batal",
    tipe: "danger",
    ikon: "delete",
    onKonfirmasi: async () => {
      const { data } = await supabaseClient.from("berita").select("foto_url").eq("id", id).single();
      const { error: errHapus } = await supabaseClient.from("berita").delete().eq("id", id);
      if (errHapus) { tampilkanToast("Gagal menghapus data: " + errHapus.message, "gagal"); console.error(errHapus); return; }
      if (data?.foto_url) hapusFotoDariStorage(data.foto_url);
      const cfg = KONTEN_CONFIG[kategori];
      muatTabelKonten(kategori, cfg.tabelElId);
      muatRingkasan();
      tampilkanToast(`Data ${kategori.toLowerCase()} berhasil dihapus.`, "sukses");
    }
  });
}

// ================= ANGGOTA & STRUKTUR PENGURUS =================
const ORANG_CONFIG = {
  Anggota: { formId: "form-anggota", judulFormId: "judul-form-anggota", tabelElId: "tabel-anggota", labelTambah: "Tambah Anggota Baru", labelEdit: "Edit Data Anggota", hasDivisi: false, fotoInputId: "foto_url_anggota", fotoPreviewId: "preview-foto_url_anggota" },
  Pengurus: { formId: "form-struktur", judulFormId: "judul-form-struktur", tabelElId: "tabel-struktur", labelTambah: "Tambah Pengurus Baru", labelEdit: "Edit Data Pengurus", hasDivisi: true, fotoInputId: "foto_url-struktur", fotoPreviewId: "preview-foto_url-struktur" },
};

async function muatTabelOrang(kategori, tabelElId, page) {
  const el = document.getElementById(tabelElId);
  if (!el) return;
  if (!page) page = ambilHalamanTabel(tabelElId);
  aturHalamanTabel(tabelElId, page);

  el.innerHTML = skeletonBarisTabel(kategori === "Pengurus" ? 5 : 5, 3);
  let query = supabaseClient.from("anggota").select("*").eq("kategori", kategori);
  query = kategori === "Pengurus"
    ? query.order("urutan", { ascending: true, nullsFirst: false }).order("nama")
    : query.order("nama");
  const { data, error } = await query;
  if (error) { el.innerHTML = `<tr><td colspan="5" class="py-4 px-4 text-center text-error text-xs">Gagal memuat data.</td></tr>`; return; }

  const total = data ? data.length : 0;
  if (!total) {
    el.innerHTML = `<tr><td colspan="5">${emptyState(`Belum ada ${kategori.toLowerCase()}`, "Tambahkan data melalui formulir di atas.", { icon: "person_add" })}</td></tr>`;
    renderBarisPaginasi(tabelElId, 0, 1, () => {});
    return;
  }

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = data.slice(offset, offset + BATAS_PER_HALAMAN);

  if (kategori === "Pengurus") {
    el.innerHTML = paged.map(a => `
      <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
        <td class="py-3.5 px-4 font-bold text-secondary text-xs">${a.urutan ?? "-"}</td>
        <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(a.nama)}</td>
        <td class="py-3.5 px-4 text-secondary text-xs">${escapeHtml(a.jabatan || "-")}</td>
        <td class="py-3.5 px-4 text-secondary text-xs">${escapeHtml(a.divisi || "-")}</td>
        <td class="py-3.5 px-4 text-right">
          <div class="inline-flex items-center gap-1.5 justify-end">
            <button type="button" onclick="editOrang('${a.id}','Pengurus')" title="Edit Pengurus" aria-label="Edit Pengurus" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all active:scale-95 focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button type="button" onclick="hapusOrang('${a.id}','Pengurus')" title="Hapus Pengurus" aria-label="Hapus Pengurus" class="w-8 h-8 rounded-lg flex items-center justify-center text-error bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-error/20 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </td>
      </tr>`).join("");
  } else {
    el.innerHTML = paged.map(a => `
      <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
        <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(a.nama)}</td>
        <td class="py-3.5 px-4 text-secondary text-xs">${escapeHtml(a.nim || "-")}</td>
        <td class="py-3.5 px-4 text-secondary text-xs">${escapeHtml(a.angkatan || "-")}</td>
        <td class="py-3.5 px-4">${badgeStatusAnggota(a.status)}</td>
        <td class="py-3.5 px-4 text-right">
          <div class="inline-flex items-center gap-1.5 justify-end">
            <button type="button" onclick="editOrang('${a.id}','Anggota')" title="Edit Anggota" aria-label="Edit Anggota" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all active:scale-95 focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button type="button" onclick="hapusOrang('${a.id}','Anggota')" title="Hapus Anggota" aria-label="Hapus Anggota" class="w-8 h-8 rounded-lg flex items-center justify-center text-error bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-error/20 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </td>
      </tr>`).join("");
  }

  renderBarisPaginasi(tabelElId, total, page, (hal) => muatTabelOrang(kategori, tabelElId, hal));
}

function pasangFormOrang(formId, kategori) {
  const form = document.getElementById(formId);
  if (!form) return;
  const cfg = ORANG_CONFIG[kategori];
  pasangPratinjauFoto(cfg.fotoInputId, cfg.fotoPreviewId);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const tombolSimpan = form.querySelector("button[type=submit]");
    tombolSimpan.disabled = true;
    tombolSimpan.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
      <span>Menyimpan...</span>
    `;

    let fotoUrl;
    try {
      fotoUrl = await unggahFotoJikaAda(cfg.fotoInputId, form.dataset.fotoLama || null, 500);
    } catch (err) {
      tampilkanToast(err.message, "gagal");
      tombolSimpan.disabled = false;
      tombolSimpan.textContent = cfg.labelTambah;
      return;
    }

    const payload = {
      nama: form.nama.value.trim(),
      jabatan: form.jabatan.value.trim(),
      foto_url: fotoUrl,
      status: form.status.value,
      kategori,
    };
    if (cfg.hasDivisi) {
      payload.divisi = form.divisi.value.trim();
      payload.urutan = form.urutan.value ? parseInt(form.urutan.value, 10) : null;
    } else {
      payload.angkatan = form.angkatan.value.trim();
      payload.nim = form.nim.value.trim() || null;
    }

    const query = id
      ? supabaseClient.from("anggota").update(payload).eq("id", id)
      : supabaseClient.from("anggota").insert(payload);

    const { error } = await query;
    tombolSimpan.disabled = false;
    tombolSimpan.textContent = cfg.labelTambah;
    if (error) { tampilkanToast("Gagal menyimpan data.", "gagal"); console.error(error); return; }

    const fotoLama = form.dataset.fotoLama;
    if (fotoLama && fotoLama !== fotoUrl) hapusFotoDariStorage(fotoLama);

    tampilkanToast(id ? "Perubahan disimpan." : "Data berhasil ditambahkan.", "sukses");
    form.reset();
    delete form.dataset.editId;
    delete form.dataset.fotoLama;
    document.getElementById(cfg.fotoPreviewId).innerHTML = "";
    document.getElementById(cfg.judulFormId).textContent = cfg.labelTambah;
    muatTabelOrang(kategori, cfg.tabelElId);
    muatRingkasan();
  });
}

async function editOrang(id, kategori) {
  const cfg = ORANG_CONFIG[kategori];
  const { data } = await supabaseClient.from("anggota").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.getElementById(cfg.formId);
  form.nama.value = data.nama;
  form.jabatan.value = data.jabatan || "";
  form.dataset.fotoLama = data.foto_url || "";
  tampilkanFotoLama(cfg.fotoPreviewId, data.foto_url);
  form.status.value = data.status;
  if (cfg.hasDivisi) {
    form.divisi.value = data.divisi || "";
    form.urutan.value = data.urutan ?? "";
  } else {
    form.angkatan.value = data.angkatan || "";
    form.nim.value = data.nim || "";
  }
  form.dataset.editId = id;
  document.getElementById(cfg.judulFormId).textContent = cfg.labelEdit;
  form.scrollIntoView({ behavior: "smooth" });
}

function hapusOrang(id, kategori) {
  tampilkanModalKonfirmasi({
    judul: `Hapus Data ${kategori}?`,
    pesan: `Apakah Anda yakin ingin menghapus data ${kategori.toLowerCase()} ini dari database? Data yang dihapus tidak dapat dipulihkan.`,
    teksKonfirmasi: "Ya, Hapus",
    teksBatal: "Batal",
    tipe: "danger",
    ikon: "delete",
    onKonfirmasi: async () => {
      const { data } = await supabaseClient.from("anggota").select("foto_url").eq("id", id).single();
      const { error: errHapus } = await supabaseClient.from("anggota").delete().eq("id", id);
      if (errHapus) { tampilkanToast("Gagal menghapus data: " + errHapus.message, "gagal"); console.error(errHapus); return; }
      if (data?.foto_url) hapusFotoDariStorage(data.foto_url);
      const cfg = ORANG_CONFIG[kategori];
      muatTabelOrang(kategori, cfg.tabelElId);
      muatRingkasan();
      tampilkanToast(`Data ${kategori.toLowerCase()} berhasil dihapus.`, "sukses");
    }
  });
}

// ================= PENDAFTARAN: KELOLA =================
async function muatTabelPendaftaran(page) {
  const el = document.getElementById("tabel-pendaftaran");
  if (!el) return;
  if (!page) page = ambilHalamanTabel("tabel-pendaftaran");
  aturHalamanTabel("tabel-pendaftaran", page);

  el.innerHTML = skeletonBarisTabel(6, 3);
  const { data, error } = await supabaseClient.from("pendaftaran").select("*").order("created_at", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="6" class="py-4 px-4 text-center text-error text-xs">Gagal memuat data pendaftaran.</td></tr>`; return; }

  const total = data ? data.length : 0;
  if (!total) {
    el.innerHTML = `<tr><td colspan="6">${emptyState("Belum ada pendaftaran", "Formulir pendaftaran yang masuk akan muncul di sini.", { icon: "assignment_ind" })}</td></tr>`;
    renderBarisPaginasi("tabel-pendaftaran", 0, 1, () => {});
    return;
  }

  // Prioritaskan status 'Menunggu' di urutan teratas, kemudian berdasarkan tanggal terbaru
  const dataTerurut = [...data].sort((a, b) => {
    const aMenunggu = a.status === "Menunggu" ? 0 : 1;
    const bMenunggu = b.status === "Menunggu" ? 0 : 1;
    if (aMenunggu !== bMenunggu) return aMenunggu - bMenunggu;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = dataTerurut.slice(offset, offset + BATAS_PER_HALAMAN);

  el.innerHTML = paged.map(p => {
    const isMenunggu = p.status === "Menunggu";
    const tombolAksi = isMenunggu ? `
      <button type="button" onclick="konfirmasiStatusPendaftaran('${p.id}','Diterima')" title="Terima Pendaftaran" aria-label="Terima Pendaftaran" class="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all active:scale-95 focus:ring-2 focus:ring-emerald-500/20 cursor-pointer">
        <span class="material-symbols-outlined text-[18px]">check</span>
      </button>
      <button type="button" onclick="konfirmasiStatusPendaftaran('${p.id}','Ditolak')" title="Tolak Pendaftaran" aria-label="Tolak Pendaftaran" class="w-8 h-8 rounded-lg flex items-center justify-center text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-rose-500/20 cursor-pointer">
        <span class="material-symbols-outlined text-[18px]">close</span>
      </button>
    ` : "";

    return `
      <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
        <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(p.nama)}</td>
        <td class="py-3.5 px-4 text-secondary text-xs">${escapeHtml(p.nim || "-")}</td>
        <td class="py-3.5 px-4 text-secondary text-xs">${escapeHtml(p.no_wa || "-")}</td>
        <td class="py-3.5 px-4 text-secondary text-xs whitespace-nowrap">${formatTanggal(p.created_at)}</td>
        <td class="py-3.5 px-4">${badgeStatus(p.status)}</td>
        <td class="py-3.5 px-4 text-right">
          <div class="inline-flex items-center gap-1.5 justify-end">
            <button type="button" onclick="bukaModalDetailPendaftar('${p.id}')" title="Lihat Detail Pendaftar" aria-label="Lihat Detail Pendaftar" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all active:scale-95 focus:ring-2 focus:ring-primary/20 cursor-pointer">
              <span class="material-symbols-outlined text-[18px]">visibility</span>
            </button>
            ${tombolAksi}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  renderBarisPaginasi("tabel-pendaftaran", total, page, (hal) => muatTabelPendaftaran(hal));
}

// ---------- Modal Detail Pendaftar ----------
async function bukaModalDetailPendaftar(id) {
  const { data, error } = await supabaseClient.from("pendaftaran").select("*").eq("id", id).single();
  if (error || !data) { tampilkanToast("Gagal memuat detail pendaftar.", "gagal"); return; }

  const baris = (label, nilai) => `
    <div class="flex items-center justify-between gap-4 py-2 border-b border-surface-container text-xs sm:text-sm">
      <span class="text-secondary font-medium">${escapeHtml(label)}</span>
      <span class="font-semibold text-on-surface text-right">${nilai}</span>
    </div>`;

  const ttl = data.tempat_lahir || data.tanggal_lahir
    ? `${escapeHtml(data.tempat_lahir || "-")}, ${data.tanggal_lahir ? formatTanggal(data.tanggal_lahir) : "-"}`
    : "-";

  const overlay = document.createElement("div");
  overlay.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xs";
  overlay.id = "modal-detail-pendaftar";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.innerHTML = `
    <div class="w-full max-w-lg bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-2xl border border-surface-container max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-surface-container">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-primary-fixed text-primary flex items-center justify-center flex-shrink-0">
            <span class="material-symbols-outlined text-[22px]">badge</span>
          </div>
          <div>
            <h3 class="text-lg font-bold text-on-surface">Detail Pendaftar</h3>
            <p class="text-xs text-secondary">Data lengkap calon anggota HIMPALUBI</p>
          </div>
        </div>
        <button type="button" id="tombol-tutup-detail-pendaftar" class="w-9 h-9 rounded-xl hover:bg-surface-container-low text-secondary hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer" aria-label="Tutup detail">
          <span class="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
      
      <div class="space-y-1">
        ${baris("Nama Lengkap", escapeHtml(data.nama))}
        ${baris("NIM", escapeHtml(data.nim || "-"))}
        ${baris("Program Studi", escapeHtml(data.program_studi || "-"))}
        ${baris("Angkatan", escapeHtml(data.angkatan || "-"))}
        ${baris("Tempat, Tanggal Lahir", ttl)}
        ${baris("No. WhatsApp", escapeHtml(data.no_wa || "-"))}
        ${baris("Alamat Email", escapeHtml(data.email || "-"))}
        ${baris("Status", badgeStatus(data.status))}
        ${baris("Tanggal Pendaftaran", formatTanggal(data.created_at))}
      </div>

      <div class="mt-5 p-4 rounded-xl bg-surface-container-low border border-surface-container">
        <span class="text-xs font-semibold text-secondary uppercase tracking-wider block mb-1.5">Alasan Bergabung</span>
        <p class="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-line">${escapeHtml(data.alasan || "-")}</p>
      </div>

      <div class="mt-6 pt-4 border-t border-surface-container flex items-center justify-end gap-2">
        <button type="button" id="tombol-tutup-detail-bawah" class="px-5 py-2.5 rounded-full bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors cursor-pointer min-h-[40px]">
          Tutup
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const tombolTutup = document.getElementById("tombol-tutup-detail-pendaftar");
  const tombolTutupBawah = document.getElementById("tombol-tutup-detail-bawah");
  tombolTutup?.focus();

  function tutup() {
    overlay.remove();
    document.removeEventListener("keydown", escHandler);
  }
  function escHandler(e) {
    if (e.key === "Escape") tutup();
  }
  document.addEventListener("keydown", escHandler);

  tombolTutup?.addEventListener("click", tutup);
  tombolTutupBawah?.addEventListener("click", tutup);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) tutup(); });
}

// Konfirmasi dulu sebelum status pendaftar diubah (mencegah salah klik).
function konfirmasiStatusPendaftaran(id, status) {
  const terima = status === "Diterima";
  tampilkanModalKonfirmasi({
    judul: terima ? "Terima pendaftar ini?" : "Tolak pendaftar ini?",
    pesan: terima
      ? "Pendaftar akan ditandai Diterima dan otomatis ditambahkan ke daftar anggota beserta NIM-nya."
      : "Pendaftar akan ditandai Ditolak dan tidak ditambahkan ke daftar anggota.",
    teksKonfirmasi: terima ? "Ya, Terima" : "Ya, Tolak",
    teksBatal: "Batal",
    tipe: terima ? "info" : "danger",
    ikon: terima ? "how_to_reg" : "person_off",
    onKonfirmasi: () => ubahStatusPendaftaran(id, status),
  });
}

async function ubahStatusPendaftaran(id, status) {
  let sudahJadiAnggota = false;

  if (status === "Diterima") {
    // 1) Tambahkan ke anggota LEBIH DULU. Jika gagal, status pendaftar tidak diubah.
    const { data: pendaftar, error: errAmbil } = await supabaseClient.from("pendaftaran").select("*").eq("id", id).single();
    if (errAmbil || !pendaftar) { tampilkanToast("Gagal membaca data pendaftar.", "gagal"); console.error(errAmbil); return; }

    let duplikat = false;
    if (pendaftar.nim) {
      const { data: samaNim, error: errNim } = await supabaseClient.from("anggota").select("id").eq("nim", pendaftar.nim);
      if (errNim) { tampilkanToast("Gagal memeriksa data anggota.", "gagal"); console.error(errNim); return; }
      duplikat = !!(samaNim && samaNim.length);
    }
    if (!duplikat) {
      const { data: samaNama, error: errNama } = await supabaseClient
        .from("anggota").select("id").eq("nama", pendaftar.nama).eq("angkatan", pendaftar.angkatan || "");
      if (errNama) { tampilkanToast("Gagal memeriksa data anggota.", "gagal"); console.error(errNama); return; }
      duplikat = !!(samaNama && samaNama.length);
    }

    if (duplikat) {
      sudahJadiAnggota = true;
    } else {
      const { error: errTambah } = await supabaseClient.from("anggota").insert({
        nama: pendaftar.nama,
        nim: pendaftar.nim || null,
        jabatan: "Anggota",
        angkatan: pendaftar.angkatan,
        status: "Aktif",
        kategori: "Anggota",
      });
      if (errTambah) {
        tampilkanToast("Gagal menambahkan ke daftar anggota. Status pendaftar tidak diubah.", "gagal");
        console.error(errTambah);
        return;
      }
    }
  }

  // 2) Baru ubah status pendaftar.
  const { error } = await supabaseClient.from("pendaftaran").update({ status }).eq("id", id);
  if (error) { tampilkanToast("Gagal mengubah status pendaftar.", "gagal"); console.error(error); return; }

  tampilkanToast(
    sudahJadiAnggota
      ? "Status diubah jadi Diterima. Pendaftar sudah ada di daftar anggota, jadi tidak ditambahkan lagi."
      : `Status pendaftaran berhasil diubah jadi ${status}.`,
    "sukses"
  );
  muatTabelPendaftaran();
  muatTabelOrang("Anggota", "tabel-anggota");
  muatRingkasan();
}

// ================= GALERI =================
async function muatTabelGaleri(page) {
  const el = document.getElementById("tabel-galeri");
  if (!el) return;
  if (!page) page = ambilHalamanTabel("tabel-galeri");
  aturHalamanTabel("tabel-galeri", page);

  el.innerHTML = skeletonBarisTabel(4, 3);
  const { data, error } = await supabaseClient.from("galeri").select("*").order("tanggal", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="4" class="py-4 px-4 text-center text-error text-xs">Gagal memuat foto galeri.</td></tr>`; return; }

  const total = data ? data.length : 0;
  if (!total) {
    el.innerHTML = `<tr><td colspan="4">${emptyState("Belum ada foto", "Tambahkan dokumentasi baru melalui formulir di atas.", { icon: "add_photo_alternate" })}</td></tr>`;
    renderBarisPaginasi("tabel-galeri", 0, 1, () => {});
    return;
  }

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = data.slice(offset, offset + BATAS_PER_HALAMAN);

  el.innerHTML = paged.map(g => `
    <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
      <td class="py-3.5 px-4">
        ${g.foto_url 
          ? `<img src="${urlGambarAman(g.foto_url)}" alt="Dokumentasi" loading="lazy" class="w-16 h-12 rounded-lg object-cover border border-surface-container shadow-xs">` 
          : '<span class="text-xs text-secondary">-</span>'}
      </td>
      <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(g.judul || "-")}</td>
      <td class="py-3.5 px-4 text-secondary text-xs whitespace-nowrap">${formatTanggal(g.tanggal)}</td>
      <td class="py-3.5 px-4 text-right">
        <button type="button" onclick="hapusGaleri('${g.id}')" title="Hapus Foto Galeri" aria-label="Hapus Foto Galeri" class="w-8 h-8 rounded-lg inline-flex items-center justify-center text-error bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-error/20 cursor-pointer">
          <span class="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </td>
    </tr>
  `).join("");

  renderBarisPaginasi("tabel-galeri", total, page, (hal) => muatTabelGaleri(hal));
}

function pasangFormGaleri(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  pasangPratinjauFoto("foto_url-galeri", "preview-foto_url-galeri");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tombolSimpan = form.querySelector("button[type=submit]");
    tombolSimpan.disabled = true;
    tombolSimpan.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
      <span>Mengunggah...</span>
    `;

    let fotoUrl;
    try {
      fotoUrl = await unggahFotoJikaAda("foto_url-galeri", null);
    } catch (err) {
      tampilkanToast(err.message, "gagal");
      tombolSimpan.disabled = false;
      tombolSimpan.textContent = "Tambah ke Galeri";
      return;
    }
    if (!fotoUrl) {
      tampilkanToast("Silakan pilih berkas foto terlebih dahulu.", "gagal");
      tombolSimpan.disabled = false;
      tombolSimpan.textContent = "Tambah ke Galeri";
      return;
    }

    const payload = {
      judul: form.judul.value.trim() || null,
      tanggal: form.tanggal.value,
      foto_url: fotoUrl,
    };
    const { error } = await supabaseClient.from("galeri").insert(payload);
    tombolSimpan.disabled = false;
    tombolSimpan.textContent = "Tambah ke Galeri";
    if (error) { tampilkanToast("Gagal menambahkan foto.", "gagal"); console.error(error); return; }
    tampilkanToast("Foto berhasil ditambahkan ke galeri.", "sukses");
    form.reset();
    form.tanggal.valueAsDate = new Date();
    document.getElementById("preview-foto_url-galeri").innerHTML = "";
    muatTabelGaleri();
  });
}

function hapusGaleri(id) {
  tampilkanModalKonfirmasi({
    judul: "Hapus Foto Galeri?",
    pesan: "Apakah Anda yakin ingin menghapus foto dokumentasi ini dari galeri publik?",
    teksKonfirmasi: "Ya, Hapus Foto",
    teksBatal: "Batal",
    tipe: "danger",
    ikon: "delete",
    onKonfirmasi: async () => {
      const { data } = await supabaseClient.from("galeri").select("foto_url").eq("id", id).single();
      const { error: errHapus } = await supabaseClient.from("galeri").delete().eq("id", id);
      if (errHapus) { tampilkanToast("Gagal menghapus data: " + errHapus.message, "gagal"); console.error(errHapus); return; }
      if (data?.foto_url) hapusFotoDariStorage(data.foto_url);
      muatTabelGaleri();
      tampilkanToast("Foto galeri berhasil dihapus.", "sukses");
    }
  });
}

// ================= PROGRAM KERJA =================
async function muatDaftarProgramAdmin(page) {
  const el = document.getElementById("daftar-program-admin");
  if (!el) return;
  if (!page) page = ambilHalamanTabel("daftar-program-admin");
  aturHalamanTabel("daftar-program-admin", page);

  el.innerHTML = `<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Tabel program kerja"><table class="w-full text-left text-sm"><tbody>${skeletonBarisTabel(4, 3)}</tbody></table></div>`;
  const { data, error } = await supabaseClient.from("program_kerja").select("*").order("divisi");
  if (error) { el.innerHTML = `<p class="py-4 text-center text-error text-xs">Gagal memuat data program kerja.</p>`; return; }

  const total = data ? data.length : 0;
  if (!total) { 
    el.innerHTML = emptyState("Belum ada program kerja", "Tambahkan program kerja baru melalui formulir di atas.", { icon: "assignment_turned_in" }); 
    renderBarisPaginasi("daftar-program-admin", 0, 1, () => {});
    return; 
  }

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = data.slice(offset, offset + BATAS_PER_HALAMAN);

  el.innerHTML = `
    <div class="overflow-x-auto" tabindex="0" role="region" aria-label="Tabel program kerja">
      <table class="w-full text-left border-collapse text-sm">
        <thead>
          <tr class="bg-surface-container-low border-b border-surface-container text-[11px] font-bold text-secondary uppercase tracking-wider">
            <th scope="col" class="py-3 px-4">Nama Program</th>
            <th scope="col" class="py-3 px-4">Divisi</th>
            <th scope="col" class="py-3 px-4">Status</th>
            <th scope="col" class="py-3 px-4 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-container text-on-surface">
          ${paged.map(p => `
            <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
              <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(p.nama_program)}</td>
              <td class="py-3.5 px-4 text-secondary text-xs">${escapeHtml(p.divisi)}</td>
              <td class="py-3.5 px-4">${badgeStatusProgram(p.status)}</td>
              <td class="py-3.5 px-4 text-right">
                <div class="inline-flex items-center gap-1.5 justify-end">
                  <button type="button" onclick="editProgram('${p.id}')" title="Edit Program Kerja" aria-label="Edit Program Kerja" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all active:scale-95 focus:ring-2 focus:ring-primary/20 cursor-pointer">
                    <span class="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button type="button" onclick="unduhSatuProgram('${p.id}')" title="Unduh Dokumen Word" aria-label="Unduh Dokumen Word" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all active:scale-95 focus:ring-2 focus:ring-primary/20 cursor-pointer">
                    <span class="material-symbols-outlined text-[18px]">download</span>
                  </button>
                  <button type="button" onclick="hapusProgram('${p.id}')" title="Hapus Program Kerja" aria-label="Hapus Program Kerja" class="w-8 h-8 rounded-lg flex items-center justify-center text-error bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-error/20 cursor-pointer">
                    <span class="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  renderBarisPaginasi("daftar-program-admin", total, page, (hal) => muatDaftarProgramAdmin(hal));
}

function pasangFormProgram(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const payload = {
      nama_program: form.nama_program.value.trim(),
      divisi: form.divisi.value.trim(),
      status: form.status.value,
      deskripsi: form.deskripsi.value.trim() || null,
    };
    const query = id
      ? supabaseClient.from("program_kerja").update(payload).eq("id", id)
      : supabaseClient.from("program_kerja").insert(payload);

    const { error } = await query;
    if (error) { tampilkanToast("Gagal menyimpan program kerja.", "gagal"); console.error(error); return; }

    tampilkanToast(id ? "Perubahan berhasil disimpan." : "Program kerja berhasil ditambahkan.", "sukses");
    form.reset();
    delete form.dataset.editId;
    document.getElementById("judul-form-program").textContent = "Tambah Program Kerja";
    muatDaftarProgramAdmin();
  });
}

async function editProgram(id) {
  const { data } = await supabaseClient.from("program_kerja").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.getElementById("form-program");
  form.nama_program.value = data.nama_program;
  form.divisi.value = data.divisi;
  form.status.value = data.status;
  form.deskripsi.value = data.deskripsi || "";
  form.dataset.editId = id;
  document.getElementById("judul-form-program").textContent = "Edit Program Kerja";
  form.scrollIntoView({ behavior: "smooth" });
}

function hapusProgram(id) {
  tampilkanModalKonfirmasi({
    judul: "Hapus Program Kerja?",
    pesan: "Apakah Anda yakin ingin menghapus data program kerja ini dari daftar organisasi?",
    teksKonfirmasi: "Ya, Hapus Program",
    teksBatal: "Batal",
    tipe: "danger",
    ikon: "delete",
    onKonfirmasi: async () => {
      const { error: errHapus } = await supabaseClient.from("program_kerja").delete().eq("id", id);
      if (errHapus) { tampilkanToast("Gagal menghapus data: " + errHapus.message, "gagal"); console.error(errHapus); return; }
      muatDaftarProgramAdmin();
      tampilkanToast("Program kerja berhasil dihapus.", "sukses");
    }
  });
}

// ================= PENGATURAN WEBSITE =================
async function muatFormPengaturan() {
  const form = document.getElementById("form-pengaturan");
  if (!form) return;
  const { data, error } = await supabaseClient.from("pengaturan").select("*").eq("id", 1).single();
  if (error || !data) return;
  form.nama_organisasi.value = data.nama_organisasi || "";
  form.tagline.value = data.tagline || "";
  form.tagline_hero.value = data.tagline_hero || "";
  form.tahun_berdiri.value = data.tahun_berdiri || "";
  form.tentang.value = data.tentang || "";
  form.sejarah.value = data.sejarah || "";
  form.tujuan.value = data.tujuan || "";
  form.teks_berjalan.value = data.teks_berjalan || "";
  form.visi.value = data.visi || "";
  form.misi.value = data.misi || "";
  form.alamat.value = data.alamat || "";
  form.email.value = data.email || "";
  form.telepon.value = data.telepon || "";
  form.instagram.value = data.instagram || "";
  form.youtube.value = data.youtube || "";

  // Kolom label beranda baru ada setelah SQL tahap 15; sebelum itu kolomnya dinonaktifkan.
  const kolomBaruAda = "akreditasi_label" in data;
  form.dataset.kolomBaru = kolomBaruAda ? "1" : "";
  ["akreditasi_label", "akreditasi_periode", "periode_kepengurusan"].forEach((nama) => {
    const input = form[nama];
    if (!input) return;
    input.value = data[nama] || "";
    input.disabled = !kolomBaruAda;
    if (!kolomBaruAda) input.placeholder = "Aktif setelah SQL tahap 15 dijalankan";
  });
}

function pasangFormPengaturan(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pesanEl = document.getElementById("pesan-pengaturan");
    const payload = {
      nama_organisasi: form.nama_organisasi.value.trim(),
      tagline: form.tagline.value.trim(),
      tagline_hero: form.tagline_hero.value.trim(),
      tahun_berdiri: form.tahun_berdiri.value.trim(),
      tentang: form.tentang.value.trim(),
      sejarah: form.sejarah.value.trim(),
      tujuan: form.tujuan.value.trim(),
      teks_berjalan: form.teks_berjalan.value.trim(),
      visi: form.visi.value.trim(),
      misi: form.misi.value.trim(),
      alamat: form.alamat.value.trim(),
      email: form.email.value.trim(),
      telepon: form.telepon.value.trim(),
      instagram: form.instagram.value.trim(),
      youtube: form.youtube.value.trim(),
    };
    if (form.dataset.kolomBaru === "1") {
      payload.akreditasi_label = form.akreditasi_label.value.trim();
      payload.akreditasi_periode = form.akreditasi_periode.value.trim();
      payload.periode_kepengurusan = form.periode_kepengurusan.value.trim();
    }
    const { error } = await supabaseClient.from("pengaturan").update(payload).eq("id", 1);
    if (error) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Gagal menyimpan perubahan pengaturan.";
      console.error(error);
      return;
    }
    pesanEl.className = "form-message success";
    pesanEl.textContent = "Pengaturan website berhasil diperbarui dan disinkronkan.";
    tampilkanToast("Pengaturan berhasil disimpan.", "sukses");
  });
}

// ================= FAQ =================
async function muatTabelFaq(page) {
  const el = document.getElementById("tabel-faq");
  if (!el) return;
  if (!page) page = ambilHalamanTabel("tabel-faq");
  aturHalamanTabel("tabel-faq", page);

  el.innerHTML = skeletonBarisTabel(3, 2);
  const { data, error } = await supabaseClient.from("faq").select("*").order("urutan", { ascending: true, nullsFirst: false });
  if (error) { el.innerHTML = `<tr><td colspan="3" class="py-4 px-4 text-center text-error text-xs">Gagal memuat FAQ.</td></tr>`; return; }

  const total = data ? data.length : 0;
  if (!total) {
    el.innerHTML = `<tr><td colspan="3">${emptyState("Belum ada FAQ", "Tambahkan pertanyaan baru melalui formulir di atas.", { icon: "contact_support" })}</td></tr>`;
    renderBarisPaginasi("tabel-faq", 0, 1, () => {});
    return;
  }

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = data.slice(offset, offset + BATAS_PER_HALAMAN);

  el.innerHTML = paged.map(f => `
    <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
      <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(f.pertanyaan)}</td>
      <td class="py-3.5 px-4 text-secondary text-xs">${f.urutan ?? "-"}</td>
      <td class="py-3.5 px-4 text-right">
        <div class="inline-flex items-center gap-1.5 justify-end">
          <button type="button" onclick="editFaq('${f.id}')" title="Edit FAQ" aria-label="Edit FAQ" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all active:scale-95 focus:ring-2 focus:ring-primary/20 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button type="button" onclick="hapusFaq('${f.id}')" title="Hapus FAQ" aria-label="Hapus FAQ" class="w-8 h-8 rounded-lg flex items-center justify-center text-error bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-error/20 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  renderBarisPaginasi("tabel-faq", total, page, (hal) => muatTabelFaq(hal));
}

function pasangFormFaq(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const payload = {
      pertanyaan: form.pertanyaan.value.trim(),
      jawaban: form.jawaban.value.trim(),
      urutan: form.urutan.value ? parseInt(form.urutan.value, 10) : null,
    };
    const query = id
      ? supabaseClient.from("faq").update(payload).eq("id", id)
      : supabaseClient.from("faq").insert(payload);
    const { error } = await query;
    if (error) { tampilkanToast("Gagal menyimpan FAQ.", "gagal"); console.error(error); return; }
    tampilkanToast(id ? "Perubahan FAQ disimpan." : "FAQ baru berhasil ditambahkan.", "sukses");
    form.reset();
    delete form.dataset.editId;
    document.getElementById("judul-form-faq").textContent = "Tambah Pertanyaan Baru";
    muatTabelFaq();
  });
}

async function editFaq(id) {
  const { data } = await supabaseClient.from("faq").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.getElementById("form-faq");
  form.pertanyaan.value = data.pertanyaan;
  form.jawaban.value = data.jawaban;
  form.urutan.value = data.urutan ?? "";
  form.dataset.editId = id;
  document.getElementById("judul-form-faq").textContent = "Edit Pertanyaan FAQ";
  form.scrollIntoView({ behavior: "smooth" });
}

function hapusFaq(id) {
  tampilkanModalKonfirmasi({
    judul: "Hapus Tanya Jawab (FAQ)?",
    pesan: "Apakah Anda yakin ingin menghapus butir pertanyaan FAQ ini?",
    teksKonfirmasi: "Ya, Hapus FAQ",
    teksBatal: "Batal",
    tipe: "danger",
    ikon: "delete",
    onKonfirmasi: async () => {
      const { error: errHapus } = await supabaseClient.from("faq").delete().eq("id", id);
      if (errHapus) { tampilkanToast("Gagal menghapus data: " + errHapus.message, "gagal"); console.error(errHapus); return; }
      muatTabelFaq();
      tampilkanToast("FAQ berhasil dihapus.", "sukses");
    }
  });
}

// ================= TESTIMONI =================
async function muatTabelTestimoni(page) {
  const el = document.getElementById("tabel-testimoni");
  if (!el) return;
  if (!page) page = ambilHalamanTabel("tabel-testimoni");
  aturHalamanTabel("tabel-testimoni", page);

  el.innerHTML = skeletonBarisTabel(4, 2);
  const { data, error } = await supabaseClient.from("testimoni").select("*").order("urutan", { ascending: true, nullsFirst: false });
  if (error) { el.innerHTML = `<tr><td colspan="4" class="py-4 px-4 text-center text-error text-xs">Gagal memuat testimoni.</td></tr>`; return; }

  const total = data ? data.length : 0;
  if (!total) {
    el.innerHTML = `<tr><td colspan="4">${emptyState("Belum ada testimoni", "Tambahkan testimoni baru melalui formulir di atas.", { icon: "reviews" })}</td></tr>`;
    renderBarisPaginasi("tabel-testimoni", 0, 1, () => {});
    return;
  }

  const offset = (page - 1) * BATAS_PER_HALAMAN;
  const paged = data.slice(offset, offset + BATAS_PER_HALAMAN);

  el.innerHTML = paged.map(t => `
    <tr class="hover:bg-surface-container-low/70 transition-colors border-b border-surface-container/60 last:border-b-0">
      <td class="py-3.5 px-4 font-semibold text-on-surface">${escapeHtml(t.nama)}</td>
      <td class="py-3.5 px-4 text-secondary text-xs">${escapeHtml(t.jabatan || "-")}</td>
      <td class="py-3.5 px-4 text-secondary text-xs">${t.urutan ?? "-"}</td>
      <td class="py-3.5 px-4 text-right">
        <div class="inline-flex items-center gap-1.5 justify-end">
          <button type="button" onclick="editTestimoni('${t.id}')" title="Edit Testimoni" aria-label="Edit Testimoni" class="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface bg-surface-container-low hover:bg-surface-container hover:text-primary transition-all active:scale-95 focus:ring-2 focus:ring-primary/20 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button type="button" onclick="hapusTestimoni('${t.id}')" title="Hapus Testimoni" aria-label="Hapus Testimoni" class="w-8 h-8 rounded-lg flex items-center justify-center text-error bg-rose-50 hover:bg-rose-100 transition-all active:scale-95 focus:ring-2 focus:ring-error/20 cursor-pointer">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </td>
    </tr>
  `).join("");

  renderBarisPaginasi("tabel-testimoni", total, page, (hal) => muatTabelTestimoni(hal));
}

function pasangFormTestimoni(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  pasangPratinjauFoto("foto_url-testimoni", "preview-foto_url-testimoni");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const tombolSimpan = form.querySelector("button[type=submit]");
    tombolSimpan.disabled = true;
    tombolSimpan.innerHTML = `
      <span class="inline-block animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
      <span>Menyimpan...</span>
    `;

    let fotoUrl;
    try {
      fotoUrl = await unggahFotoJikaAda("foto_url-testimoni", form.dataset.fotoLama || null, 500);
    } catch (err) {
      tampilkanToast(err.message, "gagal");
      tombolSimpan.disabled = false;
      tombolSimpan.textContent = "Simpan Testimoni";
      return;
    }

    const payload = {
      nama: form.nama.value.trim(),
      jabatan: form.jabatan.value.trim(),
      isi: form.isi.value.trim(),
      foto_url: fotoUrl,
      urutan: form.urutan.value ? parseInt(form.urutan.value, 10) : null,
    };
    const query = id
      ? supabaseClient.from("testimoni").update(payload).eq("id", id)
      : supabaseClient.from("testimoni").insert(payload);
    const { error } = await query;
    tombolSimpan.disabled = false;
    tombolSimpan.textContent = "Simpan Testimoni";
    if (error) { tampilkanToast("Gagal menyimpan testimoni.", "gagal"); console.error(error); return; }
    const fotoLama = form.dataset.fotoLama;
    if (fotoLama && fotoLama !== fotoUrl) hapusFotoDariStorage(fotoLama);
    tampilkanToast(id ? "Perubahan disimpan." : "Testimoni baru berhasil ditambahkan.", "sukses");
    form.reset();
    delete form.dataset.editId;
    delete form.dataset.fotoLama;
    document.getElementById("preview-foto_url-testimoni").innerHTML = "";
    document.getElementById("judul-form-testimoni").textContent = "Tambah Testimoni Baru";
    muatTabelTestimoni();
  });
}

async function editTestimoni(id) {
  const { data } = await supabaseClient.from("testimoni").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.getElementById("form-testimoni");
  form.nama.value = data.nama;
  form.jabatan.value = data.jabatan || "";
  form.isi.value = data.isi;
  form.dataset.fotoLama = data.foto_url || "";
  tampilkanFotoLama("preview-foto_url-testimoni", data.foto_url);
  form.urutan.value = data.urutan ?? "";
  form.dataset.editId = id;
  document.getElementById("judul-form-testimoni").textContent = "Edit Testimoni";
  form.scrollIntoView({ behavior: "smooth" });
}

function hapusTestimoni(id) {
  tampilkanModalKonfirmasi({
    judul: "Hapus Testimoni?",
    pesan: "Apakah Anda yakin ingin menghapus kutipan testimoni ini dari beranda website?",
    teksKonfirmasi: "Ya, Hapus Testimoni",
    teksBatal: "Batal",
    tipe: "danger",
    ikon: "delete",
    onKonfirmasi: async () => {
      const { data } = await supabaseClient.from("testimoni").select("foto_url").eq("id", id).single();
      const { error: errHapus } = await supabaseClient.from("testimoni").delete().eq("id", id);
      if (errHapus) { tampilkanToast("Gagal menghapus data: " + errHapus.message, "gagal"); console.error(errHapus); return; }
      if (data?.foto_url) hapusFotoDariStorage(data.foto_url);
      muatTabelTestimoni();
      tampilkanToast("Testimoni berhasil dihapus.", "sukses");
    }
  });
}

// ================= UTIL BERSAMA =================
function setTeks(id, teks) {
  const el = document.getElementById(id);
  if (el) el.textContent = teks;
}

function badgeStatus(status) {
  const s = (status || "").toLowerCase();
  if (s === "diterima") {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="material-symbols-outlined text-[14px]">check_circle</span>Diterima</span>`;
  }
  if (s === "ditolak") {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><span class="material-symbols-outlined text-[14px]">cancel</span>Ditolak</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><span class="material-symbols-outlined text-[14px]">schedule</span>Menunggu</span>`;
}

function badgeStatusAnggota(status) {
  const s = (status || "").toLowerCase();
  if (s === "aktif") {
    return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="material-symbols-outlined text-[14px]">check</span>Aktif</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high text-secondary border border-surface-container"><span class="material-symbols-outlined text-[14px]">remove_circle_outline</span>Nonaktif</span>`;
}
