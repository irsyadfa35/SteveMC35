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

  // TERMAI API Key
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

      // Helper function to draw text with outline
      function drawTextWithOutline(ctx, text, x, y, maxWidth, maxHeight) {
        if (!text) return;

        let fontSize = Math.min(Math.min(width, height) / 8, 80);
        let lines = [];
        let lineHeight;
        let totalHeight;

        // Try to find optimal font size
        while (fontSize > 10) {
          lineHeight = fontSize * 1.3;
          ctx.font = `bold ${fontSize}px Arial`;
          
          lines = wrapText(ctx, text, x, y, maxWidth, lineHeight);
          totalHeight = lines.length * lineHeight;
          
          if (totalHeight <= maxHeight) {
            break;
          }
          fontSize -= 2;
        }

        // Final font setting
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Calculate starting Y position to center text vertically
        const startY = y - (totalHeight / 2);

        // Draw each line
        lines.forEach((line, index) => {
          const lineY = startY + (index * lineHeight);
          
          // Draw black outline (multiple offsets for better visibility)
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
          ctx.fillStyle = 'white';
          ctx.fillText(line, x, lineY);
          
          // Clear shadow and draw white text on top
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.fillStyle = 'white';
          ctx.fillText(line, x, lineY);
          
          // Draw black stroke for additional outline
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 3;
          ctx.strokeText(line, x, lineY);
        });

        return lines.length;
      }

      const padding = 30;
      const maxWidth = width - (padding * 2);
      const maxHeight = height * 0.35; // Max 35% of image height for text

      // Draw top text
      if (topText) {
        const topY = padding + 20;
        drawTextWithOutline(ctx, topText, width / 2, topY, maxWidth, maxHeight);
      }

      // Draw bottom text
      if (bottomText) {
        const bottomY = height - padding - 20;
        drawTextWithOutline(ctx, bottomText, width / 2, bottomY, maxWidth, maxHeight);
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