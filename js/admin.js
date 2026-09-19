// ================= UTIL: tombol lihat/sembunyikan sandi (dipakai di banyak tempat) =================
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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pesanEl = document.getElementById("pesan-login");
    const tombol = form.querySelector("button[type=submit]");
    tombol.disabled = true;
    tombol.textContent = "Masuk...";

    const { error } = await supabaseClient.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.password.value,
    });

    tombol.disabled = false;
    tombol.textContent = "Masuk";

    if (error) {
      if (error.message && error.message.toLowerCase().includes("email not confirmed")) {
        pesanEl.className = "form-message error";
        pesanEl.textContent = "Email belum dikonfirmasi. Cek kotak masuk (atau folder spam) untuk link konfirmasi dari Supabase.";
      } else {
        pesanEl.className = "form-message error";
        pesanEl.textContent = "Email atau kata sandi salah.";
      }
      return;
    }
    window.location.href = "dashboard.html";
  });
}

async function wajibLogin() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
  }
}

function pasangTombolLogout(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.addEventListener("click", async (e) => {
    e.preventDefault();
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });
}

async function tampilkanProfilAdmin() {
  const { data } = await supabaseClient.auth.getSession();
  const email = data?.session?.user?.email || "Admin";
  setTeks("admin-email", email);
  const av = document.getElementById("admin-avatar");
  if (av) av.textContent = email.charAt(0).toUpperCase();
  return email;
}

// ================= DAFTAR ADMIN BARU (admin/daftar.html) =================
function pasangFormDaftarAdmin(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pesanEl = document.getElementById("pesan-daftar");
    const tombol = form.querySelector("button[type=submit]");
    tombol.disabled = true;
    tombol.textContent = "Mendaftarkan...";

    const { error } = await supabaseClient.auth.signUp({
      email: form.email.value.trim(),
      password: form.password.value,
    });

    tombol.disabled = false;
    tombol.textContent = "Daftar";

    if (error) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Pendaftaran gagal: " + error.message;
      return;
    }

    pesanEl.className = "form-message success";
    pesanEl.textContent = "Akun berhasil dibuat. Kalau email kamu sudah diundang, kamu langsung dapat akses admin — coba login sekarang.";
    form.reset();
  });
}

// ================= KELOLA ADMIN (khusus admin utama, dirender via JS) =================

// Cek apakah user yang login adalah admin utama. Kalau ya, BANGUN dan
// SISIPKAN menu + section "Kelola Admin" ke DOM lewat JS. Kalau bukan,
// slot-nya dibiarkan kosong sama sekali — elemen ini tidak pernah ada
// di DOM untuk admin biasa, bahkan kalau dicek lewat DevTools.
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
      <p class="nav-group-label">Admin Utama</p>
      <ul>
        <li><a href="#kelola-admin" data-section="kelola-admin"><svg class="ikon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4a3 3 0 100 6 3 3 0 000-6z"/><path d="M4 20c0-3.5 3.5-6 8-6s8 2.5 8 6"/><path d="M19 8l1.5 1.5L23 7"/></svg>Kelola Admin</a></li>
      </ul>
    `;
  }

  const sectionSlot = document.getElementById("kelola-admin-slot");
  if (sectionSlot) {
    sectionSlot.innerHTML = `
      <section id="kelola-admin" class="admin-section">
        <div class="admin-topbar">
          <p class="eyebrow">Admin Utama</p>
          <h1>Kelola Admin</h1>
          <p class="subtitle">Hanya terlihat untukmu sebagai admin utama.</p>
        </div>

        <div class="card-panel">
          <h3>Undang Admin Baru</h3>
          <form id="form-undang-admin" class="form-grid">
            <div class="field full">
              <label for="email-undangan">Email Calon Admin</label>
              <input type="email" id="email-undangan" name="email" required placeholder="nama@email.com">
              <p class="hint">Setelah diundang, minta orang itu buka <strong>admin/daftar.html</strong> dan daftar pakai email yang sama.</p>
            </div>
            <div class="field full"><button type="submit" class="btn">Kirim Undangan</button></div>
          </form>
        </div>

        <div class="card-panel">
          <h3>Undangan Menunggu</h3>
          <div class="table-wrap">
          <table>
            <thead><tr><th>Email</th><th>Diundang Tanggal</th><th>Aksi</th></tr></thead>
            <tbody id="tabel-undangan-admin"><tr><td colspan="3">Memuat...</td></tr></tbody>
          </table>
          </div>
        </div>

        <div class="card-panel">
          <h3>Admin Aktif</h3>
          <div class="table-wrap">
          <table>
            <thead><tr><th>Email</th><th>Peran</th><th>Admin Sejak</th><th>Aksi</th></tr></thead>
            <tbody id="tabel-admin-aktif"><tr><td colspan="4">Memuat...</td></tr></tbody>
          </table>
          </div>
        </div>

        <div class="card-panel">
          <h3>Riwayat Reset Sandi</h3>
          <div class="table-wrap">
          <table>
            <thead><tr><th>Dilakukan Oleh</th><th>Aksi</th><th>Waktu</th></tr></thead>
            <tbody id="tabel-riwayat-reset"><tr><td colspan="3">Memuat...</td></tr></tbody>
          </table>
          </div>
        </div>
      </section>
    `;

    pasangFormUndangAdmin("form-undang-admin");
    muatUndanganAdmin();
    muatDaftarAdminAktifUtama();
    muatRiwayatResetSandi();
  }

  return true;
}

async function muatUndanganAdmin() {
  const el = document.getElementById("tabel-undangan-admin");
  if (!el) return;
  el.innerHTML = skeletonBarisTabel(3, 2);
  const { data, error } = await supabaseClient.from("admin_undangan").select("*").order("dibuat_pada", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="3">Gagal memuat data.</td></tr>`; return; }
  el.innerHTML = data.length ? data.map(u => `
    <tr>
      <td>${escapeHtml(u.email)}</td>
      <td>${formatTanggal(u.dibuat_pada)}</td>
      <td class="table-actions"><button onclick="batalkanUndangan('${u.email.replace(/'/g, "\\'")}')">Batalkan</button></td>
    </tr>
  `).join("") : `<tr><td colspan="3">${emptyState("Tidak ada undangan menunggu", "Undangan yang belum diklaim akan muncul di sini.")}</td></tr>`;
}

