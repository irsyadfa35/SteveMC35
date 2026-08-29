// File: api/index.js (GitHub Pages / Vercel / Railway)
// API endpoint untuk menerima data dari fitur tes1

export default async function handler(req, res) {
  // Hanya menerima method POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      message: 'Method tidak diizinkan. Gunakan POST.'
    })
  }

  try {
    const { fitur, caption, imageUrl } = req.body

    // Validasi fitur
    if (!fitur) {
      return res.status(400).json({
        status: false,
        message: 'Parameter "fitur" wajib diisi'
      })
    }

    // ===== PROSES BERDASARKAN FITUR =====
    switch (fitur) {
      case 'tes1': {
        // Simpan data ke file atau database (opsional)
        // Di sini kita hanya mengembalikan data yang diterima
        
        let result = {
          status: true,
          message: 'Data berhasil diterima',
          data: {
            fitur: fitur,
            caption: caption || '',
            imageUrl: imageUrl || null,
            timestamp: new Date().toISOString()
          }
        }

        // Jika ada gambar, tambahkan info gambar
        if (imageUrl) {
          result.data.image = {
            url: imageUrl,
            status: 'Gambar berhasil diupload'
          }
        }

        // Jika ada caption, tambahkan info caption
        if (caption) {
          result.data.caption = {
            text: caption,
            length: caption.length
          }
        }

        // Log ke console (untuk debugging)
        console.log('[TES1] Data diterima:', {
          fitur,
          caption,
          imageUrl,
          waktu: new Date().toISOString()
        })

        return res.status(200).json(result)
      }

      default: {
        return res.status(404).json({
          status: false,
          message: `Fitur "${fitur}" tidak ditemukan`
        })
      }
    }

  } catch (error) {
    console.error('[API ERROR]', error)
    return res.status(500).json({
      status: false,
      message: error.message || 'Terjadi kesalahan internal server'
    })
  }
}