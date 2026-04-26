import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const connectedUsers = new Map<number, WebSocket>();

async function sendVerificationEmail(email: string, _name: string, token: string) {
  const link = `http://localhost:8000/api/auth/verify?token=${token}`;
  console.log(`\n EMAIL to ${email}\nLink: ${link}\n`);
  //todo
}

const client = new Client({ user: "root", database: "polyearth", hostname: "db", password: "root", port: 5432 });

async function connectWithRetry() {
  while (true) {
    try {
      await client.connect();
      console.log("Connecté à PostgreSQL");
      const migrations = [
        `CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, item_id INTEGER REFERENCES items(id), sender_id INTEGER REFERENCES users(id), receiver_id INTEGER REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'available'`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'offer'`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS quality VARCHAR(50) DEFAULT 'good'`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS available_from DATE`,
        `ALTER TABLE items ADD COLUMN IF NOT EXISTS available_until DATE`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS school VARCHAR(255) DEFAULT 'Polytech Montpellier'`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(2,1) DEFAULT 3.0`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS transaction_count INTEGER DEFAULT 0`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false`,
        `ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id)`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'text'`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS loan_id INTEGER`,
        `ALTER TABLE messages ADD COLUMN IF NOT EXISTS meta TEXT`,
        `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS end_requested_by INTEGER`,
        `UPDATE items SET status='available' WHERE status IS NULL`,
        `UPDATE items SET quality='good' WHERE quality IS NULL`,
        `UPDATE users SET rating=3.0 WHERE rating IS NULL`,
        `UPDATE users SET transaction_count=0 WHERE transaction_count IS NULL`,
        `UPDATE users SET is_verified=true WHERE is_verified IS NULL`,
        `UPDATE messages SET is_read=false WHERE is_read IS NULL`,
        `UPDATE messages SET type='text' WHERE type IS NULL`,
      ];
      for (const q of migrations) {
        try { await client.queryObject(q); }
        catch (e) { if (!e.message?.includes("already exists")) console.warn("Migration:", e.message); }
      }
      console.log("✅ Migrations OK");
      break;
    } catch (err) {
      console.error("❌ DB retry in 5s...", err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

await connectWithRetry();
const router = new Router();

// --- WEBSOCKET ---
router.get("/ws/:userId", (ctx) => {
  if (!ctx.isUpgradable) ctx.throw(400, "Not upgradable");
  const userId = parseInt(ctx.params.userId);
  const socket = ctx.upgrade();
  socket.onopen = () => { connectedUsers.set(userId, socket); };
  socket.onclose = () => { connectedUsers.delete(userId); };
  socket.onerror = (e) => console.error("WS Error:", e);
});

// --- AUTH ---
router.post("/api/auth/register", async (ctx) => {
  try {
    const { name, email, password } = await ctx.request.body({ type: "json" }).value;
    const hashed = await bcrypt.hash(password);
    const token = crypto.randomUUID();
    await client.queryObject(
      "INSERT INTO users (name, email, password, verification_token, is_verified) VALUES ($1,$2,$3,$4,false)",
      [name, email, hashed, token]
    );
    await sendVerificationEmail(email, name, token);
    ctx.response.body = { message: "Compte créé." };
  } catch { ctx.response.status = 400; ctx.response.body = { message: "Erreur inscription." }; }
});

router.post("/api/auth/login", async (ctx) => {
  const { email, password } = await ctx.request.body({ type: "json" }).value;
  const r = await client.queryObject("SELECT * FROM users WHERE email=$1", [email]);
  const user = r.rows[0] as any;
  if (user && await bcrypt.compare(password, user.password)) {
    if (!user.is_verified) { ctx.response.status = 403; return; }
    ctx.response.body = { id: user.id, name: user.name, email: user.email, school: user.school, rating: user.rating, transaction_count: user.transaction_count };
  } else ctx.response.status = 401;
});

router.get("/api/auth/verify", async (ctx) => {
  const token = ctx.request.url.searchParams.get("token");
  await client.queryObject("UPDATE users SET is_verified=true, verification_token=null WHERE verification_token=$1", [token]);
  ctx.response.redirect("http://localhost:3000/login?verified=true");
});

// --- USERS ---
router.patch("/api/users/:id", async (ctx) => {
  try {
    const { name, email, school } = await ctx.request.body({ type: "json" }).value;
    const r = await client.queryObject(
      "UPDATE users SET name=COALESCE($1,name), email=COALESCE($2,email), school=COALESCE($3,school) WHERE id=$4 RETURNING id,name,email,school,rating,transaction_count",
      [name, email, school, ctx.params.id]
    );
    ctx.response.body = r.rows[0];
  } catch { ctx.response.status = 400; ctx.response.body = { message: "Erreur mise à jour." }; }
});

// --- ITEMS ---
router.get("/api/items", async (ctx) => {
  const category = ctx.request.url.searchParams.get("category");
  const search = ctx.request.url.searchParams.get("search");
  const type = ctx.request.url.searchParams.get("type") || "offer";
  const ownerId = ctx.request.url.searchParams.get("owner_id");

  let query = `SELECT i.*, u.name as owner_name, u.rating as owner_rating, u.transaction_count as owner_transaction_count FROM items i JOIN users u ON i.owner_id=u.id WHERE i.status != 'deleted'`;
  const params: unknown[] = [];

  if (ownerId) {
    params.push(parseInt(ownerId));
    query += ` AND i.owner_id=$${params.length}`;
  } else {
    query += ` AND i.status='available'`;
    params.push(type);
    query += ` AND i.type=$${params.length}`;
    if (category && category !== "all") { params.push(category); query += ` AND i.category=$${params.length}`; }
    if (search) { params.push(`%${search}%`); query += ` AND (i.name ILIKE $${params.length} OR i.description ILIKE $${params.length})`; }
  }
  
  query += " ORDER BY i.id DESC";
  ctx.response.body = (await client.queryObject(query, params)).rows;
});

router.post("/api/items", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json", limit: "10mb" }).value;
    const userId = ctx.request.headers.get("X-Sharer-User-Id");
    const r = await client.queryObject(
      "INSERT INTO items (name,description,owner_id,category,quality,photo_url,available_from,available_until,type) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [body.name, body.description, parseInt(userId!), body.category, body.quality || "good", body.photo_url || null, body.available_from || null, body.available_until || null, body.type || 'offer']
    );
    ctx.response.body = r.rows[0];
  } catch (e) { console.error(e); ctx.response.status = 500; ctx.response.body = { message: "Erreur création annonce." }; }
});

router.get("/api/items/:id", async (ctx) => {
  const r = await client.queryObject(
    `SELECT i.*, u.name as owner_name, u.email as owner_email, u.rating as owner_rating, u.transaction_count as owner_transaction_count FROM items i JOIN users u ON i.owner_id=u.id WHERE i.id=$1 AND i.status != 'deleted'`,
    [ctx.params.id]
  );
  if (!r.rows[0]) {
    ctx.response.status = 404;
    ctx.response.body = { message: "Item non trouvé." };
    return;
  }
  ctx.response.body = r.rows[0];
});

router.patch("/api/items/:id/status", async (ctx) => {
  try {
    const { status } = await ctx.request.body({ type: "json" }).value;
    const userId = ctx.request.headers.get("X-Sharer-User-Id");
    // Verify ownership
    const itemRes = await client.queryObject("SELECT owner_id FROM items WHERE id=$1", [ctx.params.id]);
    if (itemRes.rows.length === 0) { ctx.response.status = 404; return; }
    if ((itemRes.rows[0] as any).owner_id !== parseInt(userId!)) { ctx.response.status = 403; return; }

    await client.queryObject("UPDATE items SET status=$1 WHERE id=$2", [status, ctx.params.id]);
    ctx.response.body = { success: true };
  } catch (e) { console.error(e); ctx.response.status = 500; }
});

router.delete("/api/items/:id", async (ctx) => {
  const userId = ctx.request.headers.get("X-Sharer-User-Id");
  try {
    const itemRes = await client.queryObject("SELECT id, status FROM items WHERE id=$1 AND owner_id=$2", [ctx.params.id, userId]);
    if (itemRes.rows.length === 0) {
      ctx.response.status = 403;
      ctx.response.body = { message: "Vous n'avez pas l'autorisation de supprimer cet objet." };
      return;
    }
    
    // Soft delete: change status to 'deleted'
    await client.queryObject("UPDATE items SET status='deleted' WHERE id=$1", [ctx.params.id]);
    
    // Annuler toutes les transactions en cours (en attente ou acceptées) pour cet objet
    await client.queryObject("UPDATE transactions SET status='rejected' WHERE item_id=$1 AND status IN ('pending', 'accepted')", [ctx.params.id]);

    ctx.response.body = { message: "Annonce supprimée." };
  } catch (e) { console.error(e); ctx.response.status = 500; ctx.response.body = { message: "Erreur suppression." }; }
});

// --- LOAN REQUESTS ---
router.post("/api/items/:id/reserve", async (ctx) => {
  try {
    const { borrower_id, start_date, end_date } = await ctx.request.body({ type: "json" }).value;
    const itemRes = await client.queryObject("SELECT owner_id, status FROM items WHERE id=$1", [ctx.params.id]);
    const item = itemRes.rows[0] as any;
    if (!item) { ctx.response.status = 404; ctx.response.body = { message: "Objet introuvable." }; return; }
    if (item.status === 'deleted') { ctx.response.status = 410; ctx.response.body = { message: "Cet objet a été supprimé." }; return; }
    if (item.owner_id === borrower_id) { ctx.response.status = 403; ctx.response.body = { message: "Vous ne pouvez pas emprunter votre propre objet." }; return; }

    const existing = await client.queryObject(
      "SELECT id FROM transactions WHERE item_id=$1 AND borrower_id=$2 AND status IN ('pending','accepted')", [ctx.params.id, borrower_id]
    );
    if (existing.rows.length > 0) { ctx.response.status = 409; ctx.response.body = { message: "Vous avez déjà une demande en cours pour cet objet." }; return; }

    const txRes = await client.queryObject(
      "INSERT INTO transactions (item_id,borrower_id,owner_id,start_date,end_date,status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *",
      [ctx.params.id, borrower_id, item.owner_id, start_date || null, end_date || null]
    );
    const newTx = txRes.rows[0] as any;

    const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
    const msgContent = start_date
      ? `📅 Demande de prêt du ${fmt(start_date)} au ${fmt(end_date)}`
      : "📅 Demande de prêt";
    const meta = JSON.stringify({ start_date: start_date || null, end_date: end_date || null });

    await client.queryObject(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id,meta) VALUES ($1,$2,$3,$4,'loan_request',$5,$6)",
      [ctx.params.id, borrower_id, item.owner_id, msgContent, newTx.id, meta]
    );

    const ownerSocket = connectedUsers.get(item.owner_id);
    if (ownerSocket) ownerSocket.send(JSON.stringify({ type: "LOAN_REQUEST", data: { item_id: ctx.params.id } }));

    ctx.response.body = newTx;
  } catch (e) { console.error(e); ctx.response.status = 500; ctx.response.body = { message: "Erreur." }; }
});

router.post("/api/items/:id/propose", async (ctx) => {
  try {
    const { lender_id, borrower_id, item_name, item_desc, start_date, end_date } = await ctx.request.body({ type: "json" }).value;
    
    // Create transaction
    const txRes = await client.queryObject(
      "INSERT INTO transactions (item_id,borrower_id,owner_id,start_date,end_date,status) VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *",
      [ctx.params.id, borrower_id, lender_id, start_date || null, end_date || null]
    );

    const meta = JSON.stringify({ start_date: start_date || null, end_date: end_date || null, item_name, item_desc });
    await client.queryObject(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id,meta) VALUES ($1,$2,$3,$4,'loan_request',$5,$6)",
      [ctx.params.id, lender_id, borrower_id, msgContent, (txRes.rows[0] as any).id, meta]
    );

    const borrowerSocket = connectedUsers.get(borrower_id);
    if (borrowerSocket) borrowerSocket.send(JSON.stringify({ type: "LOAN_REQUEST", data: { item_id: ctx.params.id } }));

    ctx.response.body = { message: "Proposition envoyée.", loan_id: (txRes.rows[0] as any).id };
  } catch (e) { console.error(e); ctx.response.status = 500; }
});

router.get("/api/loans/user/:userId", async (ctx) => {
  const r = await client.queryObject(
    `SELECT t.*, i.name as item_name, i.photo_url as item_photo, i.status as item_status, ub.name as borrower_name, uo.name as owner_name
     FROM transactions t JOIN items i ON t.item_id=i.id JOIN users ub ON t.borrower_id=ub.id JOIN users uo ON t.owner_id=uo.id
     WHERE (t.borrower_id=$1 OR t.owner_id=$1) ORDER BY t.created_at DESC`,
    [ctx.params.userId]
  );
  ctx.response.body = r.rows;
});

router.patch("/api/loans/:id", async (ctx) => {
  try {
    const body = await ctx.request.body({ type: "json" }).value;
    const { status, requester_id } = body;
    const txRes0 = await client.queryObject("SELECT * FROM transactions WHERE id=$1", [ctx.params.id]);
    const tx = txRes0.rows[0] as any;
    if (!tx) { ctx.response.status = 404; return; }

    const otherId = tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id;

    if (status === "accepted") {
      await client.queryObject("UPDATE transactions SET status='accepted' WHERE id=$1", [ctx.params.id]);
      await client.queryObject("UPDATE items SET status='reserved' WHERE id=$1", [tx.item_id]);
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'loan_response',$5)",
        [tx.item_id, requester_id, otherId, "✅ Prêt accepté ! Coordonnez la remise de l'objet.", tx.id]
      );
      await client.queryObject("UPDATE users SET transaction_count=transaction_count+1 WHERE id=$1 OR id=$2", [tx.owner_id, tx.borrower_id]);
      const s = connectedUsers.get(otherId);
      if (s) s.send(JSON.stringify({ type: "LOAN_ACCEPTED", data: { item_id: tx.item_id } }));
    } else if (status === "rejected") {
      await client.queryObject("UPDATE transactions SET status='rejected' WHERE id=$1", [ctx.params.id]);
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'loan_response',$5)",
        [tx.item_id, requester_id, otherId, "❌ Demande de prêt refusée.", tx.id]
      );
      const s = connectedUsers.get(otherId);
      if (s) s.send(JSON.stringify({ type: "LOAN_REJECTED", data: { item_id: tx.item_id } }));
    } else if (status === "request_end") {
      // First party requests end — store who asked
      await client.queryObject("UPDATE transactions SET end_requested_by=$1 WHERE id=$2", [requester_id, ctx.params.id]);
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'end_request',$5)",
        [tx.item_id, requester_id, otherId, "🏁 Demande de fin de prêt — l'objet a-t-il bien été rendu ?", tx.id]
      );
      const s = connectedUsers.get(otherId);
      if (s) s.send(JSON.stringify({ type: "NEW_MESSAGE", data: { item_id: tx.item_id, sender_name: "un utilisateur" } }));
    } else if (status === "completed") {
      // Second party confirms — both agree
      await client.queryObject("UPDATE transactions SET status='completed', end_requested_by=NULL WHERE id=$1", [ctx.params.id]);
      // User requested that finished loans stay hidden from announcements. 
      // We'll set it to 'borrowed' or keep it as 'reserved' to signify it's not 'available' anymore.
      await client.queryObject("UPDATE items SET status='borrowed' WHERE id=$1", [tx.item_id]);
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,'✅ Prêt terminé avec succès. Merci !','system',$4)",
        [tx.item_id, requester_id, otherId, tx.id]
      );
      const s = connectedUsers.get(otherId);
      if (s) s.send(JSON.stringify({ type: "DISCUSSION_ENDED", data: { item_id: tx.item_id } }));
    }
    ctx.response.body = { success: true };
  } catch (e) { console.error(e); ctx.response.status = 500; ctx.response.body = { message: "Erreur." }; }
});

// Overdue loans
router.get("/api/loans/overdue/:userId", async (ctx) => {
  const today = new Date().toISOString().split('T')[0];
  const r = await client.queryObject(
    `SELECT t.*, i.name as item_name, ub.name as borrower_name, uo.name as owner_name
     FROM transactions t JOIN items i ON t.item_id=i.id JOIN users ub ON t.borrower_id=ub.id JOIN users uo ON t.owner_id=uo.id
     WHERE (t.borrower_id=$1 OR t.owner_id=$1) AND t.status='accepted' AND t.end_date IS NOT NULL AND t.end_date < $2
     ORDER BY t.end_date ASC`,
    [ctx.params.userId, today]
  );
  ctx.response.body = r.rows;
});

// Extension request
router.post("/api/loans/:id/extend", async (ctx) => {
  try {
    const { new_end_date, requester_id } = await ctx.request.body({ type: "json" }).value;
    const txRes = await client.queryObject("SELECT * FROM transactions WHERE id=$1", [ctx.params.id]);
    const tx = txRes.rows[0] as any;
    if (!tx) { ctx.response.status = 404; return; }
    const otherId = tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id;
    const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
    const meta = JSON.stringify({ new_end_date });
    await client.queryObject(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id,meta) VALUES ($1,$2,$3,$4,'extension_request',$5,$6)",
      [tx.item_id, requester_id, otherId, `📅 Extension de prêt demandée jusqu'au ${fmt(new_end_date)}`, tx.id, meta]
    );
    const s = connectedUsers.get(otherId);
    if (s) s.send(JSON.stringify({ type: "NEW_MESSAGE", data: { item_id: tx.item_id, sender_name: "un utilisateur" } }));
    ctx.response.body = { success: true };
  } catch (e) { console.error(e); ctx.response.status = 500; }
});

