import express from "express"; 
import cors from "cors";
import db from "./db.js"; 
const app = express(); 
app.use(cors());
app.use(express.json()); 
app.get("/", async (req, res) => { try { const [rows] = await db.query("SELECT NOW() AS server_time"); 
res.json({ ok: true, message: "Conectado ao MySQL!", time: rows[0].server_time, }); 
    } catch (error) { 
      console.error("Database connection error:", error);
      res.status(500).json({ ok: false, message: "Erro na conexão com o banco", error: error.message }); 
  }
}); 
export default app;
