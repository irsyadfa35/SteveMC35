// api/index.js

import axios from 'axios';

export default async function handler(req, res) {

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

        const query = req.query || {};
        const body = req.method === 'POST'
            ? (req.body || {})
            : {};

        const fitur = query.fitur;

        if (fitur !== 'edit-foto') {
            return res.status(400).json({
                status: false,
                message: 'Gunakan fitur=edit-foto'
            });
        }

        const imageUrl =
            body.imageUrl ||
            query.imageUrl;

        const topText =
            body.topText ||
            query.topText ||
            '';

        const bottomText =
            body.bottomText ||
            query.bottomText ||
            '';

        if (!imageUrl) {
            return res.status(400).json({
                status: false,
                message: 'imageUrl wajib diisi'
            });
        }

        console.log('TEST API');
        console.log('Image URL:', imageUrl);
        console.log('Top:', topText);
        console.log('Bottom:', bottomText);

        // Test download saja
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });

        const buffer = Buffer.from(response.data);

        console.log(
            'Gambar berhasil didownload:',
            buffer.length
        );

        return res.status(200).json({
            status: true,
            message: 'API berjalan dan gambar berhasil didownload',
            data: {
                imageUrl,
                topText,
                bottomText,
                imageSize: buffer.length
            }
        });

    } catch (error) {

        console.error('ERROR:', error);

        return res.status(500).json({
            status: false,
            message: error?.message || 'Unknown error',
            name: error?.name || 'UnknownError',
            code: error?.code || null
        });
    }
}