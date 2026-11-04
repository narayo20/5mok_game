import puppeteer from 'puppeteer-core';
import ffmpegPath from 'ffmpeg-static';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DEMO_DIR = path.join(ROOT_DIR, 'demo');
const FRAMES_DIR = path.join(DEMO_DIR, 'frames');

if (!fs.existsSync(DEMO_DIR)) fs.mkdirSync(DEMO_DIR, { recursive: true });
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

// Clear old frames
fs.readdirSync(FRAMES_DIR).forEach((f) => fs.unlinkSync(path.join(FRAMES_DIR, f)));

const PORT = 5178;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// 1. Static server
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = path.join(DIST_DIR, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

async function main() {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`Demo recording server started on http://127.0.0.1:${PORT}`);

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 420,
    height: 840,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });

  await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle0' });
  console.log('Page loaded successfully.');

  let frameCount = 0;
  async function captureFrames(count = 1, delayMs = 100) {
    for (let i = 0; i < count; i++) {
      const frameName = `frame_${String(frameCount++).padStart(5, '0')}.png`;
      await page.screenshot({ path: path.join(FRAMES_DIR, frameName) });
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  // Initial screen pause
  await captureFrames(6, 100);

  // Switch to "1폰 2인" mode via evaluate
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find((b) => b.textContent && b.textContent.includes('1폰 2인'));
    if (btn) btn.click();
  });
  await captureFrames(4, 100);

  // Helper to click cell (r, c)
  async function clickCell(r, c) {
    const index = r * 15 + c;
    await page.evaluate((idx) => {
      const cells = document.querySelectorAll('.grid-cols-15 > div');
      if (cells[idx]) {
        cells[idx].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    }, index);
  }

  console.log('Simulating game sequence...');

  // 1. Black (7, 7) - Center
  await clickCell(7, 7);
  await captureFrames(4, 80);

  // 2. White (7, 8)
  await clickCell(7, 8);
  await captureFrames(4, 80);

  // 3. Black (6, 7)
  await clickCell(6, 7);
  await captureFrames(4, 80);

  // 4. White (8, 8)
  await clickCell(8, 8);
  await captureFrames(4, 80);

  // 5. Black (5, 7)
  await clickCell(5, 7);
  await captureFrames(4, 80);

  // 6. White (9, 8)
  await clickCell(9, 8);
  await captureFrames(4, 80);

  // 7. Black (8, 7)
  await clickCell(8, 7);
  await captureFrames(4, 80);

  // 8. White (6, 8)
  await clickCell(6, 8);
  await captureFrames(4, 80);

  // 9. Black (4, 7) -> Winning move (5-in-a-row: 4,7 / 5,7 / 6,7 / 7,7 / 8,7)!
  console.log('Making winning move for 5-in-a-row...');
  await clickCell(4, 7);

  // Capture celebration & confetti animation
  await captureFrames(18, 100);

  await browser.close();
  server.close();
  console.log(`Captured ${frameCount} frames. Generating videos...`);

  const mp4Path = path.join(DEMO_DIR, 'sample_gameplay.mp4');
  const gifPath = path.join(DEMO_DIR, 'sample_gameplay.gif');

  // Generate MP4 (H.264, 10 fps)
  await new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-framerate', '8',
      '-i', path.join(FRAMES_DIR, 'frame_%05d.png'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=420:-2',
      mp4Path,
    ];
    console.log('Running ffmpeg for MP4...');
    const ff = spawn(ffmpegPath, args);
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
  console.log(`MP4 generated: ${mp4Path}`);

  // Generate animated GIF (for instant viewing in GitHub README)
  await new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-framerate', '8',
      '-i', path.join(FRAMES_DIR, 'frame_%05d.png'),
      '-vf', 'fps=8,scale=360:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
      gifPath,
    ];
    console.log('Running ffmpeg for GIF...');
    const ff = spawn(ffmpegPath, args);
    ff.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}`));
    });
  });
  console.log(`GIF generated: ${gifPath}`);

  // Clean up frames directory
  fs.readdirSync(FRAMES_DIR).forEach((f) => fs.unlinkSync(path.join(FRAMES_DIR, f)));
  fs.rmdirSync(FRAMES_DIR);
  console.log('All sample videos successfully generated in demo/ directory!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
