const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  const filePath = path.join(process.cwd(), 'datos_finca.json');

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(filePath)) {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return res.status(200).send(fileContent);
      }
      return res.status(200).json({ ok: false, empty: true });
    } catch (err) {
      return res.status(500).json({ error: 'Error reading data file' });
    }
  }

  if (req.method === 'POST') {
    // In serverless, storage is ephemeral, respond 200 OK
    return res.status(200).json({ ok: true, message: 'Received data' });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};
