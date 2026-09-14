// ================= HALAMAN BERITA (index.html & berita.html) =================
async function muatBerita(elId, batas) {
  const el = document.getElementById(elId);
  if (!el) return;

  let query = supabaseClient
    .from("berita")
    .select("*")
    .order("tanggal", { ascending: false });

  if (batas) query = query.limit(batas);

  const { data, error } = await query;

  if (error) {
    el.innerHTML = `<p class="form-message error">Berita belum bisa dimuat. Coba muat ulang halaman.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<p>Belum ada berita yang dipublikasikan.</p>`;
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

// ================= HALAMAN ANGGOTA (anggota.html) =================
async function muatAnggota(elId) {
  const el = document.getElementById(elId);
  if (!el) return;

  const { data, error } = await supabaseClient
    .from("anggota")
    .select("*")
    .eq("status", "Aktif")
    .order("nama", { ascending: true });

  if (error) {
    el.innerHTML = `<p class="form-message error">Data anggota belum bisa dimuat.</p>`;
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    el.innerHTML = `<p>Belum ada data anggota.</p>`;
    return;
  }

  el.innerHTML = data.map(a => `
    <div class="member-card">
      <div class="photo">
        ${a.foto_url ? `<img src="${a.foto_url}" alt="">` : initial(a.nama)}
      </div>
      <h3>${escapeHtml(a.nama)}</h3>
      <div class="role">${escapeHtml(a.jabatan || "Anggota")}</div>
      <div class="meta">${escapeHtml(a.angkatan || "")}</div>
    </div>
  `).join("");
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

// ================= BERANDA: Berita (daftar + kartu foto) + Galeri =================
async function muatBerandaBerita() {
  const { data, error } = await supabaseClient
    .from("berita")
    .select("*")
    .order("tanggal", { ascending: false })
    .limit(8);

  const sideEl = document.getElementById("berita-sidelist");
  const gridEl = document.getElementById("berita-photogrid");
  const galeriEl = document.getElementById("galeri-grid");

  if (error || !data) {
    if (sideEl) sideEl.innerHTML = `<li>Berita belum bisa dimuat.</li>`;
    return;
  }

  if (data.length === 0) {
    if (sideEl) sideEl.innerHTML = `<li>Belum ada berita yang dipublikasikan.</li>`;
    if (gridEl) gridEl.innerHTML = "";
    return;
  }

  if (sideEl) {
    sideEl.innerHTML = data.slice(0, 4).map(item => `
      <li>
        <span class="date-badge">
          <span class="day">${new Date(item.tanggal).getDate()}</span>
          <span class="month">${new Date(item.tanggal).toLocaleDateString("id-ID", { month: "short" })}</span>
        </span>
        <div>
          <h4>${escapeHtml(item.judul)}</h4>
          <p>${escapeHtml(ringkas(item.isi, 90))}</p>
          <a class="more" href="berita.html">Selengkapnya &rarr;</a>
        </div>
      </li>
    `).join("");
  }

  if (gridEl) {
    const dengan_foto = data.filter(item => item.foto_url).slice(0, 4);
    gridEl.innerHTML = dengan_foto.length
      ? dengan_foto.map(item => `
          <div class="news-photo-card">
            <img src="${item.foto_url}" alt="">
            <span class="tag">Berita</span>
            <h4>${escapeHtml(item.judul)}</h4>
          </div>
        `).join("")
      : `<p style="grid-column:1/-1; color:var(--ink-600);">Tambahkan tautan foto pada berita supaya tampil di sini.</p>`;
  }

  if (galeriEl) {
    const foto = data.filter(item => item.foto_url);
    galeriEl.innerHTML = foto.length
      ? foto.map(item => `<img src="${item.foto_url}" alt="${escapeHtml(item.judul)}" loading="lazy">`).join("")
      : `<p>Foto kegiatan akan tampil di sini setelah berita dengan foto dipublikasikan.</p>`;
  }
}

// ================= UTIL =================
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
  return str.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
