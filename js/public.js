// ================= HALAMAN LIST: Berita & Kegiatan (berita.html / kegiatan.html) =================
// Dipakai untuk daftar lengkap. kategori: "Berita" atau "Kegiatan".
async function muatBerita(elId, batas, kategori) {
  const el = document.getElementById(elId);
  if (!el) return;
  kategori = kategori || "Berita";

  let query = supabaseClient
    .from("berita")
    .select("*")
    .eq("kategori", kategori)
    .order("tanggal", { ascending: false });

  if (batas) query = query.limit(batas);

  const { data, error } = await query;

  if (error) {
    el.innerHTML = `<p class="form-message error">Data belum bisa dimuat. Coba muat ulang halaman.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<li>Belum ada ${kategori.toLowerCase()} yang dipublikasikan.</li>`;
    return;
  }

  el.innerHTML = data.map(item => `
    <li class="news-item">
      <time datetime="${item.tanggal}">${formatTanggal(item.tanggal)}</time>
      <div>
        <h3>${escapeHtml(item.judul)}</h3>
        <p class="excerpt">${escapeHtml(ringkas(item.isi, 180))}</p>
      </div>
      ${item.foto_url ? `<img src="${item.foto_url}" alt="" loading="lazy">` : ""}
    </li>
  `).join("");
}

// ================= BERANDA: Kegiatan Terbaru (3 kartu foto) =================
async function muatKegiatanTerbaru(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const { data, error } = await supabaseClient
    .from("berita")
    .select("*")
    .eq("kategori", "Kegiatan")
    .order("tanggal", { ascending: false })
    .limit(3);

  if (error || !data || data.length === 0) {
    el.innerHTML = `<p>Belum ada kegiatan yang dipublikasikan.</p>`;
    return;
  }

  el.innerHTML = data.map(item => `
    <div class="news-photo-card">
      ${item.foto_url ? `<img src="${item.foto_url}" alt="">` : ""}
      <span class="tag">Kegiatan</span>
      <h4>${escapeHtml(item.judul)}</h4>
    </div>
  `).join("");
}

// ================= BERANDA: Berita Terbaru (3 kartu biasa) =================
async function muatBeritaKartu(elId, batas) {
  const el = document.getElementById(elId);
  if (!el) return;

  let query = supabaseClient
    .from("berita")
    .select("*")
    .eq("kategori", "Berita")
    .order("tanggal", { ascending: false });
  if (batas) query = query.limit(batas);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    el.innerHTML = `<p>Belum ada berita yang dipublikasikan.</p>`;
    return;
  }

  el.innerHTML = data.map(item => `
    <div class="content-card">
      ${item.foto_url ? `<img src="${item.foto_url}" class="thumb" alt="" loading="lazy">` : ""}
      <div class="body">
        <time>${formatTanggal(item.tanggal)}</time>
        <h4>${escapeHtml(item.judul)}</h4>
        <p>${escapeHtml(ringkas(item.isi, 110))}</p>
      </div>
    </div>
  `).join("");
}

// ================= HALAMAN ANGGOTA: dikelompokkan per angkatan =================
async function muatAnggota(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const { data, error } = await supabaseClient
    .from("anggota")
    .select("*")
    .eq("kategori", "Anggota")
    .eq("status", "Aktif")
    .order("angkatan", { ascending: false });

  if (error) {
    el.innerHTML = `<p class="form-message error">Data anggota belum bisa dimuat.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<p>Belum ada data anggota.</p>`;
    return;
  }

  const kelompok = {};
  data.forEach(a => {
    const k = a.angkatan || "Lainnya";
    (kelompok[k] = kelompok[k] || []).push(a);
  });

  el.innerHTML = Object.keys(kelompok)
    .sort((a, b) => b.localeCompare(a, "id", { numeric: true }))
    .map(angkatan => `
      <div class="angkatan-group">
        <h3>Angkatan ${escapeHtml(angkatan)}</h3>
        <div class="member-grid">
          ${kelompok[angkatan].map(kartuAnggota).join("")}
        </div>
      </div>
    `).join("");
}

function kartuAnggota(a) {
  return `
    <div class="member-card">
      <div class="photo">${a.foto_url ? `<img src="${a.foto_url}" alt="">` : initial(a.nama)}</div>
      <h3>${escapeHtml(a.nama)}</h3>
      <div class="role">${escapeHtml(a.jabatan || "Anggota")}</div>
    </div>
  `;
}

// ================= HALAMAN STRUKTUR ORGANISASI: BPH + Divisi =================
async function muatStruktur(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const { data, error } = await supabaseClient
    .from("anggota")
    .select("*")
    .eq("kategori", "Pengurus")
    .eq("status", "Aktif")
    .order("nama");

  if (error) {
    el.innerHTML = `<p class="form-message error">Struktur organisasi belum bisa dimuat.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<p>Struktur organisasi belum diisi oleh admin.</p>`;
    return;
  }

  const kelompok = {};
  data.forEach(a => {
    const k = a.divisi || "Lainnya";
    (kelompok[k] = kelompok[k] || []).push(a);
  });

  el.innerHTML = urutkanDivisi(Object.keys(kelompok)).map(divisi => `
    <div class="angkatan-group">
      <h3>${escapeHtml(divisi)}</h3>
      <div class="member-grid">
        ${kelompok[divisi].map(kartuAnggota).join("")}
      </div>
    </div>
  `).join("");
}

