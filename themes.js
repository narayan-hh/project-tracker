/* ==========================================================
   THEMES — twelve places to work in.
   One theme at a time. Each one paints its own sky, its own
   silhouettes and its own ambient motion, and re-colours the UI.

   Layers:
     #themescene  sits inside .world       (behind the pages)
     #themefg     sits inside .foreground  (in front of the pages)
   Both are decoration and never take a click.
   ========================================================== */

const THEME_KEY = 'pt_theme_v1';
const THEME_DEFAULT = 'forest';

const THEME_BLURB = {
  dark:"A night sky and a slow moon. Easiest on the eyes after dark.",
  digital:"Terminal greens and cyan on near-black. Quiet and technical.",
  forest:"The original: soft daylight, drifting mist, a treeline.",
  racing:"Slate and a red stripe, with a circuit running past.",
  city:"Dusk over rooftops, warm amber against a violet sky.",
  minimal:"Paper white, one rule, nothing else. No decoration at all.",
  home:"Warm walls and lamplight. A room rather than a landscape.",
  travel:"High sky and clouds, seen from a window seat.",
  village:"Late afternoon over fields, in gold and terracotta.",
  military:"Olive drab and a stencil. Flat, square, no shine.",
  artistic:"Cream canvas with washes of colour that breathe.",
  indianmusic:"Deep maroon, a mandala, and a row of lit diyas."
};

const THEMES = [
  { id:'dark',      label:'Dark',        icon:'M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z' },
  { id:'digital',   label:'Digital',     icon:'M8 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h3M16 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 9h1M13 9h1M10 13h4M10 17h2' },
  { id:'forest',    label:'Forest',      icon:'M12 3 5 13h4l-3 5h12l-3-5h4z M12 18v3' },
  { id:'racing',    label:'Racing',      icon:'M3 17h4l2-5h6l2 5h4M7 17v3M17 17v3M6 12l1-4h10l1 4' },
  { id:'city',      label:'City',        icon:'M3 21V9l5-3v15M8 21V5l6-2v18M14 21V11l7 2v8M5 12h1M5 15h1M10 8h1M10 12h1M10 16h1M17 15h1' },
  { id:'minimal',   label:'Minimalist',  icon:'M4 12h16M7 8h10M9 16h6' },
  { id:'home',      label:'Home',        icon:'M4 11 12 4l8 7M6 10v10h12V10M10 20v-6h4v6' },
  { id:'travel',    label:'Travel',      icon:'M3 13 21 5l-4 8 4 8-18-8zM10 12l4 3' },
  { id:'village',   label:'Village',     icon:'M3 20h18M5 20v-7l4-3 4 3v7M13 20v-5l4-3 3 2.2V20M8 16h2' },
  { id:'military',  label:'Military',    icon:'M12 3 4 6v6c0 5 3.5 7.6 8 9 4.5-1.4 8-4 8-9V6zM9 12l2.2 2.2L15.5 10' },
  { id:'artistic',  label:'Artistic',    icon:'M12 3a9 9 0 1 0 0 18c1.4 0 2-.9 2-1.8 0-1.6-1.7-1.7-1.7-3 0-1 .8-1.7 2-1.7H17a4 4 0 0 0 4-4A9 9 0 0 0 12 3M7.5 9.5h.01M11 7h.01M15 8.5h.01' },
  { id:'indianmusic', label:'Indian music', icon:'M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM9 18V6l8-2v10M17 14a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z' }
];

/* ---------- tiny helpers ---------- */
const tRep = (n, fn) => { const o = []; for(let i = 0; i < n; i++) o.push(fn(i)); return o.join(''); };
const tRnd = (a, b) => a + Math.random() * (b - a);
const tPick = arr => arr[Math.floor(Math.random() * arr.length)];

/* ==========================================================
   SCENES — each returns { bg, fg }
   ========================================================== */
