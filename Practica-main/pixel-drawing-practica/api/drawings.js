// WARNING: This is not persistent on Vercel! The data will reset frequently.
let drawings = [];

export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).json(drawings);
  } else if (req.method === 'POST') {
    try {
      const drawing = req.body;
      drawing.id = Date.now().toString();
      drawings.push(drawing);
      res.status(201).json({ success: true, id: drawing.id });
    } catch (e) {
      res.status(400).json({ error: 'Invalid drawing data' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
} 