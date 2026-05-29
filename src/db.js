import mysql from "mysql2/promise"; 
import dotenv from "dotenv"; 
dotenv.config();

let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
  dbUrl = dbUrl.replace(/^["']|["']$/g, '');
  dbUrl = dbUrl.replace('@localhost:', '@127.0.0.1:');
}

const db = dbUrl 
  ? mysql.createPool(dbUrl)
  : mysql.createPool({ 
      host: process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || "127.0.0.1"), 
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306, 
      user: process.env.DB_USER, 
      password: process.env.DB_password || process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,
    }); 
export default db;
