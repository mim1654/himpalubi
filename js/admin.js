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
      : `<tr><td colspan="3">Belum ada pendaftar.</td></tr>`;
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
  `).join("") : `<tr><td colspan="4">Belum ada data.</td></tr>`;
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
  let query = supabaseClient.from("anggota").select("*").eq("kategori", kategori);
  query = kategori === "Pengurus"
    ? query.order("urutan", { ascending: true, nullsFirst: false }).order("nama")
    : query.order("nama");
  const { data, error } = await query;
  if (error) { el.innerHTML = `<tr><td colspan="5">Gagal memuat data.</td></tr>`; return; }
  if (!data.length) { el.innerHTML = `<tr><td colspan="5">Belum ada data.</td></tr>`; return; }

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
  const { data, error } = await supabaseClient.from("galeri").select("*").order("tanggal", { ascending: false });
  if (error) { el.innerHTML = `<tr><td colspan="4">Gagal memuat data.</td></tr>`; return; }
  if (!data.length) { el.innerHTML = `<tr><td colspan="4">Belum ada foto.</td></tr>`; return; }

  el.innerHTML = data.map(g => `
    <tr>
      <td>${g.foto_url ? `<img src="${g.foto_url}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:6px;">` : "-"}</td>
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
  const { data, error } = await supabaseClient.from("program_kerja").select("*").order("divisi");
  if (error) { el.innerHTML = `<p class="form-message error">Gagal memuat data.</p>`; return; }
  if (!data.length) { el.innerHTML = `<p>Belum ada program kerja.</p>`; return; }

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
  form.tentang.value = data.tentang || "";
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
      tentang: form.tentang.value.trim(),
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
