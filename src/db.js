import mysql from "mysql2/promise"; 
import dotenv from "dotenv"; 
dotenv.config();

const db = process.env.DATABASE_URL 
  ? mysql.createPool(process.env.DATABASE_URL)
  : mysql.createPool({ 
      host: process.env.DB_HOST || "localhost", 
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306, 
      user: process.env.DB_USER, 
      password: process.env.DB_password || process.env.DB_PASSWORD, 
      database: process.env.DB_NAME,
    }); 
export default db;
