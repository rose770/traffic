import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({ filename: './database.sqlite', driver: sqlite3.Database });

await db.run(
  `INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
  ['external_coordinator', 'pass123', 'external_entity']
);

const check = await db.get(`SELECT * FROM users WHERE username = ?`, ['external_coordinator']);
console.log('Account now in database:', check);

await db.close();
