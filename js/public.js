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
    el.innerHTML = `<li>${emptyState(`Belum ada ${kategori.toLowerCase()}`, "Konten resmi akan tampil di sini begitu admin mempublikasikannya.", { icon: "event_available", btnText: "Kembali ke Beranda", btnHref: "index.html" })}</li>`;
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
      ${item.foto_url ? `<img src="${urlGambarAman(item.foto_url)}" alt="Foto ${escapeHtml(item.judul)}" loading="lazy" onerror="this.style.display='none'">` : ""}
    </li>
  `).join("");
}

// ================= HELPER PELACAKAN KLIK / PEMBACA BERITA =================
function ambilJumlahKlikBerita(articleId, fallback = 0) {
  if (!articleId) return fallback;
  try {
    const key = `himpalubi_views_${articleId}`;
    const stored = parseInt(localStorage.getItem(key), 10);
    return isNaN(stored) ? fallback : stored;
  } catch (e) {
    return fallback;
  }
}

function tambahKlikBerita(articleId) {
  if (!articleId) return 0;
  try {
    // Pengaman sesi browser agar 1 kunjungan/klik hanya terhitung tepat 1 kali
    const sessionKey = `himpalubi_viewed_session_${articleId}`;
    if (sessionStorage.getItem(sessionKey)) {
      return ambilJumlahKlikBerita(articleId, 1);
    }
    sessionStorage.setItem(sessionKey, "1");

    const key = `himpalubi_views_${articleId}`;
    const current = ambilJumlahKlikBerita(articleId, 0);
    const updated = current + 1;
    localStorage.setItem(key, updated.toString());

    // Coba simpan penambahan ke Supabase jika kolom views ada
    if (window.supabaseClient && typeof articleId !== "string") {
      supabaseClient
        .from("berita")
        .select("views")
        .eq("id", articleId)
        .single()
        .then(({ data }) => {
          if (data && typeof data.views !== "undefined") {
            supabaseClient
              .from("berita")
              .update({ views: (data.views || 0) + 1 })
              .eq("id", articleId)
              .then(() => {});
          }
        })
        .catch(() => {});
    }
    return updated;
  } catch (e) {
    return 1;
  }
}

// ================= HALAMAN DETAIL: Berita/Kegiatan =================
async function muatDetailKonten(elId, backLinkId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const kategori = params.get("kategori") || "Berita";
  const isKegiatan = (kategori === "Kegiatan");

  // Perbarui elemen navigasi luar (kembali & breadcrumb)
  const backLink = document.getElementById(backLinkId);
  const labelKembali = document.getElementById("label-kembali");
  const breadcrumbParent = document.getElementById("breadcrumb-parent");
  const breadcrumbCurrent = document.getElementById("breadcrumb-current");
  const rekomendasiTitle = document.getElementById("rekomendasi-title");
  const rekomendasiAllBtn = document.getElementById("rekomendasi-all-btn");

  if (backLink) backLink.href = isKegiatan ? "kegiatan.html" : "berita.html";
  if (labelKembali) labelKembali.textContent = isKegiatan ? "Kembali ke Agenda Kegiatan" : "Kembali ke Warta & Berita";
  if (breadcrumbParent) {
    breadcrumbParent.textContent = isKegiatan ? "Agenda Kegiatan" : "Warta & Berita";
    breadcrumbParent.href = isKegiatan ? "kegiatan.html" : "berita.html";
  }
  if (rekomendasiTitle) rekomendasiTitle.textContent = isKegiatan ? "Agenda Kegiatan Terkait" : "Warta & Publikasi Terkait";
  if (rekomendasiAllBtn) rekomendasiAllBtn.href = isKegiatan ? "kegiatan.html" : "berita.html";

  document.body.dataset.page = isKegiatan ? "kegiatan" : "berita";

  if (!id) {
    el.innerHTML = `
      <div class="p-8 sm:p-12 text-center bg-surface-container-lowest rounded-3xl border border-surface-container">
        <div class="w-16 h-16 rounded-2xl bg-surface-container text-secondary mx-auto flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-[32px]">article_off</span>
        </div>
        <h2 class="text-xl font-bold text-on-surface mb-2">Parameter Publikasi Tidak Ditemukan</h2>
        <p class="text-sm text-secondary mb-6 max-w-md mx-auto">Tautan yang Anda akses tidak memuat identitas publikasi yang valid. Silakan kembali ke katalog warta.</p>
        <a href="${isKegiatan ? 'kegiatan.html' : 'berita.html'}" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-95 transition-opacity">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Kembali ke ${isKegiatan ? 'Kegiatan' : 'Berita'}</span>
        </a>
      </div>
    `;
    return;
  }

  // Rekam penambahan pembaca saat halaman detail diakses
  tambahKlikBerita(id);

  let data = null;
  try {
    const res = await supabaseClient.from("berita").select("*").eq("id", id).single();
    data = res.data;
  } catch (err) {
    console.warn("Info: Gagal mengambil data detail dari Supabase.", err);
  }

  if (!data) {
    el.innerHTML = `
      <div class="p-8 sm:p-12 text-center bg-surface-container-lowest rounded-3xl border border-surface-container">
        <div class="w-16 h-16 rounded-2xl bg-surface-container text-primary-container mx-auto flex items-center justify-center mb-4">
          <span class="material-symbols-outlined text-[32px]">menu_book</span>
        </div>
        <h2 class="text-xl font-bold text-on-surface mb-2">Publikasi Tidak Ditemukan</h2>
        <p class="text-sm text-secondary mb-6 max-w-md mx-auto">Artikel atau dokumentasi kegiatan ini mungkin telah diarsipkan atau dipindahkan oleh pengurus redaksi.</p>
        <a href="${isKegiatan ? 'kegiatan.html' : 'berita.html'}" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-95 transition-opacity">
          <span class="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Kembali ke ${isKegiatan ? 'Kegiatan' : 'Berita'}</span>
        </a>
      </div>
    `;
    return;
  }

  // Update Judul Halaman & Jejak Navigasi
  document.title = `${data.judul} — HIMPALUBI UNIPAR`;
  if (breadcrumbCurrent) breadcrumbCurrent.textContent = data.judul;
  perbaruiMetaDetail(data, kategori);

  // Estimasi Waktu Baca
  const kata = (data.isi || "").trim().split(/\s+/).filter(Boolean).length;
  const waktuBaca = Math.max(1, Math.ceil(kata / 180));
  const totalViews = data.views || ambilJumlahKlikBerita(id, 1);
  const currentUrl = window.location.href;
  const shareText = encodeURIComponent(`${data.judul} — Publikasi Resmi HIMPALUBI UNIPAR\n\n`);
  const shareUrl = encodeURIComponent(currentUrl);

  // Format Paragraf Isi
  const rawParagraphs = (data.isi || "").split(/\n+/).filter(Boolean);
  let paragraphsHtml = "";
  if (rawParagraphs.length === 0) {
    paragraphsHtml = `<p class="text-secondary italic">Belum ada rincian isi teks untuk publikasi ini.</p>`;
  } else {
    paragraphsHtml = rawParagraphs.map((p, idx) => {
      if (idx === 0) {
        return `<p class="text-lg sm:text-xl font-medium text-on-surface leading-relaxed mb-6">${escapeHtml(p)}</p>`;
      }
      return `<p class="text-base sm:text-lg text-secondary leading-relaxed sm:leading-[1.9]">${escapeHtml(p)}</p>`;
    }).join("");
  }

  el.innerHTML = `
    <article class="bg-surface-container-lowest rounded-3xl p-6 sm:p-10 lg:p-12 shadow-sm border border-surface-container flex flex-col">
      
      <!-- Article Header & Meta -->
      <header class="flex flex-col gap-4 border-b border-surface-container pb-6 sm:pb-8">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-primary-fixed text-primary font-bold text-xs uppercase tracking-wider shadow-xs">
            <span class="material-symbols-outlined text-[14px]">label</span>
            <span>${escapeHtml(kategori)}</span>
          </span>
          <span class="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
            <span class="material-symbols-outlined text-[15px] text-primary-container">schedule</span>
            <span>${waktuBaca} Menit Baca</span>
          </span>
          <span class="opacity-40 text-secondary" aria-hidden="true">•</span>
          <span class="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
            <span class="material-symbols-outlined text-[15px] text-primary-container">visibility</span>
            <span>${totalViews.toLocaleString("id-ID")} Pembaca</span>
          </span>
        </div>

        <h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-[38px] font-extrabold text-on-surface leading-tight sm:leading-tight tracking-tight">
          ${escapeHtml(data.judul)}
        </h1>

        <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm shadow-xs shrink-0 overflow-hidden">
              <img src="img/logo.png" alt="HIMPALUBI" class="w-full h-full object-cover" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
              <span class="hidden">HL</span>
            </div>
            <div>
              <div class="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-on-surface">
                <span>${escapeHtml(data.penulis || "Biro Media & Informasi")}</span>
                <span class="material-symbols-outlined text-[16px] text-primary-container" title="Terverifikasi Resmi Organisasi">verified</span>
              </div>
              <div class="flex items-center gap-2 text-xs text-secondary">
                <span>${formatTanggal(data.tanggal)}</span>
                <span class="opacity-40">•</span>
                <span>HIMPALUBI FKIP UNIPAR</span>
              </div>
            </div>
          </div>

          <!-- Quick Share Buttons Desktop -->
          <div class="inline-flex items-center gap-1 p-1 rounded-full bg-surface-container-low border border-surface-container shadow-xs">
            <a href="https://api.whatsapp.com/send?text=${shareText}${shareUrl}" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-primary transition-all flex items-center justify-center cursor-pointer" title="Bagikan ke WhatsApp">
              <span class="material-symbols-outlined text-[16px]">chat</span>
            </a>
            <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" rel="noopener noreferrer" class="w-8 h-8 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-primary transition-all flex items-center justify-center cursor-pointer" title="Bagikan ke X / Twitter">
              <span class="material-symbols-outlined text-[16px]">share</span>
            </a>
            <button type="button" class="btn-copy-link w-8 h-8 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-primary transition-all flex items-center justify-center cursor-pointer" title="Salin Tautan">
              <span class="material-symbols-outlined text-[16px]">link</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Featured Photo / Media Banner -->
      <div class="my-6 sm:my-8">
        ${data.foto_url ? `
          <div class="rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-surface-container bg-surface-container">
            <img src="${urlGambarAman(data.foto_url)}" alt="Dokumentasi ${escapeHtml(data.judul)}" class="w-full h-auto max-h-[520px] object-cover" loading="lazy" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
            <div class="hidden w-full h-64 flex flex-col items-center justify-center bg-gradient-to-br from-surface-container to-surface-container-high text-secondary p-6 text-center">
              <span class="material-symbols-outlined text-[48px] text-primary-container mb-2">image</span>
              <p class="text-sm font-bold text-on-surface">Dokumentasi Arsip HIMPALUBI UNIPAR</p>
            </div>
            <div class="py-2.5 px-4 bg-surface-container-low text-xs text-secondary flex flex-wrap items-center justify-between gap-2 border-t border-surface-container">
              <span class="flex items-center gap-1.5 font-medium text-on-surface/80">
                <span class="material-symbols-outlined text-[15px] text-primary-container" aria-hidden="true">photo_camera</span>
                Dokumentasi Resmi Publikasi
              </span>
              <span class="text-secondary">HIMPALUBI FKIP UNIPAR</span>
            </div>
          </div>
        ` : `
          <div class="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-surface-container to-surface-container-low border border-surface-container p-6 sm:p-8 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <span class="material-symbols-outlined text-[26px]">newspaper</span>
            </div>
            <div>
              <h2 class="text-sm font-bold text-on-surface">Warta Publikasi Inklusif</h2>
              <p class="text-xs text-secondary">Rilis resmi Himpunan Mahasiswa Pendidikan Luar Biasa Universitas PGRI Argopuro Jember.</p>
            </div>
          </div>
        `}
      </div>

      <!-- Article Body -->
      <div class="detail-isi space-y-6 pt-2 pb-8 border-b border-surface-container">
        ${paragraphsHtml}
      </div>

      <!-- Social Share & Engagement Footer -->
      <div class="py-6 border-b border-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-primary">Bagikan Artikel</span>
          <p class="text-xs text-secondary mt-0.5">Sebarluaskan warta dan narasi edukasi inklusif ini.</p>
        </div>
        
        <!-- Action Cluster in a single unified pill container -->
        <div class="flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl sm:rounded-full max-w-full bg-surface-container-low border border-surface-container shadow-xs">
          <a href="https://api.whatsapp.com/send?text=${shareText}${shareUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full hover:bg-surface-container-lowest text-on-surface hover:text-primary transition-all text-xs font-semibold" title="Bagikan ke WhatsApp">
            <span class="material-symbols-outlined text-[16px] text-green-600">chat</span>
            <span>WhatsApp</span>
          </a>
          <span class="w-[1px] h-4 bg-surface-container" aria-hidden="true"></span>
          <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full hover:bg-surface-container-lowest text-on-surface hover:text-primary transition-all text-xs font-semibold" title="Bagikan ke X / Twitter">
            <span class="material-symbols-outlined text-[16px]">send</span>
            <span>X / Twitter</span>
          </a>
          <span class="w-[1px] h-4 bg-surface-container" aria-hidden="true"></span>
          <button type="button" class="btn-copy-link inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full hover:bg-surface-container-lowest text-on-surface hover:text-primary transition-all text-xs font-semibold cursor-pointer" title="Salin Tautan Artikel">
            <span class="material-symbols-outlined text-[16px]">link</span>
            <span>Salin</span>
          </button>
          <span class="w-[1px] h-4 bg-surface-container" aria-hidden="true"></span>
          <button type="button" onclick="window.print()" class="w-8 h-8 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-on-surface transition-all flex items-center justify-center cursor-pointer" title="Cetak Artikel">
            <span class="material-symbols-outlined text-[16px]">print</span>
          </button>
        </div>
      </div>

      <!-- Author Signature Box -->
      <footer class="pt-8 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 bg-surface-container-low/60 rounded-2xl p-5 sm:p-6 mt-8 border border-surface-container">
        <div class="w-14 h-14 rounded-full bg-surface-container-lowest p-2 border border-primary/20 shadow-xs shrink-0 flex items-center justify-center">
          <img src="img/logo.png" alt="Logo HIMPALUBI" class="w-full h-full object-contain">
        </div>
        <div class="flex-1 text-center sm:text-left">
          <div class="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
            <h2 class="text-sm sm:text-base font-bold text-on-surface">Redaksi &amp; Media HIMPALUBI UNIPAR</h2>
            <span class="px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-bold text-[10px] tracking-wide uppercase shadow-2xs">Organisasi Resmi</span>
          </div>
          <p class="text-xs text-secondary leading-relaxed mb-3">
            Himpunan Mahasiswa Pendidikan Luar Biasa (HIMPALUBI) FKIP Universitas PGRI Argopuro Jember. Wadah aspirasi mahasiswa, advokasi disabilitas, dan pengembangan keilmuan pendidikan khusus.
          </p>
          <div class="flex items-center justify-center sm:justify-start gap-4 text-xs font-semibold text-primary">
            <a href="tentang.html" class="hover:underline inline-flex items-center gap-1 hover:text-primary-container transition-colors">
              <span>Profil Organisasi</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
            <span class="opacity-30 text-secondary">•</span>
            <a href="kontak.html" class="hover:underline inline-flex items-center gap-1 hover:text-primary-container transition-colors">
              <span>Hubungi Redaksi</span>
              <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
          </div>
        </div>
      </footer>

    </article>
  `;

  // Pasang event listener tombol salin tautan
  const copyButtons = el.querySelectorAll(".btn-copy-link");
  copyButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          if (typeof tampilkanToast === "function") {
            tampilkanToast("Tautan artikel berhasil disalin ke papan klip!", "check_circle");
          } else {
            alert("Tautan artikel berhasil disalin!");
          }
        }).catch(() => {
          if (typeof tampilkanToast === "function") {
            tampilkanToast("Gagal menyalin tautan.", "error");
          }
        });
      }
    });
  });

  // Muat Rekomendasi Terkait Lainnya
  muatRekomendasiTerkait(id, kategori);
}

// ================= REKOMENDASI TERKAIT DI HALAMAN DETAIL =================
async function muatRekomendasiTerkait(currentId, kategori) {
  const section = document.getElementById("rekomendasi-section");
  const grid = document.getElementById("rekomendasi-grid");
  if (!section || !grid) return;

  try {
    let query = supabaseClient
      .from("berita")
      .select("*")
      .neq("id", currentId)
      .order("tanggal", { ascending: false })
      .limit(2);

    if (kategori) {
      query = query.eq("kategori", kategori);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      section.classList.add("hidden");
      return;
    }

    // Atur grid styling jika cuma 1 item vs 2 item
    if (data.length === 1) {
      grid.className = "grid grid-cols-1 max-w-xl gap-6";
    } else {
      grid.className = "grid grid-cols-1 md:grid-cols-2 gap-6";
    }

    grid.innerHTML = data.map(item => `
      <article class="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-surface-container transition-all duration-300 flex flex-col sm:flex-row group">
        <div class="sm:w-36 sm:min-w-[144px] h-36 sm:h-auto bg-surface-container overflow-hidden relative shrink-0">
          ${item.foto_url ? `
            <img src="${urlGambarAman(item.foto_url)}" alt="${escapeHtml(item.judul)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
          ` : ''}
          <div class="${item.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-3 text-center">
            <div class="w-8 h-8 rounded-xl bg-primary-fixed text-primary flex items-center justify-center mb-1">
              <span class="material-symbols-outlined text-[18px]">newspaper</span>
            </div>
            <span class="text-[10px] font-bold text-on-surface/70 uppercase tracking-wider">HIMPALUBI</span>
          </div>
        </div>
        <div class="p-4 flex flex-col justify-between flex-1">
          <div>
            <div class="flex items-center gap-2 text-[11px] font-semibold text-secondary mb-1.5">
              <span class="px-2 py-0.5 rounded-full bg-primary-fixed text-primary font-bold uppercase tracking-wider text-[10px]">${escapeHtml(item.kategori || 'Berita')}</span>
              <span class="opacity-40">•</span>
              <span>${formatTanggal(item.tanggal)}</span>
            </div>
            <h3 class="text-sm font-bold text-on-surface line-clamp-2 group-hover:text-primary-container transition-colors leading-snug">
              <a href="detail.html?id=${item.id}&kategori=${encodeURIComponent(item.kategori || 'Berita')}">
                ${escapeHtml(item.judul)}
              </a>
            </h3>
          </div>
          <div class="pt-3 mt-3 border-t border-surface-container flex items-center justify-between text-xs">
            <span class="flex items-center gap-1 text-secondary text-[11px]">
              <span class="material-symbols-outlined text-[14px] text-primary-container">visibility</span>
              ${ambilJumlahKlikBerita(item.id, 1)} Pembaca
            </span>
            <a href="detail.html?id=${item.id}&kategori=${encodeURIComponent(item.kategori || 'Berita')}" class="px-3 py-1 rounded-full bg-surface-container text-on-surface hover:bg-primary-container hover:text-on-primary font-semibold text-xs transition-colors inline-flex items-center gap-1">
              <span>Baca</span>
              <span class="material-symbols-outlined text-[13px]">arrow_forward</span>
            </a>
          </div>
        </div>
      </article>
    `).join("");

    section.classList.remove("hidden");
  } catch (e) {
    section.classList.add("hidden");
  }
}

// ================= BERANDA: Kegiatan Terbaru (3 kartu) =================
async function muatKegiatanTerbaru(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  let data = null;
  try {
    const res = await supabaseClient
      .from("berita")
      .select("*")
      .eq("kategori", "Kegiatan")
      .order("tanggal", { ascending: false })
      .limit(3);
    data = res.data;
  } catch (e) {
    console.warn("Info: Menampilkan agenda kurasi HIMPALUBI", e);
  }

  // Jika admin telah mempublikasikan kegiatan dinamis di Supabase
  if (data && data.length > 0) {
    el.innerHTML = data.map(item => `
      <article class="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col border border-surface-container group">
        <div class="relative h-48 bg-surface-container overflow-hidden flex items-center justify-center">
          ${item.foto_url ? `
            <img src="${urlGambarAman(item.foto_url)}" alt="Foto ${escapeHtml(item.judul)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
          ` : ''}
          <div class="${item.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-4 text-center select-none">
            <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-2 shadow-xs">
              <span class="material-symbols-outlined text-[24px]">event</span>
            </div>
            <span class="text-xs font-bold text-on-surface/70 tracking-wide uppercase">HIMPALUBI UNIPAR</span>
          </div>
          <div class="absolute top-3.5 left-3.5 bg-primary-container text-on-primary px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            ${formatTanggal(item.tanggal)}
          </div>
          <div class="absolute top-3.5 right-3.5 bg-inverse-surface/85 text-surface-bright px-2.5 py-0.5 rounded-full text-[11px] font-medium">
            Kegiatan Resmi
          </div>
        </div>
        <div class="p-5 flex flex-col flex-1">
          <h3 class="text-base font-bold text-on-surface mb-2 group-hover:text-primary-container transition-colors line-clamp-2">
            <a href="detail.html?id=${item.id}&kategori=Kegiatan" class="hover:underline">${escapeHtml(item.judul)}</a>
          </h3>
          <p class="text-xs text-secondary mb-5 flex-1 line-clamp-3 leading-relaxed">
            ${escapeHtml(ringkas(item.isi, 120))}
          </p>
          <div class="flex items-center justify-between pt-3 border-t border-surface-container mt-auto">
            <span class="flex items-center gap-1 text-secondary text-xs">
              <span class="material-symbols-outlined text-[16px] text-primary-container" aria-hidden="true">event</span>
              ${formatTanggal(item.tanggal)}
            </span>
            <a href="detail.html?id=${item.id}&kategori=Kegiatan" class="px-4 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-primary-container hover:text-on-primary text-xs font-semibold transition-colors">
              Detail
            </a>
          </div>
        </div>
      </article>
    `).join("");
    return;
  }

  // Jika belum ada data kegiatan di database
  el.innerHTML = emptyState(
    "Belum ada kegiatan yang diunggah",
    "Saat ini belum ada publikasi agenda kegiatan atau program kerja di database. Pengurus akan segera memperbarui jadwal kegiatan mendatang.",
    {
      icon: "event_busy",
      btnText: "Lihat Seluruh Kegiatan",
      btnHref: "kegiatan.html"
    }
  );
}

// ================= HALAMAN KEGIATAN (kegiatan.html) =================
async function muatHalamanKegiatan(gridId = "daftar-kegiatan-grid", featuredSectionId = "featured-event-section", counterId = "eventCounterNotice") {
  const grid = document.getElementById(gridId);
  const featuredSec = document.getElementById(featuredSectionId);
  const counterNotice = document.getElementById(counterId);

  if (!grid) return;

  let data = null;
  try {
    const res = await supabaseClient
      .from("berita")
      .select("*")
      .eq("kategori", "Kegiatan")
      .order("tanggal", { ascending: false });
    data = res.data;
  } catch (err) {
    console.warn("Info: Tidak dapat memuat kegiatan dari Supabase.", err);
  }

  // Jika tidak ada data kegiatan di database
  if (!data || data.length === 0) {
    if (featuredSec) featuredSec.style.display = "none";
    if (counterNotice) {
      counterNotice.innerHTML = `Menampilkan: <strong class="text-on-surface">0 Program Terjadwal</strong>`;
    }
    grid.innerHTML = emptyState(
      "Belum ada kegiatan yang diunggah",
      "Saat ini belum ada publikasi agenda kegiatan atau program kerja di database. Pengurus akan segera memperbarui jadwal kegiatan mendatang.",
      {
        icon: "event_busy",
        btnText: "Hubungi Pengurus",
        btnHref: "kontak.html"
      }
    );
    return;
  }

  // Jika ada data kegiatan
  if (counterNotice) {
    counterNotice.innerHTML = `Menampilkan: <strong class="text-on-surface">${data.length} Program Terjadwal</strong>`;
  }

  // 1. Render Featured Section (Sorotan Utama) menggunakan kegiatan terbaru
  if (featuredSec) {
    featuredSec.style.display = "block";
    const fItem = data[0];
    featuredSec.innerHTML = `
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-6 rounded-full bg-primary-container" aria-hidden="true"></span>
          <h2 class="text-xl sm:text-2xl font-bold text-on-surface">Sorotan Utama Kegiatan Terdekat</h2>
        </div>
        <span class="hidden sm:inline-flex items-center gap-1 text-xs text-primary-container font-semibold">
          <span class="material-symbols-outlined text-[18px]" aria-hidden="true">verified</span>
          <span>Kegiatan Terbaru</span>
        </span>
      </div>

      <div class="bg-surface-container-lowest rounded-2xl shadow-xl border border-surface-container overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        <!-- Media Column -->
        <div class="lg:col-span-5 relative min-h-[280px] sm:min-h-[340px] lg:min-h-full bg-surface-container flex items-center justify-center overflow-hidden">
          ${fItem.foto_url ? `
            <img class="w-full h-full object-cover" alt="${escapeHtml(fItem.judul)}" src="${urlGambarAman(fItem.foto_url)}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
          ` : ''}
          <div class="${fItem.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-6 text-center select-none">
            <div class="w-14 h-14 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-3 shadow-sm">
              <span class="material-symbols-outlined text-[28px]">event</span>
            </div>
            <span class="text-xs font-bold text-on-surface/80 tracking-wider uppercase">HIMPALUBI UNIPAR</span>
          </div>
          <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent lg:hidden" aria-hidden="true"></div>
          <div class="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-container text-on-primary text-xs font-bold tracking-wide uppercase shadow-md">
            <span class="w-2 h-2 rounded-full bg-on-primary animate-ping" aria-hidden="true"></span>
            <span>Publikasi Resmi</span>
          </div>
        </div>

        <!-- Content Column -->
        <div class="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-3">
              <span class="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-bold">
                Kegiatan Resmi Himpunan
              </span>
              <span class="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-xs font-semibold">
                ${formatTanggal(fItem.tanggal)}
              </span>
            </div>

            <h3 class="text-xl sm:text-2xl font-bold text-on-surface mb-4 leading-snug">
              <a href="detail.html?id=${fItem.id}&kategori=Kegiatan" class="hover:underline hover:text-primary-container transition-colors">${escapeHtml(fItem.judul)}</a>
            </h3>

            <p class="text-sm sm:text-base text-secondary mb-6 leading-relaxed">
              ${escapeHtml(ringkas(fItem.isi, 240))}
            </p>

            <!-- Key Details Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-surface-container-low">
              <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-on-primary-fixed-variant text-[20px]" aria-hidden="true">calendar_today</span>
                </div>
                <div class="min-w-0">
                  <div class="text-xs text-secondary font-medium">Hari &amp; Tanggal</div>
                  <div class="text-sm font-semibold text-on-surface truncate">${formatTanggal(fItem.tanggal)}</div>
                </div>
              </div>

              <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                  <span class="material-symbols-outlined text-on-primary-fixed-variant text-[20px]" aria-hidden="true">verified</span>
                </div>
                <div class="min-w-0">
                  <div class="text-xs text-secondary font-medium">Penyelenggara</div>
                  <div class="text-sm font-semibold text-on-surface truncate">HIMPALUBI UNIPAR</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Row -->
          <div class="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-surface-container">
            <div class="text-xs text-secondary font-medium">
              Sivitas Akademika PLB UNIPAR Jember
            </div>

            <div class="flex items-center gap-3">
              <a class="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold transition-colors shadow-md min-h-[44px]" href="detail.html?id=${fItem.id}&kategori=Kegiatan">
                <span>Lihat Detail Agenda</span>
                <span class="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // 2. Render Grid Kegiatan
  grid.innerHTML = data.map((item) => `
    <article class="event-card bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-surface-container overflow-hidden flex flex-col justify-between group" data-category="all" data-status="${statusKegiatan(item.tanggal)}" data-period="${periodeKegiatan(item.tanggal)}">
      <div>
        <div class="relative h-48 w-full overflow-hidden bg-surface-container flex items-center justify-center">
          ${item.foto_url ? `
            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="${escapeHtml(item.judul)}" src="${urlGambarAman(item.foto_url)}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
          ` : ''}
          <div class="${item.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-4 text-center select-none">
            <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-2 shadow-xs">
              <span class="material-symbols-outlined text-[24px]">event</span>
            </div>
            <span class="text-xs font-bold text-on-surface/70 tracking-wide uppercase">HIMPALUBI UNIPAR</span>
          </div>
          <div class="absolute top-3 left-3">
            <span class="px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-xs font-semibold shadow-sm">
              Kegiatan Resmi
            </span>
          </div>
          <div class="absolute top-3 right-3 bg-surface-container-lowest/95 backdrop-blur px-2.5 py-1 rounded-lg shadow-sm text-center">
            <div class="text-[10px] uppercase font-bold text-primary-container">AGENDA</div>
            <div class="text-xs font-extrabold text-on-surface leading-none">${formatTanggal(item.tanggal)}</div>
          </div>
        </div>

        <div class="p-5">
          <div class="flex items-center gap-2 mb-2">
            <span class="inline-flex items-center gap-1 text-xs font-semibold text-primary-container">
              <span class="w-2 h-2 rounded-full bg-primary-container animate-pulse"></span>
              Publikasi Resmi
            </span>
            <span class="text-secondary/50">&bull;</span>
            <span class="text-xs text-secondary">HIMPALUBI</span>
          </div>

          <h3 class="text-base font-bold text-on-surface mb-2 line-clamp-2 group-hover:text-primary-container transition-colors">
            <a href="detail.html?id=${item.id}&kategori=Kegiatan" class="hover:underline">${escapeHtml(item.judul)}</a>
          </h3>

          <p class="text-xs text-secondary line-clamp-2 mb-4 leading-relaxed">
            ${escapeHtml(ringkas(item.isi, 120))}
          </p>

          <div class="flex flex-col gap-2 bg-surface-container-low p-3 rounded-xl text-xs text-secondary">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[16px] text-primary-container shrink-0">event</span>
              <span class="truncate">${formatTanggal(item.tanggal)}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="p-5 pt-0">
        <a class="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-surface-container hover:bg-primary-container hover:text-on-primary text-on-surface text-xs font-semibold transition-all min-h-[44px]" href="detail.html?id=${item.id}&kategori=Kegiatan">
          <span>Lihat Detail Kegiatan</span>
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
        </a>
      </div>
    </article>
  `).join("");

  // Inisialisasi filter setelah card dimasukkan ke DOM
  isiOpsiPeriodeKegiatan(data);
  inisialisasiFilterKegiatan();
}

