// api/index.js
export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    const { fitur, ...params } = req.query;
    const body = req.method === 'POST' ? req.body : null;

    console.log(`📡 Request: ${req.method} /api?fitur=${fitur}`);
    console.log('📥 Query:', params);
    if (body) console.log('📥 Body:', body);

    try {
        switch (fitur) {

            case 'send-message': {
                // AMBIL DATA DARI BODY (POST) atau QUERY (GET)
                // POST lebih aman untuk data dengan spasi
                const name = body?.name || params.name || 'Tidak diketahui';
                const email = body?.email || params.email || 'Tidak diketahui';
                const pesan = body?.pesan || params.pesan || 'Tidak ada pesan';

                // Decode URL jika berasal dari GET
                const decodedName = decodeURIComponent(name);
                const decodedEmail = decodeURIComponent(email);
                const decodedPesan = decodeURIComponent(pesan);

                const waMessage = `
📩 *PESAN DARI WEBSITE*

👤 Nama: ${decodedName}
📧 Email: ${decodedEmail}
📝 Pesan: ${decodedPesan}
⏰ Dikirim: ${new Date().toLocaleString('id-ID')}
🌐 IP: ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Tidak diketahui'}
                `.trim();

                console.log('📨 Pesan diterima:');
                console.log(waMessage);

                return res.status(200).json({
                    status: true,
                    message: 'Data berhasil diterima API',
                    data: {
                        name: decodedName,
                        email: decodedEmail,
                        pesan: decodedPesan
                    },
                    debug: {
                        method: req.method,
                        body: body,
                        waMessage: waMessage
                    }
                });
            }

            // ... fitur lainnya

            default:
                return res.status(404).json({
                    status: false,
                    message: `Fitur "${fitur}" tidak ditemukan`,
                    available_fitur: ['hello', 'ping', 'info', 'echo', 'send-message', 'status', 'user'],
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