// Accept/reject extension
router.patch("/api/loans/:id/extend", async (ctx) => {
  try {
    const { accepted, new_end_date, requester_id } = await ctx.request.body({ type: "json" }).value;
    const txRes = await client.queryObject("SELECT * FROM transactions WHERE id=$1", [ctx.params.id]);
    const tx = txRes.rows[0] as any;
    if (!tx) { ctx.response.status = 404; return; }
    const otherId = tx.owner_id === requester_id ? tx.borrower_id : tx.owner_id;
    const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR");
    if (accepted) {
      await client.queryObject("UPDATE transactions SET end_date=$1 WHERE id=$2", [new_end_date, ctx.params.id]);
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,$4,'system',$5)",
        [tx.item_id, requester_id, otherId, `✅ Extension acceptée jusqu'au ${fmt(new_end_date)}`, tx.id]
      );
    } else {
      await client.queryObject(
        "INSERT INTO messages (item_id,sender_id,receiver_id,content,type,loan_id) VALUES ($1,$2,$3,'❌ Extension refusée.','system',$4)",
        [tx.item_id, requester_id, otherId, tx.id]
      );
    }
    const s = connectedUsers.get(otherId);
    if (s) s.send(JSON.stringify({ type: "NEW_MESSAGE", data: { item_id: tx.item_id, sender_name: "un utilisateur" } }));
    ctx.response.body = { success: true };
  } catch (e) { console.error(e); ctx.response.status = 500; }
});