// ================= HALAMAN BERITA (berita.html) =================
async function muatHalamanBerita(gridId = "news-grid-container", featuredId = "featured-news-section", searchInputId = "news-search-input", counterId = "news-counter-notice") {
  const grid = document.getElementById(gridId);
  const featuredSec = document.getElementById(featuredId);
  const counterNotice = document.getElementById(counterId);

  if (!grid) return;

  grid.innerHTML = skeletonListItems(4);

  let supabaseData = null;
  try {
    const res = await supabaseClient
      .from("berita")
      .select("*")
      .eq("kategori", "Berita")
      .order("tanggal", { ascending: false });
    supabaseData = res.data;
  } catch (err) {
    console.warn("Info: Gagal memuat berita dari Supabase.", err);
  }

  // Jika database kosong atau belum ada berita
  if (!supabaseData || supabaseData.length === 0) {
    if (featuredSec) {
      featuredSec.classList.add("hidden");
    }
    grid.innerHTML = `
      <div class="col-span-full py-16 px-6 text-center bg-surface-container-lowest rounded-3xl border border-surface-container shadow-xs">
        <div class="w-16 h-16 mx-auto rounded-2xl bg-surface-container flex items-center justify-center text-primary-container mb-4 shadow-xs">
          <span class="material-symbols-outlined text-[32px]">newspaper</span>
        </div>
        <h3 class="text-lg font-bold text-on-surface mb-2">Belum Ada Warta Berita</h3>
        <p class="text-xs sm:text-sm text-secondary max-w-md mx-auto leading-relaxed">
          Saat ini belum ada publikasi berita yang diunggah di database. Pengurus redaksi HIMPALUBI akan segera memperbarui warta dan rilis informasi terkini.
        </p>
      </div>
    `;

    if (counterNotice) {
      counterNotice.textContent = "Belum Ada Warta Terdaftar";
    }

    const totalPubEl = document.getElementById("totalPubCount");
    if (totalPubEl) {
      totalPubEl.textContent = "0";
    }
    return;
  }

  // 1. Hubungkan berita terbaru dari Supabase ke Hero Sorotan Khusus secara dinamis
  const latestItem = supabaseData[0];
  const featuredContainer = document.getElementById("featured-news-container");
  
  if (featuredSec && featuredContainer) {
    // Tampilkan isi teks yang mengisi penuh ruang vertikal kartu Sorotan Khusus
    const fullText = (latestItem.isi || "").replace(/\s+/g, " ").trim();
    const summaryText = ringkas(fullText, 1500);

    const kata = fullText.split(/\s+/).filter(Boolean).length;
    const readMin = Math.max(1, Math.ceil(kata / 180));
    const totalHeroViews = latestItem.views || ambilJumlahKlikBerita(latestItem.id, 0);
    const detailUrl = `detail.html?id=${latestItem.id}&kategori=Berita`;

    featuredContainer.innerHTML = `
      <div class="rounded-3xl bg-surface-container-lowest shadow-md overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 border border-surface-container">
        
        <!-- Media Visual Block -->
        <div class="lg:col-span-6 relative min-h-[340px] sm:min-h-[400px] lg:min-h-[460px] flex flex-col justify-between p-6 sm:p-8 bg-surface-variant overflow-hidden">
          ${latestItem.foto_url ? `
            <img class="absolute inset-0 w-full h-full object-cover" src="${urlGambarAman(latestItem.foto_url)}" alt="${escapeHtml(latestItem.judul)}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
          ` : ''}
          <div class="${latestItem.foto_url ? 'hidden ' : ''}absolute inset-0 w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container to-surface-container-high text-secondary p-8 text-center select-none">
            <div class="w-16 h-16 rounded-3xl bg-primary-fixed text-primary flex items-center justify-center mb-3 shadow-sm">
              <span class="material-symbols-outlined text-[36px]">campaign</span>
            </div>
            <span class="text-xs font-bold text-on-surface/70 tracking-wider uppercase">Sorotan Warta HIMPALUBI</span>
          </div>
          
          <!-- Scrim gradient for contrast -->
          <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface via-inverse-surface/30 to-transparent pointer-events-none"></div>
          
          <!-- Top Meta Badges -->
          <div class="relative z-10 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-container text-on-primary text-xs uppercase tracking-wider font-bold shadow-sm">
              <span class="material-symbols-outlined text-[16px]" aria-hidden="true">campaign</span>
              <span>Sorotan Khusus</span>
            </span>
            <span class="px-3 py-1.5 rounded-full bg-inverse-surface/80 backdrop-blur-md text-white text-xs font-medium">
              ${formatTanggal(latestItem.tanggal)}
            </span>
            <span class="px-3 py-1.5 rounded-full bg-inverse-surface/80 backdrop-blur-md text-white text-xs font-medium flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]" aria-hidden="true">schedule</span>
              <span>${readMin} Menit Baca</span>
            </span>
          </div>
        </div>

        <!-- Content Narrative Block -->
        <div class="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6 bg-surface-container-lowest">
          <div class="flex flex-col flex-1 gap-3.5">
            <div class="flex items-center gap-3">
              <span class="px-3 py-1 rounded-full bg-primary-fixed text-primary text-xs uppercase font-bold tracking-wider">
                ${escapeHtml(latestItem.subkategori || "Warta Resmi")}
              </span>
              <span class="text-xs text-secondary flex items-center gap-1">
                <span class="material-symbols-outlined text-[16px] text-primary-container" aria-hidden="true">visibility</span>
                <span>${totalHeroViews.toLocaleString("id-ID")} Pembaca</span>
              </span>
            </div>
            <h2 class="text-xl sm:text-2xl lg:text-3xl font-extrabold text-on-surface leading-tight tracking-tight">
              <a href="${detailUrl}" class="hover:text-primary-container transition-colors">${escapeHtml(latestItem.judul)}</a>
            </h2>
            <p class="text-sm sm:text-base text-secondary leading-relaxed line-clamp-[8] sm:line-clamp-[9] lg:line-clamp-[10]">
              ${escapeHtml(summaryText)}
            </p>
          </div>

          <!-- Bottom Footer Details -->
          <div class="pt-6 mt-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-surface-container">
            <!-- Author Block -->
            <div class="flex items-center gap-3 shrink-0">
              <div class="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <span class="material-symbols-outlined text-[20px]" aria-hidden="true">edit_note</span>
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-sm font-bold text-on-surface truncate">${escapeHtml(latestItem.penulis || "Redaksi HIMPALUBI")}</span>
                <span class="text-xs text-secondary truncate">HIMPALUBI UNIPAR Jember</span>
              </div>
            </div>

            <!-- Action Cluster -->
            <div class="flex items-center gap-2.5">
              <a class="px-5 py-2.5 rounded-full bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-sm flex items-center gap-1.5 whitespace-nowrap min-h-[38px]" href="${detailUrl}">
                <span>Baca Liputan Lengkap</span>
                <span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>

      </div>
    `;
    featuredSec.classList.remove("hidden");
  }

  // 2. Format list artikel murni dari Supabase
  const displayList = supabaseData.map((item) => ({
    id: item.id,
    judul: item.judul,
    isi: item.isi,
    tanggal: item.tanggal,
    kategori: item.subkategori || "Warta Resmi",
    slug: (item.subkategori || "all").toLowerCase().replace(/[^a-z0-9]/g, ""),
    penulis: item.penulis || "Redaksi HIMPALUBI",
    readTime: Math.max(1, Math.ceil((item.isi || "").split(/\s+/).length / 180)).toString(),
    foto_url: item.foto_url,
    views: item.views || ambilJumlahKlikBerita(item.id, 0),
    icon: "feed"
  }));

  // Perbarui total publikasi terdata
  const totalPubEl = document.getElementById("totalPubCount");
  if (totalPubEl) {
    totalPubEl.textContent = `${displayList.length}+`;
  }

  // Render Grid Cards
  grid.innerHTML = displayList.map(item => `
    <article class="news-card group flex flex-col justify-between rounded-2xl bg-surface-container-lowest p-5 shadow-sm hover:shadow-md transition-all h-full border border-surface-container" data-category="${item.slug || 'all'}" data-title="${escapeHtml(item.judul)}">
      <div class="flex flex-col gap-3.5">
        <div class="relative w-full h-48 rounded-xl overflow-hidden bg-surface-container">
          ${item.foto_url ? `
            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="${escapeHtml(item.judul)}" src="${urlGambarAman(item.foto_url)}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
          ` : ''}
          <div class="${item.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-4 text-center select-none">
            <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-2 shadow-xs">
              <span class="material-symbols-outlined text-[24px]">${item.icon || 'article'}</span>
            </div>
            <span class="text-xs font-bold text-on-surface/70 tracking-wide uppercase">HIMPALUBI UNIPAR</span>
          </div>
          <span class="absolute top-3 left-3 px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary-container text-xs font-bold shadow-sm">
            ${escapeHtml(item.kategori || 'Warta')}
          </span>
        </div>
        <div class="flex items-center gap-2 text-xs text-secondary">
          <span class="material-symbols-outlined text-[14px]">calendar_today</span>
          <span>${formatTanggal(item.tanggal)}</span>
          <span>•</span>
          <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px] text-primary-container">visibility</span><span>${item.views.toLocaleString("id-ID")} Pembaca</span></span>
        </div>
        <h3 class="text-base font-bold text-on-surface group-hover:text-primary-container transition-colors leading-snug">
          <a href="detail.html?id=${item.id}&kategori=Berita" class="hover:underline">${escapeHtml(item.judul)}</a>
        </h3>
        <p class="text-xs sm:text-sm text-secondary line-clamp-3 leading-relaxed">
          ${escapeHtml(ringkas(item.isi, 150))}
        </p>
      </div>
      <div class="pt-4 mt-4 flex items-center justify-between text-secondary border-t border-surface-container">
        <span class="text-xs text-on-surface-variant font-medium">${escapeHtml(item.penulis || 'Redaksi')}</span>
        <a class="text-xs text-primary font-bold flex items-center gap-1 hover:underline" href="detail.html?id=${item.id}&kategori=Berita">
          <span>Baca</span>
          <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
        </a>
      </div>
    </article>
  `).join("");

  if (counterNotice) {
    counterNotice.textContent = `Menampilkan ${displayList.length} Warta Terbaru`;
  }

  // Inisialisasi Filter & Search
  inisialisasiFilterBerita();

  // Inisialisasi Fitur Narasi Audio (Web Speech API)
  inisialisasiSpeechNarrator();
}

