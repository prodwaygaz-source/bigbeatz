const { sql, ensureSchema } = require('../lib/db');
const { hashPassword, verifyPassword, makeCookie, clearCookie, getSession } = require('../lib/auth');
// ลูกค้า: GET=ดูสถานะ, POST ?action=register|login, DELETE=ออกจากระบบ
module.exports = async (req, res) => {
  try {
    await ensureSchema();
    if (req.method === 'GET') {
      const id = Number(getSession(req, 'uid'));
      const [u] = id ? await sql`SELECT id,email FROM users WHERE id=${id}` : [];
      return res.json({ user: u || null });
    }
    if (req.method === 'DELETE') { res.setHeader('Set-Cookie', clearCookie('uid')); return res.json({ ok: true }); }
    if (req.method !== 'POST') return res.status(405).end();
    if (!process.env.SESSION_SECRET) return res.status(500).json({ error: 'ยังไม่ได้ตั้ง SESSION_SECRET' });
    const email = String(req.body?.email || '').trim().toLowerCase(), password = String(req.body?.password || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'อีเมลไม่ถูกต้อง' });
    let user;
    if (req.query.action === 'register') {
      if (password.length < 8) return res.status(400).json({ error: 'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร' });
      const [r] = await sql`INSERT INTO users(email,hash) VALUES(${email},${hashPassword(password)}) ON CONFLICT DO NOTHING RETURNING id,email`;
      if (!r) return res.status(409).json({ error: 'อีเมลนี้สมัครไปแล้ว' });
      user = r;
    } else {
      const [u] = await sql`SELECT id,email,hash FROM users WHERE email=${email}`;
      if (!u || !verifyPassword(password, u.hash)) {
        await new Promise(r => setTimeout(r, 800));
        return res.status(401).json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
      }
      user = u;
    }
    res.setHeader('Set-Cookie', makeCookie('uid', user.id, 24 * 30));
    res.json({ user: { id: user.id, email: user.email } });
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
};
