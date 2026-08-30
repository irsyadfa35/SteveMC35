// api/index.js - dengan penyimpanan Supabase

import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

    try {
        switch (fitur) {

            case 'send-message': {
                const name = body?.name || params.name || 'Tidak diketahui';
                const email = body?.email || params.email || 'Tidak diketahui';
                const pesan = body?.pesan || params.pesan || 'Tidak ada pesan';

                // SIMPAN KE SUPABASE
                const { data, error } = await supabase
                    .from('messages')
                    .insert([
                        { 
                            name: name, 
                            email: email, 
                            message: pesan,
                            created_at: new Date().toISOString()
                        }
                    ])
                    .select();

                if (error) {
                    console.error('❌ Supabase error:', error);
                }

                const waMessage = `
📩 *PESAN DARI WEBSITE*

👤 Nama: ${name}
📧 Email: ${email}
📝 Pesan: ${pesan}
⏰ Dikirim: ${new Date().toLocaleString('id-ID')}
🌐 IP: ${req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'Tidak diketahui'}
                `.trim();

                console.log('📨 Pesan diterima:', waMessage);

                return res.status(200).json({
                    status: true,
                    message: 'Data berhasil diterima API',
                    data: {
                        name: name,
                        email: email,
                        pesan: pesan,
                        saved: data ? true : false
                    },
                    debug: {
                        method: req.method,
                        body: body,
                        waMessage: waMessage
                    }
                });
            }

            // ─── GET MESSAGES ──────────────────────────────────────
            case 'get-messages': {
                const { data, error } = await supabase
                    .from('messages')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (error) {
                    return res.status(500).json({
                        status: false,
                        message: error.message
                    });
                }

                return res.status(200).json({
                    status: true,
                    data: data,
                    total: data.length
                });
            }

            // ... fitur lainnya

            default:
                return res.status(404).json({
                    status: false,
                    message: `Fitur "${fitur}" tidak ditemukan`,
                    available_fitur: ['hello', 'ping', 'info', 'send-message', 'get-messages', 'status'],
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