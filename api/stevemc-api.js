// File: api/stevemc-api.js

let latestData = null

// ==============================
// FUNGSI UTILITY CORS
// ==============================
function setCorsHeaders(res, req = null) {
  // Daftar origin yang diizinkan (untuk production)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8158',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8158',
    'https://domain-anda.com',
    'https://www.domain-anda.com',
    // Tambahkan domain Anda di sini
  ]

  let origin = '*'
  
  // Jika ada req, cek origin yang diizinkan
  if (req) {
    const requestOrigin = req.headers.origin || req.headers.referer || ''
    if (allowedOrigins.some(allowed => requestOrigin.includes(allowed))) {
      origin = requestOrigin
    }
  }

  // Set header CORS
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Max-Age', '86400') // 24 jam
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, X-Total-Count')
}

// ==============================
// FUNGSI RESPONSE HELPER
// ==============================
function sendResponse(res, statusCode, data) {
  // Pastikan CORS headers sudah diset
  res.status(statusCode).json(data)
}

export default async function handler(req, res) {
  // ==============================
  // TANGANI PREFLIGHT REQUEST (OPTIONS)
  // ==============================
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req)
    return res.status(200).end()
  }

  try {
    // Set CORS headers untuk semua response
    setCorsHeaders(res, req)

    // Log untuk debugging
    console.log(`[${new Date().toISOString()}] Method: ${req.method}, Origin: ${req.headers.origin || 'unknown'}`)

    // ==============================
    // POST = BOT MENGIRIM DATA
    // ==============================
    if (req.method === 'POST') {
      const { fitur, caption, imageUrl } = req.body

      if (!fitur) {
        return sendResponse(res, 400, {
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

          return sendResponse(res, 200, {
            status: true,
            message: 'Data berhasil diterima',
            data: latestData
          })
        }

        default:
          return sendResponse(res, 404, {
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
        return sendResponse(res, 404, {
          status: false,
          message: 'Belum ada data dari bot'
        })
      }

      return sendResponse(res, 200, {
        status: true,
        message: 'Data berhasil diambil',
        data: latestData
      })
    }

    // ==============================
    // METHOD LAIN
    // ==============================
    return sendResponse(res, 405, {
      status: false,
      message: 'Method tidak diizinkan'
    })

  } catch (error) {
    console.error('[API ERROR]', error)

    // Pastikan CORS headers tetap terkirim saat error
    setCorsHeaders(res, req)
    
    return sendResponse(res, 500, {
      status: false,
      message: error.message || 'Terjadi kesalahan internal server'
    })
  }
}