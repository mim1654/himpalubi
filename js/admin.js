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
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Email atau kata sandi salah.";
      return;
    }
    window.location.href = "dashboard.html";
  });
}

// Panggil ini di setiap halaman admin (kecuali login.html) agar
// otomatis dilempar ke login kalau belum masuk.
async function wajibLogin() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data.session) {
    window.location.href = "login.html";
  }
}

function pasangTombolLogout(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
  });
}

// ================= DASHBOARD: RINGKASAN =================
async function muatRingkasan() {
  const [berita, anggota, pendaftar] = await Promise.all([
    supabaseClient.from("berita").select("id", { count: "exact", head: true }),
    supabaseClient.from("anggota").select("id", { count: "exact", head: true }),
    supabaseClient.from("pendaftaran").select("id", { count: "exact", head: true }).eq("status", "Menunggu"),
  ]);
  setTeks("jumlah-berita", berita.count ?? 0);
  setTeks("jumlah-anggota", anggota.count ?? 0);
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
      : `<tr><td colspan="3">Belum ada pendaftar.</td></tr>`;
  }
}

// ================= BERITA: CRUD =================
async function muatTabelBerita() {
  const el = document.getElementById("tabel-berita");
  if (!el) return;
  const { data, error } = await supabaseClient.from("berita").select("*").order("tanggal", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="4">Gagal memuat data.</td></tr>`; return; }

  el.innerHTML = data.length ? data.map(b => `
    <tr>
      <td>${escapeHtml(b.judul)}</td>
      <td>${formatTanggal(b.tanggal)}</td>
      <td>${escapeHtml(b.penulis || "-")}</td>
      <td class="table-actions">
        <button onclick="editBerita('${b.id}')">Edit</button>
        <button onclick="hapusBerita('${b.id}')">Hapus</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="4">Belum ada berita.</td></tr>`;
}

function pasangFormBerita(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const payload = {
      judul: form.judul.value.trim(),
      isi: form.isi.value.trim(),
      tanggal: form.tanggal.value,
      penulis: form.penulis.value.trim(),
      foto_url: form.foto_url.value.trim() || null,
    };
    const query = id
      ? supabaseClient.from("berita").update(payload).eq("id", id)
      : supabaseClient.from("berita").insert(payload);

    const { error } = await query;
    if (error) { alert("Gagal menyimpan berita."); console.error(error); return; }

    form.reset();
    delete form.dataset.editId;
    document.getElementById("judul-form-berita").textContent = "Tambah Berita";
    muatTabelBerita();
  });
}

async function editBerita(id) {
  const { data } = await supabaseClient.from("berita").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.getElementById("form-berita");
  form.judul.value = data.judul;
  form.isi.value = data.isi;
  form.tanggal.value = data.tanggal;
  form.penulis.value = data.penulis || "";
  form.foto_url.value = data.foto_url || "";
  form.dataset.editId = id;
  document.getElementById("judul-form-berita").textContent = "Edit Berita";
  form.scrollIntoView({ behavior: "smooth" });
}

async function hapusBerita(id) {
  if (!confirm("Hapus berita ini?")) return;
  await supabaseClient.from("berita").delete().eq("id", id);
  muatTabelBerita();
}

// ================= ANGGOTA: CRUD =================
async function muatTabelAnggota() {
  const el = document.getElementById("tabel-anggota");
  if (!el) return;
  const { data, error } = await supabaseClient.from("anggota").select("*").order("nama");
  if (error) { el.innerHTML = `<tr><td colspan="5">Gagal memuat data.</td></tr>`; return; }

  el.innerHTML = data.length ? data.map(a => `
    <tr>
      <td>${escapeHtml(a.nama)}</td>
      <td>${escapeHtml(a.jabatan || "-")}</td>
      <td>${escapeHtml(a.angkatan || "-")}</td>
      <td>${badgeStatusAnggota(a.status)}</td>
      <td class="table-actions">
        <button onclick="editAnggota('${a.id}')">Edit</button>
        <button onclick="hapusAnggota('${a.id}')">Hapus</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="5">Belum ada anggota.</td></tr>`;
}

function pasangFormAnggota(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = form.dataset.editId;
    const payload = {
      nama: form.nama.value.trim(),
      jabatan: form.jabatan.value.trim(),
      angkatan: form.angkatan.value.trim(),
      foto_url: form.foto_url.value.trim() || null,
      status: form.status.value,
    };
    const query = id
      ? supabaseClient.from("anggota").update(payload).eq("id", id)
      : supabaseClient.from("anggota").insert(payload);

    const { error } = await query;
    if (error) { alert("Gagal menyimpan anggota."); console.error(error); return; }

    form.reset();
    delete form.dataset.editId;
    document.getElementById("judul-form-anggota").textContent = "Tambah Anggota";
    muatTabelAnggota();
  });
}

async function editAnggota(id) {
  const { data } = await supabaseClient.from("anggota").select("*").eq("id", id).single();
  if (!data) return;
  const form = document.getElementById("form-anggota");
  form.nama.value = data.nama;
  form.jabatan.value = data.jabatan || "";
  form.angkatan.value = data.angkatan || "";
  form.foto_url.value = data.foto_url || "";
  form.status.value = data.status;
  form.dataset.editId = id;
  document.getElementById("judul-form-anggota").textContent = "Edit Anggota";
  form.scrollIntoView({ behavior: "smooth" });
}

async function hapusAnggota(id) {
  if (!confirm("Hapus anggota ini?")) return;
  await supabaseClient.from("anggota").delete().eq("id", id);
  muatTabelAnggota();
}

// ================= PENDAFTARAN: KELOLA =================
async function muatTabelPendaftaran() {
  const el = document.getElementById("tabel-pendaftaran");
  if (!el) return;
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
        <button onclick="ubahStatusPendaftaran('${p.id}','Diterima')">Terima</button>
        <button onclick="ubahStatusPendaftaran('${p.id}','Ditolak')">Tolak</button>
      </td>
    </tr>
  `).join("") : `<tr><td colspan="6">Belum ada pendaftar.</td></tr>`;
}

async function ubahStatusPendaftaran(id, status) {
  await supabaseClient.from("pendaftaran").update({ status }).eq("id", id);
  muatTabelPendaftaran();
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