const SCENES = {

  /* ---------- DARK: a clear night over quiet hills ---------- */
  dark(){
    const stars = tRep(110, () => {
      const s = tRnd(1, 2.6);
      return '<i class="t-star" style="left:' + tRnd(0,100).toFixed(2) + '%;top:' + tRnd(0,66).toFixed(2) + '%;' +
        'width:' + s.toFixed(1) + 'px;height:' + s.toFixed(1) + 'px;' +
        'animation-duration:' + tRnd(2.5,7).toFixed(1) + 's;animation-delay:-' + tRnd(0,7).toFixed(1) + 's;' +
        'opacity:' + tRnd(.35,1).toFixed(2) + '"></i>';
    });
    const shoot = tRep(2, i => '<i class="t-shoot" style="top:' + (12 + i*14) + '%;left:' + (20 + i*35) + '%;' +
      'animation-delay:' + (6 + i*17) + 's"></i>');
    return {
      bg: '<div class="t-nightglow"></div>' +
          '<div class="t-stars">' + stars + shoot + '</div>' +
          '<div class="t-moon"><span class="t-moon-sea a"></span><span class="t-moon-sea b"></span></div>' +
          '<svg class="t-hills far" viewBox="0 0 1200 300" preserveAspectRatio="none">' +
            '<path d="M0 300V190Q150 120 300 165T600 130T900 175T1200 120V300Z"/></svg>' +
          '<svg class="t-hills near" viewBox="0 0 1200 300" preserveAspectRatio="none">' +
            '<path d="M0 300V235Q180 175 360 225T720 200T1050 245T1200 210V300Z"/></svg>',
      fg: '<div class="t-vignette"></div>'
    };
  },

  /* ---------- DIGITAL: server-room glow, falling code, grid floor ---------- */
  digital(){
    const glyphs = '01<>{}[]/|=+*#$%&AF7E29DB'.split('');
    const cols = tRep(26, i => {
      const chars = tRep(22, () => tPick(glyphs) + '<br>');
      return '<span class="t-code" style="left:' + (i*3.9).toFixed(2) + '%;' +
        'animation-duration:' + tRnd(7,17).toFixed(1) + 's;animation-delay:-' + tRnd(0,17).toFixed(1) + 's;' +
        'opacity:' + tRnd(.18,.6).toFixed(2) + ';font-size:' + tRnd(10,15).toFixed(0) + 'px">' + chars + '</span>';
    });
    const nodes = tRep(16, () => '<i class="t-node" style="left:' + tRnd(4,96).toFixed(1) + '%;' +
      'top:' + tRnd(8,58).toFixed(1) + '%;animation-delay:-' + tRnd(0,5).toFixed(1) + 's"></i>');
    return {
      bg: '<div class="t-datafall">' + cols + '</div>' +
          '<div class="t-gridfloor"></div>' +
          '<div class="t-scan"></div>' +
          nodes +
          '<div class="t-neonwash"></div>',
      fg: '<div class="t-scanlines"></div><div class="t-vignette"></div>'
    };
  },

  /* ---------- FOREST: the original living forest is left on show ---------- */
  forest(){ return { bg:'', fg:'' }; },

  /* ---------- RACING: a circuit at speed ---------- */
  racing(){
    const dashes = tRep(9, i => '<i class="t-lane" style="animation-delay:-' + (i*0.42).toFixed(2) + 's"></i>');
    const streaks = tRep(16, () => '<i class="t-streak" style="top:' + tRnd(8,88).toFixed(1) + '%;' +
      'width:' + tRnd(90,300).toFixed(0) + 'px;animation-duration:' + tRnd(.5,1.4).toFixed(2) + 's;' +
      'animation-delay:-' + tRnd(0,1.4).toFixed(2) + 's;opacity:' + tRnd(.12,.5).toFixed(2) + '"></i>');
    const crowd = tRep(90, i => '<i style="left:' + (i*1.12).toFixed(2) + '%;' +
      'top:' + tRnd(0,72).toFixed(0) + '%;background:hsl(' + tRnd(0,360).toFixed(0) + ',48%,62%);' +
      'animation-delay:-' + tRnd(0,3).toFixed(1) + 's"></i>');
    const flags = tRep(14, i => '<i style="left:' + (i*7.4).toFixed(1) + '%;' +
      'animation-delay:-' + tRnd(0,2).toFixed(1) + 's"></i>');
    return {
      bg: '<div class="t-r-sky"></div>' +
          '<svg class="t-stand" viewBox="0 0 1200 200" preserveAspectRatio="none">' +
            '<path d="M0 200V96L1200 58V200Z"/></svg>' +
          '<div class="t-crowd">' + crowd + '</div>' +
          '<div class="t-flags">' + flags + '</div>' +
          '<div class="t-asphalt"><div class="t-lanes">' + dashes + '</div></div>' +
          '<div class="t-checker"></div>',
      fg: '<div class="t-speed">' + streaks + '</div><div class="t-vignette warm"></div>'
    };
  },

  /* ---------- CITY: dusk skyline, lit windows, traffic ---------- */
  city(){
    const tower = (left, w, h, colour) => {
      const floors = Math.floor(h / 16);
      const cells = Math.max(2, Math.floor(w / 15));
      const wins = tRep(floors * cells, () => {
        const lit = Math.random() < 0.42;
        return '<i class="' + (lit ? 'lit' : '') + '"' +
          (lit ? ' style="animation-delay:-' + tRnd(0,9).toFixed(1) + 's"' : '') + '></i>';
      });
      return '<div class="t-tower" style="left:' + left + '%;width:' + w + 'px;height:' + h + 'px;' +
        'background:' + colour + '"><div class="t-wins" style="grid-template-columns:repeat(' + cells + ',1fr)">' +
        wins + '</div></div>';
    };
    let x = -2, towers = '';
    while(x < 102){
      const w = tRnd(34, 78), h = tRnd(120, 340);
      towers += tower(x.toFixed(1), w.toFixed(0), h.toFixed(0),
        tPick(['#1d2436','#232b40','#1a2130','#262f45']));
      x += w / 15 + tRnd(1.4, 3.4);
    }
    const cars = tRep(7, i => '<i class="t-car' + (i % 2 ? ' back' : '') + '" style="' +
      'animation-duration:' + tRnd(5,12).toFixed(1) + 's;animation-delay:-' + tRnd(0,12).toFixed(1) + 's;' +
      'bottom:' + (i % 2 ? 26 : 12) + 'px"></i>');
    return {
      bg: '<div class="t-dusk"></div><div class="t-citysun"></div>' +
          '<i class="t-blink" style="top:16%;animation-duration:38s"></i>' +
          '<div class="t-skyline">' + towers + '</div>' +
          '<div class="t-haze"></div>',
      fg: '<div class="t-street">' + cars + '</div><div class="t-vignette"></div>'
    };
  },

  /* ---------- MINIMALIST: paper, one line, nothing moving ---------- */
  minimal(){
    return {
      bg: '<div class="t-paper"></div><div class="t-rule"></div><div class="t-dot"></div>',
      fg: ''
    };
  },

  /* ---------- HOME: a warm room, lamp on, rain outside the window ---------- */
  home(){
    const drops = tRep(30, () => '<i style="left:' + tRnd(2,96).toFixed(1) + '%;' +
      'animation-duration:' + tRnd(1.6,3.4).toFixed(1) + 's;animation-delay:-' + tRnd(0,3.4).toFixed(1) + 's"></i>');
    const leaves = tRep(7, i => '<span style="--i:' + i + ';--r:' + (-58 + i*19) + 'deg"></span>');
    return {
      bg: '<div class="t-wall"></div>' +
          '<div class="t-window"><div class="t-outside"><div class="t-wrain">' + drops + '</div></div>' +
            '<span class="t-mullion v"></span><span class="t-mullion h"></span></div>' +
          '<div class="t-lampglow"></div>' +
          '<div class="t-shelf"><i></i><i></i><i></i></div>' +
          '<div class="t-floor"></div>',
      fg: '<div class="t-plant">' + leaves + '</div><div class="t-lampcone"></div>'
    };
  },

  /* ---------- TRAVEL: high above the clouds ---------- */
  travel(){
    const clouds = tRep(9, () => '<i class="t-tcloud" style="top:' + tRnd(24,74).toFixed(1) + '%;' +
      'transform:scale(' + tRnd(.6,1.5).toFixed(2) + ');animation-duration:' + tRnd(48,110).toFixed(0) + 's;' +
      'animation-delay:-' + tRnd(0,110).toFixed(0) + 's;opacity:' + tRnd(.5,.95).toFixed(2) + '"></i>');
    return {
      bg: '<div class="t-highsky"></div>' +
          '<div class="t-sunhaze"></div>' +
          clouds +
          '<svg class="t-route" viewBox="0 0 1200 400" preserveAspectRatio="none">' +
            '<path d="M40 330 Q380 90 700 210 T1160 96"/></svg>' +
          '<div class="t-plane">' +
            '<svg viewBox="0 0 24 24"><path d="M2 13 22 5l-4.4 8.4L22 21 2 13z"/></svg>' +
            '<span class="t-trail"></span>' +
          '</div>',
      fg: '<div class="t-vignette soft"></div>'
    };
  },

  /* ---------- VILLAGE: fields at dusk, huts, fireflies ---------- */
  village(){
    const flies = tRep(20, () => '<i class="t-ffly2" style="left:' + tRnd(2,98).toFixed(1) + '%;' +
      'top:' + tRnd(48,88).toFixed(1) + '%;animation-delay:-' + tRnd(0,9).toFixed(1) + 's,-' +
      tRnd(0,5).toFixed(1) + 's"></i>');
    const hut = (l, s) => '<div class="t-hut" style="left:' + l + '%;transform:scale(' + s + ')">' +
      '<span class="roof"></span><span class="body"></span><span class="door"></span></div>';
    const rows = tRep(7, i => '<i style="top:' + (i*13) + '%;animation-delay:-' + (i*1.3) + 's"></i>');
    return {
      bg: '<div class="t-dusksky"></div><div class="t-vsun"></div>' +
          '<svg class="t-treeline" viewBox="0 0 1200 200" preserveAspectRatio="none">' +
            '<path d="M0 200V150Q60 108 120 148T240 132T360 156T480 124T600 152T720 130T840 158T960 128T1080 150T1200 134V200Z"/></svg>' +
          '<div class="t-fields">' + rows + '</div>' +
          hut(14, .9) + hut(62, 1.05) + hut(80, .72) +
          '<div class="t-well"><span></span></div>',
      fg: '<div class="t-flies">' + flies + '</div><div class="t-vignette warm"></div>'
    };
  },

  /* ---------- MILITARY: camo, olive light, a sweeping searchlight ---------- */
  military(){
    const r = () => tRnd(30,70).toFixed(0) + '%';
    const blobs = tRep(26, () => '<i style="left:' + tRnd(-4,100).toFixed(1) + '%;top:' + tRnd(-4,100).toFixed(1) + '%;' +
      'width:' + tRnd(90,300).toFixed(0) + 'px;height:' + tRnd(70,220).toFixed(0) + 'px;' +
      'background:' + tPick(['#3c4a2e','#4d5b39','#2c361f','#5b6543','#232a17']) + ';' +
      'border-radius:' + r() + ' ' + r() + ' ' + r() + ' ' + r() + '/' +
      r() + ' ' + r() + ' ' + r() + ' ' + r() + '"></i>');
    return {
      bg: '<div class="t-camo">' + blobs + '</div>' +
          '<div class="t-mgrid"></div>' +
          '<div class="t-sweep"></div>' +
          '<svg class="t-ridge" viewBox="0 0 1200 220" preserveAspectRatio="none">' +
            '<path d="M0 220V150L120 116L260 160L420 104L560 148L720 96L880 146L1040 108L1200 152V220Z"/></svg>' +
          '<div class="t-radar"><span></span><span class="ping"></span></div>',
      fg: '<div class="t-stencil">SECTOR 04 &middot; OPERATIONS</div><div class="t-vignette hard"></div>'
    };
  },

  /* ---------- ARTISTIC: canvas, wet paint, brush strokes ---------- */
  artistic(){
    const cols = ['#E2574C','#F0A830','#2E8B84','#4A5FBF','#C85A9E','#7BB661','#F2D14E'];
    const r = () => tRnd(35,65).toFixed(0) + '%';
    const splats = tRep(11, i => '<i class="t-splat" style="left:' + tRnd(-6,96).toFixed(1) + '%;' +
      'top:' + tRnd(-6,88).toFixed(1) + '%;width:' + tRnd(150,420).toFixed(0) + 'px;' +
      'height:' + tRnd(120,360).toFixed(0) + 'px;background:' + cols[i % cols.length] + ';' +
      'animation-delay:-' + tRnd(0,14).toFixed(1) + 's;' +
      'border-radius:' + r() + ' ' + r() + ' ' + r() + ' ' + r() + '/' +
      r() + ' ' + r() + ' ' + r() + ' ' + r() + '"></i>');
    const strokes = tRep(7, i => '<i class="t-stroke" style="left:' + tRnd(-4,80).toFixed(1) + '%;' +
      'top:' + tRnd(4,90).toFixed(1) + '%;width:' + tRnd(180,520).toFixed(0) + 'px;' +
      'background:' + cols[(i+3) % cols.length] + ';transform:rotate(' + tRnd(-28,28).toFixed(1) + 'deg);' +
      'animation-delay:-' + tRnd(0,9).toFixed(1) + 's"></i>');
    return {
      bg: '<div class="t-canvas"></div>' + splats + strokes + '<div class="t-weave"></div>',
      fg: '<div class="t-vignette soft"></div>'
    };
  },

  /* ---------- INDIAN MUSIC: a lamp-lit baithak, notes in the air ---------- */
  indianmusic(){
    const notes = ['&#9834;','&#9835;','&#9833;','&#9836;','&#2360;','&#2352;','&#2327;','&#2350;'];
    const floating = tRep(16, i => '<span class="t-note" style="left:' + tRnd(4,94).toFixed(1) + '%;' +
      'animation-duration:' + tRnd(13,26).toFixed(1) + 's;animation-delay:-' + tRnd(0,26).toFixed(1) + 's;' +
      'font-size:' + tRnd(15,32).toFixed(0) + 'px;opacity:' + tRnd(.2,.6).toFixed(2) + '">' +
      notes[i % notes.length] + '</span>');
    const petals = tRep(24, i => '<i style="transform:rotate(' + ((i/24)*360).toFixed(1) + 'deg) translateY(-96px)"></i>');
    const lamps = tRep(5, i => '<div class="t-diya" style="left:' + (12 + i*19) + '%;' +
      'animation-delay:-' + (i*0.7).toFixed(1) + 's"><span class="flame"></span></div>');
    return {
      bg: '<div class="t-raga"></div>' +
          '<div class="t-mandala">' + petals + '<span class="core"></span></div>' +
          '<div class="t-arch"><span></span><span></span><span></span></div>' +
          '<div class="t-notes">' + floating + '</div>' +
          '<svg class="t-tanpura" viewBox="0 0 200 420">' +
            '<ellipse cx="100" cy="336" rx="66" ry="74"/>' +
            '<rect x="86" y="34" width="28" height="290" rx="12"/>' +
            '<circle cx="100" cy="30" r="20"/>' +
            '<g class="strings"><path d="M92 40v290M97 40v290M103 40v290M108 40v290"/></g>' +
          '</svg>',
      fg: '<div class="t-diyas">' + lamps + '</div><div class="t-vignette warm"></div>'
    };
  }
};