function inisialisasiFilterBerita() {
  const searchInput = document.getElementById("news-search-input");
  const searchBtn = document.getElementById("news-search-btn");
  const filterPills = document.querySelectorAll(".category-pill");
  const newsCards = document.querySelectorAll(".news-card");
  const counterNotice = document.getElementById("news-counter-notice");
  const tagBtns = document.querySelectorAll(".tag-btn");

  let currentCategory = "all";

  function filterNews() {
    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    let visibleCount = 0;

    newsCards.forEach((card) => {
      const cardCat = card.dataset.category || "all";
      const cardText = card.textContent.toLowerCase();

      const matchCategory = currentCategory === "all" || cardCat === currentCategory || cardText.includes(currentCategory);
      const matchSearch = !searchTerm || cardText.includes(searchTerm);

      if (matchCategory && matchSearch) {
        card.classList.remove("hidden");
        visibleCount++;
      } else {
        card.classList.add("hidden");
      }
    });

    if (counterNotice) {
      counterNotice.textContent = `Menampilkan ${visibleCount} Warta`;
    }
  }

  if (searchInput) searchInput.addEventListener("input", filterNews);
  if (searchBtn) searchBtn.addEventListener("click", filterNews);

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => {
        p.classList.remove("bg-primary-container", "text-on-primary", "font-bold");
        p.classList.add("bg-surface", "text-secondary", "font-semibold");
      });
      pill.classList.remove("bg-surface", "text-secondary", "font-semibold");
      pill.classList.add("bg-primary-container", "text-on-primary", "font-bold");
      currentCategory = pill.dataset.category || "all";
      filterNews();
    });
  });

  tagBtns.forEach((tagBtn) => {
    tagBtn.addEventListener("click", () => {
      const tagText = tagBtn.dataset.tag || tagBtn.textContent.replace("#", "").trim();
      if (searchInput) {
        searchInput.value = tagText;
        filterNews();
        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
}

function inisialisasiSpeechNarrator() {
  const playBtn = document.getElementById("play-speech-btn");
  const speechIcon = document.getElementById("speech-icon");
  const statusLabel = document.getElementById("speech-title-status");
  const timerLabel = document.getElementById("speech-timer");

  if (!playBtn || !("speechSynthesis" in window)) return;

  let isPlaying = false;

  playBtn.addEventListener("click", () => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      isPlaying = false;
      if (speechIcon) speechIcon.textContent = "volume_up";
      if (statusLabel) statusLabel.textContent = "Dengarkan Artikel (Fitur Suara)";
      if (timerLabel) timerLabel.textContent = "Audio Dijeda";
      return;
    }

    const title = document.getElementById("featured-title")?.textContent || "";
    const summary = document.getElementById("featured-summary")?.textContent || "";
    const textToRead = `${title}. ${summary}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;

    utterance.onstart = () => {
      isPlaying = true;
      if (speechIcon) speechIcon.textContent = "pause";
      if (statusLabel) statusLabel.textContent = "Memutar Narasi Suara...";
      if (timerLabel) timerLabel.textContent = "Sedang Memutar";
    };

    utterance.onend = () => {
      isPlaying = false;
      if (speechIcon) speechIcon.textContent = "volume_up";
      if (statusLabel) statusLabel.textContent = "Dengarkan Artikel (Fitur Suara)";
      if (timerLabel) timerLabel.textContent = "Selesai";
    };

    utterance.onerror = () => {
      isPlaying = false;
      if (speechIcon) speechIcon.textContent = "volume_up";
      if (statusLabel) statusLabel.textContent = "Dengarkan Artikel (Fitur Suara)";
    };

    window.speechSynthesis.speak(utterance);
  });
}

// ---- Helper filter Kegiatan: status & periode diturunkan dari tanggal ----
function statusKegiatan(tgl) {
  const d = new Date(tgl);
  if (isNaN(d)) return "all";
  const hariIni = new Date(); hariIni.setHours(0, 0, 0, 0);
  return d >= hariIni ? "upcoming" : "completed";
}
function periodeKegiatan(tgl) {
  const d = new Date(tgl);
  return isNaN(d) ? "all" : String(d.getFullYear());
}
function isiOpsiPeriodeKegiatan(data) {
  const sel = document.getElementById("periodFilterSelect");
  if (!sel) return;
  const tahun = [...new Set((data || []).map((i) => periodeKegiatan(i.tanggal)).filter((t) => t !== "all"))].sort().reverse();
  sel.innerHTML = '<option value="all">Semua Periode</option>' + tahun.map((t) => `<option value="${t}">Tahun ${t}</option>`).join("");
}

function inisialisasiFilterKegiatan() {
  const searchInput = document.getElementById("eventSearchInput");
  const statusSelect = document.getElementById("statusFilterSelect");
  const periodSelect = document.getElementById("periodFilterSelect");
  const filterPills = document.querySelectorAll(".category-filter-btn");
  const eventCards = document.querySelectorAll(".event-card");
  const counterNotice = document.getElementById("eventCounterNotice");

  let currentCategory = "all";

  function filterEvents() {
    const searchTerm = (searchInput?.value || "").toLowerCase().trim();
    const currentStatus = statusSelect?.value || "all";
    const currentPeriod = periodSelect?.value || "all";

    let visibleCount = 0;

    eventCards.forEach((card) => {
      const cardCategory = card.dataset.category || "";
      const cardStatus = card.dataset.status || "";
      const cardPeriod = card.dataset.period || "";
      const cardText = card.textContent.toLowerCase();

      const matchCategory = currentCategory === "all" || cardCategory === currentCategory;
      const matchStatus = currentStatus === "all" || cardStatus === currentStatus;
      const matchPeriod = currentPeriod === "all" || cardPeriod === currentPeriod;
      const matchSearch = !searchTerm || cardText.includes(searchTerm);

      if (matchCategory && matchStatus && matchPeriod && matchSearch) {
        card.classList.remove("hidden");
        visibleCount++;
      } else {
        card.classList.add("hidden");
      }
    });

    if (counterNotice) {
      counterNotice.innerHTML = `Menampilkan: <strong class="text-on-surface">${visibleCount} Program</strong>`;
    }
  }

  if (searchInput) searchInput.addEventListener("input", filterEvents);
  if (statusSelect) statusSelect.addEventListener("change", filterEvents);
  if (periodSelect) periodSelect.addEventListener("change", filterEvents);

  filterPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      filterPills.forEach((p) => {
        p.classList.remove("bg-primary-container", "text-on-primary");
        p.classList.add("bg-surface-container-lowest", "text-secondary");
      });
      pill.classList.remove("bg-surface-container-lowest", "text-secondary");
      pill.classList.add("bg-primary-container", "text-on-primary");
      currentCategory = pill.dataset.category || "all";
      filterEvents();
    });
  });
}

// ================= BERANDA: Berita Terbaru (3 kartu) =================
async function muatBeritaKartu(elId, batas) {
  const el = document.getElementById(elId);
  if (!el) return;

  let data = null;
  try {
    let query = supabaseClient
      .from("berita")
      .select("*")
      .eq("kategori", "Berita")
      .order("tanggal", { ascending: false });
    if (batas) query = query.limit(batas);
    const res = await query;
    data = res.data;
  } catch (e) {
    console.warn("Info: Menampilkan warta kurasi HIMPALUBI", e);
  }

  if (data && data.length > 0) {
    el.innerHTML = data.map(item => `
      <article class="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col border border-surface-container group">
        <div class="relative h-48 bg-surface-container overflow-hidden flex items-center justify-center">
          ${item.foto_url ? `
            <img src="${urlGambarAman(item.foto_url)}" alt="Foto ${escapeHtml(item.judul)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
          ` : ''}
          <div class="${item.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-4 text-center select-none">
            <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-2 shadow-xs">
              <span class="material-symbols-outlined text-[24px]">newspaper</span>
            </div>
            <span class="text-xs font-bold text-on-surface/70 tracking-wide uppercase">HIMPALUBI UNIPAR</span>
          </div>
          <div class="absolute top-3.5 left-3.5 bg-primary-container text-on-primary px-3 py-1 rounded-full text-xs font-bold shadow-sm">
            ${formatTanggal(item.tanggal)}
          </div>
          <div class="absolute top-3.5 right-3.5 bg-inverse-surface/85 text-surface-bright px-2.5 py-0.5 rounded-full text-[11px] font-medium">
            Warta Berita
          </div>
        </div>
        <div class="p-5 flex flex-col flex-1">
          <h3 class="text-base font-bold text-on-surface mb-2 group-hover:text-primary-container transition-colors line-clamp-2">
            <a href="detail.html?id=${item.id}&kategori=Berita" class="hover:underline">${escapeHtml(item.judul)}</a>
          </h3>
          <p class="text-xs text-secondary mb-5 flex-1 line-clamp-3 leading-relaxed">
            ${escapeHtml(ringkas(item.isi, 120))}
          </p>
          <div class="flex items-center justify-between pt-3 border-t border-surface-container mt-auto">
            <span class="flex items-center gap-1 text-secondary text-xs">
              <span class="material-symbols-outlined text-[16px] text-primary-container" aria-hidden="true">feed</span>
              ${formatTanggal(item.tanggal)}
            </span>
            <a href="detail.html?id=${item.id}&kategori=Berita" class="px-4 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-primary-container hover:text-on-primary text-xs font-semibold transition-colors">
              Baca
            </a>
          </div>
        </div>
      </article>
    `).join("");
    return;
  }

  // Database kosong: tampilkan empty state (bukan berita contoh palsu)
  el.innerHTML = `<div class="col-span-full">${emptyState("Belum ada berita", "Berita resmi akan tampil di sini begitu admin mempublikasikannya.", { icon: "newspaper", btnText: "Lihat Halaman Berita", btnHref: "berita.html" })}</div>`;
}

// ================= PENGURUS BERANDA (index.html) =================
async function muatPengurusBeranda(elId = "pengurus-beranda-grid", batas = 5) {
  const el = document.getElementById(elId);
  if (!el) return;

  el.innerHTML = Array(batas).fill(0).map(() => `
    <div class="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container text-center flex flex-col items-center animate-pulse">
      <div class="w-24 h-24 rounded-full bg-surface-container mb-3 mt-1"></div>
      <div class="w-20 h-5 rounded-full bg-surface-container mb-2"></div>
      <div class="w-32 h-5 bg-surface-container rounded mb-1"></div>
      <div class="w-24 h-4 bg-surface-container rounded"></div>
    </div>
  `).join("");

  let data = null;
  try {
    const res = await supabaseClient
      .from("anggota")
      .select("*")
      .eq("kategori", "Pengurus")
      .eq("status", "Aktif")
      .order("urutan", { ascending: true, nullsFirst: false })
      .order("nama")
      .limit(batas);
    data = res.data;
  } catch (err) {
    console.warn("Info: Tidak dapat memuat pengurus dari Supabase.", err);
  }

  if (data && data.length > 0) {
    el.className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5";
    el.innerHTML = data.map((p, idx) => {
      const isPucuk = idx === 0 || (p.jabatan && p.jabatan.toLowerCase().includes("ketua umum"));
      const initialName = initial(p.nama);
      const photoHtml = p.foto_url
        ? `<img src="${urlGambarAman(p.foto_url)}" alt="Foto ${escapeHtml(p.nama)}" class="w-full h-full object-cover rounded-full" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full rounded-full ${isPucuk ? 'bg-primary-fixed text-primary-container' : 'bg-surface-container-high text-on-surface'} flex items-center justify-center font-bold text-lg sm:text-xl\\'>${initialName}</div>'">`
        : `<div class="w-full h-full rounded-full ${isPucuk ? 'bg-primary-fixed text-primary-container' : 'bg-surface-container-high text-on-surface'} flex items-center justify-center font-bold text-lg sm:text-xl">${initialName}</div>`;

      return `
        <div class="bg-surface-container-lowest p-4 sm:p-5 rounded-2xl shadow-sm border border-surface-container text-center flex flex-col items-center relative overflow-hidden group hover:border-primary/20 hover:shadow-md transition-all">
          ${isPucuk ? '<div class="absolute top-0 left-0 right-0 h-1.5 bg-primary-container" aria-hidden="true"></div>' : ''}
          <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden p-1 bg-surface-container shadow-sm mb-3 ${isPucuk ? 'mt-1' : ''}">
            ${photoHtml}
          </div>
          <span class="px-2.5 py-0.5 rounded-full ${isPucuk ? 'bg-primary-container text-on-primary font-semibold' : 'bg-surface-container text-secondary font-medium'} text-label-sm mb-1.5">
            ${escapeHtml(p.divisi || (isPucuk ? "Pucuk Pimpinan" : "BPH Inti"))}
          </span>
          <h3 class="text-title-md font-bold text-on-surface mb-0.5 line-clamp-1" title="${escapeHtml(p.nama)}">${escapeHtml(p.nama)}</h3>
          <p class="text-label-md ${isPucuk ? 'text-primary-container font-semibold' : 'text-secondary font-medium'} mb-1">${escapeHtml(p.jabatan || "Pengurus")}</p>
        </div>
      `;
    }).join("");
    return;
  }

  // Jika belum ada data pengurus di database
  el.className = "w-full col-span-full";
  el.innerHTML = emptyState(
    "Belum ada data pengurus yang diunggah",
    "Saat ini data susunan dewan pengurus HIMPALUBI belum diunggah ke database. Data pengurus akan tampil secara otomatis setelah diperbarui oleh administrator.",
    {
      icon: "badge",
      btnText: "Lihat Struktur Lengkap",
      btnHref: "struktur.html"
    }
  );
}

// ================= HALAMAN ANGGOTA: dikelompokkan per angkatan =================
async function muatAnggota(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonMemberGrid(4);

  let data = null;
  try {
    const res = await supabaseClient
      .from("anggota")
      .select("*")
      .eq("kategori", "Anggota")
      .eq("status", "Aktif")
      .order("angkatan", { ascending: false })
      .order("nama", { ascending: true });
    data = res.data;
  } catch (err) {
    console.warn("Info: Tidak dapat memuat anggota dari Supabase.", err);
  }

  if (!data || data.length === 0) {
    el.innerHTML = emptyState(
      "Belum ada data anggota",
      "Saat ini direktori data anggota himpunan belum diunggah ke database. Data akan tampil di sini setelah ditambahkan oleh pengurus.",
      {
        icon: "groups",
        btnText: "Daftar Jadi Anggota",
        btnHref: "pendaftaran.html"
      }
    );
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
      <div class="mb-10 last:mb-0">
        <div class="flex items-center gap-2 pb-3 mb-6 border-b border-surface-container">
          <span class="w-2.5 h-6 rounded-full bg-primary-container" aria-hidden="true"></span>
          <h2 class="text-xl sm:text-2xl font-bold text-on-surface">Angkatan ${escapeHtml(angkatan)}</h2>
          <span class="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-medium">${kelompok[angkatan].length} Mahasiswa</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          ${kelompok[angkatan].map(kartuAnggota).join("")}
        </div>
      </div>
    `).join("");
}

function kartuAnggota(a) {
  const initialName = initial(a.nama);
  const photoHtml = a.foto_url
    ? `<img src="${urlGambarAman(a.foto_url)}" alt="Foto ${escapeHtml(a.nama)}" class="w-full h-full object-cover rounded-full" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full rounded-full bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-lg\\'>${initialName}</div>'">`
    : `<div class="w-full h-full rounded-full bg-surface-container-high text-on-surface flex items-center justify-center font-bold text-lg">${initialName}</div>`;

  return `
    <div class="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container text-center flex flex-col items-center hover:border-primary/20 hover:shadow-md transition-all">
      <div class="w-20 h-20 rounded-full overflow-hidden p-1 bg-surface-container shadow-sm mb-3">
        ${photoHtml}
      </div>
      <h3 class="text-title-md font-bold text-on-surface mb-0.5 line-clamp-1" title="${escapeHtml(a.nama)}">${escapeHtml(a.nama)}</h3>
      <div class="text-label-md text-secondary font-medium">${escapeHtml(a.jabatan || "Anggota")}</div>
      ${a.nim ? `<div class="text-label-sm text-secondary font-mono mt-1">${escapeHtml(a.nim)}</div>` : ''}
    </div>
  `;
}

// ================= HALAMAN STRUKTUR ORGANISASI: BPH + Divisi =================
async function muatStruktur(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonMemberGrid(4);

  let data = null;
  try {
    const res = await supabaseClient
      .from("anggota")
      .select("*")
      .eq("kategori", "Pengurus")
      .eq("status", "Aktif")
      .order("urutan", { ascending: true, nullsFirst: false })
      .order("nama");
    data = res.data;
  } catch (err) {
    console.warn("Info: Tidak dapat memuat struktur dari Supabase.", err);
  }

  if (!data || data.length === 0) {
    el.innerHTML = emptyState(
      "Belum ada data struktur pengurus",
      "Susunan Badan Pengurus Harian (BPH) dan divisi belum diunggah ke database. Pengurus akan segera memperbarui struktur kepengurusan.",
      {
        icon: "account_tree",
        btnText: "Kembali ke Beranda",
        btnHref: "index.html"
      }
    );
    return;
  }

  const kelompok = {};
  data.forEach(a => {
    const k = a.divisi || "Lainnya";
    (kelompok[k] = kelompok[k] || []).push(a);
  });

  el.innerHTML = urutkanDivisi(Object.keys(kelompok)).map(divisi => `
    <div class="mb-10 last:mb-0">
      <div class="flex items-center gap-2 pb-3 mb-6 border-b border-surface-container">
        <span class="w-2.5 h-6 rounded-full bg-primary-container" aria-hidden="true"></span>
        <h2 class="text-xl sm:text-2xl font-bold text-on-surface">${escapeHtml(divisi)}</h2>
        <span class="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-medium">${kelompok[divisi].length} Fungsionaris</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
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

  let data = null;
  try {
    const res = await supabaseClient
      .from("program_kerja")
      .select("*")
      .order("divisi");
    data = res.data;
  } catch (err) {
    console.warn("Info: Tidak dapat memuat program kerja dari Supabase.", err);
  }

  if (!data || data.length === 0) {
    el.innerHTML = emptyState(
      "Belum ada program kerja yang diunggah",
      "Daftar program kerja per divisi untuk periode kepengurusan ini belum diunggah ke database.",
      {
        icon: "checklist",
        btnText: "Lihat Kegiatan Terjadwal",
        btnHref: "kegiatan.html"
      }
    );
    return;
  }

  const kelompok = {};
  data.forEach(p => {
    const div = p.divisi || "Umum";
    (kelompok[div] = kelompok[div] || []).push(p);
  });

  el.innerHTML = urutkanDivisi(Object.keys(kelompok)).map(divisi => `
    <div class="mb-10 last:mb-0">
      <div class="flex items-center gap-2 pb-3 mb-6 border-b border-surface-container">
        <span class="w-2.5 h-6 rounded-full bg-primary-container" aria-hidden="true"></span>
        <h2 class="text-xl sm:text-2xl font-bold text-on-surface">${escapeHtml(divisi)}</h2>
        <span class="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-medium">${kelompok[divisi].length} Program</span>
      </div>
      <div class="flex flex-col gap-3">
        ${kelompok[divisi].map(p => `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-sm hover:border-primary/20 transition-all">
            <div class="flex-1">
              <h3 class="text-base font-bold text-on-surface mb-1">${escapeHtml(p.nama_program)}</h3>
              ${p.deskripsi ? `<p class="text-xs text-secondary leading-relaxed">${escapeHtml(p.deskripsi)}</p>` : ""}
            </div>
            <div class="shrink-0">
              ${badgeStatusProgram(p.status)}
            </div>
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
  if (!status) return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container text-secondary">Rencana</span>`;
  const s = status.toLowerCase();
  if (s === "selesai" || s === "terlaksana") {
    return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="material-symbols-outlined text-[14px]">check_circle</span>Selesai</span>`;
  }
  if (s === "berjalan" || s === "proses" || s === "sedang berjalan") {
    return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><span class="material-symbols-outlined text-[14px]">sync</span>Sedang Berjalan</span>`;
  }
  return `<span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-surface-container text-secondary"><span class="material-symbols-outlined text-[14px]">schedule</span>Direncanakan</span>`;
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
    el.innerHTML = `<p class="form-message error col-span-full">Galeri belum bisa dimuat. Silakan muat ulang halaman.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = emptyState(
      "Belum ada foto galeri yang diunggah",
      "Dokumentasi foto kegiatan HIMPALUBI akan segera diperbarui oleh tim pengurus.",
      {
        icon: "photo_library",
        btnText: "Kembali ke Beranda",
        btnHref: "index.html"
      }
    );
    return;
  }

  el.innerHTML = data.map(g => `
    <div class="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-surface-container h-64 border border-surface-container cursor-pointer flex items-center justify-center">
      ${g.foto_url ? `
        <img src="${urlGambarAman(g.foto_url)}" alt="${escapeHtml(g.judul || 'Foto Galeri')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
      ` : ''}
      <div class="${g.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-4 text-center select-none">
        <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-2 shadow-xs">
          <span class="material-symbols-outlined text-[24px]">photo_camera</span>
        </div>
        <span class="text-xs font-bold text-on-surface/70 tracking-wide uppercase">Galeri HIMPALUBI</span>
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/20 to-transparent flex flex-col justify-end p-4 text-on-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <h3 aria-level="2" class="text-sm font-bold text-on-primary leading-snug line-clamp-2">${escapeHtml(g.judul || '')}</h3>
        ${g.keterangan ? `<p class="text-xs text-secondary-fixed-dim mt-0.5 line-clamp-1">${escapeHtml(g.keterangan)}</p>` : ''}
      </div>
    </div>
  `).join("");
}

// ================= BERANDA: Galeri Momen Kegiatan (4 foto) =================
async function muatGaleriBeranda(elId = "galeri-beranda-grid", batas = 4) {
  const el = document.getElementById(elId);
  if (!el) return;

  let data = null;
  try {
    const res = await supabaseClient
      .from("galeri")
      .select("*")
      .order("tanggal", { ascending: false })
      .limit(batas);
    data = res.data;
  } catch (err) {
    console.warn("Info: Tidak dapat memuat galeri dari Supabase.", err);
  }

  // Jika belum ada data galeri di database
  if (!data || data.length === 0) {
    el.innerHTML = emptyState(
      "Belum ada dokumentasi galeri yang diunggah",
      "Foto dokumentasi kegiatan dan program kerja akan tampil di sini begitu dipublikasikan oleh pengurus.",
      {
        icon: "photo_library",
        btnText: "Lihat Seluruh Kegiatan",
        btnHref: "kegiatan.html"
      }
    );
    return;
  }

  el.innerHTML = data.map((item) => `
    <div class="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-surface-container h-64 border border-surface-container cursor-pointer flex items-center justify-center">
      ${item.foto_url ? `
        <img src="${urlGambarAman(item.foto_url)}" alt="${escapeHtml(item.judul || 'Dokumentasi Kegiatan')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
      ` : ''}
      <div class="${item.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-4 text-center select-none">
        <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-2 shadow-xs">
          <span class="material-symbols-outlined text-[24px]">photo_camera</span>
        </div>
        <span class="text-xs font-bold text-on-surface/70 tracking-wide uppercase">Galeri HIMPALUBI</span>
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent flex flex-col justify-end p-4 text-on-primary">
        <span class="text-[11px] uppercase tracking-wider font-bold text-primary-fixed mb-0.5 block">${item.tanggal ? formatTanggal(item.tanggal) : 'Dokumentasi'}</span>
        <h3 class="text-sm sm:text-base font-bold text-on-primary leading-snug line-clamp-2 group-hover:text-primary-fixed-dim transition-colors">${escapeHtml(item.judul || 'Dokumentasi Kegiatan')}</h3>
        ${item.keterangan ? `<p class="text-xs text-secondary-fixed-dim mt-0.5 line-clamp-1">${escapeHtml(item.keterangan)}</p>` : ''}
      </div>
    </div>
  `).join("");
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

// ================= BERANDA: Ringkasan Kontak =================
async function muatKontakRingkasBeranda(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { data, error } = await supabaseClient.from("pengaturan").select("alamat, email, telepon").eq("id", 1).single();
  if (error || !data || (!data.alamat && !data.email && !data.telepon)) {
    el.innerHTML = "";
    return;
  }
  const baris = [];
  if (data.alamat) baris.push(`<p style="margin:0.3rem 0;">${escapeHtml(data.alamat)}</p>`);
  if (data.email) baris.push(`<p style="margin:0.3rem 0;">${escapeHtml(data.email)}</p>`);
  if (data.telepon) baris.push(`<p style="margin:0.3rem 0;">${escapeHtml(data.telepon)}</p>`);
  el.innerHTML = baris.join("");
}

// ================= HALAMAN KONTAK =================
async function muatKontakHalaman() {
  const { data, error } = await supabaseClient.from("pengaturan").select("*").eq("id", 1).single();
  if (error || !data) return;

  setTeksAman("kontak-alamat", data.alamat);
  setTeksAman("kontak-email", data.email);
  setTeksAman("kontak-telepon", data.telepon);

  const ig = document.getElementById("kontak-instagram");
  if (ig && urlTautanAman(data.instagram)) ig.href = urlTautanAman(data.instagram);
  const yt = document.getElementById("kontak-youtube");
  if (yt && urlTautanAman(data.youtube)) yt.href = urlTautanAman(data.youtube);
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
  if (ig && urlTautanAman(data.instagram)) ig.href = urlTautanAman(data.instagram);
  const yt = document.getElementById("footer-youtube");
  if (yt && urlTautanAman(data.youtube)) yt.href = urlTautanAman(data.youtube);
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

  try {
    const [pengaturanRes, anggotaRes, programRes, pengurusRes] = await Promise.all([
      supabaseClient.from("pengaturan").select("tahun_berdiri").eq("id", 1).maybeSingle(),
      supabaseClient.from("anggota").select("id", { count: "exact", head: true }).eq("kategori", "Anggota").eq("status", "Aktif"),
      supabaseClient.from("program_kerja").select("id", { count: "exact", head: true }),
      supabaseClient.from("anggota").select("divisi").eq("kategori", "Pengurus").eq("status", "Aktif"),
    ]);

    const tahun = pengaturanRes.data?.tahun_berdiri;
    let labelTahun = "Sejak 2008";
    if (tahun) {
      labelTahun = String(tahun).toLowerCase().startsWith("sejak") ? escapeHtml(tahun) : "Sejak " + escapeHtml(tahun);
    }

    let jumlahDivisi = 0;
    if (pengurusRes.data && pengurusRes.data.length > 0) {
      const divisiUnik = new Set(pengurusRes.data.map(r => r.divisi).filter(Boolean));
      jumlahDivisi = divisiUnik.size;
    }
    if (jumlahDivisi === 0) {
      const { data: progDiv } = await supabaseClient.from("program_kerja").select("divisi");
      if (progDiv && progDiv.length > 0) {
        const setDiv = new Set(progDiv.map(p => p.divisi).filter(Boolean));
        jumlahDivisi = setDiv.size;
      }
    }

    const totalAnggota = anggotaRes.count !== null && anggotaRes.count !== undefined ? anggotaRes.count : 0;
    const totalProgram = programRes.count !== null && programRes.count !== undefined ? programRes.count : 0;

    el.innerHTML = `
      <div class="stat-mini flex flex-col items-center justify-center min-h-[85px] sm:min-h-[100px] p-2.5 sm:p-4 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-md border border-surface-container-lowest/15 shadow-sm hover:bg-surface-container-lowest/15 transition-all duration-200 text-center group">
        <span class="angka text-xs sm:text-base font-bold text-primary-fixed-dim leading-snug group-hover:scale-105 transition-transform break-words">
          ${labelTahun}
        </span>
        <span class="label text-[11px] sm:text-xs font-medium text-secondary-fixed-dim mt-1">Berdiri</span>
      </div>

      <div class="stat-mini flex flex-col items-center justify-center min-h-[85px] sm:min-h-[100px] p-2.5 sm:p-4 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-md border border-surface-container-lowest/15 shadow-sm hover:bg-surface-container-lowest/15 transition-all duration-200 text-center group">
        <span class="angka text-xl sm:text-2xl lg:text-3xl font-extrabold text-on-primary leading-tight group-hover:scale-105 transition-transform">
          ${totalAnggota}
        </span>
        <span class="label text-[11px] sm:text-xs font-medium text-secondary-fixed-dim mt-1">Anggota Aktif</span>
      </div>

      <div class="stat-mini flex flex-col items-center justify-center min-h-[85px] sm:min-h-[100px] p-2.5 sm:p-4 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-md border border-surface-container-lowest/15 shadow-sm hover:bg-surface-container-lowest/15 transition-all duration-200 text-center group">
        <span class="angka text-xl sm:text-2xl lg:text-3xl font-extrabold text-primary-fixed leading-tight group-hover:scale-105 transition-transform">
          ${jumlahDivisi}
        </span>
        <span class="label text-[11px] sm:text-xs font-medium text-secondary-fixed-dim mt-1">Divisi</span>
      </div>

      <div class="stat-mini flex flex-col items-center justify-center min-h-[85px] sm:min-h-[100px] p-2.5 sm:p-4 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-md border border-surface-container-lowest/15 shadow-sm hover:bg-surface-container-lowest/15 transition-all duration-200 text-center group">
        <span class="angka text-xl sm:text-2xl lg:text-3xl font-extrabold text-on-primary leading-tight group-hover:scale-105 transition-transform">
          ${totalProgram}
        </span>
        <span class="label text-[11px] sm:text-xs font-medium text-secondary-fixed-dim mt-1">Program Kerja</span>
      </div>
    `;
  } catch (err) {
    console.warn("Gagal memuat statistik beranda dari database:", err);
  }
}

// ================= HALAMAN TENTANG: Sejarah & Tujuan =================
async function muatSejarahTujuan(sejarahElId, tujuanElId) {
  const elSejarah = document.getElementById(sejarahElId);
  const elTujuan = document.getElementById(tujuanElId);
  if (!elSejarah && !elTujuan) return;

  const { data, error } = await supabaseClient.from("pengaturan").select("sejarah, tujuan").eq("id", 1).single();
  if (error || !data) return;

  if (elSejarah) {
    if (data.sejarah) {
      const paragraf = data.sejarah.split(/\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join("");
      elSejarah.innerHTML = `<h2>Sejarah</h2>${paragraf}`;
    } else {
      elSejarah.innerHTML = "";
    }
  }

  if (elTujuan) {
    if (data.tujuan) {
      const poin = data.tujuan.split(/\n+/).filter(Boolean).map(t => `<li>${escapeHtml(t)}</li>`).join("");
      elTujuan.innerHTML = `<h2>Tujuan</h2><ul style="line-height:1.9;">${poin}</ul>`;
    } else {
      elTujuan.innerHTML = "";
    }
  }
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
        <div class="foto">${t.foto_url ? `<img src="${urlGambarAman(t.foto_url)}" alt="Foto ${escapeHtml(t.nama)}" loading="lazy">` : initial(t.nama)}</div>
        <div>
          <div class="nama">${escapeHtml(t.nama)}</div>
          <div class="jabatan">${escapeHtml(t.jabatan || "")}</div>
        </div>
      </div>
    </div>
  `).join("");
}

// ================= TICKER / WARTA: Pengumuman Berjalan =================
async function muatTickerBerjalan() {
  const bar = document.getElementById("ticker-bar");
  const track = document.getElementById("ticker-track");
  if (!bar || !track) return;

  const fallbackPotongan = [
    "Selamat datang di Portal Resmi HIMPALUBI UNIPAR Jember",
    "Pendaftaran Calon Anggota Baru Gelombang 2026/2027 telah dibuka",
    "Mari wujudkan lingkungan kampus yang ramah, inklusif, dan berdaya bersama"
  ];

  try {
    const [pengaturanRes, beritaRes, kegiatanRes] = await Promise.all([
      supabaseClient.from("pengaturan").select("teks_berjalan").eq("id", 1).maybeSingle(),
      supabaseClient.from("berita").select("judul").eq("kategori", "Berita").order("tanggal", { ascending: false }).limit(3),
      supabaseClient.from("berita").select("judul").eq("kategori", "Kegiatan").order("tanggal", { ascending: false }).limit(3),
    ]);

    const potongan = [];
    if (pengaturanRes?.data?.teks_berjalan) potongan.push(pengaturanRes.data.teks_berjalan);
    (beritaRes?.data || []).forEach(b => potongan.push(`Berita: ${b.judul}`));
    (kegiatanRes?.data || []).forEach(k => potongan.push(`Kegiatan: ${k.judul}`));

    const listTeks = potongan.length ? potongan : fallbackPotongan;
    const blok = listTeks.map(t => `<span class="px-3">${escapeHtml(t)}</span>`).join('<span class="pemisah text-primary-container font-bold shrink-0">&bull;</span>');
    track.innerHTML = `${blok} <span class="pemisah text-primary-container font-bold shrink-0">&bull;</span> ${blok}`;
    bar.hidden = false;
  } catch (e) {
    const blok = fallbackPotongan.map(t => `<span class="px-3">${escapeHtml(t)}</span>`).join('<span class="pemisah text-primary-container font-bold shrink-0">&bull;</span>');
    track.innerHTML = `${blok} <span class="pemisah text-primary-container font-bold shrink-0">&bull;</span> ${blok}`;
    bar.hidden = false;
  }
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

    // Honeypot anti-bot: kolom tersembunyi yang tidak pernah terisi oleh manusia.
    if (form.hp_konfirmasi_situs && form.hp_konfirmasi_situs.value.trim() !== "") {
      pesanEl.className = "form-message success";
      pesanEl.textContent = "Pendaftaran berhasil dikirim.";
      form.reset();
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
      tempat_lahir: form.tempat_lahir.value.trim(),
      tanggal_lahir: form.tanggal_lahir.value,
      no_wa: form.no_wa.value.trim(),
      email: form.email.value.trim(),
      alasan: form.alasan.value.trim(),
    };

    const { error } = await supabaseClient.from("pendaftaran").insert(payload);

    tombol.disabled = false;
    tombol.textContent = "Kirim Pendaftaran";

    if (error) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = error.code === "23505"
        ? "NIM ini sudah pernah terdaftar sebelumnya. Hubungi pengurus kalau ini keliru."
        : "Pendaftaran gagal terkirim. Coba lagi sebentar lagi.";
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
function ringkas(teks, panjang = 200) {
  if (!teks) return "";
  const clean = teks.replace(/\s+/g, " ").trim();
  if (clean.length <= panjang) return clean;
  const sub = clean.slice(0, panjang);
  const lastSpace = sub.lastIndexOf(" ");
  if (lastSpace > panjang * 0.6) {
    return sub.slice(0, lastSpace) + "...";
  }
  return sub + "...";
}
function initial(nama) {
  if (!nama) return "?";
  const parts = nama.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return nama.trim().slice(0, 2).toUpperCase();
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
  return `
    <div class="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-surface-container text-center flex flex-col items-center animate-pulse">
      <div class="w-20 h-20 rounded-full bg-surface-container mb-3"></div>
      <div class="w-28 h-5 bg-surface-container rounded mb-1.5"></div>
      <div class="w-20 h-4 bg-surface-container rounded"></div>
    </div>
  `;
}
function skeletonMemberGrid(jumlah) {
  return `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">${skeletonCards(jumlah || 4, skeletonMemberCard)}</div>`;
}
function skeletonParagraf(jumlah) {
  return Array(jumlah || 3).fill(0).map((_, i) => `<span class="skeleton skeleton-text${i === (jumlah || 3) - 1 ? " short" : ""}"></span>`).join("");
}
function skeletonProgramItem() {
  return `
    <div class="p-4 rounded-xl bg-surface-container-lowest border border-surface-container animate-pulse flex items-center justify-between">
      <div class="w-1/2 h-5 bg-surface-container rounded"></div>
      <div class="w-20 h-6 bg-surface-container rounded-full"></div>
    </div>
  `;
}
function skeletonGaleri(jumlah) {
  return Array(jumlah || 6).fill('<span class="skeleton skeleton-image"></span>').join("");
}
function skeletonBarisTabel(kolom, jumlahBaris) {
  const baris = `<tr>${Array(kolom).fill('<td><span class="skeleton skeleton-text"></span></td>').join("")}</tr>`;
  return Array(jumlahBaris || 3).fill(baris).join("");
}

// ================= EMPTY STATE: tampilan "belum ada data" yang bersih & responsif =================
function emptyState(judul, deskripsi, options = {}) {
  const icon = (typeof options === "string" ? options : options.icon) || "event_busy";
  const btnText = typeof options === "object" ? options.btnText : "";
  const btnHref = typeof options === "object" ? options.btnHref : "";

  return `
    <div class="col-span-full w-full py-10 px-6 sm:px-8 rounded-2xl bg-surface-container-lowest border border-surface-container text-center flex flex-col items-center justify-center shadow-sm my-2">
      <div class="w-14 h-14 rounded-2xl bg-primary-fixed/60 text-primary-container flex items-center justify-center mb-3.5 shadow-sm">
        <span class="material-symbols-outlined text-[28px]">${escapeHtml(icon)}</span>
      </div>
      <h4 class="text-base sm:text-lg font-bold text-on-surface mb-1.5 tracking-tight">${escapeHtml(judul)}</h4>
      <p class="text-xs sm:text-sm text-secondary max-w-md mx-auto leading-relaxed ${btnText ? 'mb-4' : 'mb-0'}">${escapeHtml(deskripsi)}</p>
      ${btnText && btnHref ? `
        <a href="${escapeHtml(btnHref)}" class="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-primary-container hover:bg-primary text-on-primary text-xs font-semibold transition-all shadow-sm min-h-[40px]">
          <span>${escapeHtml(btnText)}</span>
          <span class="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_forward</span>
        </a>
      ` : ""}
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
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

  const ldEl = document.getElementById("ld-json-detail");
  if (ldEl) {
    const ld = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: data.judul,
      description: deskripsi,
      datePublished: data.tanggal,
      image: gambar,
      url: url,
      publisher: { "@type": "Organization", name: "HIMPALUBI", url: BASE, logo: `${BASE}img/logo.png` },
    };
    if (data.penulis) ld.author = { "@type": "Person", name: data.penulis };
    ldEl.textContent = JSON.stringify(ld);
  }
}

function aturMeta(selector, atribut, nilai) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute(atribut, nilai);
}

// ================= PENCARIAN KESELURUHAN =================
function pasangPencarian(tombolId) {
  const tombol = document.getElementById(tombolId);
  if (!tombol) return;
  tombol.addEventListener("click", bukaPencarian);
}

let _timerPencarian = null;

function bukaPencarian() {
  if (document.getElementById("overlay-pencarian")) return;

  const overlay = document.createElement("div");
  overlay.className = "search-overlay";
  overlay.id = "overlay-pencarian";
  overlay.innerHTML = `
    <div class="search-box">
      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="text" id="input-pencarian" placeholder="Cari berita, kegiatan, anggota, program kerja..." aria-label="Kata kunci pencarian">
        <button class="tutup-search" id="tombol-tutup-search" aria-label="Tutup pencarian">&times;</button>
      </div>
      <div class="search-results" id="hasil-pencarian" aria-live="polite">
        <p class="search-empty">Ketik kata kunci untuk mulai mencari.</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = document.getElementById("input-pencarian");
  input.focus();

  function tutup() {
    overlay.remove();
    document.removeEventListener("keydown", escHandler);
  }
  function escHandler(e) {
    if (e.key === "Escape") tutup();
  }
  document.addEventListener("keydown", escHandler);
  document.getElementById("tombol-tutup-search").addEventListener("click", tutup);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) tutup(); });

  input.addEventListener("input", () => {
    clearTimeout(_timerPencarian);
    const kata = input.value.trim();
    if (kata.length < 2) {
      document.getElementById("hasil-pencarian").innerHTML = `<p class="search-empty">Ketik minimal 2 huruf.</p>`;
      return;
    }
    _timerPencarian = setTimeout(() => jalankanPencarian(kata), 350);
  });
}

async function jalankanPencarian(kata) {
  const hasilEl = document.getElementById("hasil-pencarian");
  if (!hasilEl) return;
  hasilEl.innerHTML = `<p class="search-empty">Mencari...</p>`;

  const kunci = `%${kata}%`;
  const [beritaRes, kegiatanRes, anggotaRes, programRes] = await Promise.all([
    supabaseClient.from("berita").select("id, judul, tanggal").eq("kategori", "Berita").ilike("judul", kunci).limit(5),
    supabaseClient.from("berita").select("id, judul, tanggal").eq("kategori", "Kegiatan").ilike("judul", kunci).limit(5),
    supabaseClient.from("anggota").select("id, nama, jabatan, kategori").ilike("nama", kunci).limit(5),
    supabaseClient.from("program_kerja").select("id, nama_program, divisi").ilike("nama_program", kunci).limit(5),
  ]);

  const grup = [];

  if (beritaRes.data?.length) {
    grup.push({
      judul: "Berita",
      items: beritaRes.data.map(b => `<a class="search-result-item" href="detail.html?id=${b.id}&kategori=Berita"><div class="label">${escapeHtml(b.judul)}</div><div class="meta">${formatTanggal(b.tanggal)}</div></a>`),
    });
  }
  if (kegiatanRes.data?.length) {
    grup.push({
      judul: "Kegiatan",
      items: kegiatanRes.data.map(k => `<a class="search-result-item" href="detail.html?id=${k.id}&kategori=Kegiatan"><div class="label">${escapeHtml(k.judul)}</div><div class="meta">${formatTanggal(k.tanggal)}</div></a>`),
    });
  }
  if (anggotaRes.data?.length) {
    grup.push({
      judul: "Anggota & Pengurus",
      items: anggotaRes.data.map(a => `<a class="search-result-item" href="${a.kategori === "Pengurus" ? "struktur.html" : "anggota.html"}"><div class="label">${escapeHtml(a.nama)}</div><div class="meta">${escapeHtml(a.jabatan || (a.kategori === "Pengurus" ? "Pengurus" : "Anggota"))}</div></a>`),
    });
  }
  if (programRes.data?.length) {
    grup.push({
      judul: "Program Kerja",
      items: programRes.data.map(p => `<a class="search-result-item" href="program-kerja.html"><div class="label">${escapeHtml(p.nama_program)}</div><div class="meta">${escapeHtml(p.divisi)}</div></a>`),
    });
  }

  if (!grup.length) {
    hasilEl.innerHTML = `<p class="search-empty">Tidak ada hasil untuk "${escapeHtml(kata)}".</p>`;
    return;
  }

  hasilEl.innerHTML = grup.map(g => `
    <div class="search-group">
      <h4>${g.judul}</h4>
      ${g.items.join("")}
    </div>
  `).join("");
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
