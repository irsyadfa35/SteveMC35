// api/index.js
import axios from 'axios';
import { createCanvas, loadImage } from 'canvas';
import FormData from 'form-data';

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

    // ============================================================
    // PROCESS IMAGE WITH CANVAS
    // ============================================================
    let processedBuffer;

    try {
      const image = await loadImage(imageBuffer);

      const width = image.width;
      const height = image.height;

      console.log(`📐 Image: ${width}x${height}`);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Gambar gambar asli
      ctx.drawImage(image, 0, 0, width, height);

      // ============================================================
      // KONFIGURASI TEKS
      // ============================================================
      const FONT = 'Arial';
      const TEXT_COLOR = '#FFFFFF';
      const OUTLINE_COLOR = '#000000';

      const maxTextWidth = width * 0.90;
      const maxFontSize = Math.min(100, Math.max(30, width / 8));
      const minFontSize = 16;

      // ============================================================
      // WRAP TEXT
      // ============================================================
      function getTextLines(text, fontSize) {
        if (!text) return [];

        ctx.font = `bold ${fontSize}px ${FONT}`;

        const words = String(text).trim().split(/\s+/);

        const lines = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine
            ? `${currentLine} ${word}`
            : word;

          const textWidth = ctx.measureText(testLine).width;

          if (textWidth <= maxTextWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              lines.push(currentLine);
            }

            currentLine = word;
          }
        }

        if (currentLine) {
          lines.push(currentLine);
        }

        return lines;
      }

      // ============================================================
      // CARI FONT SIZE
      // ============================================================
      function calculateText(text) {
        if (!text) {
          return {
            lines: [],
            fontSize: maxFontSize
          };
        }

        let fontSize = maxFontSize;

        while (fontSize > minFontSize) {
          const lines = getTextLines(text, fontSize);

          const tooWide = lines.some(line => {
            ctx.font = `bold ${fontSize}px ${FONT}`;
            return ctx.measureText(line).width > maxTextWidth;
          });

          if (!tooWide) {
            return {
              lines,
              fontSize
            };
          }

          fontSize -= 2;
        }

        return {
          lines: getTextLines(text, minFontSize),
          fontSize: minFontSize
        };
      }

      // ============================================================
      // DRAW TEXT
      // ============================================================
      function drawText(text, position) {
        if (!text) return;

        const result = calculateText(text);

        const lines = result.lines;
        const fontSize = result.fontSize;

        if (!lines.length) return;

        ctx.font = `bold ${fontSize}px ${FONT}`;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;

        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;

        let centerY;

        if (position === 'top') {
          centerY = Math.max(
            totalHeight / 2 + 20,
            height * 0.12
          );
        } else {
          centerY = Math.min(
            height - totalHeight / 2 - 20,
            height * 0.88
          );
        }

        const startY =
          centerY -
          ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
          const y = startY + index * lineHeight;

          // ========================================================
          // OUTLINE HITAM
          // ========================================================
          ctx.strokeStyle = OUTLINE_COLOR;
          ctx.lineWidth = Math.max(4, fontSize * 0.08);

          ctx.strokeText(
            line,
            width / 2,
            y
          );

          // ========================================================
          // TEKS PUTIH
          // ========================================================
          ctx.fillStyle = TEXT_COLOR;

          ctx.fillText(
            line,
            width / 2,
            y
          );
        });

        console.log(
          `✏️ Text "${text}" | font=${fontSize}px | lines=${lines.length}`
        );
      }

      // ============================================================
      // TEKS ATAS
      // ============================================================
      drawText(topText, 'top');

      // ============================================================
      // TEKS BAWAH
      // ============================================================
      drawText(bottomText, 'bottom');

      // ============================================================
      // HASIL
      // ============================================================
      processedBuffer = canvas.toBuffer('image/png');

      console.log(
        `✅ Image processed: ${processedBuffer.length} bytes`
      );

    } catch (error) {
      console.error(
        '❌ Canvas processing error:',
        error
      );

      return res.status(500).json({
        status: false,
        message: 'Gagal memproses gambar dengan Canvas',
        error: error.message
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