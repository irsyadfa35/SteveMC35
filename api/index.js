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

  try {
    // Extract parameters from POST or GET
    let imageUrl, topText, bottomText;

    if (req.method === 'POST') {
      imageUrl = req.body?.imageUrl;
      topText = req.body?.topText || '';
      bottomText = req.body?.bottomText || '';
    } else {
      // GET request
      const { query } = req;
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

    // Download image
    let imageBuffer;
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024 // 10MB limit
      });
      imageBuffer = Buffer.from(response.data);
    } catch (error) {
      console.error('Download error:', error.message);
      return res.status(500).json({
        status: false,
        message: 'Gagal memuat gambar'
      });
    }

    // Process image with canvas
    let processedBuffer;
    try {
      const image = await loadImage(imageBuffer);
      const width = image.width;
      const height = image.height;

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Draw original image
      ctx.drawImage(image, 0, 0, width, height);

      // Function to wrap text
      function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        let lines = [];
        let currentLine = words[0];

        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const width = ctx.measureText(currentLine + ' ' + word).width;
          if (width < maxWidth) {
            currentLine += ' ' + word;
          } else {
            lines.push(currentLine);
            currentLine = word;
          }
        }
        lines.push(currentLine);
        return lines;
      }

      // Function to draw text with outline
      function drawTextWithOutline(ctx, text, x, y, fontSize, maxWidth) {
        const lineHeight = fontSize * 1.2;
        const lines = wrapText(ctx, text, x, y, maxWidth, lineHeight);
        
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        
        // Adjust font size if text too long
        let currentFontSize = fontSize;
        let currentLines = lines;
        let totalHeight = currentLines.length * lineHeight;
        
        // If text exceeds image boundaries, reduce font size
        while (totalHeight > height * 0.4 && currentFontSize > 10) {
          currentFontSize -= 2;
          const newLineHeight = currentFontSize * 1.2;
          ctx.font = `bold ${currentFontSize}px Arial`;
          currentLines = wrapText(ctx, text, x, y, maxWidth, newLineHeight);
          totalHeight = currentLines.length * newLineHeight;
        }

        // Draw each line
        const startY = y - (totalHeight / 2);
        currentLines.forEach((line, index) => {
          const lineY = startY + (index * (currentFontSize * 1.2));
          
          // Draw outline (black)
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 10;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          
          // Draw filled text (white)
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = 'white';
          ctx.font = `bold ${currentFontSize}px Arial`;
          
          // Draw black outline
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 3;
          ctx.shadowOffsetY = 3;
          ctx.fillText(line, x, lineY);
          
          // Draw white text on top
          ctx.shadowColor = 'transparent';
          ctx.fillStyle = 'white';
          ctx.fillText(line, x, lineY);
        });
        
        return currentLines.length;
      }

      const padding = 20;
      const maxWidth = width - (padding * 2);
      const defaultFontSize = Math.min(width / 15, 60);

      // Draw top text
      if (topText) {
        const topY = padding + 20;
        drawTextWithOutline(ctx, topText, width / 2, topY, defaultFontSize, maxWidth);
      }

      // Draw bottom text
      if (bottomText) {
        const bottomY = height - padding - 20;
        drawTextWithOutline(ctx, bottomText, width / 2, bottomY, defaultFontSize, maxWidth);
      }

      processedBuffer = canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Processing error:', error.message);
      return res.status(500).json({
        status: false,
        message: 'Gagal memproses gambar'
      });
    }

    // Upload to Termai
    let uploadResult;
    try {
      const formData = new FormData();
      formData.append('key', 'AIzaBj7z2z3xBjsk');
      
      // Detect file type
      const fileType = await fileTypeFromBuffer(processedBuffer);
      const mimeType = fileType ? fileType.mime : 'image/png';
      const extension = fileType ? fileType.ext : 'png';
      
      formData.append('file', processedBuffer, {
        filename: `edited-image.${extension}`,
        contentType: mimeType
      });

      const response = await axios.post('https://c.termai.cc/api/upload', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024
      });

      uploadResult = response.data;
    } catch (error) {
      console.error('Upload error:', error.message);
      return res.status(500).json({
        status: false,
        message: 'Gagal upload gambar ke Termai'
      });
    }

    // Return success response
    return res.status(200).json({
      status: true,
      message: 'Foto berhasil diedit dan diupload',
      data: {
        imageUrl: uploadResult.url || uploadResult.path || uploadResult
      }
    });

  } catch (error) {
    console.error('Unhandled error:', error.message);
    return res.status(500).json({
      status: false,
      message: 'Terjadi kesalahan pada server'
    });
  }
}