
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

const _pembacaServer = {};

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

    // Catat ke server lewat fungsi database (hanya menambah 1; pengunjung tidak bisa menulis angka sendiri).
    // Jika fungsi belum dipasang di Supabase, hitungan lokal di atas tetap dipakai.
    if (typeof supabaseClient !== "undefined") {
      Promise.resolve(supabaseClient.rpc("tambah_pembaca", { p_id: articleId }))
        .then(({ data, error }) => {
          if (error || typeof data !== "number") return;
          _pembacaServer[articleId] = data;
          try { localStorage.setItem(key, String(data)); } catch (e) {}
          const el = document.getElementById("jumlah-pembaca-detail");
          if (el) el.textContent = data.toLocaleString("id-ID");
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
          <span aria-hidden="true" class="material-symbols-outlined text-[32px]">article_off</span>
        </div>
        <h2 class="text-xl font-bold text-on-surface mb-2">Parameter Publikasi Tidak Ditemukan</h2>
        <p class="text-sm text-secondary mb-6 max-w-md mx-auto">Tautan yang Anda akses tidak memuat identitas publikasi yang valid. Silakan kembali ke katalog warta.</p>
        <a href="${isKegiatan ? 'kegiatan.html' : 'berita.html'}" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-95 transition-opacity">
          <span aria-hidden="true" class="material-symbols-outlined text-[18px]">arrow_back</span>
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
    const res = await supabaseClient.from("berita").select("*").eq("id", id).maybeSingle();
    data = res.data;
    if (res.error) { console.error(res.error); return tampilGagalMuat(el); }
  } catch (err) {
    console.warn("Info: Gagal mengambil data detail dari Supabase.", err);
  }

  if (!data) {
    el.innerHTML = `
      <div class="p-8 sm:p-12 text-center bg-surface-container-lowest rounded-3xl border border-surface-container">
        <div class="w-16 h-16 rounded-2xl bg-surface-container text-primary-container mx-auto flex items-center justify-center mb-4">
          <span aria-hidden="true" class="material-symbols-outlined text-[32px]">menu_book</span>
        </div>
        <h2 class="text-xl font-bold text-on-surface mb-2">Publikasi Tidak Ditemukan</h2>
        <p class="text-sm text-secondary mb-6 max-w-md mx-auto">Artikel atau dokumentasi kegiatan ini mungkin telah diarsipkan atau dipindahkan oleh pengurus redaksi.</p>
        <a href="${isKegiatan ? 'kegiatan.html' : 'berita.html'}" class="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-95 transition-opacity">
          <span aria-hidden="true" class="material-symbols-outlined text-[18px]">arrow_back</span>
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
  const totalViews = _pembacaServer[id] ?? (data.views || ambilJumlahKlikBerita(id, 1));
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
            <span aria-hidden="true" class="material-symbols-outlined text-[14px]">label</span>
            <span>${escapeHtml(kategori)}</span>
          </span>
          <span class="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
            <span aria-hidden="true" class="material-symbols-outlined text-[15px] text-primary-container">schedule</span>
            <span>${waktuBaca} Menit Baca</span>
          </span>
          <span class="opacity-40 text-secondary" aria-hidden="true">•</span>
          <span class="inline-flex items-center gap-1 text-xs font-semibold text-secondary">
            <span aria-hidden="true" class="material-symbols-outlined text-[15px] text-primary-container">visibility</span>
            <span><span id="jumlah-pembaca-detail">${totalViews.toLocaleString("id-ID")}</span> Pembaca</span>
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
                <span>${escapeHtml(data.penulis || "Redaksi HIMPALUBI")}</span>
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
            <a href="https://api.whatsapp.com/send?text=${shareText}${shareUrl}" target="_blank" rel="noopener noreferrer" class="w-11 h-11 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-primary transition-all flex items-center justify-center cursor-pointer" title="Bagikan ke WhatsApp" aria-label="Bagikan ke WhatsApp">
              <span aria-hidden="true" class="material-symbols-outlined text-[16px]">chat</span>
            </a>
            <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" rel="noopener noreferrer" class="w-11 h-11 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-primary transition-all flex items-center justify-center cursor-pointer" title="Bagikan ke X / Twitter" aria-label="Bagikan ke X / Twitter">
              <span aria-hidden="true" class="material-symbols-outlined text-[16px]">share</span>
            </a>
            <button type="button" class="btn-copy-link w-11 h-11 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-primary transition-all flex items-center justify-center cursor-pointer" title="Salin Tautan" aria-label="Salin Tautan">
              <span aria-hidden="true" class="material-symbols-outlined text-[16px]">link</span>
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
              <span aria-hidden="true" class="material-symbols-outlined text-[48px] text-primary-container mb-2">image</span>
              <p class="text-sm font-bold text-on-surface">Dokumentasi Arsip HIMPALUBI UNIPAR</p>
            </div>
            <div class="py-2.5 px-4 bg-surface-container-low text-xs text-secondary flex flex-wrap items-center justify-between gap-2 border-t border-surface-container">
              <span class="flex items-center gap-1.5 font-medium text-on-surface/80">
                <span class="material-symbols-outlined text-[15px] text-primary-container" aria-hidden="true">photo_camera</span>
                Dokumentasi
              </span>
              <span class="text-secondary">HIMPALUBI FKIP UNIPAR</span>
            </div>
          </div>
        ` : `
          <div class="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-surface-container to-surface-container-low border border-surface-container p-6 sm:p-8 flex items-center gap-4">
            <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
              <span aria-hidden="true" class="material-symbols-outlined text-[26px]">newspaper</span>
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
          <a href="https://api.whatsapp.com/send?text=${shareText}${shareUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[44px] rounded-full hover:bg-surface-container-lowest text-on-surface hover:text-primary transition-all text-xs font-semibold" title="Bagikan ke WhatsApp">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px] text-secondary">chat</span>
            <span>WhatsApp</span>
          </a>
          <span class="w-[1px] h-4 bg-surface-container" aria-hidden="true"></span>
          <a href="https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[44px] rounded-full hover:bg-surface-container-lowest text-on-surface hover:text-primary transition-all text-xs font-semibold" title="Bagikan ke X / Twitter">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">send</span>
            <span>X / Twitter</span>
          </a>
          <span class="w-[1px] h-4 bg-surface-container" aria-hidden="true"></span>
          <button type="button" class="btn-copy-link inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[44px] rounded-full hover:bg-surface-container-lowest text-on-surface hover:text-primary transition-all text-xs font-semibold cursor-pointer" title="Salin Tautan Artikel">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">link</span>
            <span>Salin</span>
          </button>
          <span class="w-[1px] h-4 bg-surface-container" aria-hidden="true"></span>
          <button type="button" id="btn-dengar" hidden aria-pressed="false" class="w-11 h-11 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-on-surface transition-all flex items-center justify-center cursor-pointer" title="Dengarkan Artikel" aria-label="Dengarkan artikel">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">volume_up</span>
          </button>
          <button type="button" onclick="window.print()" class="w-11 h-11 rounded-full hover:bg-surface-container-lowest text-secondary hover:text-on-surface transition-all flex items-center justify-center cursor-pointer" title="Cetak Artikel" aria-label="Cetak Artikel">
            <span aria-hidden="true" class="material-symbols-outlined text-[16px]">print</span>
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
            <a href="tentang.html" class="hover:underline inline-flex items-center gap-1 min-h-[44px] hover:text-primary-container transition-colors">
              <span>Profil Organisasi</span>
              <span aria-hidden="true" class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
            <span class="opacity-30 text-secondary">•</span>
            <a href="kontak.html" class="hover:underline inline-flex items-center gap-1 min-h-[44px] hover:text-primary-container transition-colors">
              <span>Hubungi Redaksi</span>
              <span aria-hidden="true" class="material-symbols-outlined text-[14px]">arrow_forward</span>
            </a>
          </div>
        </div>
      </footer>

    </article>
  `;

  // Tombol "Dengarkan": membacakan judul dan isi artikel dengan suara bawaan perangkat (bahasa Indonesia).
  const btnDengar = el.querySelector("#btn-dengar");
  if (btnDengar && "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined") {
    btnDengar.hidden = false;
    const ikon = btnDengar.querySelector(".material-symbols-outlined");
    const atur = (aktif) => {
      btnDengar.setAttribute("aria-pressed", aktif ? "true" : "false");
      btnDengar.setAttribute("aria-label", aktif ? "Hentikan pembacaan artikel" : "Dengarkan artikel");
      btnDengar.title = aktif ? "Hentikan Pembacaan" : "Dengarkan Artikel";
      if (ikon) ikon.textContent = aktif ? "stop_circle" : "volume_up";
    };
    btnDengar.addEventListener("click", () => {
      if (window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); atur(false); return; }
      const teks = [data.judul, data.isi].filter(Boolean).join(". ");
      const u = new SpeechSynthesisUtterance(teks);
      u.lang = "id-ID";
      u.onend = u.onerror = () => atur(false);
      window.speechSynthesis.speak(u);
      atur(true);
    });
    window.addEventListener("pagehide", () => window.speechSynthesis.cancel());
  }

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
              <span aria-hidden="true" class="material-symbols-outlined text-[18px]">newspaper</span>
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
              <span aria-hidden="true" class="material-symbols-outlined text-[14px] text-primary-container">visibility</span>
              ${ambilJumlahKlikBerita(item.id, 1)} Pembaca
            </span>
            <a href="detail.html?id=${item.id}&kategori=${encodeURIComponent(item.kategori || 'Berita')}" class="px-3 py-1 rounded-full bg-surface-container text-on-surface hover:bg-primary-container hover:text-on-primary font-semibold text-xs transition-colors inline-flex items-center gap-1">
              <span>Baca</span>
              <span aria-hidden="true" class="material-symbols-outlined text-[13px]">arrow_forward</span>
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
    if (res.error) { console.error(res.error); return tampilGagalMuat(el); }
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
              <span aria-hidden="true" class="material-symbols-outlined text-[24px]">event</span>
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
    if (res.error) { console.error(res.error); if (featuredSec) featuredSec.style.display = "none"; return tampilGagalMuat(grid); }
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
              <span aria-hidden="true" class="material-symbols-outlined text-[28px]">event</span>
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
                ${escapeHtml(labelJenisKegiatan(fItem.jenis_kegiatan, "Kegiatan Resmi Himpunan"))}
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
    <article class="event-card bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-surface-container overflow-hidden flex flex-col justify-between group" data-category="${escapeHtml(item.jenis_kegiatan || "umum")}" data-status="${statusKegiatan(item.tanggal)}" data-period="${periodeKegiatan(item.tanggal)}">
      <div>
        <div class="relative h-48 w-full overflow-hidden bg-surface-container flex items-center justify-center">
          ${item.foto_url ? `
            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="${escapeHtml(item.judul)}" src="${urlGambarAman(item.foto_url)}" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
          ` : ''}
          <div class="${item.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-4 text-center select-none">
            <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-2 shadow-xs">
              <span aria-hidden="true" class="material-symbols-outlined text-[24px]">event</span>
            </div>
            <span class="text-xs font-bold text-on-surface/70 tracking-wide uppercase">HIMPALUBI UNIPAR</span>
          </div>
          <div class="absolute top-3 left-3">
            <span class="px-2.5 py-1 rounded-full bg-primary-container text-on-primary text-xs font-semibold shadow-sm">
              ${escapeHtml(labelJenisKegiatan(item.jenis_kegiatan, "Kegiatan Resmi"))}
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
              <span aria-hidden="true" class="material-symbols-outlined text-[16px] text-primary-container shrink-0">event</span>
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
  siapkanPilKategoriKegiatan(data);
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
    if (res.error) { console.error(res.error); if (featuredSec) featuredSec.classList.add("hidden"); return tampilGagalMuat(grid); }
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
          <span aria-hidden="true" class="material-symbols-outlined text-[32px]">newspaper</span>
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
              <span aria-hidden="true" class="material-symbols-outlined text-[36px]">campaign</span>
            </div>
            <span class="text-xs font-bold text-on-surface/70 tracking-wider uppercase">Sorotan Warta HIMPALUBI</span>
          </div>
          
          <!-- Scrim gradient for contrast -->
          <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface via-inverse-surface/30 to-transparent pointer-events-none"></div>
          
          <!-- Top Meta Badges -->
          <div class="relative z-10 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 min-h-[44px] rounded-full bg-primary-container text-on-primary text-xs uppercase tracking-wider font-bold shadow-sm">
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
              <span aria-hidden="true" class="material-symbols-outlined text-[24px]">${item.icon || 'article'}</span>
            </div>
            <span class="text-xs font-bold text-on-surface/70 tracking-wide uppercase">HIMPALUBI UNIPAR</span>
          </div>
          <span class="absolute top-3 left-3 px-3 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary-container text-xs font-bold shadow-sm">
            ${escapeHtml(item.kategori || 'Warta')}
          </span>
        </div>
        <div class="flex items-center gap-2 text-xs text-secondary">
          <span aria-hidden="true" class="material-symbols-outlined text-[14px]">calendar_today</span>
          <span>${formatTanggal(item.tanggal)}</span>
          <span>•</span>
          <span class="flex items-center gap-1"><span aria-hidden="true" class="material-symbols-outlined text-[14px] text-primary-container">visibility</span><span>${item.views.toLocaleString("id-ID")} Pembaca</span></span>
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
          <span aria-hidden="true" class="material-symbols-outlined text-[16px]">arrow_forward</span>
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
// ---- Kategori kegiatan (kolom berita.jenis_kegiatan, diisi dari dashboard) ----
const JENIS_KEGIATAN_LABEL = {
  inklusi: "Pendidikan Inklusif & PLB",
  seminar: "Seminar & Workshop",
  pengabdian: "Pengabdian Masyarakat",
  kaderisasi: "Kaderisasi & LKMM",
  kompetisi: "Kompetisi Mahasiswa",
};
function labelJenisKegiatan(jenis, cadangan) {
  return JENIS_KEGIATAN_LABEL[jenis] || cadangan;
}
// Tombol kategori yang belum punya kegiatan disembunyikan; jika tidak ada kegiatan berkategori sama sekali,
// seluruh baris tombol disembunyikan agar tidak ada tombol yang tidak berfungsi.
function siapkanPilKategoriKegiatan(data) {
  const wadah = document.getElementById("categoryPillContainer");
  if (!wadah) return;
  const dipakai = new Set((data || []).map((i) => i.jenis_kegiatan).filter(Boolean));
  wadah.querySelectorAll(".category-filter-btn").forEach((btn) => {
    const kat = btn.dataset.category;
    if (kat && kat !== "all") btn.classList.toggle("hidden", !dipakai.has(kat));
  });
  wadah.classList.toggle("hidden", dipakai.size === 0);
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
    if (res.error) { console.error(res.error); return tampilGagalMuat(el); }
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
              <span aria-hidden="true" class="material-symbols-outlined text-[24px]">newspaper</span>
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
      .select("id, nama, jabatan, angkatan, foto_url, status, kategori, divisi, urutan")
      .eq("kategori", "Pengurus")
      .eq("status", "Aktif")
      .order("urutan", { ascending: true, nullsFirst: false })
      .order("nama")
      .limit(batas);
    data = res.data;
    if (res.error) { console.error(res.error); return tampilGagalMuat(el); }
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
      .select("id, nama, jabatan, angkatan, foto_url, status, kategori, divisi, urutan")
      .eq("kategori", "Anggota")
      .eq("status", "Aktif")
      .order("angkatan", { ascending: false })
      .order("nama", { ascending: true });
    data = res.data;
    if (res.error) { console.error(res.error); return tampilGagalMuat(el); }
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

  const peta = await petaKepengurusan(data.map(a => a.id));

  const kelompok = {};
  data.forEach(a => {
    const k = a.angkatan || "Lainnya";
    (kelompok[k] = kelompok[k] || []).push(a);
  });

  el.innerHTML = Object.keys(kelompok)
    .sort((a, b) => b.localeCompare(a, "id", { numeric: true }))
    .map(angkatan => `
      <section class="group-block" aria-label="Angkatan ${escapeHtml(angkatan)}">
        <div class="group-head">
          <h2>Angkatan ${escapeHtml(angkatan)}</h2>
          <span class="group-head__meta">${kelompok[angkatan].length} mahasiswa</span>
        </div>
        <div class="people-grid">
          ${kelompok[angkatan].map(a => kartuAnggota(a, false, peta[a.id])).join("")}
        </div>
      </section>
    `).join("");
}

// Mengelompokkan baris kepengurusan per anggota. Bila tabel belum ada (SQL tahap 22 belum dijalankan), hasilnya kosong.
async function petaKepengurusan(idAnggota) {
  const peta = {};
  if (!idAnggota.length) return peta;
  const { data, error } = await supabaseClient
    .from("kepengurusan")
    .select("anggota_id, periode, jabatan, divisi, urutan, aktif")
    .in("anggota_id", idAnggota);
  if (error || !data) return peta;
  data.sort((x, y) => (x.urutan ?? 9999) - (y.urutan ?? 9999));
  data.forEach(k => {
    const ringkas = peta[k.anggota_id] = peta[k.anggota_id] || { aktif: [], mantan: [] };
    if (k.aktif) ringkas.aktif.push(k);
    else ringkas.mantan.push(k.periode);
  });
  return peta;
}

function kartuAnggota(a, unggulan, kep) {
  const initialName = initial(a.nama);
  const fallback = `<span aria-hidden="true">${initialName}</span>`;
  const photoHtml = a.foto_url
    ? `<img src="${urlGambarAman(a.foto_url)}" alt="Foto ${escapeHtml(a.nama)}" loading="lazy" onerror="this.outerHTML='${fallback.replace(/'/g, "&#39;")}'">`
    : fallback;

  let peran = escapeHtml(a.jabatan || "Anggota");
  let lencana = "";
  if (kep && kep.aktif.length) {
    peran = kep.aktif.map(k => `${escapeHtml(k.jabatan)} &middot; ${escapeHtml(k.divisi)}`).join("<br>");
    lencana = `<span class="person__badge">Pengurus aktif</span>`;
  } else if (kep && kep.mantan.length) {
    const terbaru = [...kep.mantan].sort().pop();
    lencana = `<span class="person__badge person__badge--lalu">Mantan pengurus ${escapeHtml(terbaru)}</span>`;
  }

  return `
    <article class="person${unggulan ? " person--lead" : ""}">
      <div class="person__photo">${photoHtml}</div>
      <div class="person__body">
        <h3 class="person__name">${escapeHtml(a.nama)}</h3>
        <p class="person__role">${peran}</p>
        ${lencana}
      </div>
    </article>
  `;
}

// ================= HALAMAN STRUKTUR ORGANISASI: BPH + Divisi =================
async function muatStruktur(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonMemberGrid(4);

  let rows = null;
  try {
    const res = await supabaseClient
      .from("kepengurusan")
      .select("id, periode, jabatan, divisi, urutan, aktif, anggota(id, nama, foto_url)")
      .order("urutan", { ascending: true, nullsFirst: false });
    if (res.error) {
      console.warn("Info: tabel kepengurusan belum tersedia, memakai data pengurus lama.", res.error);
      return muatStrukturLama(el);
    }
    rows = (res.data || []).filter(r => r.anggota);
  } catch (err) {
    console.warn("Info: Tidak dapat memuat struktur dari Supabase.", err);
    return tampilGagalMuat(el);
  }

  if (!rows.length) return tampilStrukturKosong(el);

  const daftarPeriode = [...new Set(rows.map(r => r.periode))].sort().reverse();
  const periodeBerjalan = rows.filter(r => r.aktif).map(r => r.periode).sort().pop() || daftarPeriode[0];
  const gambar = (periode) => {
    // Pada periode berjalan hanya yang masih menjabat; periode lama menampilkan semuanya.
    const terpilih = rows.filter(r => r.periode === periode && (periode !== periodeBerjalan || r.aktif));
    const kartu = terpilih.map(r => ({ divisi: r.divisi, orang: { nama: r.anggota.nama, foto_url: r.anggota.foto_url, jabatan: r.jabatan } }));
    el.innerHTML = tabPeriodeStruktur(daftarPeriode, periode) + kelompokDivisiHtml(kartu);
    el.querySelectorAll("[data-periode]").forEach(tombol => {
      tombol.addEventListener("click", () => gambar(tombol.dataset.periode));
    });
  };
  gambar(periodeBerjalan);
}

function tabPeriodeStruktur(daftar, terpilih) {
  if (daftar.length < 2) return "";
  return `
    <div class="periode-tabs" role="tablist" aria-label="Periode kepengurusan">
      ${daftar.map(p => `<button type="button" role="tab" class="periode-tab" data-periode="${escapeHtml(p)}" aria-selected="${p === terpilih}">Periode ${escapeHtml(p)}</button>`).join("")}
    </div>`;
}

function kelompokDivisiHtml(kartu) {
  const kelompok = {};
  kartu.forEach(k => {
    const nama = k.divisi || "Lainnya";
    (kelompok[nama] = kelompok[nama] || []).push(k.orang);
  });
  return urutkanDivisi(Object.keys(kelompok)).map(divisi => `
    <section class="group-block" aria-label="${escapeHtml(divisi)}">
      <div class="group-head">
        <h2>${escapeHtml(divisi)}</h2>
        <span class="group-head__meta">${kelompok[divisi].length} fungsionaris</span>
      </div>
      <div class="people-grid${divisi === "BPH" ? " people-grid--lead" : ""}">
        ${kelompok[divisi].map(o => kartuAnggota(o, divisi === "BPH")).join("")}
      </div>
    </section>
  `).join("");
}

function tampilStrukturKosong(el) {
  el.innerHTML = emptyState(
    "Belum ada data struktur pengurus",
    "Susunan Badan Pengurus Harian (BPH) dan divisi belum diunggah ke database. Pengurus akan segera memperbarui struktur kepengurusan.",
    {
      icon: "account_tree",
      btnText: "Kembali ke Beranda",
      btnHref: "index.html"
    }
  );
}

// Cadangan selama SQL tahap 22 belum dijalankan: membaca baris pengurus lama.
async function muatStrukturLama(el) {
  const res = await supabaseClient
    .from("anggota")
    .select("id, nama, jabatan, angkatan, foto_url, status, kategori, divisi, urutan")
    .eq("kategori", "Pengurus")
    .eq("status", "Aktif")
    .order("urutan", { ascending: true, nullsFirst: false })
    .order("nama");
  if (res.error) { console.error(res.error); return tampilGagalMuat(el); }
  if (!res.data || !res.data.length) return tampilStrukturKosong(el);
  el.innerHTML = kelompokDivisiHtml(res.data.map(a => ({ divisi: a.divisi, orang: a })));
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
    if (res.error) { console.error(res.error); return tampilGagalMuat(el); }
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

  const selesai = (p) => ["selesai", "terlaksana"].includes(String(p.status || "").toLowerCase());
  el.innerHTML = urutkanDivisi(Object.keys(kelompok)).map(divisi => `
    <section class="group-block" aria-label="${escapeHtml(divisi)}">
      <div class="group-head">
        <h2>${escapeHtml(divisi)}</h2>
        <span class="group-head__meta">${kelompok[divisi].length} program &middot; ${kelompok[divisi].filter(selesai).length} selesai</span>
      </div>
      <ul class="program-list">
        ${kelompok[divisi].map(p => `
          <li class="program-row">
            <div>
              <h3>${escapeHtml(p.nama_program)}</h3>
              ${p.deskripsi ? `<p>${escapeHtml(p.deskripsi)}</p>` : ""}
            </div>
            <div class="program-row__status">${badgeStatusProgram(p.status)}</div>
          </li>
        `).join("")}
      </ul>
    </section>
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
  const s = String(status || "").toLowerCase();
  if (s === "selesai" || s === "terlaksana") {
    return `<span class="status-chip status-chip--selesai"><span aria-hidden="true" class="material-symbols-outlined">check_circle</span>Selesai</span>`;
  }
  if (s === "berjalan" || s === "proses" || s === "sedang berjalan") {
    return `<span class="status-chip status-chip--berjalan"><span aria-hidden="true" class="material-symbols-outlined">sync</span>Sedang berjalan</span>`;
  }
  return `<span class="status-chip status-chip--rencana"><span aria-hidden="true" class="material-symbols-outlined">schedule</span>${status ? "Direncanakan" : "Rencana"}</span>`;
}

// ================= TAUTAN SOSIAL (YouTube / Instagram / TikTok / lainnya) =================
// Mengenali platform dari alamat tautan. YouTube punya gambar sampul otomatis; platform lain memakai foto sampul unggahan pengurus.
function infoTautanSosial(url) {
  const s = String(url === null || url === undefined ? "" : url).trim();
  let u;
  try { u = new URL(s); } catch (e) { return null; }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const h = u.hostname.replace(/^(www|m)\./i, "").toLowerCase();
  const adaDi = (d) => h === d || h.endsWith("." + d);
  if (h === "youtu.be" || adaDi("youtube.com")) {
    let id = null;
    if (h === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (u.pathname === "/watch") id = u.searchParams.get("v");
    else { const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?]+)/); if (m) id = m[2]; }
    const sah = id && /^[A-Za-z0-9_-]{11}$/.test(id);
    return { platform: "YouTube", ikon: "play_circle", thumb: sah ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null, url: s };
  }
  if (adaDi("instagram.com") || h === "instagr.am") return { platform: "Instagram", ikon: "photo_camera", thumb: null, url: s };
  if (adaDi("tiktok.com")) return { platform: "TikTok", ikon: "music_note", thumb: null, url: s };
  if (adaDi("facebook.com") || h === "fb.watch") return { platform: "Facebook", ikon: "thumb_up", thumb: null, url: s };
  if (h === "x.com" || adaDi("twitter.com")) return { platform: "X", ikon: "tag", thumb: null, url: s };
  return { platform: h, ikon: "link", thumb: null, url: s };
}

function htmlLencanaTautan(info) {
  return `<span class="galeri-tile__lencana"><span class="material-symbols-outlined" aria-hidden="true">${info.ikon}</span>${escapeHtml(info.platform)}</span>`;
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

  el.innerHTML = data.map((g, i) => {
    const wide = data.length >= 5 && i === 0 ? " galeri-tile--wide" : "";
    const judul = g.judul || "";
    const gambar = g.foto_url ? `<img src="${urlGambarAman(g.foto_url)}" alt="${escapeHtml(judul || "Foto galeri")}" loading="lazy" onerror="this.hidden=true; this.nextElementSibling.hidden=false;">` : "";
    const kosong = `<div class="galeri-tile__kosong"${g.foto_url ? " hidden" : ""}>
        <span aria-hidden="true" class="material-symbols-outlined">photo_camera</span>
        <span>Foto belum tersedia</span>
      </div>`;
    const caption = g.judul || g.keterangan ? `<div class="galeri-tile__caption">
        ${g.judul ? `<h3>${escapeHtml(g.judul)}</h3>` : ""}
        ${g.keterangan ? `<p>${escapeHtml(ringkas(g.keterangan, 80))}</p>` : ""}
      </div>` : "";
    const href = urlTautanAman(g.tautan_url);
    const info = href ? infoTautanSosial(href) : null;
    if (info) {
      return `
    <a class="galeri-tile galeri-tile--tautan${wide}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" aria-label="Buka di ${escapeHtml(info.platform)}: ${escapeHtml(judul || "tautan galeri")} (tab baru)">
      ${gambar}
      ${kosong}
      ${htmlLencanaTautan(info)}
      ${caption}
    </a>`;
    }
    return `
    <div class="galeri-tile${wide}" tabindex="${g.foto_url ? 0 : -1}"${g.foto_url ? ` role="button" aria-label="Perbesar foto: ${escapeHtml(judul || "Galeri")}"` : ""}>
      ${gambar}
      ${kosong}
      ${caption}
    </div>`;
  }).join("");
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
    if (res.error) { console.error(res.error); return tampilGagalMuat(el); }
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

  el.innerHTML = data.map((item) => {
    const hrefTautan = urlTautanAman(item.tautan_url);
    const infoTautan = hrefTautan ? infoTautanSosial(hrefTautan) : null;
    const buka = infoTautan
      ? `<a href="${escapeHtml(hrefTautan)}" target="_blank" rel="noopener noreferrer" aria-label="Buka di ${escapeHtml(infoTautan.platform)}: ${escapeHtml(item.judul || 'Dokumentasi Kegiatan')} (tab baru)" class="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-surface-container h-64 border border-surface-container cursor-pointer flex items-center justify-center">`
      : `<div class="group relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-surface-container h-64 border border-surface-container cursor-pointer flex items-center justify-center">`;
    return `
    ${buka}
    ${infoTautan ? htmlLencanaTautan(infoTautan) : ''}
      ${item.foto_url ? `
        <img src="${urlGambarAman(item.foto_url)}" alt="${escapeHtml(item.judul || 'Dokumentasi Kegiatan')}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');">
      ` : ''}
      <div class="${item.foto_url ? 'hidden ' : ''}w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-surface-container-low to-surface-container text-secondary p-4 text-center select-none">
        <div class="w-12 h-12 rounded-2xl bg-primary-fixed text-primary flex items-center justify-center mb-2 shadow-xs">
          <span aria-hidden="true" class="material-symbols-outlined text-[24px]">photo_camera</span>
        </div>
        <span class="text-xs font-bold text-on-surface/70 tracking-wide uppercase">Galeri HIMPALUBI</span>
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/30 to-transparent flex flex-col justify-end p-4 text-on-primary">
        <span class="text-[11px] uppercase tracking-wider font-bold text-primary-fixed mb-0.5 block">${item.tanggal ? formatTanggal(item.tanggal) : 'Dokumentasi'}</span>
        <h3 class="text-sm sm:text-base font-bold text-on-primary leading-snug line-clamp-2 group-hover:text-primary-fixed-dim transition-colors">${escapeHtml(item.judul || 'Dokumentasi Kegiatan')}</h3>
        ${item.keterangan ? `<p class="text-xs text-secondary-fixed-dim mt-0.5 line-clamp-1">${escapeHtml(item.keterangan)}</p>` : ''}
      </div>
    ${infoTautan ? '</a>' : '</div>'}
  `;
  }).join("");
}

// ================= HALAMAN TENTANG =================
async function muatTentangHalaman(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.innerHTML = skeletonParagraf(4);

  const { data, error } = await ambilPengaturan();
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
  const { data, error } = await ambilPengaturan();
  if (error || !data) return;
  el.textContent = ringkas(data.tentang || "", 260);
}

// ================= BERANDA: Ringkasan Kontak =================
// Alamat/email/telepon/jam layanan/media sosial: satu sumber, diubah dari Dashboard > Pengaturan.
// Jika sebuah nilai kosong atau kolomnya belum ada di database, teks bawaan di HTML tetap dipakai.
function hrefEmailAman(email) {
  const e = String(email || "").trim();
  return /^[^\s<>"'@]+@[^\s<>"'@]+$/.test(e) ? "mailto:" + e : "";
}
function hrefTelAman(tel) {
  const t = String(tel || "").replace(/[^\d+]/g, "");
  return t.length >= 6 ? "tel:" + t : "";
}
function pasangTautanSosial(id, url, sembunyikanJikaKosong) {
  const el = document.getElementById(id);
  if (!el) return;
  const aman = urlTautanAman(url);
  if (aman) { el.href = aman; el.hidden = false; }
  else if (sembunyikanJikaKosong) el.hidden = true;
}

async function muatKontakRingkasBeranda(elId) {
  const ringkas = document.getElementById(elId);
  if (ringkas) ringkas.innerHTML = "";
  if (!document.getElementById("beranda-alamat")) return;
  const { data, error } = await ambilPengaturan();
  if (error || !data) return;

  setTeksAman("beranda-alamat", data.alamat);

  const email = document.getElementById("beranda-email");
  if (email && data.email) {
    email.textContent = data.email;
    const href = hrefEmailAman(data.email);
    if (href) email.href = href;
  }

  if (typeof data.jam_layanan === "string") {
    const baris = document.getElementById("beranda-jam-baris");
    if (baris) baris.hidden = data.jam_layanan.trim() === "";
    setTeksAman("beranda-jam", data.jam_layanan.trim());
  }

  const barisTel = document.getElementById("beranda-telepon-baris");
  const tel = document.getElementById("beranda-telepon");
  if (barisTel && tel && data.telepon) {
    tel.textContent = data.telepon;
    const href = hrefTelAman(data.telepon);
    if (href) tel.href = href;
    barisTel.hidden = false;
  }

  pasangTautanSosial("beranda-instagram", data.instagram, true);
  pasangTautanSosial("beranda-youtube", data.youtube, true);
  pasangTautanSosial("beranda-tiktok", data.tiktok, true);
}

// ================= HALAMAN KONTAK =================
async function muatKontakHalaman() {
  const { data, error } = await ambilPengaturan();
  if (error || !data) return;

  setTeksAman("kontak-alamat", data.alamat);
  setTeksAman("kontak-email", data.email);
  setTeksAman("kontak-telepon", data.telepon);
  const aEmail = document.getElementById("kontak-email");
  if (aEmail && aEmail.tagName === "A") {
    const h = hrefEmailAman(data.email);
    if (h) aEmail.href = h; else { aEmail.removeAttribute("href"); if (!data.email) aEmail.textContent = "Belum tersedia"; }
  }
  const aTel = document.getElementById("kontak-telepon");
  if (aTel && aTel.tagName === "A") {
    const h = hrefTelAman(data.telepon);
    if (h) aTel.href = h; else { aTel.removeAttribute("href"); if (!data.telepon) aTel.textContent = "Belum tersedia"; }
  }

  pasangTautanSosial("kontak-instagram", data.instagram, true);
  pasangTautanSosial("kontak-youtube", data.youtube, true);
  pasangTautanSosial("kontak-tiktok", data.tiktok, true);
  const pemisah = document.getElementById("kontak-tiktok-pemisah");
  if (pemisah) pemisah.hidden = !urlTautanAman(data.tiktok);
}

// ================= FOOTER: isi otomatis dari Pengaturan =================
async function muatPengaturanFooter() {
  const { data, error } = await ambilPengaturan();
  if (error || !data) return;

  const d = document.getElementById("footer-deskripsi");
  if (d && data.tagline) d.textContent = data.tagline;

  setTeksAman("footer-alamat", data.alamat);
  setTeksAman("footer-email", data.email);
  const fe = document.getElementById("footer-email");
  if (fe && data.email && hrefEmailAman(data.email)) fe.href = hrefEmailAman(data.email);
  setTeksAman("footer-telepon", data.telepon);
  const barisTelFooter = document.getElementById("footer-telepon-baris");
  if (barisTelFooter && data.telepon) barisTelFooter.hidden = false;

  pasangTautanSosial("footer-instagram", data.instagram, true);
  pasangTautanSosial("footer-youtube", data.youtube, true);
  pasangTautanSosial("footer-tiktok", data.tiktok, true);
}

// ================= BERANDA: Tagline Hero (dinamis dari Pengaturan) =================
async function muatTaglineHero(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { data } = await ambilPengaturan();
  if (data?.tagline_hero) el.textContent = data.tagline_hero;
}

// ================= BERANDA: Statistik Pencapaian =================
async function muatStatistikBeranda(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  try {
    const [pengaturanRes, anggotaRes, programRes, pengurusRes] = await Promise.all([
      ambilPengaturan(),
      supabaseClient.from("anggota").select("id", { count: "exact", head: true }).eq("kategori", "Anggota").eq("status", "Aktif"),
      supabaseClient.from("program_kerja").select("id", { count: "exact", head: true }),
      supabaseClient.from("kepengurusan").select("divisi").eq("aktif", true),
    ]);

    const tahun = pengaturanRes.data?.tahun_berdiri;
    let labelTahun = "";
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
    // Tahun berdiri belum diisi di Pengaturan: jangan tampilkan angka karangan.
    if (!labelTahun && el.firstElementChild) el.firstElementChild.remove();
  } catch (err) {
    console.warn("Gagal memuat statistik beranda dari database:", err);
  }
}

// ================= HALAMAN TENTANG: Sejarah & Tujuan =================
async function muatSejarahTujuan(sejarahElId, tujuanElId) {
  const elSejarah = document.getElementById(sejarahElId);
  const elTujuan = document.getElementById(tujuanElId);
  if (!elSejarah && !elTujuan) return;

  const { data, error } = await ambilPengaturan();
  if (error || !data) {
    [elSejarah, elTujuan].forEach(e => { const b = e && e.closest("section"); if (b) b.hidden = true; });
    return;
  }

  if (elSejarah) {
    if (data.sejarah) {
      const paragraf = data.sejarah.split(/\n+/).filter(Boolean).map(p => `<p>${escapeHtml(p)}</p>`).join("");
      elSejarah.innerHTML = paragraf;
    } else {
      elSejarah.innerHTML = "";
      const bagian = elSejarah.closest("section");
      if (bagian) bagian.hidden = true;
    }
  }

  if (elTujuan) {
    if (data.tujuan) {
      const poin = data.tujuan.split(/\n+/).filter(Boolean).map(t => `<li>${escapeHtml(t)}</li>`).join("");
      elTujuan.innerHTML = `<ul>${poin}</ul>`;
      const bagian = elTujuan.closest("section");
      if (bagian) bagian.hidden = false;
    } else {
      elTujuan.innerHTML = "";
    }
  }
}

// ================= HALAMAN TENTANG: Visi & Misi =================
async function muatVisiMisi(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const bagian = el.closest("section");
  const { data, error } = await ambilPengaturan();
  if (error || !data || (!data.visi && !data.misi)) {
    el.innerHTML = "";
    if (bagian) bagian.hidden = true;
    return;
  }
  const butirMisi = String(data.misi || "").split(/\n+/).map(t => t.trim()).filter(Boolean);
  const misiHtml = butirMisi.length > 1
    ? `<ol class="misi-list">${butirMisi.map(t => `<li><span>${escapeHtml(t.replace(/^\s*(\d+[.)]|[-•*])\s*/, ""))}</span></li>`).join("")}</ol>`
    : `<p class="prose-himp" style="margin:0">${escapeHtml(butirMisi[0] || "Belum diisi.")}</p>`;
  el.innerHTML = `
    <div class="visimisi">
      <div>
        <h2>Visi</h2>
        <p class="visimisi__visi">${escapeHtml(data.visi || "Belum diisi.")}</p>
      </div>
      <div>
        <h2>Misi</h2>
        ${misiHtml}
      </div>
    </div>
  `;
  if (bagian) bagian.hidden = false;
}

// ================= HALAMAN TENTANG: FAQ =================
// Kolom faq.halaman ada setelah SQL tahap 18. Sebelum itu, semua FAQ dianggap milik halaman Tentang.
async function ambilFaqUntukHalaman(halaman) {
  const urut = (q) => q.order("urutan", { ascending: true, nullsFirst: false });
  const res = await urut(supabaseClient.from("faq").select("*").in("halaman", [halaman, "semua"]));
  if (res.error) {
    // Kolom belum ada: Tentang memakai semua FAQ, halaman lain tidak punya FAQ database.
    if (halaman !== "tentang") return { data: [], error: null };
    return await urut(supabaseClient.from("faq").select("*"));
  }
  return res;
}

async function muatFaqHalaman(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const { data, error } = await ambilFaqUntukHalaman("tentang");
  const bagianFaq = el.closest("section");
  if (error || !data || data.length === 0) {
    el.innerHTML = "";
    if (bagianFaq) bagianFaq.hidden = true;
    return;
  }
  if (bagianFaq) bagianFaq.hidden = false;
  el.innerHTML = data.map((f, i) => `
    <details class="faq-item"${i === 0 ? " open" : ""}>
      <summary>${escapeHtml(f.pertanyaan)}</summary>
      <div class="faq-jawaban">${escapeHtml(f.jawaban).replace(/\n/g, "<br>")}</div>
    </details>
  `).join("");
}

// ================= HALAMAN KEGIATAN: FAQ + Layanan Inklusi =================
async function muatFaqKegiatan(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  let hasil;
  try { hasil = await ambilFaqUntukHalaman("kegiatan"); } catch (err) { return; }
  const { data, error } = hasil;
  if (error || !data || data.length === 0) return; // pertahankan isi bawaan di HTML
  el.innerHTML = data.map((f, i) => `
    <div class="bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container overflow-hidden">
      <button class="faq-btn w-full px-5 py-4 text-left flex items-center justify-between gap-4 text-sm sm:text-base font-semibold text-on-surface hover:text-primary-container transition-colors min-h-[48px]" type="button" aria-expanded="false" aria-controls="faq-kegiatan-${i}">
        <span>${escapeHtml(f.pertanyaan)}</span>
        <span class="material-symbols-outlined faq-icon transition-transform duration-200 text-secondary" aria-hidden="true">expand_more</span>
      </button>
      <div id="faq-kegiatan-${i}" class="faq-content hidden px-5 pb-5 text-xs sm:text-sm text-secondary leading-relaxed border-t border-surface-container pt-3">${escapeHtml(f.jawaban).replace(/\n/g, "<br>")}</div>
    </div>
  `).join("");
}

function nomorWaAman(nomor) {
  let d = String(nomor || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "62" + d.slice(1);
  else if (d.startsWith("8")) d = "62" + d;
  return d.length >= 9 && d.length <= 15 ? d : "";
}

async function muatLayananInklusi() {
  if (!document.getElementById("layanan-judul")) return;
  let data = null;
  try { ({ data } = await ambilPengaturan()); } catch (err) { return; }
  if (!data || !("layanan_judul" in data)) return; // SQL tahap 18 belum dijalankan: isi bawaan HTML dipakai

  if (data.layanan_judul) setTeksAman("layanan-judul", data.layanan_judul);
  if (data.layanan_deskripsi) setTeksAman("layanan-deskripsi", data.layanan_deskripsi);
  if (data.layanan_kontak_label) setTeksAman("layanan-label", data.layanan_kontak_label.replace(/:?\s*$/, ":"));

  const daftar = String(data.layanan_fasilitas || "").split(/\n+/).map(t => t.trim()).filter(Boolean);
  const wadah = document.getElementById("layanan-fasilitas");
  if (wadah && daftar.length) {
    wadah.innerHTML = daftar.map(t => `
      <div class="flex items-center gap-3 text-secondary-fixed-dim text-xs sm:text-sm">
        <span class="material-symbols-outlined text-primary-fixed text-[20px] shrink-0" aria-hidden="true">check_circle</span>
        <span>${escapeHtml(t)}</span>
      </div>`).join("");
  }

  const wa = nomorWaAman(data.layanan_whatsapp);
  const aNomor = document.getElementById("layanan-nomor");
  const aWa = document.getElementById("layanan-wa");
  if (data.layanan_whatsapp !== null && data.layanan_whatsapp !== undefined) {
    if (!wa) {
      // Nomor dikosongkan di dashboard: sembunyikan narahubung dan tombol WhatsApp
      if (aNomor && aNomor.parentElement) aNomor.parentElement.hidden = true;
      if (aWa) aWa.style.display = "none";
    } else {
      if (aNomor) { aNomor.textContent = data.layanan_whatsapp.trim(); aNomor.href = "tel:+" + wa; }
      if (aWa) aWa.href = "https://wa.me/" + wa + "?text=" + encodeURIComponent("Halo HIMPALUBI, saya ingin menanyakan layanan akomodasi untuk kegiatan.");
    }
  }
}

// ================= BERANDA: Testimoni =================
// Label beranda yang bisa diubah dari Dashboard > Pengaturan (kolom baru dari SQL tahap 15).
// Jika kolomnya belum ada, teks bawaan di index.html dipakai apa adanya.
async function muatLabelBeranda() {
  const lencana = document.getElementById("akreditasi-badge");
  const lKep = document.getElementById("label-kepengurusan");
  if (!lencana && !lKep) return;
  const { data, error } = await ambilPengaturan();
  if (error || !data) return;
  if (lencana && typeof data.akreditasi_label === "string") {
    const label = data.akreditasi_label.trim();
    const periode = (data.akreditasi_periode || "").trim();
    lencana.hidden = label === "";
    const elLabel = document.getElementById("akreditasi-label");
    const elPeriode = document.getElementById("akreditasi-periode");
    if (elLabel) elLabel.textContent = label;
    if (elPeriode) { elPeriode.textContent = periode; elPeriode.hidden = periode === ""; }
  }
  if (lKep && typeof data.periode_kepengurusan === "string") {
    lKep.textContent = ("KEPENGURUSAN " + data.periode_kepengurusan.trim()).trim();
  }
}

async function muatTestimoniBeranda(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const section = el.closest("section");
  const { data, error } = await supabaseClient.from("testimoni").select("*").order("urutan", { ascending: true, nullsFirst: false }).limit(6);
  if (error || !data || data.length === 0) {
    el.innerHTML = "";
    if (section) section.hidden = true;
    return;
  }
  el.innerHTML = data.map((t) => `
    <figure class="min-w-0 flex flex-col justify-between gap-5 p-6 rounded-2xl bg-surface-container-lowest border border-surface-container shadow-xs">
      <blockquote class="text-body-md text-on-surface leading-relaxed">&ldquo;${escapeHtml(t.isi)}&rdquo;</blockquote>
      <figcaption class="flex items-center gap-3">
        <div class="w-11 h-11 rounded-full overflow-hidden bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-bold shrink-0">
          ${t.foto_url ? `<img src="${urlGambarAman(t.foto_url)}" alt="" class="w-full h-full object-cover" loading="lazy" onerror="this.remove()">` : escapeHtml(initial(t.nama))}
        </div>
        <div class="min-w-0">
          <div class="text-label-md font-semibold text-on-surface">${escapeHtml(t.nama)}</div>
          ${t.jabatan ? `<div class="text-label-sm text-secondary">${escapeHtml(t.jabatan)}</div>` : ""}
        </div>
      </figcaption>
    </figure>
  `).join("");
  if (section) section.hidden = false;
}

// ================= TICKER / WARTA: Pengumuman Berjalan =================
async function muatTickerBerjalan() {
  const bar = document.getElementById("ticker-bar");
  const track = document.getElementById("ticker-track");
  if (!bar || !track) return;

  const fallbackPotongan = [
    "Selamat datang di Portal Resmi HIMPALUBI UNIPAR Jember",
    "Informasi kegiatan dan pendaftaran anggota tersedia di website ini",
    "Mari wujudkan lingkungan kampus yang ramah, inklusif, dan berdaya bersama"
  ];

  try {
    const [pengaturanRes, beritaRes, kegiatanRes] = await Promise.all([
      ambilPengaturan(),
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

// ================= FORM ASPIRASI (index.html) — tersimpan ke tabel `aspirasi` =================
function pasangFormAspirasi(formId) {
  const form = document.getElementById(formId);
  if (!form) return;
  const pesanEl = document.getElementById("pesan-aspirasi");
  const tampil = (jenis, teks) => {
    if (!pesanEl) return;
    pesanEl.className = "form-message " + jenis;
    pesanEl.textContent = teks;
    pesanEl.setAttribute("role", jenis === "error" ? "alert" : "status");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    // Honeypot anti-bot
    const hp = document.getElementById("aspirasi-situs");
    if (hp && hp.value.trim() !== "") { tampil("success", "Terima kasih! Pesan Anda sudah kami terima."); form.reset(); return; }

    const tombol = form.querySelector("button[type=submit]");
    const labelAsli = tombol.innerHTML;
    tombol.disabled = true;
    tombol.textContent = "Mengirim...";

    const { error } = await supabaseClient.from("aspirasi").insert({
      nama: document.getElementById("aspirasi-nama").value.trim(),
      email: document.getElementById("aspirasi-email").value.trim(),
      kategori: document.getElementById("aspirasi-kategori").value,
      pesan: document.getElementById("aspirasi-pesan").value.trim(),
    });

    tombol.disabled = false;
    tombol.innerHTML = labelAsli;

    if (error) {
      console.error(error);
      tampil("error", "Pesan belum terkirim. Coba lagi sebentar lagi, atau hubungi kami lewat surel di samping.");
      return;
    }
    tampil("success", "Terima kasih! Pesan aspirasi Anda sudah tersimpan dan akan ditindaklanjuti pengurus.");
    form.reset();
  });
}

// ================= FORM PENDAFTARAN (pendaftaran.html) =================
// Menampilkan pesan hasil formulir di layar (gulir + fokus + role yang tepat untuk pembaca layar).
function umumkanPesan(el) {
  if (!el) return;
  el.setAttribute("role", el.classList.contains("error") ? "alert" : "status");
  el.setAttribute("tabindex", "-1");
  const kurangiGerak = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: kurangiGerak ? "auto" : "smooth", block: "center" });
  el.focus({ preventScroll: true });
}

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
      umumkanPesan(pesanEl);
      form.nim.focus();
      return;
    }
    if (!/^(\+62|62|0)8[0-9]{8,12}$/.test(noWa)) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Format Nomor WhatsApp tidak valid. Contoh: 08123456789.";
      umumkanPesan(pesanEl);
      form.no_wa.focus();
      return;
    }

    // Persetujuan pengolahan data pribadi (wajib)
    if (form.setuju && !form.setuju.checked) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = "Centang persetujuan pengolahan data pribadi terlebih dahulu.";
      umumkanPesan(pesanEl);
      form.setuju.focus();
      return;
    }

    // Honeypot anti-bot: kolom tersembunyi yang tidak pernah terisi oleh manusia.
    if (form.hp_konfirmasi_situs && form.hp_konfirmasi_situs.value.trim() !== "") {
      pesanEl.className = "form-message success";
      pesanEl.textContent = "Pendaftaran berhasil dikirim.";
      umumkanPesan(pesanEl);
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
    if (form.setuju) payload.setuju_pada = new Date().toISOString();

    let { error } = await supabaseClient.from("pendaftaran").insert(payload);
    // Cadangan: jika kolom setuju_pada belum dibuat di database (SQL tahap 19 belum dijalankan), kirim tanpa kolom itu.
    if (error && payload.setuju_pada && (error.code === "PGRST204" || /setuju_pada/.test(error.message || ""))) {
      delete payload.setuju_pada;
      ({ error } = await supabaseClient.from("pendaftaran").insert(payload));
    }

    tombol.disabled = false;
    tombol.textContent = "Kirim Pendaftaran";

    if (error) {
      pesanEl.className = "form-message error";
      pesanEl.textContent = error.code === "23505"
        ? "Pendaftaran tidak dapat diproses. Jika kamu merasa sudah mendaftar atau data ini keliru, hubungi pengurus."
        : "Pendaftaran gagal terkirim. Coba lagi sebentar lagi.";
      umumkanPesan(pesanEl);
      console.error(error);
      return;
    }

    pesanEl.className = "form-message success";
    pesanEl.textContent = "Pendaftaran berhasil dikirim. Tim pengurus akan menghubungi kamu.";
      umumkanPesan(pesanEl);
    form.reset();
  });
}

// ================= PENGATURAN: diambil sekali, dipakai ulang =================
let _pengaturanPromise = null;
function ambilPengaturan() {
  if (!_pengaturanPromise) {
    _pengaturanPromise = Promise.resolve(
      supabaseClient.from("pengaturan").select("*").eq("id", 1).maybeSingle()
    );
  }
  return _pengaturanPromise;
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
  const bersih = (t) => String(t).replace(/[^\p{L}\p{N}]/gu, "");
  if (!nama) return "?";
  const parts = nama.trim().split(/\s+/);
  if (parts.length >= 2) {
    return bersih(parts[0][0] + parts[1][0]).toUpperCase() || "?";
  }
  return bersih(nama.trim().slice(0, 2)).toUpperCase() || "?";
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
// Tampilan seragam saat data gagal dimuat (jaringan/Supabase bermasalah), supaya tidak disangka "data kosong".
function tampilGagalMuat(el, pesan) {
  if (!el) return;
  el.innerHTML = `
    <div role="alert" class="col-span-full p-8 text-center bg-surface-container-lowest rounded-2xl border border-surface-container">
      <p class="text-body-md text-on-surface font-semibold mb-1">Data belum bisa dimuat</p>
      <p class="text-body-md text-secondary mb-4">${escapeHtml(pesan || "Periksa koneksi internet Anda, lalu coba lagi.")}</p>
      <button type="button" onclick="location.reload()" class="inline-flex items-center justify-center min-h-[44px] px-6 rounded-full bg-primary-container hover:bg-primary text-on-primary text-sm font-semibold transition-colors">Muat ulang halaman</button>
    </div>`;
}

// Kunci fokus di dalam dialog (Tab berputar di dalam), Esc menutup, fokus kembali ke pemicu.
function jebakFokusDialog(dialogEl, tutup) {
  const pemicu = document.activeElement;
  const sel = 'a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),select,textarea,[tabindex]:not([tabindex="-1"])';
  const onKey = (e) => {
    if (e.key === "Escape") { e.stopPropagation(); tutup(); return; }
    if (e.key !== "Tab") return;
    const f = Array.from(dialogEl.querySelectorAll(sel)).filter(x => x.offsetParent !== null);
    if (!f.length) { e.preventDefault(); return; }
    const a = f[0], z = f[f.length - 1];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };
  dialogEl.addEventListener("keydown", onKey);
  return function lepas() {
    dialogEl.removeEventListener("keydown", onKey);
    if (pemicu && typeof pemicu.focus === "function" && document.contains(pemicu)) pemicu.focus();
  };
}

function emptyState(judul, deskripsi, options = {}) {
  const icon = (typeof options === "string" ? options : options.icon) || "event_busy";
  const btnText = typeof options === "object" ? options.btnText : "";
  const btnHref = typeof options === "object" ? options.btnHref : "";

  return `
    <div class="empty-note">
      <div class="empty-note__icon"><span aria-hidden="true" class="material-symbols-outlined">${escapeHtml(icon)}</span></div>
      <h4>${escapeHtml(judul)}</h4>
      <p>${escapeHtml(deskripsi)}</p>
      ${btnText && btnHref ? `<a href="${escapeHtml(btnHref)}" class="empty-note__aksi"><span>${escapeHtml(btnText)}</span></a>` : ""}
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
  const gambar = data.foto_url || `${BASE}img/og-default.png`;
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
    <div class="search-box" role="dialog" aria-modal="true" aria-label="Pencarian situs">
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
  const _pemicuPencarian = document.activeElement;
  input.focus();

  let lepasFokus = () => {};
  function tutup() {
    overlay.remove();
    lepasFokus();
  }
  lepasFokus = jebakFokusDialog(overlay, tutup);
  // jebakFokusDialog mencatat elemen aktif saat dipanggil (sudah input), jadi kembalikan ke pemicu asli
  const _lepasAsli = lepasFokus;
  lepasFokus = () => { _lepasAsli(); if (_pemicuPencarian && document.contains(_pemicuPencarian)) _pemicuPencarian.focus(); };
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

  const kunci = `%${kata.replace(/[\\%_]/g, "\\$&")}%`;
  const [beritaRes, kegiatanRes, anggotaRes, programRes] = await Promise.all([
    supabaseClient.from("berita").select("id, judul, tanggal").eq("kategori", "Berita").ilike("judul", kunci).limit(5),
    supabaseClient.from("berita").select("id, judul, tanggal").eq("kategori", "Kegiatan").ilike("judul", kunci).limit(5),
    supabaseClient.from("anggota").select("id, nama, jabatan, kategori").eq("kategori", "Anggota").ilike("nama", kunci).limit(5),
    supabaseClient.from("program_kerja").select("id, nama_program, divisi").ilike("nama_program", kunci).limit(5),
  ]);

  if (beritaRes.error || kegiatanRes.error || anggotaRes.error || programRes.error) {
    hasilEl.innerHTML = `<p class="search-empty">Pencarian belum bisa dilakukan. Periksa koneksi, lalu coba lagi.</p>`;
    return;
  }

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

  const gambar = Array.from(container.querySelectorAll("img")).filter(im => !im.closest("a[href]"));
  if (!gambar.length) return;

  let indeks = 0;
  let lepasFokusLightbox = () => {};

  function bukaLightbox(i) {
    indeks = i;
    const overlay = document.createElement("div");
    overlay.className = "lightbox-overlay";
    overlay.id = "lightbox-aktif";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Pratinjau foto");
    overlay.innerHTML = `
      <button class="lightbox-tutup" aria-label="Tutup">&times;</button>
      ${gambar.length > 1 ? `<button class="lightbox-prev" aria-label="Sebelumnya">&larr;</button>` : ""}
      <img alt="">
      ${gambar.length > 1 ? `<button class="lightbox-next" aria-label="Berikutnya">&rarr;</button>` : ""}
    `;
    const imgBesar = overlay.querySelector("img");
    imgBesar.src = gambar[indeks].src;
    imgBesar.alt = gambar[indeks].alt || "";
    document.body.appendChild(overlay);

    overlay.querySelector(".lightbox-tutup").addEventListener("click", tutupLightbox);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) tutupLightbox(); });
    const prev = overlay.querySelector(".lightbox-prev");
    const next = overlay.querySelector(".lightbox-next");
    if (prev) prev.addEventListener("click", () => geser(-1));
    if (next) next.addEventListener("click", () => geser(1));
    document.addEventListener("keydown", tombolKeyboard);
    lepasFokusLightbox = jebakFokusDialog(overlay, tutupLightbox);
    overlay.querySelector(".lightbox-tutup").focus();
  }

  function geser(arah) {
    indeks = (indeks + arah + gambar.length) % gambar.length;
    const overlay = document.getElementById("lightbox-aktif");
    if (overlay) {
      const besar = overlay.querySelector("img");
      besar.src = gambar[indeks].src;
      besar.alt = gambar[indeks].alt || "";
    }
  }

  function tombolKeyboard(e) {
    if (e.key === "ArrowLeft") geser(-1);
    if (e.key === "ArrowRight") geser(1);
  }

  function tutupLightbox() {
    const overlay = document.getElementById("lightbox-aktif");
    if (overlay) overlay.remove();
    document.removeEventListener("keydown", tombolKeyboard);
    lepasFokusLightbox();
    lepasFokusLightbox = () => {};
  }

  gambar.forEach((img, i) => {
    img.addEventListener("click", () => bukaLightbox(i));
    const tile = img.closest("[role='button']");
    if (tile) tile.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bukaLightbox(i); }
    });
  });
}