function pasangFormUndangAdmin(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    const emailAdminSaatIni = document.getElementById("admin-email")?.textContent || null;

    const { error } = await supabaseClient.from("admin_undangan").insert({
      email,
      diundang_oleh: emailAdminSaatIni,
    });

    if (error) {
      tampilkanToast(error.code === "23505" ? "Email itu sudah diundang." : "Gagal mengundang.", "gagal");
      console.error(error);
      return;
    }

    tampilkanToast(`Undangan terkirim untuk ${email}. Minta dia daftar lewat halaman "Daftar Admin".`, "sukses");
    form.reset();
    muatUndanganAdmin();
  });
}

async function batalkanUndangan(email) {
  if (!confirm(`Batalkan undangan untuk ${email}?`)) return;
  await supabaseClient.from("admin_undangan").delete().eq("email", email);
  muatUndanganAdmin();
}

async function muatDaftarAdminAktifUtama() {
  const el = document.getElementById("tabel-admin-aktif");
  if (!el) return;
  el.innerHTML = skeletonBarisTabel(4, 2);
  const { data, error } = await supabaseClient.from("admin_users").select("*").order("dibuat_pada");
  if (error) { el.innerHTML = `<tr><td colspan="4">Gagal memuat data.</td></tr>`; return; }

  const { data: sesi } = await supabaseClient.auth.getSession();
  const emailSaatIni = sesi?.session?.user?.email;

  el.innerHTML = data.length ? data.map(a => `
    <tr>
      <td>${escapeHtml(a.email)}${a.email === emailSaatIni ? " <em>(kamu)</em>" : ""}</td>
      <td>${a.peran === "utama" ? '<span class="badge diterima">Utama</span>' : '<span class="badge menunggu">Admin</span>'}</td>
      <td>${formatTanggal(a.dibuat_pada)}</td>
      <td class="table-actions">
        ${a.peran === "utama" ? "-" : `
          <button onclick="bukaModalResetSandi('${a.id}','${a.email.replace(/'/g, "\\'")}')">Reset Sandi</button>
          <button onclick="cabutAksesAdmin('${a.id}','${a.email.replace(/'/g, "\\'")}')">Cabut Akses</button>
        `}
      </td>
    </tr>
  `).join("") : `<tr><td colspan="4">${emptyState("Belum ada admin", "Undang admin pertama lewat form di atas.")}</td></tr>`;
}

