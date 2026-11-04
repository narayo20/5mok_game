import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, 'dist');
const PORT = process.env.PORT || 5173;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
};

// 로컬 Wi-Fi / 이더넷 IP 주소 검색
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({ name, ip: net.address });
      }
    }
  }
  return addresses;
}

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // 파일이 없으면 index.html로 fallback (SPA 라우팅 지원)
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end(`Server Error: ${err.code}`);
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      });
      res.end(content);
    }
  });
});

server.listen(PORT, '0.0.0.0', async () => {
  const localIps = getLocalIpAddresses();
  const primaryIp = localIps.length > 0 ? localIps[0].ip : 'localhost';
  const accessUrl = `http://${primaryIp}:${PORT}`;

  console.log('\n========================================================');
  console.log(' 🎮 1:1 모바일 렌주룰 오목 (Wi-Fi P2P) 서버 실행 완료!');
  console.log('========================================================\n');
  console.log(` 📱 스마트폰(iOS Safari / Android Chrome) 접속 주소:`);
  console.log(`    👉 \x1b[36m${accessUrl}\x1b[0m\n`);

  if (localIps.length > 1) {
    console.log(' 기타 감지된 네트워크 IP:');
    localIps.forEach((item) => {
      console.log(`   - ${item.name}: http://${item.ip}:${PORT}`);
    });
    console.log('');
  }

  try {
    const qrString = await QRCode.toString(accessUrl, { type: 'terminal', small: true });
    console.log(' 📲 스마트폰 카메라로 아래 QR 코드를 스캔하세요:\n');
    console.log(qrString);
  } catch (e) {
    // QR terminal print optional
  }

  console.log(' 💡 안내:');
  console.log(' 1. 스마트폰과 이 컴퓨터가 [동일한 Wi-Fi]에 연결되어 있어야 합니다.');
  console.log(' 2. 야외에서는 스마트폰 한 대의 [핫스팟]에 컴퓨터와 다른 폰을 연결해도 됩니다.');
  console.log(' 3. 폰에서 열린 후 [1:1 Wi-Fi] -> [방 만들기]를 누르면 폰끼리 1:1 직접 연결됩니다!\n');
});

