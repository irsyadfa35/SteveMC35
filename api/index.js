// api/index.js
// Endpoint: https://domain.com/api/index?fitur=edit-foto

import { createCanvas, loadImage } from 'canvas';
import FormData from 'form-data';
import axios from 'axios';
import { fromBuffer } from 'file-type';

// ============================================================
// KONFIGURASI TERMAI
// ============================================================
const TERMAI_KEY = "AIzaBj7z2z3xBjsk";
const TERMAI_DOMAIN = "https://c.termai.cc";

// ============================================================
// FUNGSI UPLOAD KE TERMAI
// ============================================================
async function uploadTermai(buffer) {
    try {
        const { ext } = await fromBuffer(buffer);
        const form = new FormData();
        form.append("file", buffer, { filename: "file." + ext });
        
        const response = await axios.post(
            `${TERMAI_DOMAIN}/api/upload?key=${TERMAI_KEY}`,
            form,
            {
                headers: form.getHeaders(),
                timeout: 120000
            }
        );
        
        return response.data?.path || null;
    } catch (error) {
        console.error('❌ Upload Termai error:', error.message);
        return null;
    }
}

// ============================================================
// FUNGSI WRAP TEXT
// ============================================================
function wrapText(ctx, text, maxWidth, fontSize, fontFamily) {
    if (!text) return { lines: [], fontSize: fontSize };
    
    let size = fontSize;
    let lines = [];
    let success = false;
    
    while (size >= 12) {
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
        ctx.font = `bold 12px ${fontFamily}`;
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
        return { lines, fontSize: 12 };
    }
    
    return { lines, fontSize: size };
}

