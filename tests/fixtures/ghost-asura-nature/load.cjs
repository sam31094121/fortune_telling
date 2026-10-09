// 測試共用：以 jiti 載入專案 TS 模組（@ 別名＝專案根目錄；server-only 以空模組代替）。
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const createJiti = require(path.join(root, 'node_modules/jiti'));
const jiti = createJiti(__filename, {
  interopDefault: true,
  cache: false,
  alias: { '@/': root + '/', 'server-only': path.join(__dirname, 'server-only-stub.cjs') },
});
module.exports = { root, load: (rel) => jiti(path.join(root, rel)) };