/* ==========================================================
   APPLY
   ========================================================== */
function loadTheme(){
  try{ return localStorage.getItem(THEME_KEY) || THEME_DEFAULT; }catch(e){ return THEME_DEFAULT; }
}
function saveTheme(id){
  try{ localStorage.setItem(THEME_KEY, id); }catch(e){}
}

function renderThemeScene(id){
  const bgHost = document.getElementById('themescene');
  const fgHost = document.getElementById('themefg');
  const built  = (SCENES[id] || SCENES[THEME_DEFAULT])();
  if(bgHost) bgHost.innerHTML = built.bg;
  if(fgHost) fgHost.innerHTML = built.fg;
}

function applyTheme(id){
  if(!THEMES.some(t => t.id === id)) id = THEME_DEFAULT;
  THEMES.forEach(t => document.body.classList.toggle('theme-' + t.id, t.id === id));
  document.body.dataset.theme = id;
  document.querySelectorAll("[data-theme-pick]").forEach(b =>
    b.classList.toggle("on", b.dataset.themePick === id));
  renderThemeScene(id);
}

function setTheme(id){ saveTheme(id); applyTheme(id); }


/* the old weather buttons are gone — drop anything they left behind */
function clearLegacyFx(){
  ['rain','sun','snow','wind','herd','birds'].forEach(f =>
    document.body.classList.remove('fx-' + f));
  try{ localStorage.removeItem('ptracker.fx'); }catch(e){}
}

