export default async function handler(req, res) {
    const { fitur } = req.query

    try {
        switch (fitur) {

            case 'hello':
                return res.status(200).json({
                    status: true,
                    message: 'Hello World'
                })

            case 'ping':
                return res.status(200).json({
                    status: true,
                    message: 'Pong!'
                })

            case 'info':
                return res.status(200).json({
                    status: true,
                    name: 'SteveMC API',
                    version: '1.0.0'
                })

            default:
                return res.status(404).json({
                    status: false,
                    message: 'Fitur tidak ditemukan'
                })
        }

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: error.message
        })
    }
}