import { firebaseConfig, lagId } from './config.js';

/* =====================================================
   1. RUTA
   Punkter med navn vises som byer på kartet.
   Punkter uten navn former bare streken langs veien.
   ===================================================== */
const RUTE = [
  { navn:'Bergen',      lat:60.3913, lng:5.3221 },
  {                     lat:60.5900, lng:5.8100 },
  { navn:'Voss',        lat:60.6297, lng:6.4147 },
  {                     lat:61.0500, lng:7.8100 },
  {                     lat:60.9877, lng:9.2333 },
  {                     lat:60.1683, lng:10.2586 },
  { navn:'Oslo',        lat:59.9139, lng:10.7522 },
  {                     lat:59.1256, lng:11.3878 },
  {                     lat:58.3479, lng:11.9424 },
  { navn:'Göteborg',    lat:57.7089, lng:11.9746 },
  {                     lat:56.6739, lng:12.8578 },
  { navn:'Malmö',       lat:55.6050, lng:13.0038 },
  { navn:'København',   lat:55.6761, lng:12.5683 },
  {                     lat:54.6996, lng:11.3543 },
  {                     lat:54.5033, lng:11.2242 },
  {                     lat:53.8655, lng:10.6866 },
  { navn:'Hamburg',     lat:53.5511, lng:9.9937 },
  { navn:'Hannover',    lat:52.3759, lng:9.7320 },
  {                     lat:51.5413, lng:9.9158 },
  { navn:'Kassel',      lat:51.3127, lng:9.4797 },
  {                     lat:50.5841, lng:8.6784 },
  { navn:'Frankfurt',   lat:50.1109, lng:8.6821 },
  {                     lat:49.4875, lng:8.4660 },
  {                     lat:49.0069, lng:8.4037 },
  {                     lat:47.9990, lng:7.8421 },
  { navn:'Basel',       lat:47.5596, lng:7.5886 },
  {                     lat:47.0502, lng:8.3093 },
  {                     lat:46.5600, lng:8.5700 },
  {                     lat:46.1944, lng:9.0175 },
  {                     lat:45.8080, lng:9.0852 },
  { navn:'Milano',      lat:45.4642, lng:9.1900 },
  {                     lat:45.0526, lng:9.6929 },
  { navn:'Bologna',     lat:44.4949, lng:11.3426 },
  { navn:'Firenze',     lat:43.7696, lng:11.2558 },
  {                     lat:43.3188, lng:11.3308 },
  {                     lat:42.7185, lng:12.1108 },
  { navn:'Roma',        lat:41.9028, lng:12.4964 }
];

/* ---- Avstander langs ruta ---- */
function avstand(a, b){
  const R = 6371, rad = Math.PI/180;
  const dLat = (b.lat-a.lat)*rad, dLng = (b.lng-a.lng)*rad;
  const h = Math.sin(dLat/2)**2 +
            Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

let sum = 0;
RUTE[0].km = 0;
for (let i = 1; i < RUTE.length; i++){
  sum += avstand(RUTE[i-1], RUTE[i]);
  RUTE[i].km = sum;
}
const TOTAL = sum;
const BYER = RUTE.filter(p => p.navn);

/** Posisjon (lat/lng) etter et gitt antall kilometer langs ruta */
function posisjonEtter(km){
  const d = Math.max(0, Math.min(km, TOTAL));
  for (let i = 1; i < RUTE.length; i++){
    if (RUTE[i].km >= d){
      const a = RUTE[i-1], b = RUTE[i];
      const andel = (d - a.km) / (b.km - a.km || 1);
      return { lat: a.lat + (b.lat-a.lat)*andel, lng: a.lng + (b.lng-a.lng)*andel };
    }
  }
  return { lat: RUTE.at(-1).lat, lng: RUTE.at(-1).lng };
}

/* =====================================================
   2. LAGRING — Firebase hvis den er satt opp, ellers lokalt
   ===================================================== */
async function lagLager(){
  if (firebaseConfig && firebaseConfig.projectId){
    try {
      const { initializeApp } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
      const { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } =
        await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');

      const db  = getFirestore(initializeApp(firebaseConfig));
      const kol = collection(db, 'lag', lagId, 'okter');

      return {
        delt: true,
        lytt(cb){
          onSnapshot(query(kol, orderBy('opprettet','desc')),
            snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
            err  => visFeil('Mistet kontakt med databasen: ' + err.code));
        },
        async leggTil(o){ await addDoc(kol, o); },
        async slett(id){ await deleteDoc(doc(kol, id)); }
      };
    } catch (e){
      visFeil('Fikk ikke kontakt med Firebase. Viser lokal logg i stedet.');
    }
  }

  const NOKKEL = 'bergen-roma-okter-v1';
  let lyttere = [];
  const les  = () => JSON.parse(localStorage.getItem(NOKKEL) || '[]');
  const skriv = a => { localStorage.setItem(NOKKEL, JSON.stringify(a)); lyttere.forEach(f => f(les())); };

  return {
    delt: false,
    lytt(cb){
      lyttere.push(cb);
      cb(les());
      window.addEventListener('storage', () => cb(les()));
    },
    async leggTil(o){ skriv([{ id: crypto.randomUUID(), ...o }, ...les()]); },
    async slett(id){ skriv(les().filter(o => o.id !== id)); }
  };
}

/* =====================================================
   3. KART
   ===================================================== */
const kart = L.map('kart', { scrollWheelZoom:false, zoomControl:true });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom:12, attribution:'&copy; OpenStreetMap'
}).addTo(kart);