// ============================================================
// FUNGSI EDIT FOTO
// ============================================================
async function editFoto(params) {
    const {
        imageUrl,
        topText = '',
        bottomText = '',
        textColor = '#FFFFFF',
        outlineColor = '#000000',
        maxFontSize = 100,
        minFontSize = 16,
        outlineWidth = 4,
        margin = 10,
        maxWidthPercent = 90
    } = params;

    // Load gambar dari URL
    let image;
    try {
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        image = await loadImage(buffer);
    } catch (error) {
        throw new Error('Gagal memuat gambar dari URL: ' + error.message);
    }

    // Setup canvas
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext('2d');

    // Gambar original
    ctx.drawImage(image, 0, 0, image.width, image.height);

    const w = canvas.width;
    const h = canvas.height;
    const maxTextWidth = w * (maxWidthPercent / 100);
    const fontFamily = 'Arial Black, Impact, sans-serif';

    // ============================================================
    // PROSES TEKS ATAS
    // ============================================================
    const topResult = wrapText(ctx, topText, maxTextWidth, parseInt(maxFontSize), fontFamily);
    const topLines = topResult.lines;
    const topFontSize = topResult.fontSize;

    // ============================================================
    // PROSES TEKS BAWAH
    // ============================================================
    const bottomResult = wrapText(ctx, bottomText, maxTextWidth, parseInt(maxFontSize), fontFamily);
    const bottomLines = bottomResult.lines;
    const bottomFontSize = bottomResult.fontSize;

    // ============================================================
    // FUNGSI DRAW TEXT DENGAN OUTLINE
    // ============================================================
    function drawTextWithOutline(lines, y, size) {
        if (lines.length === 0) return;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${size}px ${fontFamily}`;

        const lineHeight = size * 1.2;
        const outlineW = parseInt(outlineWidth);
        const outlineSteps = Math.max(1, Math.round(outlineW / 2));
        
        lines.forEach((line, index) => {
            const lineY = y + (index * lineHeight) + (lineHeight / 2);
            
            // Outline
            ctx.fillStyle = outlineColor;
            ctx.lineWidth = outlineW;
            ctx.strokeStyle = outlineColor;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            
            for (let i = 0; i < outlineSteps; i++) {
                const offset = i * 0.5;
                ctx.strokeText(line, w / 2 + offset, lineY);
                ctx.strokeText(line, w / 2 - offset, lineY);
                ctx.strokeText(line, w / 2, lineY + offset);
                ctx.strokeText(line, w / 2, lineY - offset);
            }
            
            ctx.strokeText(line, w / 2, lineY);

            // Teks utama
            ctx.fillStyle = textColor;
            ctx.fillText(line, w / 2, lineY);
        });
    }

    // ============================================================
    // GAMBAR TEKS
    // ============================================================
    const marginPx = parseInt(margin);

    if (topLines.length > 0) {
        const topY = marginPx;
        drawTextWithOutline(topLines, topY, topFontSize);
    }

    if (bottomLines.length > 0) {
        const bottomHeight = bottomLines.length * (bottomFontSize * 1.2);
        const bottomY = h - bottomHeight - marginPx;
        drawTextWithOutline(bottomLines, bottomY, bottomFontSize);
    }

    // ============================================================
    // KONVERSI KE BUFFER & UPLOAD
    // ============================================================
    const buffer = canvas.toBuffer('image/png');
    const uploadedUrl = await uploadTermai(buffer);

    if (!uploadedUrl) {
        throw new Error('Gagal upload gambar ke Termai');
    }

    return {
        imageUrl: uploadedUrl,
        width: w,
        height: h,
        topText: topText,
        bottomText: bottomText,
        settings: {
            textColor,
            outlineColor,
            maxFontSize,
            minFontSize,
            outlineWidth,
            margin,
            maxWidthPercent
        }
    };
}

// ============================================================
// HANDLER UTAMA
// ============================================================
export default async function handler(req, res) {
    // ============================================================
    // CORS
    // ============================================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const { fitur } = req.query;
    const body = req.method === 'POST' ? req.body : null;

    try {
        switch (fitur) {

            // ─── HELLO ──────────────────────────────────────────────
            case 'hello':
                return res.status(200).json({
                    status: true,
                    message: 'Hello World',
                    timestamp: new Date().toISOString()
                });

            // ─── PING ───────────────────────────────────────────────
            case 'ping':
                return res.status(200).json({
                    status: true,
                    message: 'Pong!',
                    timestamp: new Date().toISOString()
                });

            // ─── INFO ──────────────────────────────────────────────
            case 'info':
                return res.status(200).json({
                    status: true,
                    name: 'SteveMC API',
                    version: '1.0.0',
                    endpoints: [
                        'hello - Say hello',
                        'ping - Ping pong',
                        'info - Info API',
                        'edit-foto - Edit foto dengan teks (GET/POST)'
                    ],
                    timestamp: new Date().toISOString()
                });

            // ─── EDIT FOTO ──────────────────────────────────────────
            case 'edit-foto': {
                // Ambil parameter dari query (GET) atau body (POST)
                const params = {
                    imageUrl: req.query.imageUrl || body?.imageUrl,
                    topText: req.query.topText || body?.topText || '',
                    bottomText: req.query.bottomText || body?.bottomText || '',
                    textColor: req.query.textColor || body?.textColor || '#FFFFFF',
                    outlineColor: req.query.outlineColor || body?.outlineColor || '#000000',
                    maxFontSize: req.query.maxFontSize || body?.maxFontSize || 100,
                    minFontSize: req.query.minFontSize || body?.minFontSize || 16,
                    outlineWidth: req.query.outlineWidth || body?.outlineWidth || 4,
                    margin: req.query.margin || body?.margin || 10,
                    maxWidthPercent: req.query.maxWidthPercent || body?.maxWidthPercent || 90
                };

                // Validasi imageUrl
                if (!params.imageUrl) {
                    return res.status(400).json({
                        status: false,
                        message: 'Parameter imageUrl wajib diisi',
                        example: {
                            imageUrl: 'https://c.termai.cc/i154/ErlE.jpg',
                            topText: 'SELAMAT ULANG TAHUN',
                            bottomText: '🎉🎂🎉',
                            textColor: '#FFFFFF',
                            outlineColor: '#000000',
                            maxFontSize: 100,
                            minFontSize: 16,
                            outlineWidth: 4,
                            margin: 10,
                            maxWidthPercent: 90
                        }
                    });
                }

                console.log('📸 Memproses edit foto...');
                console.log('📥 Parameter:', params);

                const result = await editFoto(params);

                console.log('✅ Foto berhasil diedit:', result.imageUrl);

                return res.status(200).json({
                    status: true,
                    message: 'Foto berhasil diedit dan diupload',
                    data: {
                        imageUrl: result.imageUrl,
                        width: result.width,
                        height: result.height,
                        top_text: result.topText,
                        bottom_text: result.bottomText,
                        settings: result.settings
                    },
                    timestamp: new Date().toISOString()
                });
            }

            // ─── DEFAULT ────────────────────────────────────────────
            default:
                return res.status(404).json({
                    status: false,
                    message: `Fitur "${fitur}" tidak ditemukan`,
                    available_fitur: ['hello', 'ping', 'info', 'edit-foto'],
                    timestamp: new Date().toISOString()
                });
        }

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            status: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}