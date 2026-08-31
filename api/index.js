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

  // TERMAI API Key - hardcoded as requested
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

    console.log(`Processing image: ${imageUrl}`);
    console.log(`Top text: "${topText}", Bottom text: "${bottomText}"`);

    // Step 2: Download image
    let imageBuffer;
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 10 * 1024 * 1024 // 10MB limit
      });
      imageBuffer = Buffer.from(response.data);
      console.log(`Image downloaded: ${imageBuffer.length} bytes`);
    } catch (error) {
      console.error('Download error:', error.message);
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
      console.log(`Image dimensions: ${width}x${height}`);

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
      console.log(`Image processed: ${processedBuffer.length} bytes`);
    } catch (error) {
      console.error('Canvas processing error:', error);
      return res.status(500).json({
        status: false,
        message: 'Gagal memproses gambar dengan Canvas',
        error: error.message,
        stack: error.stack
      });
    }

    // Step 5-6: Upload to Termai
    let uploadResult;
    try {
      // Detect file type
      let fileType = null;
      try {
        fileType = await fileTypeFromBuffer(processedBuffer);
      } catch (e) {
        // If file-type detection fails, default to PNG
      }
      
      const mimeType = fileType ? fileType.mime : 'image/png';
      const extension = fileType ? fileType.ext : 'png';

      const formData = new FormData();
      formData.append('file', processedBuffer, {
        filename: `edited-image.${extension}`,
        contentType: mimeType
      });

      console.log(`Uploading to Termai with key: ${TERMAI_KEY}`);
      
      const response = await axios.post(
        `https://c.termai.cc/api/upload?key=${TERMAI_KEY}`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
          },
          timeout: 120000,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      uploadResult = response.data;
      console.log('Termai response:', JSON.stringify(uploadResult));

      // Extract URL from various possible response structures
      let imageUrlResult = null;
      
      if (uploadResult && typeof uploadResult === 'object') {
        // Check different possible response structures
        if (uploadResult.url) {
          imageUrlResult = uploadResult.url;
        } else if (uploadResult.path) {
          imageUrlResult = uploadResult.path;
        } else if (uploadResult.data) {
          if (uploadResult.data.url) {
            imageUrlResult = uploadResult.data.url;
          } else if (uploadResult.data.path) {
            imageUrlResult = uploadResult.data.path;
          } else if (typeof uploadResult.data === 'string') {
            imageUrlResult = uploadResult.data;
          }
        } else if (typeof uploadResult === 'string') {
          imageUrlResult = uploadResult;
        }
      }

      // If no URL found, check if response itself is a URL string
      if (!imageUrlResult && typeof uploadResult === 'string') {
        imageUrlResult = uploadResult;
      }

      if (!imageUrlResult) {
        throw new Error(`Could not extract image URL from Termai response: ${JSON.stringify(uploadResult)}`);
      }

      // Return success response
      return res.status(200).json({
        status: true,
        message: 'Foto berhasil diedit dan diupload',
        data: {
          imageUrl: imageUrlResult
        }
      });

    } catch (error) {
      console.error('Upload error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });

      return res.status(500).json({
        status: false,
        message: 'Gagal upload gambar ke Termai',
        error: error.message,
        termai: error.response?.data || null,
        statusCode: error.response?.status || 500
      });
    }

  } catch (error) {
    console.error('Unhandled error:', error);
    return res.status(500).json({
      status: false,
      message: 'Terjadi kesalahan pada server',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}