const linjePunkter = RUTE.map(p => [p.lat, p.lng]);
L.polyline(linjePunkter, { color:'#12262B', weight:2, opacity:.35, dashArray:'1 6' }).addTo(kart);
const tilbakelagt = L.polyline([], { color:'#C08A2E', weight:4, opacity:.95 }).addTo(kart);
kart.fitBounds(L.latLngBounds(linjePunkter).pad(0.06));

const byMarkorer = BYER.map(by =>
  L.marker([by.lat, by.lng], {
    icon: L.divIcon({ className:'', html:'<div class="by-ikon"></div>', iconSize:[9,9] })
  }).addTo(kart).bindTooltip(`${by.navn} · ${Math.round(by.km)} km`, { direction:'top' })
);

const loper = L.marker(posisjonEtter(0), {
  icon: L.divIcon({ className:'loper-ikon', html:'🏃', iconSize:[26,26], iconAnchor:[13,13] }),
  zIndexOffset: 1000
}).addTo(kart);

/* Myk bevegelse fra ett kilometertall til et annet */
let animasjon, visesNa = 0;
function flyttLoper(fra, til){
  cancelAnimationFrame(animasjon);
  const rolig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now(), tid = rolig ? 0 : 900;
  const steg = na => {
    const t = tid ? Math.min((na-start)/tid, 1) : 1;
    const e = 1 - Math.pow(1-t, 3);
    const km = fra + (til-fra)*e;
    loper.setLatLng(posisjonEtter(km));
    tilbakelagt.setLatLngs(sporTil(km));
    if (t < 1) animasjon = requestAnimationFrame(steg);
  };
  animasjon = requestAnimationFrame(steg);
}

function sporTil(km){
  const punkter = RUTE.filter(p => p.km <= km).map(p => [p.lat, p.lng]);
  const p = posisjonEtter(km);
  punkter.push([p.lat, p.lng]);
  return punkter;
}

/* =====================================================
   4. ETAPPELINJAL
   ===================================================== */
const linjalByer = document.getElementById('linjal-byer');
BYER.forEach(by => {
  const el = document.createElement('div');
  el.className = 'by-merke';
  el.style.left = (by.km / TOTAL * 100) + '%';
  el.innerHTML = '<span class="strek"></span>';
  const navn = document.createElement('span');
  navn.className = 'navn'; navn.textContent = by.navn;
  const km = document.createElement('span');
  km.className = 'avstand'; km.textContent = Math.round(by.km);
  el.append(navn, km);
  by.el = el;
  linjalByer.appendChild(el);
});