async function cabutAksesAdmin(id, email) {
  if (!confirm(`Cabut akses admin untuk ${email}? Akun login-nya tidak dihapus, cuma akses dashboard-nya.`)) return;
  await supabaseClient.from("admin_users").delete().eq("id", id);
  tampilkanToast(`Akses admin ${email} sudah dicabut.`, "sukses");
  muatDaftarAdminAktifUtama();
}

// ---------- Modal Reset Sandi ----------
function bukaModalResetSandi(userId, email) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "modal-reset-sandi";
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>Reset Sandi</h3>
      <p style="color:var(--ink-600); font-size:0.9rem; margin-top:-0.5rem;">Untuk akun: <strong>${escapeHtml(email)}</strong></p>
      <div class="field">
        <label for="input-sandi-baru">Sandi Baru</label>
        <div class="password-toggle-wrap">
          <input type="password" id="input-sandi-baru" minlength="8" placeholder="Minimal 8 karakter" autocomplete="new-password" name="sandi-baru-${userId}">
          <button type="button" class="password-toggle-btn" id="tombol-lihat-sandi">Lihat</button>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" id="tombol-batal-reset">Batal</button>
        <button type="button" class="btn" id="tombol-konfirmasi-reset">Reset</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById("input-sandi-baru");
  input.focus();

  document.getElementById("tombol-lihat-sandi").addEventListener("click", () => {
    const tombol = document.getElementById("tombol-lihat-sandi");
    const kini = input.type === "password";
    input.type = kini ? "text" : "password";
    tombol.textContent = kini ? "Sembunyikan" : "Lihat";
  });

  document.getElementById("tombol-batal-reset").addEventListener("click", tutupModalResetSandi);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) tutupModalResetSandi(); });
  document.getElementById("tombol-konfirmasi-reset").addEventListener("click", () => konfirmasiResetSandi(userId, email));
}

function tutupModalResetSandi() {
  const overlay = document.getElementById("modal-reset-sandi");
  if (overlay) overlay.remove();
}

async function konfirmasiResetSandi(userId, email) {
  const input = document.getElementById("input-sandi-baru");
  const sandiBaru = input.value;

  if (!sandiBaru || sandiBaru.length < 8) {
    tampilkanToast("Sandi minimal 8 karakter.", "gagal");
    return;
  }

  const tombol = document.getElementById("tombol-konfirmasi-reset");
  tombol.disabled = true;
  tombol.textContent = "Memproses...";

  const { data: sesi } = await supabaseClient.auth.getSession();
  const token = sesi?.session?.access_token;
  if (!token) { tampilkanToast("Sesi tidak ditemukan, coba login ulang.", "gagal"); return; }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/reset-password-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ target_user_id: userId, password_baru: sandiBaru }),
    });
    const hasil = await res.json();

    if (!res.ok) {
      tampilkanToast(hasil.error || "Gagal mereset sandi.", "gagal");
      tombol.disabled = false;
      tombol.textContent = "Reset";
      return;
    }

    tampilkanToast(`Sandi ${email} berhasil direset.`, "sukses");
    tutupModalResetSandi();
    muatDaftarAdminAktifUtama();
    muatRiwayatResetSandi();
  } catch (e) {
    tampilkanToast("Gagal menghubungi server. Pastikan Edge Function sudah di-deploy.", "gagal");
    console.error(e);
    tombol.disabled = false;
    tombol.textContent = "Reset";
  }
}

async function muatRiwayatResetSandi() {
  const el = document.getElementById("tabel-riwayat-reset");
  if (!el) return;
  el.innerHTML = skeletonBarisTabel(3, 2);
  const { data, error } = await supabaseClient
    .from("admin_activity_log")
    .select("*")
    .order("waktu", { ascending: false })
    .limit(20);

  if (error) { el.innerHTML = `<tr><td colspan="3">Gagal memuat data.</td></tr>`; return; }
  el.innerHTML = data.length ? data.map(l => `
    <tr>
      <td>${escapeHtml(l.dilakukan_oleh_email || "-")}</td>
      <td>Reset sandi untuk ${escapeHtml(l.target_email || "-")}</td>
      <td>${formatTanggal(l.waktu)}</td>
    </tr>
  `).join("") : `<tr><td colspan="3">${emptyState("Belum ada riwayat", "Riwayat reset sandi akan tercatat di sini.")}</td></tr>`;
}

