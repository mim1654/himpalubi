// ================= HALAMAN LIST: Berita & Kegiatan (berita.html / kegiatan.html) =================
// Dipakai untuk daftar lengkap. kategori: "Berita" atau "Kegiatan".
async function muatBerita(elId, batas, kategori) {
  const el = document.getElementById(elId);
  if (!el) return;
  kategori = kategori || "Berita";
  el.innerHTML = skeletonListItems(batas || 3);

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
    el.innerHTML = `<li>${emptyState(`Belum ada ${kategori.toLowerCase()}`, "Konten akan tampil di sini begitu admin mempublikasikannya.")}</li>`;
    return;
  }

  el.innerHTML = data.map(item => `
    <li class="news-item">
      <time datetime="${item.tanggal}">${formatTanggal(item.tanggal)}</time>
      <div>
        <h3><a href="detail.html?id=${item.id}&kategori=${kategori}" style="color:inherit; text-decoration:none;">${escapeHtml(item.judul)}</a></h3>
        <p class="excerpt">${escapeHtml(ringkas(item.isi, 180))}</p>
        <a href="detail.html?id=${item.id}&kategori=${kategori}" class="more">Baca Selengkapnya &rarr;</a>
      </div>
      ${item.foto_url ? `<img src="${item.foto_url}" alt="" loading="lazy">` : ""}
    </li>
  `).join("");
}

// ================= HALAMAN DETAIL: Berita/Kegiatan =================
async function muatDetailKonten(elId, backLinkId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = `<span class="skeleton skeleton-image" style="height:260px; margin-bottom:1.5rem;"></span>${skeletonParagraf(4)}`;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const kategori = params.get("kategori") || "Berita";

  const backLink = document.getElementById(backLinkId);
  if (backLink) backLink.href = kategori === "Kegiatan" ? "kegiatan.html" : "berita.html";
  document.body.dataset.page = kategori === "Kegiatan" ? "kegiatan" : "berita";

  if (!id) {
    el.innerHTML = `<p>Data tidak ditemukan.</p>`;
    return;
  }

  const { data, error } = await supabaseClient.from("berita").select("*").eq("id", id).single();
  if (error || !data) {
    el.innerHTML = `<p>Data tidak ditemukan atau sudah dihapus.</p>`;
    return;
  }

  document.title = `${data.judul} — HIMPALUBI`;
  perbaruiMetaDetail(data, kategori);

  const paragraf = (data.isi || "").split(/\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join("");

  el.innerHTML = `
    <div class="detail-meta">
      <span class="kategori-tag">${escapeHtml(kategori)}</span>
      ${formatTanggal(data.tanggal)}${data.penulis ? ` &middot; ${escapeHtml(data.penulis)}` : ""}
    </div>
    <h1>${escapeHtml(data.judul)}</h1>
    ${data.foto_url ? `<img src="${data.foto_url}" alt="" class="detail-photo" loading="lazy">` : ""}
    <div class="detail-isi">${paragraf || "<p>Belum ada isi.</p>"}</div>
  `;
}

// ================= BERANDA: Kegiatan Terbaru (3 kartu foto) =================
async function muatKegiatanTerbaru(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonCards(3, skeletonPhotoCard);

  const { data, error } = await supabaseClient
    .from("berita")
    .select("*")
    .eq("kategori", "Kegiatan")
    .order("tanggal", { ascending: false })
    .limit(3);

  if (error || !data || data.length === 0) {
    el.innerHTML = emptyState("Belum ada kegiatan", "Kegiatan terbaru akan muncul di sini setelah dipublikasikan.");
    return;
  }

  el.innerHTML = data.map(item => `
    <a href="detail.html?id=${item.id}&kategori=Kegiatan" class="news-photo-card" style="text-decoration:none;">
      ${item.foto_url ? `<img src="${item.foto_url}" alt="" loading="lazy">` : ""}
      <span class="tag">Kegiatan</span>
      <h4>${escapeHtml(item.judul)}</h4>
    </a>
  `).join("");
}

// ================= BERANDA: Berita Terbaru (3 kartu biasa) =================
async function muatBeritaKartu(elId, batas) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonCards(batas || 3, skeletonContentCard);

  let query = supabaseClient
    .from("berita")
    .select("*")
    .eq("kategori", "Berita")
    .order("tanggal", { ascending: false });
  if (batas) query = query.limit(batas);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    el.innerHTML = emptyState("Belum ada berita", "Berita terbaru akan muncul di sini setelah dipublikasikan.");
    return;
  }

  el.innerHTML = data.map(item => `
    <a href="detail.html?id=${item.id}&kategori=Berita" class="content-card" style="text-decoration:none; color:inherit; display:block;">
      ${item.foto_url ? `<img src="${item.foto_url}" class="thumb" alt="" loading="lazy">` : ""}
      <div class="body">
        <time>${formatTanggal(item.tanggal)}</time>
        <h4>${escapeHtml(item.judul)}</h4>
        <p>${escapeHtml(ringkas(item.isi, 110))}</p>
      </div>
    </a>
  `).join("");
}

