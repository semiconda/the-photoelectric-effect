/* The Photoelectric Effect — the interactive apparatus.
 *
 * This is index.html's simulation, lifted WHOLE. Not a reimplementation and
 * not a tidy-up: the body of bootToy() below is that page's script verbatim,
 * character for character, because it is the piece of this project that has
 * been looked at most and nobody asked for it to change. It drives the same
 * canvas, reads the same controls and calls the same physics() out of
 * physics.js that the quiz is scored against.
 *
 * TWO THINGS WRAP IT, AND THEY ARE THE ONLY TWO.
 *
 * 1. A function, so that `const $`, `state`, `lightColor` and the rest stay
 *    off the global scope. present.html declares its own $ and anim.js its
 *    own lightColor; at top level in a classic script those would collide and
 *    the page would not parse.
 *
 * 2. Lazy boot. The original runs the moment its page loads, which here would
 *    mean an animation loop painting a canvas nobody can see for six parts
 *    before anyone reaches it. It starts the first time the slide is opened
 *    instead, and the second call does nothing.
 *
 * The script expects a few elements that belong to sections of index.html
 * this slide does not have - the energy bars, the Kmax-against-frequency
 * graph, the comparison cards. present.html carries hidden stubs for them,
 * which is what lets the script stay verbatim: it writes into them, nobody
 * sees it, and not one line had to be cut to make that true.
 */