// ================= MITRA & LOKASI (tahap 20) =================
// Data dari tabel mitra_tautan (diisi di Dashboard > Mitra & Lokasi). Jika tabel belum ada / kosong,
// bagian terkait tetap tersembunyi dan halaman berjalan normal.
async function ambilMitra(jenis) {
  try {
    const { data, error } = await supabaseClient.from("mitra_tautan").select("*")
      .eq("jenis", jenis).eq("aktif", true)
      .order("urutan", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true });
    return error || !data ? [] : data;
  } catch (e) { return []; }
}

function kueriPeta(l) {
  return (l.keterangan || "").trim() || (l.nama + " Universitas PGRI Argopuro Jember");
}

async function muatLokasiKampus() {
  const sec = document.getElementById("sec-lokasi");
  if (!sec) return;
  const daftar = await ambilMitra("lokasi");
  if (!daftar.length) return;

  const tabs = document.getElementById("lokasi-tabs");
  const iframe = document.getElementById("lokasi-peta");
  const pilih = (i) => {
    const l = daftar[i];
    tabs.querySelectorAll("[role=tab]").forEach((b, n) => {
      b.setAttribute("aria-selected", n === i ? "true" : "false");
      b.tabIndex = n === i ? 0 : -1;
    });
    const q = encodeURIComponent(kueriPeta(l));
    iframe.src = `https://www.google.com/maps?q=${q}&output=embed`;
    iframe.title = "Peta lokasi " + l.nama;
    document.getElementById("lokasi-nama").textContent = l.nama;
    document.getElementById("lokasi-alamat").textContent = l.keterangan || "";
    const rute = document.getElementById("lokasi-rute");
    rute.href = urlTautanAman(l.url) || `https://www.google.com/maps/dir/?api=1&destination=${q}`;
  };
  tabs.innerHTML = daftar.map((l, i) =>
    `<button type="button" role="tab" class="lokasi__tab" id="lokasi-tab-${i}" aria-controls="lokasi-panel" aria-selected="false" tabindex="-1">${escapeHtml(l.nama)}</button>`
  ).join("");
  tabs.addEventListener("click", (e) => {
    const b = e.target.closest("[role=tab]");
    if (b) pilih([...tabs.children].indexOf(b));
  });
  tabs.addEventListener("keydown", (e) => {
    const n = daftar.length, cur = [...tabs.children].findIndex(b => b.getAttribute("aria-selected") === "true");
    let to = -1;
    if (e.key === "ArrowRight") to = (cur + 1) % n;
    else if (e.key === "ArrowLeft") to = (cur - 1 + n) % n;
    else if (e.key === "Home") to = 0;
    else if (e.key === "End") to = n - 1;
    if (to < 0) return;
    e.preventDefault(); pilih(to); tabs.children[to].focus();
  });
  if (daftar.length === 1) tabs.hidden = true;
  sec.hidden = false;
  pilih(0);
}