// ================= HALAMAN ANGGOTA: dikelompokkan per angkatan =================
async function muatAnggota(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonMemberGrid(4);

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
    el.innerHTML = emptyState("Belum ada data anggota", "Data anggota akan tampil di sini setelah ditambahkan admin.");
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
      <div class="photo">${a.foto_url ? `<img src="${a.foto_url}" alt="" loading="lazy">` : initial(a.nama)}</div>
      <h3>${escapeHtml(a.nama)}</h3>
      <div class="role">${escapeHtml(a.jabatan || "Anggota")}</div>
    </div>
  `;
}

// ================= HALAMAN STRUKTUR ORGANISASI: BPH + Divisi =================
async function muatStruktur(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonMemberGrid(4);

  const { data, error } = await supabaseClient
    .from("anggota")
    .select("*")
    .eq("kategori", "Pengurus")
    .eq("status", "Aktif")
    .order("urutan", { ascending: true, nullsFirst: false })
    .order("nama");

  if (error) {
    el.innerHTML = `<p class="form-message error">Struktur organisasi belum bisa dimuat.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = emptyState("Struktur belum diisi", "Susunan BPH dan divisi akan tampil di sini setelah diisi admin.");
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
  el.innerHTML = Array(3).fill(0).map(skeletonProgramItem).join("");

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
    el.innerHTML = emptyState("Belum ada program kerja", "Program kerja tiap divisi akan tampil di sini setelah ditambahkan.");
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
  el.innerHTML = skeletonGaleri(6);

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
    el.innerHTML = emptyState("Galeri masih kosong", "Foto kegiatan akan tampil di sini setelah diunggah admin.");
    return;
  }

  el.innerHTML = data.map(g => `<img src="${g.foto_url}" alt="${escapeHtml(g.judul || "")}" loading="lazy">`).join("");
}