function bootToy() {
/* ---- index.html's script begins, unmodified ------------------------- */
const $=id=>document.getElementById(id);
/* Which metal is selected, by name, for metalLook() in anim.js. */
function metalName(){return $('material').value==='custom'?'Custom':$('material').options[$('material').selectedIndex].text.split(' ·')[0];}
function shade(hex,f){const n=parseInt(hex.slice(1),16);return 'rgb('+Math.round((n>>16&255)*f)+','+Math.round((n>>8&255)*f)+','+Math.round((n&255)*f)+')';}let state,paused=false,time=0,last=0;
function update(){const phi=$('material').value==='custom'?+$('work').value:+$('material').value;state=physics(+$('wave').value,+$('intensity').value,phi);const s=state;$('customBox').hidden=$('material').value!=='custom';$('workValue').textContent=phi.toFixed(2)+' eV';$('waveValue').textContent=s.wavelength+' nm';$('intensityValue').textContent=s.intensity+'%';$('frequency').textContent='Frequency f = '+(s.frequency/1e12).toFixed(1)+' THz · '+(s.wavelength<380?'Ultraviolet (shown in violet)':s.wavelength>750?'Near infrared (shown in red)':'Visible light');$('threshold').textContent=s.threshold.toFixed(1)+' nm';$('energy').textContent=s.energy.toFixed(2)+' eV';$('kinetic').textContent=s.k>=0?s.k.toFixed(2)+' eV':'—';$('rate').textContent=s.rate.toFixed(2)+'×';$('status').textContent=s.intensity===0?'Light off · No incident photons':s.emits?'Emission · Photon energy exceeds the work function':'No emission · Photon energy does not exceed the work function';/* The status line sits on the paper now, not on the slate, so it takes the
   paper pair - the same two this page uses for the live badge. */
$('status').style.color=s.emits?'#0f7357':'#8a5f10';$('insight').textContent=s.intensity===0?'Increase intensity to turn on the light. Emission still depends on the energy of each photon.':s.k<0?'An additional '+(-s.k).toFixed(2)+' eV per photon is needed to reach threshold. More intensity will not help: shorten the wavelength or select a lower-work-function metal.':s.k===0?'At the ideal threshold, maximum kinetic energy is zero: no electrons travel outward.':'Each photon supplies '+phi.toFixed(2)+' eV to overcome the work function, leaving '+s.k.toFixed(2)+' eV as maximum kinetic energy. Higher intensity increases the number of electrons, not this energy.';
const bars=[['Photon energy',s.energy,'#bb9ce8'],['Work function',phi,'#e5bb76'],['maximum kinetic energy',Math.max(0,s.k),'#93d9db']];$('bars').innerHTML=bars.map(([n,v,c])=>`<div class="barrow"><span>${n}</span><div class="track"><div class="fill" style="width:${v/7*100}%;background:${c}"></div></div><span>${n==='maximum kinetic energy'&&s.k<0?'No emission':v.toFixed(2)+' eV'}</span></div>`).join('');$('balance').textContent=s.k<0?'Photon energy is below the work function. A negative difference is not a physical electron kinetic energy.':'Photon energy = work function + maximum kinetic energy';$('calculation').textContent=s.k<0?s.energy.toFixed(2)+' eV < '+phi.toFixed(2)+' eV → No emission':s.energy.toFixed(2)+' − '+phi.toFixed(2)+' = '+s.k.toFixed(2)+' eV';drawGraph();syncLaser();drawScene();}
function drawGraph(){const s=state,x=f=>55+f/1800*440,y=k=>190-k/6*160,f0=s.phi/H/1e12;let lines='';for(let k=0;k<=6;k+=2)lines+=`<line x1="55" y1="${y(k)}" x2="495" y2="${y(k)}" stroke="#4c4035"/><text x="36" y="${y(k)+5}" fill="#c0ad96">${k}</text>`;for(let f=0;f<=1800;f+=600)lines+=`<text x="${x(f)}" y="213" text-anchor="middle" fill="#c0ad96">${f}</text>`;$('graph').innerHTML=`<text x="12" y="17" fill="#c0ad96">Kmax (eV)</text><rect x="55" y="30" width="${x(f0)-55}" height="160" fill="#e5bb7610"/>${lines}<line x1="55" y1="30" x2="55" y2="190" stroke="#ad9272"/><line x1="55" y1="190" x2="495" y2="190" stroke="#ad9272"/><line x1="${x(f0)}" y1="30" x2="${x(f0)}" y2="190" stroke="#e5bb76" stroke-dasharray="4 5"/><path d="M ${x(f0)} 190 L 495 ${y(H*1800e12-s.phi)}" fill="none" stroke="#93d9db" stroke-width="2"/><text x="${55+(x(f0)-55)/2}" y="100" text-anchor="middle" fill="#c0ad96">No emission</text><text x="${f0>1100?x(f0)-6:x(f0)+6}" text-anchor="${f0>1100?'end':'start'}" y="45" fill="#e5bb76">f₀ = ${f0.toFixed(0)} THz</text><circle cx="${x(s.frequency/1e12)}" cy="${y(Math.max(0,s.k))}" r="6" fill="${s.k>0?'#93d9db':'#e5bb76'}"/><text x="495" y="237" text-anchor="end" fill="#c0ad96">Frequency f (THz)</text>`;}
const canvas=$('scene'),ctx=canvas.getContext('2d');
const /* Moved right with the angle. The beam drops 135px to the surface, so at 45
   degrees it also runs 135px across - from x=240 that lands at 375, which is
   65px short of the plate's left edge. From 485 it lands at 620, the middle
   of it. The old 68 degrees ran 334px across, which is why 240 worked then. */
/* Close to the surface, which is what the merged slide can afford. The beam
   drops from the laser to the metal and runs the same distance sideways at
   45 degrees, so a shorter drop is a shorter beam in both directions: 85px
   instead of 135 leaves the diagram a third less tall. x is whatever lands
   it on the middle of the plate, 620 - 85. */
laserOrigin={x:500,y:250};
let laserAngle=45,lastIntensity=50;/* FIXED. Aiming was a fourth variable on a slide about three. */
function laserTarget(){return {x:laserOrigin.x+(335-laserOrigin.y)*Math.tan(laserAngle*Math.PI/180),y:335};}
function syncLaser(){ $('angleValue').textContent=laserAngle.toFixed(1)+'°';$('laserPower').textContent=state.intensity>0?'Turn laser off':'Turn laser on';$('laserPower').setAttribute('aria-pressed',String(state.intensity>0)); }
let photons=[],electrons=[],impacts=[],photonClock=0,sequence=0;
function lightColor(w){if(w<380)return'#b69aff';if(w>750)return'#d86b58';const hue=270-(w-380)/(750-380)*270;return `hsl(${hue},85%,68%)`;}
function clearParticles(){photons=[];electrons=[];impacts=[];photonClock=0;}
function spawnPhoton(){const n=sequence++,target=laserTarget();photons.push({x:laserOrigin.x,y:laserOrigin.y,tx:target.x+(n%3-1)*3,ty:target.y,p:0,energy:state.energy,wavelength:state.wavelength});}
function advanceParticles(dt){if(!state)return;const flux=state.intensity/50*state.wavelength/400*5;if(flux>0){photonClock+=dt*flux;while(photonClock>=1){spawnPhoton();photonClock--;}}for(const p of photons){p.p+=dt/.95;if(p.p>=1){const k=p.energy-state.phi;impacts.push({x:p.tx,y:p.ty,age:0,success:k>0});if(k>0)electrons.push({x:p.tx,y:p.ty-5,v:95*Math.sqrt(k),angle:-Math.PI/2,/* straight out of the surface, not fanned */age:0,trail:[]});}}photons=photons.filter(p=>p.p<1);for(const e of electrons){e.trail.push({x:e.x,y:e.y});if(e.trail.length>8)e.trail.shift();e.x+=Math.cos(e.angle)*e.v*dt;e.y+=Math.sin(e.angle)*e.v*dt;e.age+=dt;}electrons=electrons.filter(e=>e.y>40&&e.x<1175&&e.age<9);for(const i of impacts)i.age+=dt;impacts=impacts.filter(i=>i.age<.55);}
function drawScene(){if(!state)return;const s=state,c=ctx,lit=s.intensity>0,color=lightColor(s.wavelength);c.clearRect(0,0,1200,480);const bg=c.createLinearGradient(0,0,0,480);bg.addColorStop(0,'#15252b');bg.addColorStop(1,'#10191d');c.fillStyle=bg;c.fillRect(0,0,1200,480);
// Diagram surface, light paths and energy cues are functional geometry.
c.strokeStyle='#ffffff06';c.lineWidth=1;for(let x=30;x<1200;x+=40){c.beginPath();c.moveTo(x,50);c.lineTo(x,410);c.stroke();}for(let y=50;y<430;y+=40){c.beginPath();c.moveTo(25,y);c.lineTo(1175,y);c.stroke();}
c.font='16px system-ui';c.fillStyle='#c5b69d';c.fillText('1  LASER POINTER',30,37);c.fillText('2  PHOTONS ARRIVE',400,37);c.fillText('3  ELECTRONS ESCAPE',640,37);
const target=laserTarget(),beamAngle=Math.atan2(target.y-laserOrigin.y,target.x-laserOrigin.x);
if(lit){c.save();c.strokeStyle=color;c.globalAlpha=.12+.32*s.intensity/100;c.shadowColor=color;c.shadowBlur=18;c.lineWidth=10;c.beginPath();c.moveTo(laserOrigin.x,laserOrigin.y);c.lineTo(target.x,target.y);c.stroke();c.globalAlpha=.4+.5*s.intensity/100;c.lineWidth=2;c.stroke();c.restore();}
/* The slab takes the selected metal's colour, from the same METAL table the
   slides draw their surfaces with, so copper is copper here too. */
const mk=metalLook(metalName()),plate=c.createLinearGradient(0,335,0,370);plate.addColorStop(0,mk.face);plate.addColorStop(.18,mk.body);plate.addColorStop(1,shade(mk.body,.55));c.fillStyle=plate;c.fillRect(200,335,960,31);c.fillStyle=mk.edge;c.fillRect(200,332,960,4);c.strokeStyle='#afc4cd55';for(let x=212;x<1160;x+=14){c.beginPath();c.moveTo(x,342);c.lineTo(x+8,358);c.stroke();}
c.font='18px system-ui';c.fillStyle='#f5e9d6';c.fillText(($('material').value==='custom'?'Custom metal':$('material').options[$('material').selectedIndex].text.split(' ·')[0])+' surface',213,400);c.font='15px system-ui';c.fillStyle='#e5bb76';c.fillText('Escape energy: '+s.phi.toFixed(2)+' eV',213,427);
// Rotating laser-pointer diagram; its aperture anchors the simulated ray.
c.save();c.translate(laserOrigin.x,laserOrigin.y);c.rotate(beamAngle);const barrel=c.createLinearGradient(0,-16,0,16);barrel.addColorStop(0,'#aabcc6');barrel.addColorStop(.25,'#e0e8ec');barrel.addColorStop(.55,'#60747e');barrel.addColorStop(1,'#283e49');c.fillStyle=barrel;c.beginPath();c.roundRect(-175,-15,165,30,10);c.fill();c.fillStyle='#253b47';c.fillRect(-42,-15,28,30);c.fillStyle='#c4d4dc';c.fillRect(-14,-11,14,22);c.fillStyle=lit?color:'#253b47';c.fillRect(-2,-7,4,14);c.fillStyle=lit?'#9debe4':'#69808a';c.beginPath();c.roundRect(-105,-20,24,7,3);c.fill();c.fillStyle='#182c36';c.font='bold 12px system-ui';c.fillText('LASER',-152,5);c.restore();
c.save();c.strokeStyle='#b9c7ce77';c.setLineDash([4,5]);c.beginPath();c.moveTo(target.x,335);c.lineTo(target.x,252);c.stroke();c.setLineDash([]);c.strokeStyle='#e5bb76';c.beginPath();c.arc(target.x,335,45,-Math.PI/2-laserAngle*Math.PI/180,-Math.PI/2);c.stroke();c.font='14px system-ui';c.fillStyle='#e5bb76';c.fillText('θ = '+laserAngle.toFixed(0)+'°',target.x-93,268);c.fillStyle='#a5b7ba';c.fillText('normal',target.x-52,241);c.strokeStyle=lit?color:'#82949b';c.lineWidth=2;c.beginPath();c.ellipse(target.x,335,15,6,0,0,Math.PI*2);c.stroke();c.restore();
c.font='16px system-ui';c.fillStyle='#c5d2d5';/* The two lines that sat here told the room how to aim, which it no longer
   can, and then how to read a picture it can see. */
for(const p of photons){const x=p.x+(p.tx-p.x)*p.p,y=p.y+(p.ty-p.y)*p.p,a=Math.atan2(p.ty-p.y,p.tx-p.x);c.save();c.translate(x,y);c.rotate(a);c.strokeStyle=lightColor(p.wavelength);c.lineWidth=2.5;c.shadowBlur=7;c.shadowColor=c.strokeStyle;c.beginPath();const period=7+14*(p.wavelength-180)/620;for(let j=-15;j<=15;j++){const yy=Math.sin((j+15)/period*Math.PI*2)*5;j===-15?c.moveTo(j,yy):c.lineTo(j,yy);}c.stroke();c.restore();}
for(const i of impacts){c.save();c.globalAlpha=Math.max(0,1-i.age/.55);c.strokeStyle=i.success?'#9debe4':'#e5bb76';c.lineWidth=2;c.beginPath();c.arc(i.x,i.y,4+i.age*30,Math.PI,Math.PI*2);c.stroke();c.restore();}
for(const e of electrons){c.save();c.strokeStyle='#93d9db66';c.lineWidth=2;c.beginPath();e.trail.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();c.fillStyle='#9debe4';c.shadowColor='#93d9db';c.shadowBlur=12;c.beginPath();c.arc(e.x,e.y,7,0,Math.PI*2);c.fill();c.shadowBlur=0;c.strokeStyle='#12383a';c.beginPath();c.moveTo(e.x-3,e.y);c.lineTo(e.x+3,e.y);c.stroke();c.restore();}
c.font='16px system-ui';c.fillStyle=lit?(s.emits?'#9debe4':'#e5bb76'):'#c5b69d';c.fillText(!lit?'Laser off':s.emits?'Energy left over → motion!':'Not enough energy to escape',680,103);c.font='14px system-ui';c.fillStyle='#a5b7ba';c.fillText(lit?'Each wave packet represents one photon.':'Turn up the intensity to switch on the laser.',213,455);}
function animate(t){const dt=last?Math.min((t-last)/1000,.05):0;if(!paused){time+=dt;advanceParticles(dt);}last=t;drawScene();requestAnimationFrame(animate);}
['material','work','wave','intensity'].forEach(id=>$(id).addEventListener('input',()=>{clearParticles();update();}));$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'Resume animation':'Pause animation';};function preset(m,w,i){$('material').value=m;$('wave').value=w;$('intensity').value=i;time=0;clearParticles();update();}$('reset').onclick=()=>{paused=false;$('pause').textContent='Pause animation';laserAngle=68;$('angle').value='68';preset('2.30',400,50);};document.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>{const p={red:['2.30',700,100],bright:['2.30',400,25],metal:['4.30',400,50]}[b.dataset.preset];preset(...p);});update();requestAnimationFrame(animate);
let comparisonsPaused=false;
$('comparePause').onclick=()=>{comparisonsPaused=!comparisonsPaused;document.querySelector('.comparison').classList.toggle('is-paused',comparisonsPaused);$('comparePause').textContent=comparisonsPaused?'Resume comparisons':'Pause comparisons';};
document.querySelectorAll('[data-demo]').forEach(button=>button.onclick=()=>{preset('4.30',button.dataset.demo==='uv-zinc'?250:700,50);document.querySelector('.lab').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});$('wave').focus({preventScroll:true});});