/* Viser så mange bynavn som får plass. Bergen og Roma står alltid. */
function fordelByMerker(){
  const bredde = linjalByer.clientWidth;
  if (!bredde) return;
  const minAvstand = 64;
  let sisteX = 0;
  BYER.forEach((by, i) => {
    if (i === 0 || i === BYER.length - 1){ by.el.classList.remove('skjult'); return; }
    const x = by.km / TOTAL * bredde;
    const plass = (x - sisteX) >= minAvstand && (bredde - x) >= minAvstand;
    by.el.classList.toggle('skjult', !plass);
    if (plass) sisteX = x;
  });
}
fordelByMerker();
window.addEventListener('load', fordelByMerker);
document.fonts?.ready.then(fordelByMerker);
let tidsavbrudd;
window.addEventListener('resize', () => {
  clearTimeout(tidsavbrudd);
  tidsavbrudd = setTimeout(fordelByMerker, 150);
});

/* =====================================================
   5. TEGN ALT
   ===================================================== */
const el = id => document.getElementById(id);
const nf  = new Intl.NumberFormat('nb-NO', { maximumFractionDigits:1 });

function tegn(okter){
  const total = okter.reduce((s,o) => s + Number(o.km || 0), 0);
  const kappet = Math.min(total, TOTAL);
  const andel = kappet / TOTAL * 100;

  el('teller-km').textContent    = nf.format(total);
  el('teller-total').textContent = nf.format(Math.round(TOTAL)) + ' km';

  el('linjal-fylt').style.width = andel + '%';
  el('linjal-loper').style.left = andel + '%';

  const passerte = BYER.filter(b => b.km <= kappet);
  const sist = passerte.at(-1) || BYER[0];
  const neste = BYER.find(b => b.km > kappet);

  BYER.forEach((b,i) => {
    b.el.classList.toggle('passert', b.km <= kappet);
    byMarkorer[i].getElement()?.querySelector('.by-ikon')
      ?.classList.toggle('passert', b.km <= kappet);
  });

  el('status-tekst').textContent =
    total >= TOTAL ? `Framme i Roma! Laget har løpt hele ruta – ${nf.format(total)} km til sammen.`
  : total === 0   ? 'Laget står på startstreken i Bergen. Legg inn den første økta.'
  : `Laget er ${Math.round(kappet - sist.km)} km sør for ${sist.navn}. ${nf.format(TOTAL - kappet)} km igjen til Roma.`;

  el('neste-by').textContent = neste
    ? `Neste stopp: ${neste.navn} om ${nf.format(neste.km - kappet)} km`
    : 'Ruta er fullført.';

  flyttLoper(visesNa, kappet);
  visesNa = kappet;

  tegnLag(okter);
  tegnLogg(okter);
}

function tegnLag(okter){
  const per = new Map();
  okter.forEach(o => per.set(o.navn, (per.get(o.navn) || 0) + Number(o.km || 0)));
  const rader = [...per.entries()].sort((a,b) => b[1]-a[1]);
  const mest = rader[0]?.[1] || 1;
  const liste = el('lagliste');
  liste.innerHTML = '';

  if (!rader.length){
    liste.innerHTML = '<li class="tom">Ingen kilometer registrert ennå.</li>';
    return;
  }
  rader.forEach(([navn, km], i) => {
    const li = document.createElement('li');
    const plass = document.createElement('span');
    plass.className = 'lag-plass'; plass.textContent = (i+1) + '.';
    const n = document.createElement('span');
    n.className = 'lag-navn'; n.textContent = navn;
    const stolpe = document.createElement('span');
    stolpe.className = 'lag-stolpe'; stolpe.style.width = (km/mest*90) + 'px';
    const k = document.createElement('span');
    k.className = 'lag-km'; k.textContent = nf.format(km) + ' km';
    li.append(plass, n, stolpe, k);
    liste.appendChild(li);
  });
}