// ================= HALAMAN TENTANG =================
async function muatTentangHalaman(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonParagraf(4);

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
  el.innerHTML = skeletonParagraf(2);
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

// ================= BERANDA: Tagline Hero (dinamis dari Pengaturan) =================
async function muatTaglineHero(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { data } = await supabaseClient.from("pengaturan").select("tagline_hero").eq("id", 1).single();
  if (data?.tagline_hero) el.textContent = data.tagline_hero;
}

// ================= BERANDA: Statistik Pencapaian =================
async function muatStatistikBeranda(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const [pengaturanRes, anggotaRes, programRes, pengurusRes] = await Promise.all([
    supabaseClient.from("pengaturan").select("tahun_berdiri").eq("id", 1).single(),
    supabaseClient.from("anggota").select("id", { count: "exact", head: true }).eq("kategori", "Anggota").eq("status", "Aktif"),
    supabaseClient.from("program_kerja").select("id", { count: "exact", head: true }),
    supabaseClient.from("anggota").select("divisi").eq("kategori", "Pengurus").eq("status", "Aktif"),
  ]);

  const divisiUnik = new Set((pengurusRes.data || []).map(r => r.divisi).filter(Boolean));
  const tahun = pengaturanRes.data?.tahun_berdiri;

  el.innerHTML = `
    <div class="stat-mini"><span class="angka">${tahun ? "Sejak " + escapeHtml(tahun) : "—"}</span><span class="label">Berdiri</span></div>
    <div class="stat-mini"><span class="angka">${anggotaRes.count ?? 0}</span><span class="label">Anggota Aktif</span></div>
    <div class="stat-mini"><span class="angka">${divisiUnik.size}</span><span class="label">Divisi</span></div>
    <div class="stat-mini"><span class="angka">${programRes.count ?? 0}</span><span class="label">Program Kerja</span></div>
  `;
}

// ================= HALAMAN TENTANG: Visi & Misi =================
async function muatVisiMisi(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { data, error } = await supabaseClient.from("pengaturan").select("visi, misi").eq("id", 1).single();
  if (error || !data || (!data.visi && !data.misi)) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <div class="visi-misi-grid">
      <div class="visi-misi-card">
        <h3>Visi</h3>
        <p>${escapeHtml(data.visi || "Belum diisi.")}</p>
      </div>
      <div class="visi-misi-card">
        <h3>Misi</h3>
        <p>${escapeHtml(data.misi || "Belum diisi.").replace(/\n/g, "<br>")}</p>
      </div>
    </div>
  `;
}

// ================= HALAMAN TENTANG: FAQ =================
async function muatFaqHalaman(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { data, error } = await supabaseClient.from("faq").select("*").order("urutan", { ascending: true, nullsFirst: false });
  if (error || !data || data.length === 0) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = data.map((f, i) => `
    <details class="faq-item"${i === 0 ? " open" : ""}>
      <summary>${escapeHtml(f.pertanyaan)}</summary>
      <div class="faq-jawaban">${escapeHtml(f.jawaban).replace(/\n/g, "<br>")}</div>
    </details>
  `).join("");
}

// ================= BERANDA: Testimoni =================
async function muatTestimoniBeranda(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { data, error } = await supabaseClient.from("testimoni").select("*").order("urutan", { ascending: true, nullsFirst: false }).limit(6);
  if (error || !data || data.length === 0) {
    el.innerHTML = "";
    const section = el.closest("section");
    if (section) section.style.display = "none";
    return;
  }
  el.innerHTML = data.map(t => `
    <div class="testimoni-card">
      <p class="kutipan">${escapeHtml(t.isi)}</p>
      <div class="testimoni-orang">
        <div class="foto">${t.foto_url ? `<img src="${t.foto_url}" alt="" loading="lazy">` : initial(t.nama)}</div>
        <div>
          <div class="nama">${escapeHtml(t.nama)}</div>
          <div class="jabatan">${escapeHtml(t.jabatan || "")}</div>
        </div>
      </div>
    </div>
  `).join("");
}

// ================= FORM PENDAFTARAN (pendaftaran.html) =================
function pasangFormPendaftaran(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Pesan validasi Bahasa Indonesia untuk field NIM & No. WhatsApp
  const nimEl = form.querySelector("#nim");
  if (nimEl) {
    nimEl.addEventListener("input", () => nimEl.setCustomValidity(""));
    nimEl.addEventListener("invalid", () => {
      nimEl.setCustomValidity(
        nimEl.validity.patternMismatch || nimEl.validity.valueMissing
          ? "NIM boleh berisi huruf dan angka, 6-20 karakter."
          : ""
      );
    });
  }
  const waEl = form.querySelector("#no_wa");
  if (waEl) {
    waEl.addEventListener("input", () => waEl.setCustomValidity(""));
    waEl.addEventListener("invalid", () => {
      waEl.setCustomValidity(
        waEl.validity.patternMismatch || waEl.validity.valueMissing
          ? "Format nomor tidak valid. Contoh yang benar: 08123456789"
          : ""
      );
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const pesanEl = document.getElementById("pesan-pendaftaran");

    // Validasi tambahan sebelum kirim (selain validasi HTML5 bawaan browser)
    const nim = form.nim.value.trim();
    const noWa = form.no_wa.value.trim();

    if (!/^[A-Za-z0-9]{6,20}$/.test(nim)) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "NIM boleh berisi huruf dan angka, 6-20 karakter.";
      form.nim.focus();
      return;
    }
    if (!/^(\+62|62|0)8[0-9]{8,12}$/.test(noWa)) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Format Nomor WhatsApp tidak valid. Contoh: 08123456789.";
      form.no_wa.focus();
      return;
    }

    const tombol = form.querySelector("button[type=submit]");
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
// ================= SKELETON LOADING: placeholder shimmer sebelum data siap =================
function skeletonListItem() {
  return `<li class="news-item">
    <span class="skeleton skeleton-text short" style="height:1.1em;"></span>
    <div>
      <span class="skeleton skeleton-title"></span>
      <span class="skeleton skeleton-text"></span>
    </div>
  </li>`;
}
function skeletonListItems(jumlah) {
  return Array(jumlah || 3).fill(0).map(skeletonListItem).join("");
}
function skeletonPhotoCard() {
  return `<div class="news-photo-card" style="background: var(--sage-100);"><span class="skeleton skeleton-image" style="height:100%; position:absolute; inset:0; border-radius: var(--radius);"></span></div>`;
}
function skeletonContentCard() {
  return `<div class="content-card">
    <span class="skeleton skeleton-image"></span>
    <div class="body">
      <span class="skeleton skeleton-text short" style="height:0.8em; width:30%;"></span>
      <span class="skeleton skeleton-title"></span>
      <span class="skeleton skeleton-text"></span>
    </div>
  </div>`;
}
function skeletonCards(jumlah, fn) {
  return Array(jumlah || 3).fill(0).map(fn).join("");
}
function skeletonMemberCard() {
  return `<div class="member-card">
    <span class="skeleton skeleton-circle"></span>
    <span class="skeleton skeleton-title" style="margin-top:0.75rem;"></span>
    <span class="skeleton skeleton-text short"></span>
  </div>`;
}
function skeletonMemberGrid(jumlah) {
  return `<div class="member-grid">${skeletonCards(jumlah || 4, skeletonMemberCard)}</div>`;
}
function skeletonParagraf(jumlah) {
  return Array(jumlah || 3).fill(0).map((_, i) => `<span class="skeleton skeleton-text${i === (jumlah || 3) - 1 ? " short" : ""}"></span>`).join("");
}
function skeletonProgramItem() {
  return `<div class="program-item"><span class="skeleton skeleton-title" style="width:60%;"></span></div>`;
}
function skeletonGaleri(jumlah) {
  return Array(jumlah || 6).fill('<span class="skeleton skeleton-image"></span>').join("");
}
function skeletonBarisTabel(kolom, jumlahBaris) {
  const baris = `<tr>${Array(kolom).fill('<td><span class="skeleton skeleton-text"></span></td>').join("")}</tr>`;
  return Array(jumlahBaris || 3).fill(baris).join("");
}

// ================= EMPTY STATE: tampilan "belum ada data" yang lebih baik =================
function emptyState(judul, deskripsi) {
  return `
    <div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 14h8"/></svg>
      <h4>${escapeHtml(judul)}</h4>
      <p>${escapeHtml(deskripsi)}</p>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// ================= SEO: update meta/OG tag dinamis di halaman detail =================
function perbaruiMetaDetail(data, kategori) {
  const BASE = "https://mim1654.github.io/himpalubi/";
  const judul = `${data.judul} — HIMPALUBI`;
  const deskripsi = ringkas((data.isi || "").replace(/\n+/g, " "), 160);
  const gambar = data.foto_url || `${BASE}img/logo.png`;
  const url = `${BASE}detail.html?id=${data.id}&kategori=${kategori}`;

  aturMeta('meta[name="description"]', "content", deskripsi);
  aturMeta('link[rel="canonical"]', "href", url);
  aturMeta('meta[property="og:type"]', "content", "article");
  aturMeta('meta[property="og:title"]', "content", judul);
  aturMeta('meta[property="og:description"]', "content", deskripsi);
  aturMeta('meta[property="og:image"]', "content", gambar);
  aturMeta('meta[property="og:url"]', "content", url);
  aturMeta('meta[name="twitter:title"]', "content", judul);
  aturMeta('meta[name="twitter:description"]', "content", deskripsi);
  aturMeta('meta[name="twitter:image"]', "content", gambar);
}

function aturMeta(selector, atribut, nilai) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(atribut, nilai);
}

// ================= TOAST: notifikasi halus (pengganti alert()) =================
function tampilkanToast(pesan, jenis) {
  let wrap = document.querySelector(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const toast = document.createElement("div");
  toast.className = `toast ${jenis || ""}`.trim();
  toast.textContent = pesan;
  wrap.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ================= LIGHTBOX: klik foto galeri untuk perbesar =================
function pasangLightbox(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const gambar = Array.from(container.querySelectorAll("img"));
  if (!gambar.length) return;

  let indeks = 0;

  function bukaLightbox(i) {
    indeks = i;
    const overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.id = "lightbox-aktif";
    overlay.innerHTML = `
      <button class="lightbox-tutup" aria-label="Tutup">&times;</button>
      ${gambar.length > 1 ? `<button class="lightbox-prev" aria-label="Sebelumnya">&larr;</button>` : ""}
      <img src="${gambar[indeks].src}" alt="${gambar[indeks].alt || ""}">
      ${gambar.length > 1 ? `<button class="lightbox-next" aria-label="Berikutnya">&rarr;</button>` : ""}
    `;
    document.body.appendChild(overlay);

    overlay.querySelector(".lightbox-tutup").addEventListener("click", tutupLightbox);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) tutupLightbox(); });
    const prev = overlay.querySelector(".lightbox-prev");
    const next = overlay.querySelector(".lightbox-next");
    if (prev) prev.addEventListener("click", () => geser(-1));
    if (next) next.addEventListener("click", () => geser(1));
    document.addEventListener("keydown", tombolKeyboard);
  }

  function geser(arah) {
    indeks = (indeks + arah + gambar.length) % gambar.length;
    const overlay = document.getElementById("lightbox-aktif");
    if (overlay) overlay.querySelector("img").src = gambar[indeks].src;
  }

  function tombolKeyboard(e) {
    if (e.key === "Escape") tutupLightbox();
    if (e.key === "ArrowLeft") geser(-1);
    if (e.key === "ArrowRight") geser(1);
  }

  function tutupLightbox() {
    const overlay = document.getElementById("lightbox-aktif");
    if (overlay) overlay.remove();
    document.removeEventListener("keydown", tombolKeyboard);
  }

  gambar.forEach((img, i) => img.addEventListener("click", () => bukaLightbox(i)));
}
