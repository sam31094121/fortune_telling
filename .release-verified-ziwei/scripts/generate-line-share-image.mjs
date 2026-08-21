import sharp from 'sharp';

const width = 1200;
const height = 630;

const title = '&#9775; &#22826;&#26997;&#21629;&#29702; AI';
const services = [
  'AI &#32043;&#24494;&#26007;&#25976;',
  '&#20843;&#23383;',
  '&#25976;&#23383;&#35542;&#21513;&#20982;',
  '&#22825;&#22320;&#20154;&#26234;&#24935;&#20998;&#26512;',
];

function star(seed) {
  const x = (seed * 97) % width;
  const y = (seed * 53) % height;
  const opacity = 0.12 + ((seed * 17) % 42) / 100;
  const r = 0.7 + ((seed * 13) % 18) / 10;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#f8fafc" opacity="${opacity}" />`;
}

function serviceText() {
  return services
    .map((label, index) => {
      const y = 520 + index * 26;
      return `<text x="600" y="${y}" text-anchor="middle" class="service">${label}</text>`;
    })
    .join('\n');
}

const svg = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgCore" cx="50%" cy="45%" r="76%">
      <stop offset="0%" stop-color="#263a68"/>
      <stop offset="42%" stop-color="#070a14"/>
      <stop offset="100%" stop-color="#01030a"/>
    </radialGradient>
    <radialGradient id="aura" cx="50%" cy="46%" r="56%">
      <stop offset="0%" stop-color="#f8fafc" stop-opacity="0.20"/>
      <stop offset="30%" stop-color="#8b5cf6" stop-opacity="0.26"/>
      <stop offset="66%" stop-color="#06b6d4" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#02030a" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="whiteGlass" x1="22%" y1="5%" x2="80%" y2="96%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="45%" stop-color="#e0f2fe"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <linearGradient id="blackGlass" x1="14%" y1="8%" x2="84%" y2="95%">
      <stop offset="0%" stop-color="#172033"/>
      <stop offset="42%" stop-color="#030712"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="50%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
    <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.75 0 0 0 0 0.82 0 0 0 0 1 0 0 0 0.56 0"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    <filter id="taijiShadow" x="-35%" y="-35%" width="170%" height="170%">
      <feDropShadow dx="0" dy="30" stdDeviation="26" flood-color="#000000" flood-opacity="0.66"/>
      <feDropShadow dx="0" dy="0" stdDeviation="20" flood-color="#a78bfa" flood-opacity="0.60"/>
      <feDropShadow dx="0" dy="0" stdDeviation="38" flood-color="#22d3ee" flood-opacity="0.26"/>
    </filter>
    <style>
      .title {
        font-family: "Microsoft JhengHei", "Noto Sans TC", "PingFang TC", sans-serif;
        font-size: 46px;
        font-weight: 850;
        letter-spacing: 2px;
        fill: url(#goldText);
        paint-order: stroke;
        stroke: rgba(2,6,23,0.55);
        stroke-width: 3px;
      }
      .service {
        font-family: "Microsoft JhengHei", "Noto Sans TC", "PingFang TC", sans-serif;
        font-size: 25px;
        font-weight: 760;
        letter-spacing: 3px;
        fill: #f8fafc;
        paint-order: stroke;
        stroke: rgba(2,6,23,0.58);
        stroke-width: 3px;
      }
      .ring {
        fill: none;
        stroke-linecap: round;
      }
    </style>
  </defs>

  <rect width="1200" height="630" fill="url(#bgCore)"/>
  <rect width="1200" height="630" fill="url(#aura)"/>
  ${Array.from({ length: 92 }, (_, i) => star(i + 3)).join('\n')}

  <g opacity="0.80" filter="url(#softGlow)">
    <ellipse cx="600" cy="302" rx="430" ry="232" class="ring" stroke="#7dd3fc" stroke-width="1.7" opacity="0.30"/>
    <ellipse cx="600" cy="302" rx="350" ry="190" class="ring" stroke="#facc15" stroke-width="1.25" opacity="0.18" transform="rotate(-14 600 302)"/>
    <ellipse cx="600" cy="302" rx="500" ry="270" class="ring" stroke="#a78bfa" stroke-width="1" opacity="0.17" transform="rotate(10 600 302)"/>
  </g>

  <text x="600" y="68" text-anchor="middle" class="title">${title}</text>

  <g transform="translate(600 292)" filter="url(#taijiShadow)">
    <circle cx="0" cy="0" r="214" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.38)" stroke-width="2"/>
    <circle cx="0" cy="0" r="202" fill="url(#whiteGlass)"/>
    <path d="M 0 -202 A 202 202 0 0 1 0 202 A 101 101 0 0 1 0 0 A 101 101 0 0 0 0 -202 Z" fill="url(#blackGlass)"/>
    <circle cx="0" cy="-101" r="27" fill="url(#whiteGlass)" stroke="rgba(255,255,255,0.60)" stroke-width="2"/>
    <circle cx="0" cy="101" r="27" fill="url(#blackGlass)" stroke="rgba(255,255,255,0.34)" stroke-width="2"/>
    <circle cx="-57" cy="-72" r="128" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="11" opacity="0.48"/>
    <path d="M -105 -156 C -36 -204 92 -188 151 -90" fill="none" stroke="rgba(255,255,255,0.66)" stroke-width="10" stroke-linecap="round" opacity="0.80"/>
    <path d="M -136 130 C -60 188 70 188 140 88" fill="none" stroke="rgba(125,211,252,0.46)" stroke-width="9" stroke-linecap="round" opacity="0.74"/>
  </g>

  <g opacity="0.84">
    <circle cx="600" cy="292" r="244" fill="none" stroke="rgba(250,204,21,0.24)" stroke-width="1.4" stroke-dasharray="8 12"/>
    <circle cx="600" cy="292" r="270" fill="none" stroke="rgba(125,211,252,0.18)" stroke-width="1"/>
  </g>

  <g>
    <rect x="330" y="489" width="540" height="124" rx="26" fill="rgba(2,6,23,0.42)" stroke="rgba(255,255,255,0.12)"/>
    ${serviceText()}
  </g>
</svg>
`;

await sharp(Buffer.from(svg))
  .jpeg({ quality: 93, mozjpeg: true })
  .toFile('public/images/line-share-taichi.jpg');

const info = await sharp('public/images/line-share-taichi.jpg').metadata();
console.log(`Generated line-share-taichi.jpg ${info.width}x${info.height} ${info.format}`);
