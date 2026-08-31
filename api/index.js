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

      // ============================================================
      // FUNGSI WRAP TEXT (SAMA DENGAN HTML PREVIEW)
      // ============================================================
      function wrapText(ctx, text, maxWidth, maxSize, minSize, fontFamily) {
        if (!text) return { lines: [], fontSize: maxSize };
        
        let size = maxSize;
        let lines = [];
        let success = false;
        
        while (size >= minSize) {
          ctx.font = `bold ${size}px ${fontFamily}`;
          const words = text.split(' ');
          lines = [];
          let currentLine = words[0] || '';
          
          for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth) {
              lines.push(currentLine);
              currentLine = words[i];
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine);
          
          const maxLineWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
          if (maxLineWidth <= maxWidth) {
            success = true;
            break;
          }
          size -= 2;
        }
        
        if (!success || lines.length === 0) {
          ctx.font = `bold ${minSize}px ${fontFamily}`;
          const words = text.split(' ');
          lines = [];
          let currentLine = words[0] || '';
          
          for (let i = 1; i < words.length; i++) {
            const testLine = currentLine + ' ' + words[i];
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth) {
              lines.push(currentLine);
              currentLine = words[i];
            } else {
              currentLine = testLine;
            }
          }
          lines.push(currentLine);
          return { lines, fontSize: minSize };
        }
        
        return { lines, fontSize: size };
      }

      // ============================================================
      // FUNGSI DRAW TEXT WITH OUTLINE (SAMA DENGAN HTML PREVIEW)
      // ============================================================
      function drawTextWithOutline(ctx, lines, y, width, height, fontSize, fontFamily, color, outline, outlineWidth) {
        if (lines.length === 0) return;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${fontSize}px ${fontFamily}`;

        const lineHeight = fontSize * 1.2;
        const outlineSteps = Math.max(1, Math.round(outlineWidth / 2));
        
        lines.forEach((line, index) => {
          const lineY = y + (index * lineHeight) + (lineHeight / 2);
          
          ctx.fillStyle = outline;
          ctx.lineWidth = outlineWidth;
          ctx.strokeStyle = outline;
          ctx.lineJoin = 'round';
          ctx.lineCap = 'round';
          
          // Multiple stroke for thicker outline
          for (let i = 0; i < outlineSteps; i++) {
            const offset = i * 0.5;
            ctx.strokeText(line, width / 2 + offset, lineY);
            ctx.strokeText(line, width / 2 - offset, lineY);
            ctx.strokeText(line, width / 2, lineY + offset);
            ctx.strokeText(line, width / 2, lineY - offset);
          }
          
          ctx.strokeText(line, width / 2, lineY);
          ctx.fillStyle = color;
          ctx.fillText(line, width / 2, lineY);
        });
      }

      // ============================================================
      // PARAMETER TEKS (SAMA DENGAN HTML PREVIEW)
      // ============================================================
      const maxTextWidth = width * 0.9;
      const fontFamily = 'Arial Black, Impact, sans-serif';
      const color = '#FFFFFF';
      const outline = '#000000';
      const outlineWidth = 4;
      const margin = 10;
      const maxSize = 100;
      const minSize = 16;

      // ============================================================
      // PROSES TEKS ATAS
      // ============================================================
      if (topText) {
        const topResult = wrapText(ctx, topText, maxTextWidth, maxSize, minSize, fontFamily);
        const topLines = topResult.lines;
        const topFontSize = topResult.fontSize;
        
        if (topLines.length > 0) {
          const topY = margin;
          drawTextWithOutline(
            ctx,
            topLines,
            topY,
            width,
            height,
            topFontSize,
            fontFamily,
            color,
            outline,
            outlineWidth
          );
        }
      }

      // ============================================================
      // PROSES TEKS BAWAH
      // ============================================================
      if (bottomText) {
        const bottomResult = wrapText(ctx, bottomText, maxTextWidth, maxSize, minSize, fontFamily);
        const bottomLines = bottomResult.lines;
        const bottomFontSize = bottomResult.fontSize;
        
        if (bottomLines.length > 0) {
          const bottomHeight = bottomLines.length * (bottomFontSize * 1.2);
          const bottomY = height - bottomHeight - margin;
          drawTextWithOutline(
            ctx,
            bottomLines,
            bottomY,
            width,
            height,
            bottomFontSize,
            fontFamily,
            color,
            outline,
            outlineWidth
          );
        }
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