/* Ignores what it is given. The slider is gone and dragging the canvas no
   longer aims; the listeners stay so the rest of the script is untouched. */
function setLaserAngle(){}
$('angle').addEventListener('input',()=>setLaserAngle($('angle').value));
$('laserPower').onclick=()=>{if(state.intensity>0){lastIntensity=state.intensity;$('intensity').value='0';}else{$('intensity').value=String(lastIntensity||50);}clearParticles();update();};
let aiming=false;
function aimAt(event){const r=canvas.getBoundingClientRect(),x=(event.clientX-r.left)*880/r.width;setLaserAngle(Math.atan2(x-laserOrigin.x,135)*180/Math.PI);}
canvas.addEventListener('pointerdown',event=>{aiming=true;canvas.setPointerCapture(event.pointerId);aimAt(event);});
canvas.addEventListener('pointermove',event=>{if(aiming)aimAt(event);});
canvas.addEventListener('pointerup',()=>{aiming=false;});canvas.addEventListener('pointercancel',()=>{aiming=false;});
canvas.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setLaserAngle(laserAngle+(event.key==='ArrowRight'?1:-1));}});
/* ---- index.html's script ends --------------------------------------- */
}

window.Toy = {
  /* Called when the slide is first shown. Idempotent: the apparatus is built
     once and keeps running after that, so coming back to it finds it as it
     was left rather than reset. */
  boot: function () {
    if (window.Toy._booted) return;
    window.Toy._booted = true;
    bootToy();
  },
  _booted: false
};
