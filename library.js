const { sql, ensureSchema } = require('../lib/db');
const { getSession } = require('../lib/auth');
// คลังบีทที่ลูกค้าซื้อแล้ว (ดาวน์โหลดซ้ำได้ทุกเมื่อ)
module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const uid = Number(getSession(req, 'uid'));
    if (!uid) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
    res.json(await sql`SELECT id,title,audio FROM beats WHERE id IN (SELECT jsonb_array_elements_text(beat_ids)::int FROM orders WHERE user_id=${uid} AND status='paid') ORDER BY id DESC`);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};
