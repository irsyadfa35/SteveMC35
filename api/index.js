// api/index.js
// Endpoint: https://domain.com/api/index?fitur=hello

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

    // ============================================================
    // AMBIL PARAMETER
    // ============================================================
    const { fitur, ...params } = req.query;
    const body = req.method === 'POST' ? req.body : null;

    console.log(`📡 Request: ${req.method} /api?fitur=${fitur}`);
    console.log('📥 Query:', params);
    if (body) console.log('📥 Body:', body);

    // ============================================================
    // HANDLE FITUR
    // ============================================================
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
                        'send-message - Kirim pesan ke owner'
                    ],
                    timestamp: new Date().toISOString()
                });

            // ─── SEND MESSAGE ──────────────────────────────────────
            case 'send-message': {
                // Ambil data dari body (POST) atau query (GET)
                const name = body?.name || params.name || 'Tidak diketahui';
                const email = body?.email || params.email || 'Tidak diketahui';
                const pesan = body?.pesan || params.pesan || 'Tidak ada pesan';

                // Format pesan WhatsApp
                const waMessage = `
📩 *PESAN DARI WEBSITE*

👤 Nama: ${name}
📧 Email: ${email}
📝 Pesan: ${pesan}
⏰ Dikirim: ${new Date().toLocaleString('id-ID')}
🌐 IP: ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Tidak diketahui'}
                `.trim();

                console.log('📨 Pesan diterima:');
                console.log(waMessage);

                // ============================================================
                // RESPONSE - Data yang dikirim balik SAMA PERSIS dengan input
                // ============================================================
                return res.status(200).json({
                    status: true,
                    message: 'Data berhasil diterima API',
                    data: {
                        name: name,
                        email: email,
                        pesan: pesan
                    },
                    debug: {
                        method: req.method,
                        body: body,
                        waMessage: waMessage
                    }
                });
            }

            // ─── DEFAULT ────────────────────────────────────────────
            default:
                return res.status(404).json({
                    status: false,
                    message: `Fitur "${fitur}" tidak ditemukan`,
                    available_fitur: ['hello', 'ping', 'info', 'send-message'],
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