// api/index.js

import axios from 'axios';
import { createCanvas, loadImage } from 'canvas';
import FormData from 'form-data';

const TERMAI_KEY = 'AIzaBj7z2z3xBjsk';
const TERMAI_UPLOAD = `https://c.termai.cc/api/upload?key=${TERMAI_KEY}`;

export default async function handler(req, res) {

    // ================================
    // CORS
    // ================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS'
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Accept'
    );

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    try {

        // ================================
        // AMBIL DATA
        // ================================
        const query = req.query || {};
        const body = req.method === 'POST' ? (req.body || {}) : {};

        if (query.fitur !== 'edit-foto' && !body.imageUrl) {
            return res.status(400).json({
                status: false,
                message: 'Gunakan fitur=edit-foto'
            });
        }

        const imageUrl =
            body.imageUrl ||
            query.imageUrl;

        const topText =
            body.topText ??
            query.topText ??
            '';

        const bottomText =
            body.bottomText ??
            query.bottomText ??
            '';

        // ================================
        // VALIDASI
        // ================================
        if (!imageUrl) {
            return res.status(400).json({
                status: false,
                message: 'Parameter imageUrl wajib diisi'
            });
        }

        if (!topText && !bottomText) {
            return res.status(400).json({
                status: false,
                message: 'topText atau bottomText wajib diisi'
            });
        }

        console.log('📸 EDIT FOTO');
        console.log('Image:', imageUrl);
        console.log('Top:', topText);
        console.log('Bottom:', bottomText);

        // ================================
        // DOWNLOAD GAMBAR
        // ================================
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            maxContentLength: 15 * 1024 * 1024
        });

        const imageBuffer = Buffer.from(imageResponse.data);

        console.log(
            '✅ Gambar berhasil didownload:',
            imageBuffer.length,
            'bytes'
        );

        // ================================
        // LOAD GAMBAR
        // ================================
        const image = await loadImage(imageBuffer);

        const width = image.width;
        const height = image.height;

        console.log(`📐 Ukuran: ${width}x${height}`);

        // ================================
        // CANVAS
        // ================================
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(
            image,
            0,
            0,
            width,
            height
        );

        // ================================
        // PENGATURAN TEXT
        // ================================
        const maxWidth = width * 0.9;

        function getFontSize(text) {

            let size = Math.min(
                Math.floor(width / 8),
                100
            );

            ctx.font = `bold ${size}px Arial`;

            while (
                ctx.measureText(text).width > maxWidth &&
                size > 20
            ) {
                size -= 2;
                ctx.font = `bold ${size}px Arial`;
            }

            return size;
        }

        function drawText(text, y) {

            if (!text) return;

            const fontSize = getFontSize(text);

            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Outline
            ctx.lineWidth = Math.max(
                4,
                Math.floor(fontSize / 12)
            );

            ctx.strokeStyle = '#000000';
            ctx.fillStyle = '#FFFFFF';
            ctx.lineJoin = 'round';

            ctx.strokeText(
                text,
                width / 2,
                y
            );

            ctx.fillText(
                text,
                width / 2,
                y
            );
        }

        // ================================
        // TEXT ATAS
        // ================================
        if (topText) {

            drawText(
                topText,
                Math.max(50, height * 0.12)
            );
        }

        // ================================
        // TEXT BAWAH
        // ================================
        if (bottomText) {

            drawText(
                bottomText,
                Math.min(
                    height - 50,
                    height * 0.88
                )
            );
        }

        // ================================
        // HASIL PNG
        // ================================
        const outputBuffer =
            canvas.toBuffer('image/png');

        console.log(
            '✅ Canvas berhasil dibuat:',
            outputBuffer.length,
            'bytes'
        );

        // ================================
        // UPLOAD TERMAI
        // ================================
        const form = new FormData();

        form.append(
            'file',
            outputBuffer,
            {
                filename: 'stevemc-edited.png',
                contentType: 'image/png'
            }
        );

        console.log('📤 Upload ke Termai...');

        const uploadResponse = await axios.post(
            TERMAI_UPLOAD,
            form,
            {
                headers: {
                    ...form.getHeaders()
                },
                timeout: 60000,
                maxContentLength: 20 * 1024 * 1024,
                maxBodyLength: 20 * 1024 * 1024
            }
        );

        console.log(
            '📥 Response Termai:',
            uploadResponse.data
        );

        const result = uploadResponse.data;

        // ================================
        // CARI URL HASIL
        // ================================
        const resultUrl =
            result?.url ||
            result?.path ||
            result?.data?.url ||
            result?.data?.path;

        if (!resultUrl) {

            console.error(
                '❌ Termai tidak memberikan URL:',
                result
            );

            return res.status(500).json({
                status: false,
                message: 'Upload berhasil tetapi URL gambar tidak ditemukan',
                termai: result
            });
        }

        // ================================
        // RESPONSE
        // ================================
        return res.status(200).json({
            status: true,
            message: 'Foto berhasil diedit dan diupload',
            data: {
                imageUrl: resultUrl,
                width,
                height,
                topText,
                bottomText
            }
        });

    } catch (error) {

        console.error(
            '❌ ERROR:',
            error
        );

        return res.status(500).json({
            status: false,
            message: error.message || 'Internal Server Error'
        });
    }
}