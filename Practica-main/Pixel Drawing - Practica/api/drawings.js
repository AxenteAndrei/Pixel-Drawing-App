let drawings = [];
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.resolve(__dirname, 'drawings.json');

// Load from file if exists
if (fs.existsSync(DATA_FILE)) {
  try {
    drawings = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    drawings = [];
  }
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    res.status(200).json(drawings);
  } else if (req.method === 'POST') {
    try {
      const drawing = req.body;
      drawing.id = Date.now().toString();
      drawings.push(drawing);
      fs.writeFileSync(DATA_FILE, JSON.stringify(drawings, null, 2));
      res.status(201).json({ success: true, id: drawing.id });
    } catch (e) {
      res.status(400).json({ error: 'Invalid drawing data' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}; 