import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Fetch all drawings
    const { data, error } = await supabase
      .from('drawings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  } else if (req.method === 'POST') {
    // Insert a new drawing
    const drawing = req.body;
    const { data, error } = await supabase
      .from('drawings')
      .insert([{ data: drawing.canvasState }])
      .select();
    if (error) return res.status(400).json({ error: error.message });
    return res.status(201).json({ success: true, drawing: data[0] });
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 