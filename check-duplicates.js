import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({ filename: './database.sqlite', driver: sqlite3.Database });

const total = await db.get(`SELECT COUNT(*) as count FROM permits`);
console.log('Total permits in database:', total.count);

const dupes = await db.all(`SELECT id, COUNT(*) as count FROM permits GROUP BY id HAVING COUNT(*) > 1`);
console.log('Duplicate IDs found:', dupes.length === 0 ? 'NONE' : dupes);

await db.close();