// ================= SIDEBAR: ganti "lembar" tanpa scroll =================
function pasangNavigasiTab() {
  const sections = document.querySelectorAll(".admin-section");
  const links = document.querySelectorAll(".admin-sidebar nav a[data-section]");
  if (!sections.length || !links.length) return;

  function tampilkanBagian(idBagian) {
    sections.forEach(s => s.classList.toggle("aktif", s.id === idBagian));
    links.forEach(l => {
      if (l.dataset.section === idBagian) l.setAttribute("aria-current", "page");
      else l.removeAttribute("aria-current");
    });
    document.querySelector(".admin-main").scrollTo({ top: 0, behavior: "instant" });
    window.scrollTo({ top: 0, behavior: "instant" });
    history.replaceState(null, "", `#${idBagian}`);
  }

  links.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      tampilkanBagian(link.dataset.section);
    });
  });

  const awal = window.location.hash.replace("#", "");
  const bagianAwal = document.getElementById(awal) ? awal : "ringkasan";
  tampilkanBagian(bagianAwal);
}

// ================= DASHBOARD: RINGKASAN =================
async function muatRingkasan() {
  ["jumlah-anggota", "jumlah-pengurus", "jumlah-berita", "jumlah-kegiatan", "jumlah-pendaftar"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `<span class="skeleton skeleton-text" style="width:2.5em; height:1.8rem; display:inline-block;"></span>`;
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
    .order("created_at", { ascending: false })
    .limit(5);

  const el = document.getElementById("pendaftar-terbaru");
  if (el && terbaru) {
    el.innerHTML = terbaru.length
      ? terbaru.map(p => `
          <tr>
            <td>${escapeHtml(p.nama)}</td>
            <td>${formatTanggal(p.created_at)}</td>
            <td>${badgeStatus(p.status)}</td>
          </tr>`).join("")
      : `<tr><td colspan="3">${emptyState("Belum ada pendaftar", "Pendaftar baru akan muncul di sini.")}</td></tr>`;
  }
}

// ================= BERITA & KEGIATAN (tabel "berita", beda kategori) =================
const KONTEN_CONFIG = {
  Berita: { formId: "form-berita", judulFormId: "judul-form-berita", tabelElId: "tabel-berita", labelTambah: "Tambah Berita", labelEdit: "Edit Berita" },
  Kegiatan: { formId: "form-kegiatan", judulFormId: "judul-form-kegiatan", tabelElId: "tabel-kegiatan", labelTambah: "Tambah Kegiatan", labelEdit: "Edit Kegiatan" },
};

async function muatTabelKonten(kategori, tabelElId) {
  const el = document.getElementById(tabelElId);
  if (!el) return;
  el.innerHTML = skeletonBarisTabel(4, 3);
  const { data, error } = await supabaseClient.from("berita").select("*").eq("kategori", kategori).order("tanggal", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="4">Gagal memuat data.</td></tr>`; return; }

  el.innerHTML = data.length ? data.map(b => `
    <tr>
      <td>${escapeHtml(b.judul)}</td>
      <td>${formatTanggal(b.tanggal)}</td>
      <td>${escapeHtml(b.penulis || "-")}</td>
      <td class="table-actions">
        <button onclick="editKonten('${b.id}','${kategori}')">Edit</button>
        <button onclick="hapusKonten('${b.id}','${kategori}')">Hapus</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="4">${emptyState("Belum ada data", "Tambahkan lewat form di atas.")}</td></tr>`;
}

function pasangFormKonten(formId, kategori) {
  const form = document.getElementById(formId);
  if (!form) return;
  const cfg = KONTEN_CONFIG[kategori];

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const payload = {
      judul: form.judul.value.trim(),
      isi: form.isi.value.trim(),
      tanggal: form.tanggal.value,
      penulis: form.penulis.value.trim(),
      foto_url: form.foto_url.value.trim() || null,
      kategori,
    };
    const query = id
      ? supabaseClient.from("berita").update(payload).eq("id", id)
      : supabaseClient.from("berita").insert(payload);

    const { error } = await query;
    if (error) { tampilkanToast("Gagal menyimpan data.", "gagal"); console.error(error); return; }

    tampilkanToast(id ? "Perubahan disimpan." : "Data berhasil ditambahkan.", "sukses");
    form.reset();
    form.tanggal.valueAsDate = new Date();
    delete form.dataset.editId;
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
  form.foto_url.value = data.foto_url || "";
  form.dataset.editId = id;
  document.getElementById(cfg.judulFormId).textContent = cfg.labelEdit;
  form.scrollIntoView({ behavior: "smooth" });
}

async function hapusKonten(id, kategori) {
  if (!confirm("Hapus data ini?")) return;
  await supabaseClient.from("berita").delete().eq("id", id);
  const cfg = KONTEN_CONFIG[kategori];
  muatTabelKonten(kategori, cfg.tabelElId);
  muatRingkasan();
}

// ================= ANGGOTA & STRUKTUR PENGURUS (tabel "anggota", beda kategori) =================
const ORANG_CONFIG = {
  Anggota: { formId: "form-anggota", judulFormId: "judul-form-anggota", tabelElId: "tabel-anggota", labelTambah: "Tambah Anggota", labelEdit: "Edit Anggota", hasDivisi: false },
  Pengurus: { formId: "form-struktur", judulFormId: "judul-form-struktur", tabelElId: "tabel-struktur", labelTambah: "Tambah Pengurus", labelEdit: "Edit Pengurus", hasDivisi: true },
};

async function muatTabelOrang(kategori, tabelElId) {
  const el = document.getElementById(tabelElId);
  if (!el) return;
  el.innerHTML = skeletonBarisTabel(kategori === "Pengurus" ? 5 : 4, 3);
  let query = supabaseClient.from("anggota").select("*").eq("kategori", kategori);
  query = kategori === "Pengurus"
    ? query.order("urutan", { ascending: true, nullsFirst: false }).order("nama")
    : query.order("nama");
  const { data, error } = await query;
  if (error) { el.innerHTML = `<tr><td colspan="5">Gagal memuat data.</td></tr>`; return; }
  if (!data.length) { el.innerHTML = `<tr><td colspan="5">${emptyState("Belum ada data", "Tambahkan lewat form di atas.")}</td></tr>`; return; }

  if (kategori === "Pengurus") {
    el.innerHTML = data.map(a => `
      <tr>
        <td>${a.urutan ?? "-"}</td>
        <td>${escapeHtml(a.nama)}</td>
        <td>${escapeHtml(a.jabatan || "-")}</td>
        <td>${escapeHtml(a.divisi || "-")}</td>
        <td class="table-actions">
          <button onclick="editOrang('${a.id}','Pengurus')">Edit</button>
          <button onclick="hapusOrang('${a.id}','Pengurus')">Hapus</button>
        </td>
      </tr>`).join("");
  } else {
    el.innerHTML = data.map(a => `
      <tr>
        <td>${escapeHtml(a.nama)}</td>
        <td>${escapeHtml(a.angkatan || "-")}</td>
        <td>${badgeStatusAnggota(a.status)}</td>
        <td class="table-actions">
          <button onclick="editOrang('${a.id}','Anggota')">Edit</button>
          <button onclick="hapusOrang('${a.id}','Anggota')">Hapus</button>
        </td>
      </tr>`).join("");
  }
}

function pasangFormOrang(formId, kategori) {
  const form = document.getElementById(formId);
  if (!form) return;
  const cfg = ORANG_CONFIG[kategori];

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const payload = {
      nama: form.nama.value.trim(),
      jabatan: form.jabatan.value.trim(),
      foto_url: form.foto_url.value.trim() || null,
      status: form.status.value,
      kategori,
    };
    if (cfg.hasDivisi) {
      payload.divisi = form.divisi.value.trim();
      payload.urutan = form.urutan.value ? parseInt(form.urutan.value, 10) : null;
    } else {
      payload.angkatan = form.angkatan.value.trim();
    }

    const query = id
      ? supabaseClient.from("anggota").update(payload).eq("id", id)
      : supabaseClient.from("anggota").insert(payload);

    const { error } = await query;
    if (error) { tampilkanToast("Gagal menyimpan data.", "gagal"); console.error(error); return; }

    tampilkanToast(id ? "Perubahan disimpan." : "Data berhasil ditambahkan.", "sukses");
    form.reset();
    delete form.dataset.editId;
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
  form.foto_url.value = data.foto_url || "";
  form.status.value = data.status;
  if (cfg.hasDivisi) {
    form.divisi.value = data.divisi || "";
    form.urutan.value = data.urutan ?? "";
  } else {
    form.angkatan.value = data.angkatan || "";
  }
  form.dataset.editId = id;
  document.getElementById(cfg.judulFormId).textContent = cfg.labelEdit;
  form.scrollIntoView({ behavior: "smooth" });
}

async function hapusOrang(id, kategori) {
  if (!confirm("Hapus data ini?")) return;
  await supabaseClient.from("anggota").delete().eq("id", id);
  const cfg = ORANG_CONFIG[kategori];
  muatTabelOrang(kategori, cfg.tabelElId);
  muatRingkasan();
}

// ================= PENDAFTARAN: KELOLA =================
async function muatTabelPendaftaran() {
  const el = document.getElementById("tabel-pendaftaran");
  if (!el) return;
  el.innerHTML = skeletonBarisTabel(6, 3);
  const { data, error } = await supabaseClient.from("pendaftaran").select("*").order("created_at", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="6">Gagal memuat data.</td></tr>`; return; }

  el.innerHTML = data.length ? data.map(p => `
    <tr>
      <td>${escapeHtml(p.nama)}</td>
      <td>${escapeHtml(p.nim || "-")}</td>
      <td>${escapeHtml(p.no_wa || "-")}</td>
      <td>${formatTanggal(p.created_at)}</td>
      <td>${badgeStatus(p.status)}</td>
      <td class="table-actions">
        <button onclick="bukaModalDetailPendaftar('${p.id}')">Detail</button>
        <button onclick="ubahStatusPendaftaran('${p.id}','Diterima')">Terima</button>
        <button onclick="ubahStatusPendaftaran('${p.id}','Ditolak')">Tolak</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="6">${emptyState("Belum ada pendaftar", "Pendaftar baru akan muncul di sini.")}</td></tr>`;
}

// ---------- Modal Detail Pendaftar ----------
async function bukaModalDetailPendaftar(id) {
  const { data, error } = await supabaseClient.from("pendaftaran").select("*").eq("id", id).single();
  if (error || !data) { tampilkanToast("Gagal memuat detail pendaftar.", "gagal"); return; }

  const baris = (label, nilai) => `
    <div style="display:flex; justify-content:space-between; gap:1rem; padding:0.6rem 0; border-bottom:1px solid var(--line);">
      <span style="color:var(--ink-600); font-size:0.88rem;">${escapeHtml(label)}</span>
      <span style="font-weight:600; text-align:right;">${nilai}</span>
    </div>`;

  const ttl = data.tempat_lahir || data.tanggal_lahir
    ? `${escapeHtml(data.tempat_lahir || "-")}, ${data.tanggal_lahir ? formatTanggal(data.tanggal_lahir) : "-"}`
    : "-";

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "modal-detail-pendaftar";
  overlay.innerHTML = `
    <div class="modal-box" style="max-width:460px; max-height:85vh; overflow-y:auto;">
      <h3>Detail Pendaftar</h3>
      <div>
        ${baris("Nama Lengkap", escapeHtml(data.nama))}
        ${baris("NIM", escapeHtml(data.nim || "-"))}
        ${baris("Program Studi", escapeHtml(data.program_studi || "-"))}
        ${baris("Angkatan", escapeHtml(data.angkatan || "-"))}
        ${baris("Tempat, Tanggal Lahir", ttl)}
        ${baris("No. WhatsApp", escapeHtml(data.no_wa || "-"))}
        ${baris("Email", escapeHtml(data.email || "-"))}
        ${baris("Status", badgeStatus(data.status))}
        ${baris("Tanggal Daftar", formatTanggal(data.created_at))}
      </div>
      <div style="margin-top:1rem;">
        <span style="color:var(--ink-600); font-size:0.88rem; display:block; margin-bottom:0.4rem;">Alasan Bergabung</span>
        <p style="margin:0; line-height:1.6;">${escapeHtml(data.alasan || "-")}</p>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" id="tombol-tutup-detail-pendaftar">Tutup</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById("tombol-tutup-detail-pendaftar").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}

async function ubahStatusPendaftaran(id, status) {
  const { error } = await supabaseClient.from("pendaftaran").update({ status }).eq("id", id);
  if (error) { tampilkanToast("Gagal mengubah status.", "gagal"); console.error(error); return; }

  if (status === "Diterima") {
    const { data: pendaftar } = await supabaseClient.from("pendaftaran").select("*").eq("id", id).single();
    if (pendaftar) {
      const { data: sudahAda } = await supabaseClient
        .from("anggota")
        .select("id")
        .eq("nama", pendaftar.nama)
        .eq("angkatan", pendaftar.angkatan || "");

      if (!sudahAda || sudahAda.length === 0) {
        await supabaseClient.from("anggota").insert({
          nama: pendaftar.nama,
          jabatan: "Anggota",
          angkatan: pendaftar.angkatan,
          status: "Aktif",
          kategori: "Anggota",
        });
      }
    }
  }

  muatTabelPendaftaran();
  muatTabelOrang("Anggota", "tabel-anggota");
  muatRingkasan();
}

// ================= GALERI =================
async function muatTabelGaleri() {
  const el = document.getElementById("tabel-galeri");
  if (!el) return;
  el.innerHTML = skeletonBarisTabel(4, 3);
  const { data, error } = await supabaseClient.from("galeri").select("*").order("tanggal", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="4">Gagal memuat data.</td></tr>`; return; }
  if (!data.length) { el.innerHTML = `<tr><td colspan="4">${emptyState("Belum ada foto", "Tambahkan foto lewat form di atas.")}</td></tr>`; return; }

  el.innerHTML = data.map(g => `
    <tr>
      <td>${g.foto_url ? `<img src="${g.foto_url}" alt="" loading="lazy" style="width:64px;height:48px;object-fit:cover;border-radius:6px;">` : "-"}</td>
      <td>${escapeHtml(g.judul || "-")}</td>
      <td>${formatTanggal(g.tanggal)}</td>
      <td class="table-actions"><button onclick="hapusGaleri('${g.id}')">Hapus</button></td>
    </tr>
  `).join("");
}

function pasangFormGaleri(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      judul: form.judul.value.trim() || null,
      tanggal: form.tanggal.value,
      foto_url: form.foto_url.value.trim(),
    };
    const { error } = await supabaseClient.from("galeri").insert(payload);
    if (error) { tampilkanToast("Gagal menambah foto.", "gagal"); console.error(error); return; }
    tampilkanToast("Foto ditambahkan ke galeri.", "sukses");
    form.reset();
    form.tanggal.valueAsDate = new Date();
    muatTabelGaleri();
  });
}

