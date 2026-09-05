/**
 * 區塊置換小工具。
 *
 * 這個專案裡有些檔案是 CRLF、有些是 LF，甚至同一個檔案兩者混用。
 * 直接用字串比對常常「明明看得到卻找不到」，改到一半就中斷。
 * 這支統一先把換行正規化再比對，避免每次改檔都在跟換行符打架。
 *
 * 用法：node scripts/patch-block.mjs <目標檔> <舊區塊檔> <新區塊檔>
 */
import fs from 'node:fs';

const [target, oldFile, newFile] = process.argv.slice(2);
const norm = (text) => text.replace(/\r\n/g, '\n');

const source = norm(fs.readFileSync(target, 'utf8'));
const oldBlock = norm(fs.readFileSync(oldFile, 'utf8')).replace(/\n$/, '');
const newBlock = norm(fs.readFileSync(newFile, 'utf8')).replace(/\n$/, '');

if (!source.includes(oldBlock)) {
  console.error('找不到要置換的區塊：', oldFile);
  process.exit(1);
}
fs.writeFileSync(target, source.replace(oldBlock, newBlock));
console.log('已置換', oldFile);