// ================= HALAMAN PROGRAM KERJA: dikelompokkan per divisi =================
async function muatProgramKerja(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const { data, error } = await supabaseClient
    .from("program_kerja")
    .select("*")
    .order("divisi");

  if (error) {
    el.innerHTML = `<p class="form-message error">Program kerja belum bisa dimuat.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<p>Program kerja belum ditambahkan oleh admin.</p>`;
    return;
  }

  const kelompok = {};
  data.forEach(p => {
    (kelompok[p.divisi] = kelompok[p.divisi] || []).push(p);
  });

  el.innerHTML = urutkanDivisi(Object.keys(kelompok)).map(divisi => `
    <div class="angkatan-group">
      <h3>${escapeHtml(divisi)}</h3>
      <div class="program-list">
        ${kelompok[divisi].map(p => `
          <div class="program-item">
            <div>
              <h4>${escapeHtml(p.nama_program)}</h4>
              ${p.deskripsi ? `<p>${escapeHtml(p.deskripsi)}</p>` : ""}
            </div>
            ${badgeStatusProgram(p.status)}
          </div>
        `).join("")}
      </div>
    </div>
  `).join("");
}

function urutkanDivisi(daftar) {
  return daftar.sort((a, b) => {
    if (a === "BPH") return -1;
    if (b === "BPH") return 1;
    return a.localeCompare(b, "id");
  });
}

function badgeStatusProgram(status) {
  const kelas = { Direncanakan: "menunggu", Berjalan: "diterima", Selesai: "aktif" }[status] || "menunggu";
  return `<span class="badge ${kelas}">${escapeHtml(status || "")}</span>`;
}

// ================= HALAMAN GALERI =================
async function muatGaleriHalaman(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const { data, error } = await supabaseClient
    .from("galeri")
    .select("*")
    .order("tanggal", { ascending: false });

  if (error) {
    el.innerHTML = `<p class="form-message error">Galeri belum bisa dimuat.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<p>Belum ada foto di galeri.</p>`;
    return;
  }

  el.innerHTML = data.map(g => `<img src="${g.foto_url}" alt="${escapeHtml(g.judul || "")}" loading="lazy">`).join("");
}

// ================= HALAMAN TENTANG =================
async function muatTentangHalaman(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const { data, error } = await supabaseClient.from("pengaturan").select("*").eq("id", 1).single();
  if (error || !data) {
    el.innerHTML = `<p>Informasi belum tersedia.</p>`;
    return;
  }
  const paragraf = (data.tentang || "").split(/\n+/).filter(Boolean);
  el.innerHTML = paragraf.map(p => `<p>${escapeHtml(p)}</p>`).join("") || `<p>Informasi belum tersedia.</p>`;
}

// ================= BERANDA: Tentang (ringkas) =================
async function muatTentangRingkas(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { data, error } = await supabaseClient.from("pengaturan").select("tentang").eq("id", 1).single();
  if (error || !data) return;
  el.textContent = ringkas(data.tentang || "", 260);
}

// ================= HALAMAN KONTAK =================
async function muatKontakHalaman() {
  const { data, error } = await supabaseClient.from("pengaturan").select("*").eq("id", 1).single();
  if (error || !data) return;

  setTeksAman("kontak-alamat", data.alamat);
  setTeksAman("kontak-email", data.email);
  setTeksAman("kontak-telepon", data.telepon);

  const ig = document.getElementById("kontak-instagram");
  if (ig && data.instagram) ig.href = data.instagram;
  const yt = document.getElementById("kontak-youtube");
  if (yt && data.youtube) yt.href = data.youtube;
}

// ================= FOOTER: isi otomatis dari Pengaturan =================
async function muatPengaturanFooter() {
  const { data, error } = await supabaseClient.from("pengaturan").select("*").eq("id", 1).single();
  if (error || !data) return;

  const d = document.getElementById("footer-deskripsi");
  if (d && data.tagline) d.textContent = data.tagline;

  setTeksAman("footer-email", data.email);
  setTeksAman("footer-telepon", data.telepon);

  const ig = document.getElementById("footer-instagram");
  if (ig && data.instagram) ig.href = data.instagram;
  const yt = document.getElementById("footer-youtube");
  if (yt && data.youtube) yt.href = data.youtube;
}

// ================= FORM PENDAFTARAN (pendaftaran.html) =================
function pasangFormPendaftaran(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tombol = form.querySelector("button[type=submit]");
    const pesanEl = document.getElementById("pesan-pendaftaran");
    tombol.disabled = true;
    tombol.textContent = "Mengirim...";

    const payload = {
      nama: form.nama.value.trim(),
      nim: form.nim.value.trim(),
      program_studi: form.program_studi.value.trim(),
      angkatan: form.angkatan.value.trim(),
      no_wa: form.no_wa.value.trim(),
      email: form.email.value.trim(),
      alasan: form.alasan.value.trim(),
    };

    const { error } = await supabaseClient.from("pendaftaran").insert(payload);

    tombol.disabled = false;
    tombol.textContent = "Kirim Pendaftaran";

    if (error) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Pendaftaran gagal terkirim. Coba lagi sebentar lagi.";
      console.error(error);
      return;
    }

    pesanEl.className = "form-message success";
    pesanEl.textContent = "Pendaftaran berhasil dikirim. Tim pengurus akan menghubungi kamu.";
    form.reset();
  });
}

// ================= UTIL =================
function setTeksAman(id, teks) {
  const el = document.getElementById(id);
  if (el && teks) el.textContent = teks;
}
function formatTanggal(tgl) {
  if (!tgl) return "";
  const d = new Date(tgl);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
function ringkas(teks, panjang) {
  if (!teks) return "";
  return teks.length > panjang ? teks.slice(0, panjang) + "…" : teks;
}
function initial(nama) {
  if (!nama) return "?";
  return nama.trim().charAt(0).toUpperCase();
}
function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