// --- MESSAGES ---
router.get("/api/messages/:userId", async (ctx) => {
  const r = await client.queryObject(
    `SELECT m.*, 
            u1.name as sender_name, 
            u2.name as receiver_name, 
            i.name as item_name, 
            i.photo_url as item_photo,
            i.owner_id as item_owner_id
     FROM messages m 
     JOIN users u1 ON m.sender_id=u1.id 
     JOIN users u2 ON m.receiver_id=u2.id
     JOIN items i ON m.item_id=i.id
     WHERE (m.sender_id=$1 OR m.receiver_id=$1) AND i.status NOT IN ('deleted', 'borrowed') 
     ORDER BY m.created_at ASC`,
    [ctx.params.userId]
  );
  ctx.response.body = r.rows;
});

router.patch("/api/messages/:id/read", async (ctx) => {
  try {
    await client.queryObject("UPDATE messages SET is_read=true, read_at=CURRENT_TIMESTAMP WHERE id=$1", [ctx.params.id]);
    ctx.response.body = { success: true };
  } catch { ctx.response.status = 500; }
});

router.post("/api/messages", async (ctx) => {
  try {
    const { item_id, sender_id, receiver_id, content } = await ctx.request.body({ type: "json" }).value;
    
    // Check if item still exists
    const itemRes = await client.queryObject("SELECT id, status FROM items WHERE id=$1", [item_id]);
    if (itemRes.rows.length === 0) {
      ctx.response.status = 404;
      ctx.response.body = { message: "Cet objet n'existe plus. La discussion est fermée." };
      return;
    }
    const item = itemRes.rows[0] as any;
    if (item.status === 'deleted') {
      ctx.response.status = 410;
      ctx.response.body = { message: "Cet objet a été supprimé. La discussion est fermée." };
      return;
    }

    await client.queryObject(
      "INSERT INTO messages (item_id,sender_id,receiver_id,content) VALUES ($1,$2,$3,$4)",
      [item_id, sender_id, receiver_id, content]
    );
    const receiverSocket = connectedUsers.get(receiver_id);
    if (receiverSocket) {
      const sRes = await client.queryObject("SELECT name FROM users WHERE id=$1", [sender_id]);
      const senderName = (sRes.rows[0] as any).name;
      receiverSocket.send(JSON.stringify({ type: "NEW_MESSAGE", data: { item_id, sender_id, content, sender_name: senderName } }));
    }
    ctx.response.body = { message: "Envoyé." };
  } catch (e) { console.error(e); ctx.response.status = 500; }
});

