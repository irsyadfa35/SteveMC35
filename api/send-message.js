// api/send-message.js
// Endpoint: https://domain.com/api/send-message

const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // ============================================================
    // CORS
    // ============================================================
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    // ============================================================
    // KONFIGURASI
    // ============================================================
    // Ganti dengan nomor WhatsApp Owner (format internasional tanpa +)
    const OWNER_NUMBER = '6281234567890'; // Contoh: 6281234567890
    
    // URL API WhatsApp (sesuaikan dengan bot WhatsApp Anda)
    const WHATSAPP_API_URL = 'https://your-wa-bot-url.com/send-message';
    // Atau jika menggunakan layanan seperti Fonnte, WAPi, dll
    // const WHATSAPP_API_URL = 'https://api.fonnte.com/send';
    // const API_KEY = 'your-api-key';

    // ============================================================
    // HANDLE GET - Tampilkan form sederhana atau status
    // ============================================================
    if (req.method === 'GET') {
        return res.status(200).json({
            status: true,
            message: 'API Send Message aktif',
            endpoint: '/api/send-message',
            method: 'POST',
            example: {
                name: 'John Doe',
                email: 'john@example.com',
                message: 'Halo, ini pesan dari website!'
            }
        });
    }

    // ============================================================
    // HANDLE POST - Terima pesan dari website
    // ============================================================
    if (req.method === 'POST') {
        try {
            const { name, email, message, subject } = req.body;

            // Validasi
            if (!message) {
                return res.status(400).json({
                    status: false,
                    message: 'Pesan tidak boleh kosong'
                });
            }

            // Format pesan untuk WhatsApp
            const waMessage = `
📩 *PESAN DARI WEBSITE*

👤 *Nama:* ${name || 'Tidak diketahui'}
📧 *Email:* ${email || 'Tidak diketahui'}
📋 *Subjek:* ${subject || 'Tidak ada'}
📝 *Pesan:*
${message}

⏰ *Dikirim:* ${new Date().toLocaleString('id-ID')}
🌐 *IP:* ${req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Tidak diketahui'}
            `.trim();

            console.log('📨 Pesan akan dikirim ke Owner:', waMessage);

            // ============================================================
            // KIRIM KE WHATSAPP (Pilih salah satu method di bawah)
            // ============================================================

            // ─── METHOD 1: Jika menggunakan Bot WhatsApp sendiri ──────
            /*
            const response = await fetch(WHATSAPP_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    number: OWNER_NUMBER,
                    message: waMessage
                })
            });

            if (!response.ok) {
                throw new Error(`WhatsApp API error: ${response.status}`);
            }

            const result = await response.json();
            */

            // ─── METHOD 2: Jika menggunakan Fonnte ─────────────────────
            /*
            const response = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: {
                    'Authorization': API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target: OWNER_NUMBER,
                    message: waMessage,
                    countryCode: '62',
                })
            });

            const result = await response.json();
            */

            // ─── METHOD 3: TESTING - Simulasi kirim (tanpa WA) ──────
            // Hanya untuk testing, pesan dicatat di console
            console.log('📨 [TESTING] Pesan untuk Owner:', waMessage);
            console.log('📨 [TESTING] Dikirim ke:', OWNER_NUMBER);

            // Simpan ke log file (opsional)
            // await fs.appendFile('messages.log', `[${new Date().toISOString()}] ${waMessage}\n\n`);

            // ============================================================
            // RESPONSE SUKSES
            // ============================================================
            return res.status(200).json({
                status: true,
                message: 'Pesan berhasil dikirim ke Owner',
                data: {
                    to: OWNER_NUMBER,
                    sentAt: new Date().toISOString(),
                    // result: result // Jika pakai WA API asli
                },
                // Untuk testing, tampilkan pesan yang dikirim
                debug: {
                    message: waMessage
                }
            });

        } catch (error) {
            console.error('❌ Error:', error);
            return res.status(500).json({
                status: false,
                message: 'Gagal mengirim pesan',
                error: error.message
            });
        }
    }

    // Method tidak diizinkan
    return res.status(405).json({
        status: false,
        message: 'Method tidak diizinkan. Gunakan POST'
    });
};