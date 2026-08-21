/* ==========================================================
   Living forest — scene, wildlife and weather
   Pure decoration. Never intercepts a click.
   ========================================================== */

const FX_KEY = 'ptracker.fx';
const rnd  = (a,b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/* ==========================================================
   TREES
   ========================================================== */
function treeConifer(x, h, w, fill){
  const tiers = 5, out = [];
  for(let i = 0; i < tiers; i++){
    const t = i / (tiers - 1);
    const y = 200 - h + t * h * 0.78;
    const hw = (w / 2) * (0.32 + t * 0.68);
    const drop = h * 0.26;
    out.push(`<path d="M${x},${y} L${x-hw},${y+drop} L${x-hw*0.45},${y+drop*0.86}
      L${x},${y+drop*0.3} L${x+hw*0.45},${y+drop*0.86} L${x+hw},${y+drop} Z"/>`);
  }
  out.push(`<rect x="${x-w*0.045}" y="${196-h*0.06}" width="${w*0.09}" height="${h*0.14}"/>`);
  return `<g fill="${fill}">${out.join('')}</g>`;
}
function treeBroadleaf(x, h, w, fill){
  const cy = 200 - h + h * 0.30, r = w / 2;
  return `<g fill="${fill}">
    <path d="M${x-w*0.05},200 L${x-w*0.04},${cy} L${x+w*0.04},${cy} L${x+w*0.05},200 Z"/>
    <path d="M${x-r},${cy+r*0.30}
      C${x-r*1.06},${cy-r*0.44} ${x-r*0.52},${cy-r*0.98} ${x-r*0.06},${cy-r*0.82}
      C${x+r*0.30},${cy-r*1.14} ${x+r*0.92},${cy-r*0.72} ${x+r*0.86},${cy-r*0.16}
      C${x+r*1.16},${cy+r*0.14} ${x+r*0.84},${cy+r*0.48} ${x+r*0.42},${cy+r*0.40}
      C${x+r*0.12},${cy+r*0.60} ${x-r*0.56},${cy+r*0.60} ${x-r},${cy+r*0.30} Z"/>
  </g>`;
}
function treeBirch(x, h, w, fill){
  const cy = 200 - h + h * 0.26, r = w / 2;
  return `<g fill="${fill}">
    <path d="M${x-w*0.028},200 L${x-w*0.02},${cy} L${x+w*0.02},${cy} L${x+w*0.028},200 Z"/>
    <ellipse cx="${x-r*0.34}" cy="${cy-r*0.22}" rx="${r*0.52}" ry="${r*0.62}"/>
    <ellipse cx="${x+r*0.36}" cy="${cy-r*0.34}" rx="${r*0.46}" ry="${r*0.54}"/>
    <ellipse cx="${x}"        cy="${cy-r*0.72}" rx="${r*0.50}" ry="${r*0.44}"/>
    <ellipse cx="${x+r*0.10}" cy="${cy+r*0.14}" rx="${r*0.62}" ry="${r*0.38}"/>
  </g>`;
}
function bush(x, h, w, fill){
  return `<g fill="${fill}">
    <ellipse cx="${x-w*0.24}" cy="${200-h*0.42}" rx="${w*0.36}" ry="${h*0.48}"/>
    <ellipse cx="${x+w*0.22}" cy="${200-h*0.36}" rx="${w*0.32}" ry="${h*0.42}"/>
    <ellipse cx="${x}"        cy="${200-h*0.62}" rx="${w*0.30}" ry="${h*0.44}"/>
  </g>`;
}
function fern(x, h, fill){
  const out = [];
  for(let i = 0; i < 7; i++){
    const t = i/6, y = 200 - t*h, len = 16*(1-t*0.55);
    out.push(`<path d="M${x},${y} q${len*0.6},${-len*0.34} ${len},${-len*0.16}
                        q${-len*0.5},${len*0.26} ${-len},${len*0.16} Z"/>`);
    out.push(`<path d="M${x},${y} q${-len*0.6},${-len*0.34} ${-len},${-len*0.16}
                        q${len*0.5},${len*0.26} ${len},${len*0.16} Z"/>`);
  }
  return `<g fill="${fill}"><path d="M${x-1.2},200 L${x-0.7},${200-h} L${x+0.7},${200-h} L${x+1.2},200 Z"/>${out.join('')}</g>`;
}
function treeBand(cls, fill, count, minH, maxH, seed, pxHeight){
  const parts = [];
  for(let i = 0; i < count; i++){
    const x = (i + 0.5) * (1200 / count) + ((i*37 + seed) % 23) - 11;
    const h = minH + ((i*53 + seed) % (maxH - minH));
    const kind = (i + seed) % 3;
    const w = h * (kind === 0 ? 0.52 : kind === 1 ? 0.86 : 0.62);
    parts.push(kind === 0 ? treeConifer(x,h,w,fill)
             : kind === 1 ? treeBroadleaf(x,h,w,fill)
             :              treeBirch(x,h,w,fill));
  }
  return `<svg class="layer ${cls}" viewBox="0 0 1200 200" preserveAspectRatio="none"
            style="height:${pxHeight}px">${parts.join('')}</svg>`;
}

/* ==========================================================
   ANIMALS
   Each returns an <svg>. All share the same walking rig.
   ========================================================== */
const legRect = (x,y,w,h,alt) =>
  `<rect class="leg${alt?' b':''}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${w/2}"/>`;

function aDeer(s){
  return `<svg width="${64*s}" height="${52*s}" viewBox="0 0 64 52"><g class="bob" fill="#7A5A3A">
    ${legRect(13,24,3.4,18)}${legRect(20,24,3.4,18,1)}${legRect(35,24,3.4,18,1)}${legRect(42,24,3.4,18)}
    <path d="M9,19 C9,13 15,10 23,10 L38,10 C45,10 49,13 49,19 C49,23 46,26 41,26 L17,26 C12,26 9,23 9,19 Z"/>
    <path d="M45,15 L50,5 C51,2.6 54,3 54,5.4 L54,9 L59,11.4 C61,12.4 60,15 58,15 L51,15.6 Z"/>
    <path d="M51,5 L49,0.5 M51.6,4.6 L55.6,1.4 M53.4,3 L57.6,2.6" stroke="#7A5A3A"
          stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path class="tail" d="M9,17 L3.5,12.6 C2,11.4 3.4,9.2 5.2,10.4 L10,14 Z"/>
  </g></svg>`;
}
function aZebra(s){
  return `<svg width="${68*s}" height="${54*s}" viewBox="0 0 68 54"><g class="bob">
    <g fill="#E9E5DD">
      ${legRect(14,26,4,20)}${legRect(22,26,4,20,1)}${legRect(38,26,4,20,1)}${legRect(46,26,4,20)}
      <path d="M10,20 C10,13.6 16,10 25,10 L42,10 C50,10 54,13.6 54,20 C54,24.6 51,27.6 45,27.6 L19,27.6 C13,27.6 10,24.6 10,20 Z"/>
      <path d="M50,15 L56,4.6 C57,2.4 60,2.8 60,5.2 L60,9 L65,11.4 C67,12.4 66,15.4 64,15.4 L57,16 Z"/>
    </g>
    <g fill="#2B2724">
      <rect x="17" y="11" width="2.6" height="16" rx="1"/><rect x="23" y="10.6" width="2.6" height="17" rx="1"/>
      <rect x="29" y="10.4" width="2.6" height="17" rx="1"/><rect x="35" y="10.6" width="2.6" height="17" rx="1"/>
      <rect x="41" y="11" width="2.6" height="16" rx="1"/>
      <path d="M44,12 L52,6 L53.6,8.6 L46,14 Z"/>
      <path d="M56,4.6 L54.6,0.6 L58.4,3 Z"/>
      <path class="tail" d="M10,18 L4,13.6 C2.4,12.4 4,10 5.8,11.4 L11,15 Z"/>
    </g></g></svg>`;
}
function aBuffalo(s){
  return `<svg width="${72*s}" height="${52*s}" viewBox="0 0 72 52"><g class="bob" fill="#463E36">
    ${legRect(16,30,5,18)}${legRect(25,30,5,18,1)}${legRect(42,30,5,18,1)}${legRect(51,30,5,18)}
    <path d="M12,24 C12,15 18,10 30,10 L44,10 C55,10 60,15 60,24 C60,29 56,32 49,32 L22,32 C15,32 12,29 12,24 Z"/>
    <path d="M30,11 C31,5 36,3 42,4 L44,10 Z"/>
    <path d="M58,20 C64,19 69,21.6 69,26 C69,29.6 65,31.6 61,30.6 L57,29 Z"/>
    <path d="M60,19.6 C63,13.6 70,13.6 71,17.6 C69,16.6 65,17.6 63,20.6 Z"/>
    <path d="M57,20.6 C54,14.6 47,15 47,19 C49,18 53,19 55,21.6 Z"/>
    <path class="tail" d="M12,22 L5,19 C3,18.2 4.4,15.4 6.4,16.4 L13,19.4 Z"/>
  </g></svg>`;
}
function aElephant(s){
  return `<svg width="${86*s}" height="${68*s}" viewBox="0 0 86 68"><g class="shake" fill="#7E7B78">
    <g class="bob">
      ${legRect(16,38,8,24)}${legRect(29,38,8,24,1)}${legRect(48,38,8,24,1)}${legRect(61,38,8,24)}
      <path d="M12,28 C12,17 20,11 34,11 L52,11 C66,11 72,17 72,28 C72,35 66,40 56,40 L26,40 C16,40 12,35 12,28 Z"/>
      <path d="M64,20 C64,13 69,9 75,9 C81,9 84,13 84,20 C84,27 80,32 74,32 C68,32 64,27 64,20 Z"/>
      <path class="ear" d="M64,13 C58,12 53,16 53,22 C53,28 57,32 62,31 C60,26 60,18 64,13 Z"/>
      <path class="trunk" d="M76,29 C79,36 78,45 74,52 C72,56 74,60 78,60 C79,60 79.6,58.6 78.6,58.2
            C76.6,57.6 76,55.6 77,53.6 C81,46 82,36 79,28 Z"/>
      <path d="M71,32 C70,37 69,41 67,44 C69,41 71,37 72,32 Z" fill="#EFEAE2"/>
      <path d="M77,32 C77,37 77,41 76,44 C78,41 79,37 79,32 Z" fill="#EFEAE2"/>
      <path class="tail" d="M12,26 L5,24 C3,23.4 4,20.4 6,21.2 L13,23.6 Z"/>
    </g></g></svg>`;
}
function aLion(s){
  return `<svg width="${68*s}" height="${48*s}" viewBox="0 0 68 48"><g class="bob">
    <g fill="#C79150">
      ${legRect(15,25,4.4,18)}${legRect(23,25,4.4,18,1)}${legRect(38,25,4.4,18,1)}${legRect(46,25,4.4,18)}
      <path d="M11,19 C11,13 17,9.6 25,9.6 L41,9.6 C48,9.6 52,13 52,19 C52,23.6 49,26.6 43,26.6 L19,26.6 C13,26.6 11,23.6 11,19 Z"/>
    </g>
    <g fill="#8E5C2C">
      <circle cx="55" cy="15" r="12"/>
      <path class="tail" d="M11,17 L3,12 C1,11 2.6,8 4.6,9.2 L12,13.6 Z"/>
      <circle cx="3" cy="10" r="3.4"/>
    </g>
    <circle cx="57" cy="15" r="7.6" fill="#D9A96E"/>
    <circle cx="55" cy="13" r="1.3" fill="#3A2A18"/><circle cx="60" cy="13" r="1.3" fill="#3A2A18"/>
    <path d="M57.6,17 L55.6,19 L59.6,19 Z" fill="#3A2A18"/>
  </g></svg>`;
}
function aSheep(s){
  return `<svg width="${52*s}" height="${42*s}" viewBox="0 0 52 42"><g class="bob">
    <g fill="#3E3830">
      ${legRect(13,26,3,13)}${legRect(19,26,3,13,1)}${legRect(30,26,3,13,1)}${legRect(36,26,3,13)}
    </g>
    <g fill="#F2EDE4">
      <ellipse cx="16" cy="18" rx="8" ry="7.6"/><ellipse cx="25" cy="15.6" rx="9" ry="8.6"/>
      <ellipse cx="34" cy="18" rx="8" ry="7.6"/><ellipse cx="21" cy="22.6" rx="8" ry="6.6"/>
      <ellipse cx="30" cy="22.6" rx="8" ry="6.6"/>
    </g>
    <g fill="#3E3830">
      <ellipse cx="43" cy="17" rx="5.4" ry="6"/>
      <path d="M38.6,13 C36.6,10.6 38,8.6 40.4,9.6 L42,12.6 Z"/>
      <path d="M47.4,13 C49.4,10.6 48,8.6 45.6,9.6 L44,12.6 Z"/>
    </g>
    <circle cx="45" cy="16" r="1.2" fill="#F2EDE4"/>
  </g></svg>`;
}
function aCow(s){
  return `<svg width="${70*s}" height="${52*s}" viewBox="0 0 70 52"><g class="bob">
    <g fill="#EDE7DC">
      ${legRect(15,27,4.4,19)}${legRect(23,27,4.4,19,1)}${legRect(39,27,4.4,19,1)}${legRect(47,27,4.4,19)}
      <path d="M11,20 C11,13.6 17,10 26,10 L43,10 C51,10 55,13.6 55,20 C55,25 52,28 46,28 L20,28 C14,28 11,25 11,20 Z"/>
      <path d="M52,16 C52,11 56,8 61,8 C66,8 68,11 68,16 C68,21 65,24 60,24 C55,24 52,21 52,16 Z"/>
    </g>
    <g fill="#4C4238">
      <ellipse cx="22" cy="16" rx="6" ry="4.6"/><ellipse cx="38" cy="22" rx="7" ry="4.4"/>
      <ellipse cx="45" cy="14.6" rx="4" ry="3.2"/>
      <path d="M54,9 C51,5 53,2.4 56,4 L57.6,8 Z"/><path d="M66,9 C69,5 67,2.4 64,4 L62.4,8 Z"/>
      <path class="tail" d="M11,18 L4,15 C2,14.2 3.4,11.4 5.4,12.4 L12,15.4 Z"/>
    </g>
    <ellipse cx="61" cy="19.6" rx="4.4" ry="3.2" fill="#D9B7AE"/>
    <circle cx="57" cy="14" r="1.2" fill="#3A322A"/><circle cx="64" cy="14" r="1.2" fill="#3A322A"/>
    <path d="M31,28 C31,31.6 33,33.6 35,33.6 C37,33.6 39,31.6 39,28 Z" fill="#D9B7AE"/>
  </g></svg>`;
}
function aFox(s){
  return `<svg width="${58*s}" height="${36*s}" viewBox="0 0 58 36"><g class="bob" fill="#B4652C">
    ${legRect(14,19,3,13)}${legRect(20,19,3,13,1)}${legRect(31,19,3,13,1)}${legRect(37,19,3,13)}
    <path d="M11,15 C11,10.6 15,8.4 21,8.4 L35,8.4 C41,8.4 44,10.6 44,15 C44,18.4 41.6,20.6 37.6,20.6 L17,20.6 C13.4,20.6 11,18.4 11,15 Z"/>
    <path d="M43,11.6 L51,7 C53,5.8 55.6,7.4 54.6,9.4 L52,13.6 L46,14.6 Z"/>
    <path d="M45.6,8.4 L44.4,3.6 L48.6,6.4 Z M50.6,7.6 L51.4,3 L54,6 Z"/>
    <path class="tail" d="M11,13.6 C6,12.2 1,14.6 0.6,19 C0.3,22.6 3.4,24.6 6,23 C3.4,21 4.6,17.4 8,16.6 L11,16.2 Z"/>
  </g></svg>`;
}
function aRabbit(s){
  return `<svg width="${34*s}" height="${32*s}" viewBox="0 0 34 32"><g class="bob" fill="#6B6155">
    <ellipse cx="15" cy="20" rx="11" ry="7.6"/><circle cx="25.6" cy="15.6" r="5.2"/>
    <path d="M24.6,11.6 C23.4,6.6 24.4,2.4 26.4,2.4 C28.4,2.4 28.8,6.6 27.4,11.4 Z"/>
    <path d="M28.4,12 C28.6,7.6 30.4,4.2 32,4.8 C33.6,5.4 33,9.4 30.8,12.8 Z"/>
    <circle cx="4.4" cy="18.6" r="3.6"/>
    ${legRect(9,25,3,6)}${legRect(19,25,3,6,1)}
  </g></svg>`;
}
function aOwl(s){
  return `<svg width="${30*s}" height="${36*s}" viewBox="0 0 30 36"><g class="perch" fill="#4A5A46">
    <path d="M15,3 C22.6,3 27,9.4 27,18.6 C27,27.4 22.2,33 15,33 C7.8,33 3,27.4 3,18.6 C3,9.4 7.4,3 15,3 Z"/>
    <path d="M6.6,6.4 L4.2,0.6 L10.4,4 Z M23.4,6.4 L25.8,0.6 L19.6,4 Z"/>
    <circle cx="10.4" cy="14.6" r="3.4" fill="#F2F6EF"/><circle cx="19.6" cy="14.6" r="3.4" fill="#F2F6EF"/>
    <circle cx="10.4" cy="14.6" r="1.5"/><circle cx="19.6" cy="14.6" r="1.5"/>
    <path d="M15,17.6 L12.8,21 L17.2,21 Z" fill="#D9A441"/>
  </g></svg>`;
}
function aSquirrel(s){
  return `<svg width="${34*s}" height="${34*s}" viewBox="0 0 34 34"><g class="perch" fill="#8A5A38">
    <path d="M14,32 C8,32 5,27.4 6.4,22 C7.6,17.4 11,15 15.4,15.4 L18,15.6 L18,32 Z"/>
    <circle cx="19.6" cy="11.6" r="5.6"/>
    <path d="M16.4,7 L14.6,2.6 L19,5.4 Z M23,7 L25.4,3 L26,7.6 Z"/>
    <path d="M8,26 C1.4,24 -1,15 4.4,9.4 C8.4,5.4 14,6.4 13.6,9.6 C13.4,11.6 10.6,10.6 8.2,13
             C5,16.2 5.6,22 10,24.6 Z"/>
  </g></svg>`;
}
function butterfly(s, c){
  return `<svg width="${22*s}" height="${18*s}" viewBox="0 0 22 18" fill="${c}">
    <path class="wingL" d="M11,9 C6,1.4 0.6,1.4 0.6,6.6 C0.6,11.4 6,12.6 11,9 Z"/>
    <path class="wingR" d="M11,9 C16,1.4 21.4,1.4 21.4,6.6 C21.4,11.4 16,12.6 11,9 Z"/>
    <rect x="10.3" y="4.6" width="1.4" height="9" rx=".7" fill="#4A4034"/></svg>`;
}
function birdShape(s, c){
  return `<svg width="${26*s}" height="${14*s}" viewBox="0 0 26 14" fill="${c}"><g class="wing">
    <path d="M13,9 C9.4,2.6 4.6,1 0.6,3.4 C4.6,3.6 8.6,6 13,9 Z"/>
    <path d="M13,9 C16.6,2.6 21.4,1 25.4,3.4 C21.4,3.6 17.4,6 13,9 Z"/>
  </g></svg>`;
}

/* the cast the Herd button draws from.
   cross = seconds to run the width of the screen — lower is faster. */
const SPECIES = [
  { name:'deer',     draw:aDeer,     size:[0.78,1.02], cross:[26,34] },
  { name:'zebra',    draw:aZebra,    size:[0.82,1.04], cross:[28,36] },
  { name:'buffalo',  draw:aBuffalo,  size:[0.88,1.12], cross:[34,44] },
  { name:'elephant', draw:aElephant, size:[1.00,1.30], cross:[46,60] },
  { name:'lion',     draw:aLion,     size:[0.78,1.00], cross:[30,38] },
  { name:'sheep',    draw:aSheep,    size:[0.72,0.94], cross:[32,42] }
];

/* ==========================================================
   CLOUDS
   ========================================================== */
function cloud(w, fill){
  return `<svg width="${w}" height="${w*0.42}" viewBox="0 0 200 84" fill="${fill}">
    <ellipse cx="56" cy="52" rx="42" ry="26"/><ellipse cx="98" cy="40" rx="46" ry="32"/>
    <ellipse cx="142" cy="52" rx="40" ry="25"/><rect x="20" y="50" width="160" height="28" rx="14"/>
  </svg>`;
}

/* ==========================================================
   BUILD: sky and distant forest  (behind the pages)
   ========================================================== */
function buildWorld(){
  const world = document.getElementById('world');
  if(!world) return;

  /* clouds that slide right across the sky */
  const clouds = [];
  const cw = [300,240,380,270,330,210];
  for(let i = 0; i < 6; i++){
    clouds.push(`<div class="cloud" style="top:${2 + i*5.5}%;
      animation-duration:${(150 + i*46)}s;animation-delay:${-(i*38)}s;
      transform:translateX(-32vw)">${cloud(cw[i], i%2 ? '#FFFFFF' : '#F2F5FA')}</div>`);
  }
  /* and clouds that simply hover in place, breathing gently */
  const hover = [
    [ 6, 5,260,0  ], [72, 3,300,-7], [34,12,200,-14],
    [86,15,170,-4 ], [18,20,150,-11], [56,9,230,-19]
  ].map(([l,t,w,d]) =>
    `<div class="cloud hover" style="left:${l}%;top:${t}%;animation-delay:${d}s">
       ${cloud(w,'#FFFFFF')}</div>`).join('');

  const canopy = `
    <svg class="canopy-top" viewBox="0 0 1440 200" preserveAspectRatio="none" style="height:170px">
      <path fill="#3F8062" opacity=".22" d="M0,0 H1440 V50 Q1380,110 1320,54 Q1256,124 1196,58
        Q1130,116 1070,52 Q1006,122 946,56 Q880,112 820,50 Q756,120 696,54 Q630,114 570,52
        Q506,122 446,56 Q380,110 320,50 Q256,120 196,54 Q130,112 70,50 Q34,80 0,44 Z"/>
      <path fill="#2F6B52" opacity=".30" d="M0,0 H1440 V24 Q1392,74 1344,28 Q1296,82 1248,32
        Q1194,78 1146,26 Q1098,76 1050,28 Q996,80 948,30 Q900,74 852,24 Q798,78 750,30
        Q702,72 654,26 Q600,76 552,28 Q504,78 456,30 Q402,72 354,24 Q306,76 258,28
        Q204,78 156,30 Q108,72 60,24 Q30,48 0,20 Z"/>
    </svg>`;

  const flies = [];
  for(let i = 0; i < 12; i++){
    flies.push(`<i class="ffly" style="left:${6 + i*7.6}%;top:${46 + (i%5)*9}%;
      animation-delay:${(i*1.7).toFixed(1)}s,${(i*0.9).toFixed(1)}s"></i>`);
  }

  /* birds that are always around, high in the sky */
  const ambient = [
    `<div class="bird" style="top:11%;animation-duration:76s;animation-delay:-20s">${birdShape(1,'#3C5A4C')}</div>`,
    `<div class="bird" style="top:18%;animation-duration:98s;animation-delay:-58s;opacity:.6">${birdShape(0.75,'#4A6A5A')}</div>`
  ].join('');

  world.innerHTML = `
    <div class="tint rain"></div><div class="tint snow"></div><div class="tint sun"></div>
    <div class="sun-orb"></div><div class="rays"></div><div class="bloom"></div>
    <div class="storm-deck"></div>
    ${hover}
    ${clouds.join('')}
    <div class="scene">
      ${canopy}
      <div class="mistband b2"></div>
      ${treeBand('far','#9FC4B0',16,70,120,3,170)}
      ${ambient}
      ${treeBand('mid','#6BA187',12,100,165,11,215)}
      <div class="mistband b1"></div>
      ${flies.join('')}
      <div class="flock" id="flock"></div>
    </div>`;
}

/* ==========================================================
   BUILD: near forest, animals, weather  (IN FRONT of the pages)
   ========================================================== */
function buildForeground(){
  const fg = document.getElementById('foreground');
  if(!fg) return;

  /* A low, quiet treeline in three tones so it reads as real depth.
     Kept short on purpose — it should edge the screen, not fill it. */
  const edgeBack  = treeBand('fgedge back', '#5C8F74', 13, 62, 104, 5, 104);
  const edgeMid   = treeBand('fgedge mid2', '#3C7A5C', 10, 74, 122, 19, 96);
  const near      = treeBand('fgnear',      '#28624A',  8, 82, 130, 7,  86);

  const floorParts = [];
  for(let i = 0; i < 20; i++) floorParts.push(bush(20 + i*61 + (i%3)*12, 34 + (i%4)*12, 58 + (i%3)*20, '#1F5039'));
  for(let i = 0; i < 24; i++) floorParts.push(fern(10 + i*50 + (i%2)*16, 28 + (i%3)*13, '#245B43'));
  const floor = `<svg class="layer fgfloor" viewBox="0 0 1200 200" preserveAspectRatio="none"
      style="height:58px">${floorParts.join('')}</svg>`;

  /* animals that live here all the time, walking in front of the pages */
  const residents = `
    <div class="critter walker" style="--b:18px;animation-duration:104s;animation-delay:-14s">${aDeer(0.9)}</div>
    <div class="critter walker leftward" style="--b:10px;animation-duration:136s;animation-delay:-52s">${aFox(0.8)}</div>
    <div class="critter walker" style="--b:6px;animation-duration:82s;animation-delay:-34s">${aRabbit(0.85)}</div>`;

  /* perched low, among the undergrowth */
  const perched = `
    <div class="critter" style="left:3%;bottom:52px">${aOwl(0.85)}</div>
    <div class="critter" style="right:5%;bottom:48px">${aSquirrel(0.8)}</div>
    <div class="critter flutter" style="left:12%;bottom:120px">${butterfly(0.9,'#E4A15C')}</div>
    <div class="critter flutter" style="right:16%;bottom:150px;animation-delay:-9s">${butterfly(0.8,'#C77FA6')}</div>
    <div class="critter flutter" style="left:34%;bottom:104px;animation-delay:-17s">${butterfly(0.7,'#7FA8C7')}</div>`;

  /* --- rain --- */
  const drops = [];
  for(let i = 0; i < 170; i++){
    drops.push(`<i class="drop" style="left:${(i*0.61 % 104).toFixed(1)}%;
      height:${(16 + (i%5)*9)}px;
      animation-duration:${(0.42 + (i%6)*0.06).toFixed(2)}s;
      animation-delay:${-(i*0.031).toFixed(3)}s;
      opacity:${(0.5 + (i%4)*0.16).toFixed(2)}"></i>`);
  }
  for(let i = 0; i < 18; i++){
    drops.push(`<i class="splash" style="left:${(3 + i*5.5).toFixed(0)}%;
      animation-delay:${-(i*0.19).toFixed(2)}s"></i>`);
  }
  const boltSvg = (x, scale) => `<i class="bolt" style="left:${x}%;transform:scale(${scale})">
    <svg width="70" height="230" viewBox="0 0 70 230" fill="#F2F7FF">
      <path d="M40,0 L10,120 L32,120 L18,230 L60,96 L36,96 L52,0 Z" opacity=".95"/>
    </svg></i>`;

  /* --- snow --- */
  const flakes = [];
  for(let i = 0; i < 80; i++){
    const s = 3 + (i % 4) * 1.7;
    flakes.push(`<i class="flake" style="left:${(i*1.26 % 100).toFixed(1)}%;
      width:${s}px;height:${s}px;
      animation-duration:${(7 + (i%6)*2.2).toFixed(1)}s;
      animation-delay:${-(i*0.28).toFixed(2)}s;opacity:${(0.5 + (i%5)*0.1).toFixed(2)}"></i>`);
  }

  /* --- wind-blown leaves --- */
  const blown = [];
  const leafCols = ['#7CBB98','#A8CF8E','#C2B78A','#D9A441','#8FC3A6','#E08A4A'];
  for(let i = 0; i < 30; i++){
    blown.push(`<i class="blown" style="top:${(4 + (i*3.1 % 86)).toFixed(0)}%;
      animation-duration:${(3.6 + (i%7)*1.1).toFixed(1)}s;
      animation-delay:${-(i*0.34).toFixed(2)}s">
      <svg width="${11 + i%5}" height="${11 + i%5}" viewBox="0 0 24 24" fill="${leafCols[i%6]}">
        <path d="M21 3C10 3 3 9 3 18c0 1 0 2 .3 3 1-6 5-10 11-12-4 3-7 6-8 12 8 1 14-4 14-13V3z"/>
      </svg></i>`);
  }

  fg.innerHTML = `
    <div class="weather rain">
      <div class="rain-sheet"></div>
      ${drops.join('')}
      <div class="flash"></div>
      ${boltSvg(22,1)}${boltSvg(68,0.8)}
    </div>
    <div class="weather snow">${flakes.join('')}</div>
    <div class="weather wind">${blown.join('')}</div>

    <div class="fg-scene">
      ${edgeBack}
      ${edgeMid}
      ${near}
      ${floor}
      <div class="mistband b3"></div>
      ${residents}
      ${perched}
      <div class="herd" id="herd"></div>
    </div>`;
}

/* ==========================================================
   HERD — a different species, and a different mix, each time
   ========================================================== */
function renderHerd(){
  const herd = document.getElementById('herd');
  if(!herd) return;

  /* one species only, and the whole herd runs the same way:
     in from one edge, out the other. Nobody starts mid-screen. */
  const sp = pick(SPECIES);
  const leftward = Math.random() < 0.5;          /* the single direction */
  const count = Math.round(rnd(12, 18));
  const cross = rnd(sp.cross[0], sp.cross[1]);
  const out = [];

  let delay = 0;
  for(let i = 0; i < count; i++){
    const scale = rnd(sp.size[0], sp.size[1]);
    /* small speed spread, but all still crossing in the same direction */
    const dur = cross * rnd(0.94, 1.12);
    out.push(`<div class="critter walker run${leftward?' leftward':''}"
      style="--b:${Math.round(rnd(6, 54))}px;
             animation-duration:${dur.toFixed(1)}s;
             animation-delay:${delay.toFixed(2)}s;
             opacity:${rnd(0.78, 1).toFixed(2)};
             z-index:${Math.round(rnd(1,9))}">${sp.draw(scale)}</div>`);
    delay += rnd(0.7, 2.4);                      /* they stream past, not all at once */
  }
  herd.innerHTML = out.join('');
  herd.dataset.species = sp.name;
}

/* ==========================================================
   BIRDS — several separate groups at different heights
   ========================================================== */
function renderFlocks(){
  const flock = document.getElementById('flock');
  if(!flock) return;

  const V = [[0,0],[8,6],[16,12],[24,18],[-8,6],[-16,12],[-24,18],[32,24],[-32,24],[40,30],[-40,30]];
  const groups = [
    { top:8,  size:1.00, dur:58, colour:'#33513F', n:11, back:false },
    { top:16, size:0.78, dur:76, colour:'#456B58', n:9,  back:false },
    { top:26, size:0.60, dur:94, colour:'#5A7E6C', n:7,  back:true  },
    { top:34, size:0.46, dur:118,colour:'#6E8E7E', n:6,  back:false }
  ];

  const out = [];
  groups.forEach((g, gi) => {
    for(let i = 0; i < g.n; i++){
      const [dx, dy] = V[i % V.length];
      out.push(`<div class="bird${g.back?' back':''}"
        style="top:calc(${g.top}% + ${dy * g.size}px);
               margin-left:${dx * 11 * g.size}px;
               animation-duration:${g.dur}s;
               animation-delay:${-(gi*7 + i*0.4).toFixed(2)}s;
               opacity:${(0.95 - i*0.03).toFixed(2)}">${birdShape(g.size, g.colour)}</div>`);
    }
  });
  flock.innerHTML = out.join('');
}

/* ==========================================================
   THE BUTTONS
   ========================================================== */
const FX = [
  { id:'rain',  label:'Rain',  icon:'M6 14a4 4 0 0 1 .6-8 5 5 0 0 1 9.5 1.3A3.4 3.4 0 0 1 18 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3' },
  { id:'sun',   label:'Sun',   icon:'M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12M12 1v2M12 21v2M3 12H1M23 12h-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4' },
  { id:'snow',  label:'Snow',  icon:'M12 2v20M4.9 6.5l14.2 11M19.1 6.5 4.9 17.5M12 6l-2.5-2M12 6l2.5-2M12 18l-2.5 2M12 18l2.5 2' },
  { id:'wind',  label:'Wind',  icon:'M3 8h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 18h8' },
  { id:'herd',  label:'Herd',  icon:'M4 20v-6a5 5 0 0 1 5-5h5a5 5 0 0 1 5 5v6M8 9V6l-2-3M16 9V6l2-3M9 20v-4M15 20v-4' },
  { id:'birds', label:'Birds', icon:'M2 9c3-4 7-4 10 1 3-5 7-5 10-1-3 0-6 2-10 6-4-4-7-6-10-6z' }
];
const WEATHER = ['rain','sun','snow'];

function loadFx(){
  try{ return JSON.parse(localStorage.getItem(FX_KEY)) || []; }catch(e){ return []; }
}
function saveFx(list){
  try{ localStorage.setItem(FX_KEY, JSON.stringify(list)); }catch(e){}
}
function applyFx(list){
  FX.forEach(f => document.body.classList.toggle('fx-' + f.id, list.includes(f.id)));
  document.querySelectorAll('.fxbtn').forEach(b =>
    b.classList.toggle('on', list.includes(b.dataset.fx)));
}
function toggleFx(id){
  let list = loadFx();
  if(list.includes(id)){
    list = list.filter(x => x !== id);
  } else {
    if(WEATHER.includes(id)) list = list.filter(x => !WEATHER.includes(x));
    list.push(id);
    if(id === 'herd') renderHerd();     /* new animals every time it is switched on */
  }
  saveFx(list);
  applyFx(list);
}

function buildFxBar(){
  const bar = document.getElementById('fxbar');
  if(!bar) return;
  bar.innerHTML = FX.map(f => `
    <button class="fxbtn" data-fx="${f.id}" title="${f.label}">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${f.icon}"/></svg>
      <span>${f.label}</span>
    </button>`).join('');
  bar.querySelectorAll('.fxbtn').forEach(b => {
    b.addEventListener('click', ev => {
      ev.preventDefault(); ev.stopPropagation();
      toggleFx(b.dataset.fx);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  buildWorld();
  buildForeground();
  renderFlocks();
  renderHerd();
  buildFxBar();
  applyFx(loadFx());
});