// --- MARK ALL MESSAGES READ FOR ITEM/USER ---
router.post("/api/messages/read-all", async (ctx) => {
  try {
    const { item_id, user_id } = await ctx.request.body({ type: "json" }).value;
    await client.queryObject(
      "UPDATE messages SET is_read=true, read_at=CURRENT_TIMESTAMP WHERE item_id=$1 AND receiver_id=$2 AND is_read=false",
      [item_id, user_id]
    );
    ctx.response.body = { success: true };
  } catch { ctx.response.status = 500; }
});

router.post("/api/messages/end-discussion", async (ctx) => {
  try {
    const { item_id, user_id } = await ctx.request.body({ type: "json" }).value;
    // To 'end' a discussion for a user, we can delete the messages where they are sender or receiver for this item.
    // A simpler approach to hide it from both without deleting the actual history is to delete it if they both "end" it,
    // but deleting messages completely for that item is what we will do for simplicity.
    await client.queryObject(
      "DELETE FROM messages WHERE item_id=$1 AND (sender_id=$2 OR receiver_id=$2)",
      [item_id, user_id]
    );
    ctx.response.body = { success: true };
  } catch { ctx.response.status = 500; }
});

router.get("/api/loans/active/:itemId/:userId", async (ctx) => {
  try {
    const { itemId, userId } = ctx.params;
    const otherId = ctx.request.url.searchParams.get("otherId");
    const r = await client.queryObject(
      `SELECT * FROM transactions 
       WHERE item_id=$1 
       AND ((borrower_id=$2 AND owner_id=$3) OR (borrower_id=$3 AND owner_id=$2))
       AND status IN ('pending', 'accepted')
       ORDER BY created_at DESC LIMIT 1`,
      [itemId, userId, otherId]
    );
    ctx.response.body = r.rows[0] || {};
  } catch (e) {
    console.error(e);
    ctx.response.status = 500;
  }
});
// --- APP ---
const app = new Application();
app.use(async (ctx, next) => {
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "*");
  if (ctx.request.method === "OPTIONS") ctx.response.status = 204;
  else await next();
});
app.use(router.routes());
app.use(router.allowedMethods());

console.log("🚀 Backend on http://localhost:8000");
await app.listen({ port: 8000 });