function tegnLogg(okter){
  const liste = el('logg');
  liste.innerHTML = '';
  if (!okter.length){
    liste.innerHTML = '<li class="tom">Første økt legges inn til venstre.</li>';
    return;
  }
  [...okter].sort((a,b) => (b.opprettet||0)-(a.opprettet||0)).slice(0,60).forEach(o => {
    const li = document.createElement('li');

    const dato = document.createElement('span');
    dato.className = 'logg-dato';
    dato.textContent = (o.dato || '').split('-').reverse().slice(0,2).join('.');

    const tekst = document.createElement('span');
    tekst.className = 'logg-tekst';
    const navn = document.createElement('span');
    navn.className = 'logg-navn'; navn.textContent = o.navn;
    tekst.appendChild(navn);
    if (o.kommentar){
      const k = document.createElement('span');
      k.className = 'logg-kommentar'; k.textContent = ' — ' + o.kommentar;
      tekst.appendChild(k);
    }

    const km = document.createElement('span');
    km.className = 'logg-km'; km.textContent = nf.format(o.km) + ' km';

    const slett = document.createElement('button');
    slett.className = 'slett'; slett.textContent = '×';
    slett.title = 'Slett økta';
    slett.setAttribute('aria-label', `Slett ${o.km} km for ${o.navn}`);
    slett.onclick = async () => {
      if (confirm(`Slette ${nf.format(o.km)} km for ${o.navn}?`)) await lager.slett(o.id);
    };

    li.append(dato, tekst, km, slett);
    liste.appendChild(li);
  });
}

/* =====================================================
   6. SKJEMA
   ===================================================== */
function melding(tekst, ok){
  const m = el('skjema-melding');
  m.textContent = tekst;
  m.classList.toggle('ok', !!ok);
}
function visFeil(tekst){ melding(tekst, false); }

function toast(tekst){
  const t = el('toast');
  t.textContent = tekst;
  t.classList.add('vis');
  setTimeout(() => t.classList.remove('vis'), 4200);
}

el('f-dato').value = new Date().toISOString().slice(0,10);
el('f-navn').value = localStorage.getItem('bergen-roma-navn') || '';

el('f-send').onclick = async () => {
  const navn = el('f-navn').value.trim();
  const km   = Number(String(el('f-km').value).replace(',', '.'));
  const dato = el('f-dato').value;

  if (!navn)                     return melding('Skriv inn navnet ditt.');
  if (!km || km <= 0)            return melding('Skriv inn hvor mange kilometer du løp.');
  if (km > 200)                  return melding('Over 200 km på én økt? Del den opp i flere oppføringer.');
  if (!dato)                     return melding('Velg en dato.');

  const for_ = visesNa;
  el('f-send').disabled = true;
  try {
    await lager.leggTil({
      navn, km: Math.round(km*10)/10, dato,
      kommentar: el('f-kommentar').value.trim(),
      opprettet: Date.now()
    });
    localStorage.setItem('bergen-roma-navn', navn);
    el('f-km').value = ''; el('f-kommentar').value = '';
    melding(`${nf.format(km)} km lagt til. Bra jobba!`, true);

    const passert = BYER.find(b => b.km > for_ && b.km <= for_ + km);
    if (passert) setTimeout(() => toast(`🎉 Laget har passert ${passert.navn}!`), 900);
  } catch (e){
    melding('Klarte ikke å lagre: ' + (e.message || e));
  } finally {
    el('f-send').disabled = false;
  }
};

el('f-km').addEventListener('keydown', e => { if (e.key === 'Enter') el('f-send').click(); });

/* CSV til Excel */
let sisteOkter = [];
el('f-csv').onclick = () => {
  const rader = [['Dato','Navn','Kilometer','Kommentar'],
    ...[...sisteOkter].sort((a,b) => (a.dato||'').localeCompare(b.dato||''))
      .map(o => [o.dato, o.navn, String(o.km).replace('.', ','), o.kommentar || ''])];
  const csv = '\uFEFF' + rader.map(r => r.map(f => `"${String(f).replace(/"/g,'""')}"`).join(';')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' }));
  a.download = 'bergen-roma.csv';
  a.click();
};

/* =====================================================
   7. START
   ===================================================== */
const lager = await lagLager();
el('modus-merke').textContent = lager.delt ? 'Delt logg' : 'Lokal logg';
el('modus-merke').classList.toggle('lokal', !lager.delt);
if (!lager.delt){
  melding('Tallene lagres bare i denne nettleseren. Se README for å slå på delt logg.', true);
}
lager.lytt(okter => { sisteOkter = okter; tegn(okter); });