async function hapusGaleri(id) {
  if (!confirm("Hapus foto ini?")) return;
  await supabaseClient.from("galeri").delete().eq("id", id);
  muatTabelGaleri();
}

// ================= PROGRAM KERJA =================
async function muatDaftarProgramAdmin() {
  const el = document.getElementById("daftar-program-admin");
  if (!el) return;
  el.innerHTML = `<div class="table-wrap"><table><tbody>${skeletonBarisTabel(4, 3)}</tbody></table></div>`;
  const { data, error } = await supabaseClient.from("program_kerja").select("*").order("divisi");
  if (error) { el.innerHTML = `<p class="form-message error">Gagal memuat data.</p>`; return; }
  if (!data.length) { el.innerHTML = emptyState("Belum ada program kerja", "Tambahkan lewat form di atas."); return; }

  el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Program</th><th>Divisi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>` +
    data.map(p => `
      <tr>
        <td>${escapeHtml(p.nama_program)}</td>
        <td>${escapeHtml(p.divisi)}</td>
        <td>${badgeStatusProgram(p.status)}</td>
        <td class="table-actions">
          <button onclick="editProgram('${p.id}')">Edit</button>
          <button onclick="hapusProgram('${p.id}')">Hapus</button>
        </td>
      </tr>`).join("") + `</tbody></table></div>`;
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

    tampilkanToast(id ? "Perubahan disimpan." : "Program kerja ditambahkan.", "sukses");
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

async function hapusProgram(id) {
  if (!confirm("Hapus program kerja ini?")) return;
  await supabaseClient.from("program_kerja").delete().eq("id", id);
  muatDaftarProgramAdmin();
}

// ================= PENGATURAN =================
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
  form.visi.value = data.visi || "";
  form.misi.value = data.misi || "";
  form.alamat.value = data.alamat || "";
  form.email.value = data.email || "";
  form.telepon.value = data.telepon || "";
  form.instagram.value = data.instagram || "";
  form.youtube.value = data.youtube || "";
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
      visi: form.visi.value.trim(),
      misi: form.misi.value.trim(),
      alamat: form.alamat.value.trim(),
      email: form.email.value.trim(),
      telepon: form.telepon.value.trim(),
      instagram: form.instagram.value.trim(),
      youtube: form.youtube.value.trim(),
    };
    const { error } = await supabaseClient.from("pengaturan").update(payload).eq("id", 1);
    if (error) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Gagal menyimpan pengaturan.";
      console.error(error);
      return;
    }
    pesanEl.className = "form-message success";
    pesanEl.textContent = "Pengaturan berhasil disimpan.";
  });
}

// ================= FAQ =================
async function muatTabelFaq() {
  const el = document.getElementById("tabel-faq");
  if (!el) return;
  el.innerHTML = skeletonBarisTabel(3, 2);
  const { data, error } = await supabaseClient.from("faq").select("*").order("urutan", { ascending: true, nullsFirst: false });
  if (error) { el.innerHTML = `<tr><td colspan="3">Gagal memuat data.</td></tr>`; return; }
  if (!data.length) { el.innerHTML = `<tr><td colspan="3">${emptyState("Belum ada FAQ", "Tambahkan lewat form di atas.")}</td></tr>`; return; }
  el.innerHTML = data.map(f => `
    <tr>
      <td>${escapeHtml(f.pertanyaan)}</td>
      <td>${f.urutan ?? "-"}</td>
      <td class="table-actions">
        <button onclick="editFaq('${f.id}')">Edit</button>
        <button onclick="hapusFaq('${f.id}')">Hapus</button>
      </td>
    </tr>
  `).join("");
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
    tampilkanToast(id ? "Perubahan disimpan." : "FAQ ditambahkan.", "sukses");
    form.reset();
    delete form.dataset.editId;
    document.getElementById("judul-form-faq").textContent = "Tambah Pertanyaan";
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
  document.getElementById("judul-form-faq").textContent = "Edit Pertanyaan";
  form.scrollIntoView({ behavior: "smooth" });
}

async function hapusFaq(id) {
  if (!confirm("Hapus FAQ ini?")) return;
  await supabaseClient.from("faq").delete().eq("id", id);
  muatTabelFaq();
}

// ================= TESTIMONI =================
async function muatTabelTestimoni() {
  const el = document.getElementById("tabel-testimoni");
  if (!el) return;
  el.innerHTML = skeletonBarisTabel(4, 2);
  const { data, error } = await supabaseClient.from("testimoni").select("*").order("urutan", { ascending: true, nullsFirst: false });
  if (error) { el.innerHTML = `<tr><td colspan="4">Gagal memuat data.</td></tr>`; return; }
  if (!data.length) { el.innerHTML = `<tr><td colspan="4">${emptyState("Belum ada testimoni", "Tambahkan lewat form di atas.")}</td></tr>`; return; }
  el.innerHTML = data.map(t => `
    <tr>
      <td>${escapeHtml(t.nama)}</td>
      <td>${escapeHtml(t.jabatan || "-")}</td>
      <td>${t.urutan ?? "-"}</td>
      <td class="table-actions">
        <button onclick="editTestimoni('${t.id}')">Edit</button>
        <button onclick="hapusTestimoni('${t.id}')">Hapus</button>
      </td>
    </tr>
  `).join("");
}

function pasangFormTestimoni(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const payload = {
      nama: form.nama.value.trim(),
      jabatan: form.jabatan.value.trim(),
      isi: form.isi.value.trim(),
      foto_url: form.foto_url.value.trim() || null,
      urutan: form.urutan.value ? parseInt(form.urutan.value, 10) : null,
    };
    const query = id
      ? supabaseClient.from("testimoni").update(payload).eq("id", id)
      : supabaseClient.from("testimoni").insert(payload);
    const { error } = await query;
    if (error) { tampilkanToast("Gagal menyimpan testimoni.", "gagal"); console.error(error); return; }
    tampilkanToast(id ? "Perubahan disimpan." : "Testimoni ditambahkan.", "sukses");
    form.reset();
    delete form.dataset.editId;
    document.getElementById("judul-form-testimoni").textContent = "Tambah Testimoni";
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
  form.foto_url.value = data.foto_url || "";
  form.urutan.value = data.urutan ?? "";
  form.dataset.editId = id;
  document.getElementById("judul-form-testimoni").textContent = "Edit Testimoni";
  form.scrollIntoView({ behavior: "smooth" });
}

async function hapusTestimoni(id) {
  if (!confirm("Hapus testimoni ini?")) return;
  await supabaseClient.from("testimoni").delete().eq("id", id);
  muatTabelTestimoni();
}

// ================= UTIL BERSAMA =================
function setTeks(id, teks) {
  const el = document.getElementById(id);
  if (el) el.textContent = teks;
}
function badgeStatus(status) {
  const kelas = { Menunggu: "menunggu", Diterima: "diterima", Ditolak: "ditolak" }[status] || "menunggu";
  return `<span class="badge ${kelas}">${status}</span>`;
}
function badgeStatusAnggota(status) {
  const kelas = status === "Aktif" ? "aktif" : "nonaktif";
  return `<span class="badge ${kelas}">${status}</span>`;
}
