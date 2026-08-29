// File: api/stevemc-api.js

let latestData = null

export default async function handler(req, res) {

  try {

    // ==============================
    // POST = BOT MENGIRIM DATA
    // ==============================
    if (req.method === 'POST') {

      const { fitur, caption, imageUrl } = req.body

      if (!fitur) {
        return res.status(400).json({
          status: false,
          message: 'Parameter "fitur" wajib diisi'
        })
      }

      switch (fitur) {

        case 'tes1': {

          latestData = {
            fitur,
            caption: caption || '',
            imageUrl: imageUrl || null,
            timestamp: new Date().toISOString()
          }

          if (imageUrl) {
            latestData.image = {
              url: imageUrl,
              status: 'Gambar berhasil diupload'
            }
          }

          if (caption) {
            latestData.caption = {
              text: caption,
              length: caption.length
            }
          }

          return res.status(200).json({
            status: true,
            message: 'Data berhasil diterima',
            data: latestData
          })
        }

        default:
          return res.status(404).json({
            status: false,
            message: `Fitur "${fitur}" tidak ditemukan`
          })
      }
    }

    // ==============================
    // GET = WEBSITE MENGAMBIL DATA
    // ==============================
    if (req.method === 'GET') {

      if (!latestData) {
        return res.status(404).json({
          status: false,
          message: 'Belum ada data dari bot'
        })
      }

      return res.status(200).json({
        status: true,
        message: 'Data berhasil diambil',
        data: latestData
      })
    }

    // ==============================
    // METHOD LAIN
    // ==============================

    return res.status(405).json({
      status: false,
      message: 'Method tidak diizinkan'
    })

  } catch (error) {

    console.error('[API ERROR]', error)

    return res.status(500).json({
      status: false,
      message: error.message || 'Terjadi kesalahan internal server'
    })
  }
}