/* the theme layers live inside the two decoration hosts */
function mountThemeLayers(){
  const world = document.getElementById('world');
  const fg    = document.getElementById('foreground');
  if(world && !document.getElementById('themescene')){
    const d = document.createElement('div');
    d.className = 'theme-scene'; d.id = 'themescene';
    world.appendChild(d);
  }
  if(fg && !document.getElementById('themefg')){
    const d = document.createElement('div');
    d.className = 'theme-fg'; d.id = 'themefg';
    fg.appendChild(d);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  mountThemeLayers();
  clearLegacyFx();
  applyTheme(loadTheme());
});

/* ==========================================================
   THE THEMES PAGE
   The twelve buttons used to sit along the top bar, where they
   crowded the header and gave you no idea what you were picking.
   They now have a page of their own, reached from the menu, with
   a swatch of each theme's sky, card and accent colour.
   ========================================================== */
function viewThemes(){
  const current = document.body.dataset.theme || loadTheme();

  const card = t => `
    <button class="theme-card ${t.id === current ? 'on' : ''}"
            data-theme-pick="${t.id}" data-act="pick-theme"
            aria-pressed="${t.id === current}">
      <span class="tsw" data-t="${t.id}" aria-hidden="true">
        <i class="tsw-sky"></i><i class="tsw-card"></i><i class="tsw-dot"></i>
      </span>
      <span class="theme-name">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${t.icon}"/></svg>
        ${esc(t.label)}
      </span>
      <span class="theme-blurb">${esc(THEME_BLURB[t.id] || '')}</span>
      <span class="theme-tick">Currently on</span>
    </button>`;

  return `
  <div class="page t-themes">
    ${banner({
      tall: false,
      body: `<div>
        <h1>Themes</h1>
        <p class="sub">Pick how the tracker looks. The choice is remembered on this computer.</p>
      </div>`
    })}

    <div class="theme-grid">${THEMES.map(card).join('')}</div>

    <div class="foot">Changing the theme only changes the colours — nothing you have recorded moves.</div>
  </div>`;
}

/* wired through the same action system as every other button */
function themeAction(a, el){
  if(a !== 'pick-theme') return false;
  setTheme(el.dataset.themePick);
  render();
  toast(THEMES.find(t => t.id === el.dataset.themePick).label + ' theme on');
  return true;
}
