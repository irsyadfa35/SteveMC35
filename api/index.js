export default async function handler(req, res) {
    const { fitur } = req.query;

    try {

        switch (fitur) {

            case 'ping':
                return res.status(200).json({
                    status: true,
                    message: 'Pong!'
                });

            case 'test-canvas':

                try {
                    const canvasModule = await import('canvas');

                    return res.status(200).json({
                        status: true,
                        message: 'Canvas berhasil dimuat',
                        exports: Object.keys(canvasModule)
                    });

                } catch (error) {

                    return res.status(500).json({
                        status: false,
                        message: 'Canvas gagal dimuat',
                        error: error.message,
                        stack: error.stack
                    });
                }

            default:
                return res.status(404).json({
                    status: false,
                    message: 'Fitur tidak ditemukan'
                });
        }

    } catch (error) {

        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
}