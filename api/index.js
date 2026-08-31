// api/index.js
import axios from 'axios';
import { createCanvas, loadImage } from 'canvas';
import FormData from 'form-data';
import { fileTypeFromBuffer } from 'file-type';

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return res.status(200).end();
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // TERMAI API Key - SEGERA GANTI/ROTASI KEY INI!
  const TERMAI_KEY = 'AIzaBj7z2z3xBjsk';

  try {
    let imageUrl, topText, bottomText;

    // Extract parameters from POST or GET
    if (req.method === 'POST') {
      imageUrl = req.body?.imageUrl;
      topText = req.body?.topText || '';
      bottomText = req.body?.bottomText || '';
    } else {
      // GET request
      const { query } = req;
      
      // Check if fitur parameter is correct
      if (query.fitur !== 'edit-foto') {
        return res.status(400).json({
          status: false,
          message: 'Invalid fitur parameter. Use: fitur=edit-foto'
        });
      }
      
      imageUrl = query.imageUrl;
      topText = query.topText || '';
      bottomText = query.bottomText || '';
    }

    // Validate imageUrl
    if (!imageUrl) {
      return res.status(400).json({
        status: false,
        message: 'Parameter imageUrl wajib diisi'
      });
    }

    // Decode URL if needed
    try {
      imageUrl = decodeURIComponent(imageUrl);
    } catch (e) {
      // If decoding fails, use as is
    }

    console.log(`📥 Processing image: ${imageUrl}`);
    console.log(`📝 Top text: "${topText}", Bottom text: "${bottomText}"`);

    // Step 2: Download image
    let imageBuffer;
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024 // 10MB limit
      });
      imageBuffer = Buffer.from(response.data);
      console.log(`✅ Image downloaded: ${imageBuffer.length} bytes`);
    } catch (error) {
      console.error('❌ Download error:', error.message);
      return res.status(500).json({
        status: false,
        message: 'Gagal memuat gambar',
        error: error.message,
        statusCode: error.response?.status || 500
      });
    }

    // Step 3-4: Process image with canvas
    let processedBuffer;
    try {
      const image = await loadImage(imageBuffer);
      const width = image.width;
      const height = image.height;
      console.log(`📐 Image dimensions: ${width}x${height}`);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Draw original image
      ctx.drawImage(image, 0, 0, width, height);

      // Helper function to wrap text
      function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let lines = [];
        let currentLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine + ' ' + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width < maxWidth) {
            currentLine = testLine;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) {
          lines.push(currentLine);
        }
        return lines;
      }

      // ============================================================
      // FUNCTION DRAW TEXT WITH OUTLINE (DIPERBAIKI)
      // ============================================================
      function drawTextWithOutline(ctx, text, x, y, maxWidth, maxHeight) {
        if (!text) return;

        let fontSize = Math.min(Math.min(width, height) / 8, 80);
        let lines = [];
        let lineHeight = 0;
        let totalHeight = 0;

        // Cari ukuran font yang sesuai
        while (fontSize >= 10) {
          ctx.font = `bold ${fontSize}px Arial`;

          lineHeight = fontSize * 1.2;
          lines = wrapText(ctx, text, x, y, maxWidth, lineHeight);
          totalHeight = lines.length * lineHeight;

          // Pastikan setiap baris tidak melebihi maxWidth
          const widestLine = Math.max(
            ...lines.map(line => ctx.measureText(line).width)
          );

          if (
            widestLine <= maxWidth &&
            totalHeight <= maxHeight
          ) {
            break;
          }

          fontSize -= 2;
        }

        // Font final
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        lineHeight = fontSize * 1.2;
        totalHeight = lines.length * lineHeight;

        // Posisi awal
        const startY = y - (totalHeight / 2) + (lineHeight / 2);

        lines.forEach((line, index) => {
          const lineY = startY + (index * lineHeight);

          // =========================
          // OUTLINE HITAM (DIGAMBAR PERTAMA)
          // =========================
          ctx.lineJoin = 'round';
          ctx.miterLimit = 2;

          ctx.strokeStyle = '#000000';
          ctx.lineWidth = Math.max(4, fontSize * 0.08);

          ctx.strokeText(line, x, lineY);

          // =========================
          // TEKS PUTIH (DIGAMBAR KEDUA - DI ATAS OUTLINE)
          // =========================
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(line, x, lineY);
        });

        return lines.length;
      }

      // ============================================================
      // DRAW TEXT ON IMAGE
      // ============================================================
      const padding = 30;
      const maxWidth = width * 0.90;
      const maxHeight = height * 0.35;

      // =========================
      // TEKS ATAS
      // =========================
      if (topText) {
        const topY = Math.max(60, height * 0.12);

        drawTextWithOutline(
          ctx,
          topText,
          width / 2,
          topY,
          maxWidth,
          maxHeight
        );
      }

      // =========================
      // TEKS BAWAH
      // =========================
      if (bottomText) {
        const bottomY = height * 0.88;

        drawTextWithOutline(
          ctx,
          bottomText,
          width / 2,
          bottomY,
          maxWidth,
          maxHeight
        );
      }

      processedBuffer = canvas.toBuffer('image/png');
      console.log(`✅ Image processed: ${processedBuffer.length} bytes`);
    } catch (error) {
      console.error('❌ Canvas processing error:', error);
      return res.status(500).json({
        status: false,
        message: 'Gagal memproses gambar dengan Canvas',
        error: error.message,
        stack: error.stack
      });
    }

    // ============================================================
    // UPLOAD KE TERMAI
    // ============================================================
    try {
      const formData = new FormData();

      formData.append('file', processedBuffer, {
        filename: 'edited-image.png',
        contentType: 'image/png'
      });

      const uploadUrl =
        `https://c.termai.cc/api/upload?key=${encodeURIComponent(TERMAI_KEY)}`;

      console.log('📤 Upload URL:', uploadUrl);
      console.log('📦 Buffer:', processedBuffer.length, 'bytes');

      const response = await axios.post(
        uploadUrl,
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 120000,
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
          validateStatus: () => true
        }
      );

      console.log('📡 Termai HTTP:', response.status);
      console.log('📥 Termai response:', response.data);

      // Jangan anggap semua HTTP response sebagai sukses
      if (response.status < 200 || response.status >= 300) {
        return res.status(500).json({
          status: false,
          message: 'Termai menolak upload',
          statusCode: response.status,
          termai: response.data
        });
      }

      const uploadResult = response.data;

      // Cari URL hasil upload
      let resultUrl = null;

      if (typeof uploadResult === 'string') {
        resultUrl = uploadResult;
      } else if (uploadResult?.url) {
        resultUrl = uploadResult.url;
      } else if (uploadResult?.path) {
        resultUrl = uploadResult.path;
      } else if (uploadResult?.data?.url) {
        resultUrl = uploadResult.data.url;
      } else if (uploadResult?.data?.path) {
        resultUrl = uploadResult.data.path;
      } else if (typeof uploadResult?.data === 'string') {
        resultUrl = uploadResult.data;
      }

      if (!resultUrl) {
        return res.status(500).json({
          status: false,
          message: 'Upload berhasil tetapi URL gambar tidak ditemukan',
          termai: uploadResult
        });
      }

      return res.status(200).json({
        status: true,
        message: 'Foto berhasil diedit dan diupload',
        data: {
          imageUrl: resultUrl
        }
      });

    } catch (error) {
      console.error('❌ TERMAI ERROR:', error);

      return res.status(500).json({
        status: false,
        message: 'Gagal upload gambar ke Termai',
        error: error.message,
        statusCode: error.response?.status || null,
        termai: error.response?.data || null,
        headers: error.response?.headers || null
      });
    }

  } catch (error) {
    console.error('❌ Unhandled error:', error);
    return res.status(500).json({
      status: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}