function inisialNama(nama) {
  const kata = String(nama || "").replace(/^ukm\s+/i, "").trim().split(/\s+/).filter(Boolean);
  return ((kata[0] || "?")[0] + (kata[1] ? kata[1][0] : "")).toUpperCase();
}

function htmlTautanKampus(daftar) {
  return daftar.map(t => `
      <li><a href="${escapeHtml(urlTautanAman(t.url))}" target="_blank" rel="noopener noreferrer">
        <span><strong>${escapeHtml(t.nama)}</strong>${t.keterangan ? `<small>${escapeHtml(t.keterangan)}</small>` : ""}</span>
        <span class="material-symbols-outlined" aria-hidden="true">arrow_outward</span>
        <span class="sr-only">(buka di tab baru)</span>
      </a></li>`).join("");
}

function htmlUkmKampus(daftar) {
  return daftar.map(u => {
    const logo = urlGambarAman(u.logo_url);
    const href = urlTautanAman(u.url);
    const penjelasan = String(u.keterangan || "").trim();
    return `
      <li class="ukm-kartu">
        ${href ? `<a class="ukm-logo-tautan" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" tabindex="-1" aria-hidden="true"><span class="ukm-logo">${logo ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy" width="64" height="64">` : escapeHtml(inisialNama(u.nama))}</span></a>` : `<span class="ukm-logo" aria-hidden="true">${logo ? `<img src="${escapeHtml(logo)}" alt="" loading="lazy" width="64" height="64">` : escapeHtml(inisialNama(u.nama))}</span>`}
        <div class="ukm-kartu__isi">
          <h3 class="ukm-nama">${escapeHtml(u.nama)}</h3>
          ${penjelasan ? `<p class="ukm-kartu__teks">${escapeHtml(penjelasan)}</p>` : ""}
          ${href ? `<a class="ukm-kartu__tautan" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"><span>Buka Instagram</span><span class="material-symbols-outlined" aria-hidden="true">arrow_outward</span><span class="sr-only">${escapeHtml(u.nama)} (tab baru)</span></a>` : ""}
        </div>
      </li>`;
  }).join("");
}

// Tautan situs kampus tampil di footer, di kolom sendiri "Layanan Akademik" (diisi dari Dashboard > Mitra & Lokasi).
// Kolom tersembunyi selama belum ada tautan, sehingga footer tetap rapi.
async function muatJaringanKampus() {
  const kolom = document.getElementById("footer-layanan");
  const daftar = document.getElementById("footer-layanan-daftar");
  if (!kolom || !daftar) return;
  const tautan = (await ambilMitra("tautan")).filter(t => urlTautanAman(t.url));
  if (!tautan.length) return;
  daftar.innerHTML = tautan.map(t => `
          <li><a class="inline-flex items-center gap-1 hover:text-primary-fixed transition-colors" href="${escapeHtml(urlTautanAman(t.url))}" target="_blank" rel="noopener noreferrer"><span>${escapeHtml(t.nama)}</span><span class="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_outward</span><span class="sr-only">(buka di tab baru)</span></a></li>`).join("");
  kolom.hidden = false;
}

// Halaman Jaringan Kampus (kampus.html): hanya daftar UKM. Peta ada di halaman Kontak, tautan situs kampus ada di footer.
async function muatHalamanKampus() {
  const ukm = await ambilMitra("ukm");
  const secU = document.getElementById("kampus-ukm");
  if (ukm.length && secU) {
    document.getElementById("kampus-ukm-daftar").innerHTML = htmlUkmKampus(ukm);
    secU.hidden = false;
  }
  const kosong = document.getElementById("kampus-kosong");
  if (kosong) kosong.hidden = ukm.length > 0;
}

// Beranda: ringkasan Jaringan Kampus. Bagian tetap tersembunyi sampai ada UKM aktif.
async function muatJaringanBeranda(elId = "jaringan-beranda-daftar", batas = 4) {
  const daftarEl = document.getElementById(elId);
  const bagian = document.getElementById("jaringan-kampus");
  if (!daftarEl || !bagian) return;
  const ukm = await ambilMitra("ukm");
  if (!ukm.length) return;
  daftarEl.innerHTML = htmlUkmKampus(ukm.slice(0, batas));
  const semua = document.getElementById("jaringan-beranda-semua");
  if (semua && ukm.length > batas) semua.textContent = `Lihat semua ${ukm.length} UKM`;
  bagian.hidden = false;
}


// ================= INFO LOMBA (lomba.html) =================
// Tautan hanya diterima dari Google Drive/Docs/Forms. Selain itu diabaikan.
function urlGoogleAman(u, jenis) {
  try {
    const url = new URL(String(u || "").trim());
    if (url.protocol !== "https:") return "";
    const h = url.hostname.toLowerCase();
    if (jenis === "form") {
      const ok = (h === "docs.google.com" && url.pathname.startsWith("/forms/")) || h === "forms.gle" || h === "forms.google.com";
      return ok ? url.href : "";
    }
    return (h === "drive.google.com" || h === "docs.google.com") ? url.href : "";
  } catch (e) { return ""; }
}

// Tautan Drive "…/file/d/ID/view" diubah jadi tautan unduh langsung. Selain itu dipakai apa adanya.
function tautanUnduhDrive(href) {
  const m = /^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/.exec(href);
  return m ? `https://drive.google.com/uc?export=download&id=${m[1]}` : href;
}

function statusLomba(l) {
  const tgl = (s) => (s ? new Date(s + "T00:00:00") : null);
  const sekarang = new Date();
  const buka = tgl(l.tanggal_buka);
  const tutup = tgl(l.tanggal_tutup);
  if (tutup) tutup.setHours(23, 59, 59, 999);
  if (buka && sekarang < buka) return { teks: "Segera dibuka", kelas: "" };
  if (tutup && sekarang > tutup) return { teks: "Pendaftaran ditutup", kelas: "lomba-status--tutup" };
  return { teks: "Pendaftaran dibuka", kelas: "lomba-status--buka" };
}

function paragrafLomba(teks) {
  return String(teks || "").split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("");
}

function htmlMetaLomba(l) {
  const baris = [];
  if (l.tanggal_buka || l.tanggal_tutup) {
    baris.push(`<li><strong>Pendaftaran:</strong> ${escapeHtml(l.tanggal_buka ? formatTanggal(l.tanggal_buka) : "sekarang")} s.d. ${escapeHtml(l.tanggal_tutup ? formatTanggal(l.tanggal_tutup) : "belum ditentukan")}</li>`);
  }
  if (l.tanggal_acara) baris.push(`<li><strong>Pelaksanaan:</strong> ${escapeHtml(formatTanggal(l.tanggal_acara))}</li>`);
  if (l.lokasi) baris.push(`<li><strong>Lokasi:</strong> ${escapeHtml(l.lokasi)}</li>`);
  if (l.kontak) baris.push(`<li><strong>Kontak:</strong> ${escapeHtml(l.kontak)}</li>`);
  return baris.length ? `<ul class="lomba-meta">${baris.join("")}</ul>` : "";
}

function htmlKartuLomba(l) {
  const st = statusLomba(l);
  return `
    <li class="lomba-kartu">
      <span class="lomba-status ${st.kelas}">${escapeHtml(st.teks)}</span>
      <h3>${escapeHtml(l.judul)}</h3>
      ${l.ringkasan ? `<p>${escapeHtml(l.ringkasan)}</p>` : ""}
      ${htmlMetaLomba(l)}
      <div class="lomba-aksi"><a class="lomba-tombol lomba-tombol--utama" href="lomba.html?slug=${encodeURIComponent(l.slug)}">Lihat detail<span class="sr-only"> ${escapeHtml(l.judul)}</span></a></div>
    </li>`;
}

function htmlKategoriLomba(k, lombaDibuka) {
  const juknis = urlGoogleAman(k.juknis_url, "juknis");
  const form = urlGoogleAman(k.form_url, "form");
  const syarat = String(k.syarat || "").split("\n").map(s => s.trim()).filter(Boolean);
  const info = [];
  if (k.biaya) info.push(`<li><strong>Biaya:</strong> ${escapeHtml(k.biaya)}</li>`);
  if (k.kuota !== null && k.kuota !== undefined) info.push(`<li><strong>Kuota:</strong> ${escapeHtml(k.kuota)} peserta</li>`);
  return `
    <li class="lomba-kartu">
      <h3>${escapeHtml(k.nama)}</h3>
      ${k.deskripsi ? `<p>${escapeHtml(k.deskripsi)}</p>` : ""}
      ${info.length ? `<ul class="lomba-meta">${info.join("")}</ul>` : ""}
      ${syarat.length ? `<ul class="lomba-syarat">${syarat.map(s => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : ""}
      <div class="lomba-aksi">
        ${juknis ? `<a class="lomba-tombol" href="${escapeHtml(tautanUnduhDrive(juknis))}" target="_blank" rel="noopener noreferrer"><span class="material-symbols-outlined" aria-hidden="true">download</span><span>Unduh juknis</span><span class="sr-only"> ${escapeHtml(k.nama)} (buka di tab baru)</span></a>` : ""}
        ${form && lombaDibuka ? `<a class="lomba-tombol lomba-tombol--utama" href="${escapeHtml(form)}" target="_blank" rel="noopener noreferrer"><span>Daftar</span><span class="sr-only"> ${escapeHtml(k.nama)} (buka di tab baru)</span></a>` : ""}
      </div>
    </li>`;
}

async function muatHalamanLomba() {
  const daftarEl = document.getElementById("lomba-daftar");
  const detailEl = document.getElementById("lomba-detail");
  const kosongEl = document.getElementById("lomba-kosong");
  if (!daftarEl || !detailEl) return;
  const slug = new URLSearchParams(window.location.search).get("slug");
  try {
    if (!slug) {
      const { data, error } = await supabaseClient.from("lomba").select("*")
        .eq("aktif", true).order("tanggal_acara", { ascending: false, nullsFirst: false });
      if (error || !data || !data.length) { if (kosongEl) kosongEl.hidden = false; return; }
      daftarEl.innerHTML = data.map(htmlKartuLomba).join("");
      daftarEl.hidden = false;
      return;
    }
    const { data: l, error } = await supabaseClient.from("lomba").select("*").eq("slug", slug).eq("aktif", true).maybeSingle();
    if (error || !l) {
      detailEl.innerHTML = `<p class="empty-note">Lomba tidak ditemukan atau sudah tidak aktif.</p><p><a class="lomba-kembali" href="lomba.html">Kembali ke daftar lomba</a></p>`;
      detailEl.hidden = false;
      return;
    }
    const { data: kat } = await supabaseClient.from("lomba_kategori").select("*")
      .eq("lomba_id", l.id).eq("aktif", true).order("urutan", { ascending: true, nullsFirst: false }).order("created_at", { ascending: true });
    const st = statusLomba(l);
    const dibuka = st.kelas === "lomba-status--buka";
    document.title = `${l.judul} | HIMPALUBI`;
    const desk = document.querySelector('meta[name="description"]');
    if (desk) desk.setAttribute("content", l.ringkasan || `Informasi lomba ${l.judul} dari HIMPALUBI.`);
    const h1 = document.querySelector(".page-hero__title");
    if (h1) h1.textContent = l.judul;
    const lead = document.querySelector(".page-hero__lead");
    if (lead) lead.textContent = l.ringkasan || "";
    const poster = urlGambarAman(l.poster_url);
    detailEl.innerHTML = `
      <a class="lomba-kembali" href="lomba.html">&larr; Semua lomba</a>
      <section>
        <span class="lomba-status ${st.kelas}">${escapeHtml(st.teks)}</span>
        ${poster ? `<img class="lomba-poster" src="${poster}" alt="Poster ${escapeHtml(l.judul)}" loading="lazy">` : ""}
        ${htmlMetaLomba(l)}
      </section>
      ${l.deskripsi ? `<section><h2>Tentang lomba</h2>${paragrafLomba(l.deskripsi)}</section>` : ""}
      <section>
        <h2>Kategori lomba</h2>
        ${kat && kat.length ? `<ul class="lomba-daftar">${kat.map(k => htmlKategoriLomba(k, dibuka)).join("")}</ul>` : `<p class="empty-note">Kategori akan segera diumumkan.</p>`}
        ${!dibuka ? `<p>Tombol Daftar hanya muncul saat pendaftaran dibuka.</p>` : ""}
      </section>`;
    detailEl.hidden = false;
  } catch (e) {
    if (kosongEl) kosongEl.hidden = false;
  }
}
