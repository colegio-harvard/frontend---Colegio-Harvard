import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { HiAcademicCap, HiBookOpen, HiClipboardCheck, HiCog, HiPrinter, HiShieldCheck, HiPencil, HiTrash, HiChevronDown } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/libretasService';
import insigniaHarvard from '../assets/logo-oficial-padre.webp';
import insigniaJesus from '../assets/insignia-jesus.webp';
import ninosPortada from '../assets/ninos-portada.png';
import insigniaFamilia from '../assets/insignia-familia.png';
import familiaLeyendo from '../assets/familia-leyendo.png';
import { fileUrl } from '../utils/constants';

const NOTAS = ['', 'AD', 'A', 'B', 'C'];
const tabsAdmin = [
  ['registro', 'Registro de notas', HiBookOpen], ['acom', 'Conducta y hábitos', HiClipboardCheck], ['config', 'Cursos y responsables', HiCog],
  ['periodos', 'Bimestres', HiClipboardCheck], ['merito', 'Orden de mérito', HiAcademicCap],
  ['auditoria', 'Auditoría', HiShieldCheck],
];

const errorText = e => e.response?.data?.error || 'No se pudo completar la operación';

function SelectorCursos({ cursos, seleccionados, onChange }) {
  const [abierto, setAbierto] = useState(false);
  const ids = seleccionados || [];
  const toggle = id => onChange(ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  return <div className="relative mt-3">
    <button type="button" onClick={()=>setAbierto(!abierto)} className="input-field flex items-center justify-between text-left">
      <span>{ids.length ? `${ids.length} curso${ids.length===1?'':'s'} seleccionado${ids.length===1?'':'s'}` : 'Seleccione uno o varios cursos'}</span><HiChevronDown className={`transition-transform ${abierto?'rotate-180':''}`}/>
    </button>
    {abierto&&<div className="absolute z-30 mt-1 w-full max-h-72 overflow-y-auto rounded-xl border border-gold-300 bg-white p-2 shadow-xl">
      <div className="flex justify-between px-2 py-1 text-xs"><button type="button" className="text-gold-700 font-medium" onClick={()=>onChange(cursos.map(c=>Number(c.id)))}>Seleccionar todos</button><button type="button" className="text-primary-600" onClick={()=>onChange([])}>Limpiar</button></div>
      {cursos.map(c=><label key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-cream-50 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-red-700" checked={ids.includes(Number(c.id))} onChange={()=>toggle(Number(c.id))}/><span className="text-sm"><b>{c.nombre}</b><small className="block text-cream-600">{c.area}</small></span></label>)}
      <button type="button" className="btn-gold w-full mt-2" onClick={()=>setAbierto(false)}>Listo ({ids.length})</button>
    </div>}
    {tab==='acom'&&<section className="bg-white p-5 rounded-2xl border border-cream-200 space-y-4"><div><h2 className="text-lg font-semibold text-primary-800">Nota del padre de familia</h2><p className="text-sm text-cream-600">Registre AD, A, B o C para cada concepto del alumno y bimestre seleccionados arriba.</p></div>{!acom.alumno?<p className="p-4 rounded-xl bg-amber-50 text-amber-800">Seleccione primero un alumno en la sección Conducta y hábitos.</p>:<div className="grid md:grid-cols-2 gap-3">{data?.criteriosPadre?.map(c=><label key={c.id} className="flex justify-between items-center gap-3 border border-cream-200 rounded-xl p-3"><span>{c.nombre}</span><select className="input-field !w-24" value={acom.padreNotas?.[c.id]||''} onChange={e=>setAcom({...acom,padreNotas:{...(acom.padreNotas||{}),[c.id]:e.target.value}})}>{NOTAS.map(n=><option key={n} value={n}>{n||'—'}</option>)}</select></label>)}</div>}<div className="flex justify-end"><button className="btn-primary" disabled={!acom.alumno||(!admin&&periodo?.estado!=='ABIERTO')} onClick={guardarConducta}>Guardar nota del padre</button></div></section>}
  </div>;
}

function imprimirLibretaAnterior(data, ventana) {
  if (!ventana) {
    ventana = window.open('', '_blank', 'width=1200,height=850');
    if (!ventana) return toast.error('Permita las ventanas emergentes para imprimir');
    ventana.opener = null;
  }
  const { alumno, notas, conducta, observaciones } = data;
  const cursos = [...new Map(notas.map(n => [`${n.area}|${n.curso}`, { area: n.area, curso: n.curso }])).values()];
  const celda = (arr, nombre, p, campo = 'curso') => arr.find(x => x[campo] === nombre && Number(x.numero) === p)?.calificacion || '';
  const comentario = p => observaciones.find(x => x.tipo === 'COMENTARIO_TUTOR' && Number(x.numero) === p)?.texto || observaciones.find(x => x.tipo === 'COMENTARIO_DOCENTE' && Number(x.numero) === p)?.texto || '';
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Libreta - ${alumno.nombre_completo}</title><style>
  @page{size:A4 landscape;margin:7mm}*{box-sizing:border-box}body{margin:0;color:#4b1515;font-family:Arial;background:#fffaf2}.page{width:100%;min-height:190mm;border:3px double #9b1c25;padding:12mm;page-break-after:always;background:linear-gradient(135deg,#fffdf8,#fff8eb)}h1,h2{font-family:Georgia;color:#7d1018}.cover{display:grid;grid-template-columns:1fr 1fr;gap:15mm}.brand{text-align:center;border:1px solid #c9973e;border-radius:18px;padding:12mm}.brand h1{font-size:42px;margin:10px}.badge{background:#850f18;color:white;padding:10px 30px;border-radius:22px;font-size:26px;font-weight:bold}.student{margin-top:28px;text-align:left;border:2px solid #d4a14a;border-radius:14px;padding:18px;font-size:18px;line-height:2}.quote{font-family:Georgia;font-style:italic}.legend{display:grid;gap:7px;margin-top:20px}.legend div{padding:8px;border-left:12px solid #a71d2a;background:#fff}.title{font-size:27px;border-bottom:2px solid #c9973e;padding-bottom:8px}table{width:100%;border-collapse:collapse;background:#fffdf8}th{background:#8d1520;color:white}th,td{border:1px solid #d6b77e;padding:7px;text-align:center}td:nth-child(1),td:nth-child(2){text-align:left}.inside{display:grid;grid-template-columns:2fr 1fr;gap:12px}.comments{display:grid;gap:10px}.comment{border:1px solid #d6b77e;border-radius:12px;padding:12px;min-height:65px;background:white}.footer{text-align:center;margin-top:14px;font-family:Georgia}@media print{button{display:none}.page:last-child{page-break-after:auto}}</style></head><body>
  <section class="page cover"><div><h2 class="title">SITUACIÓN AL FINALIZAR EL AÑO LECTIVO</h2><p>Inicial: culminación del año escolar</p><div class="legend"><div><b>AD — Logro destacado</b><br>Supera lo esperado para la competencia.</div><div><b>A — Logro esperado</b><br>Alcanza satisfactoriamente lo programado.</div><div><b>B — En proceso</b><br>Requiere acompañamiento para lograrlo.</div><div><b>C — En inicio</b><br>Necesita mayor tiempo y apoyo docente.</div></div></div><div class="brand"><p class="quote">“La tradición es un reto para la educación”</p><h2>Colegio</h2><h1>Harvard</h1><p>INICIAL – PRIMARIA – SECUNDARIA</p><div class="badge">LIBRETA DE NOTAS</div><div class="student"><b>ALUMNO:</b> ${alumno.nombre_completo}<br><b>CÓDIGO:</b> ${alumno.codigo_alumno}<br><b>GRADO:</b> ${alumno.grado} &nbsp; <b>SECCIÓN:</b> ${alumno.seccion}<br><b>NIVEL:</b> ${alumno.nivel} &nbsp; <b>AÑO:</b> ${alumno.anio}<br><b>TELÉFONO:</b> ${alumno.celular || ''}</div><p class="quote">“Enseña al niño el camino en que debe andar”</p><p><b>Tutor(a):</b> ${alumno.tutor || ''}</p></div></section>
  <section class="page"><h2 class="title">DISTRIBUCIÓN DE ÁREAS Y CURSOS — ${alumno.nombre_completo}</h2><div class="inside"><div><table><thead><tr><th>ÁREA</th><th>CURSO</th><th>I</th><th>II</th><th>III</th><th>IV</th></tr></thead><tbody>${cursos.map(c => `<tr><td>${c.area}</td><td>${c.curso}</td>${[1,2,3,4].map(p=>`<td>${celda(notas,c.curso,p)}</td>`).join('')}</tr>`).join('')}</tbody></table><h2>Conducta y hábitos</h2><table><thead><tr><th>CONCEPTO</th><th>I</th><th>II</th><th>III</th><th>IV</th></tr></thead><tbody>${[...new Set(conducta.map(c=>c.nombre))].map(n=>`<tr><td>${n}</td>${[1,2,3,4].map(p=>`<td>${celda(conducta,n,p,'nombre')}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div><h2>COMENTARIO DEL PROFESOR</h2><div class="comments">${[1,2,3,4].map(p=>`<div class="comment"><b>${p}.</b> ${comentario(p)}</div>`).join('')}</div></div></div><p class="footer">Colegio Harvard — UGEL 06</p></section><script>window.onload=()=>setTimeout(()=>window.print(),250)</script></body></html>`;
  ventana.document.open();
  ventana.document.write(html);
  ventana.document.close();
}

function imprimirLibreta(data, ventana) {
  if (!ventana) {
    ventana = window.open('', '_blank', 'width=1200,height=850');
    if (!ventana) return toast.error('Permita las ventanas emergentes para imprimir');
    ventana.opener = null;
  }
  const { alumno, notas = [], conducta = [], notasPadre = [], observaciones = [], criterios = [], criteriosPadre = [] } = data;
  const esc = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  const nota = (lista, nombre, periodo, campo = 'curso') => esc(lista.find(x => x[campo] === nombre && Number(x.numero) === periodo)?.calificacion || '');
  const cursos = [...new Map(notas.map(n => [`${n.area}|${n.curso}`, { area:n.area, curso:n.curso }])).values()];
  const grupos = cursos.reduce((m, c) => (m[c.area] = [...(m[c.area] || []), c], m), {});
  const iconoArea = area => {
    const a = String(area || '').toUpperCase();
    if (a.includes('COMUNIC')) return '▤';
    if (a.includes('PERSONAL')) return '♣';
    if (a.includes('PSICOMOT')) return '⚑';
    if (a.includes('CIENCIA')) return '⚛';
    if (a.includes('MATEM')) return 'π';
    return '◆';
  };
  const filasCursos = Object.entries(grupos).map(([area, lista]) => lista.map((c, i) => `<tr>${i === 0 ? `<td class="area" rowspan="${lista.length}"><span class="row-icon area-icon">${iconoArea(area)}</span><span>${esc(area)}</span></td>` : ''}<td>${esc(c.curso)}</td>${[1,2,3,4].map(p => `<td class="grade">${nota(notas,c.curso,p)}</td>`).join('')}</tr>`).join('')).join('');
  const nombresConducta = criterios.length ? criterios.map(c => c.nombre) : [...new Set(conducta.map(c => c.nombre))];
  const iconosConducta = ['☑','◷','▤','☆','♡','⚖','♢','⌂','♧','♡'];
  const filasConducta = nombresConducta.map((n, i) => `<tr><td><span class="row-icon conduct-icon">${iconosConducta[i] || '◇'}</span><span>${esc(n)}</span></td>${[1,2,3,4].map(p => `<td class="grade">${nota(conducta,n,p,'nombre')}</td>`).join('')}</tr>`).join('');
  const observacion = (tipo, p) => esc(observaciones.find(x => x.tipo === tipo && Number(x.numero) === p)?.texto || '');
  const foto = alumno.foto_url ? fileUrl(alumno.foto_url) : '';
  const partesNombre = String(alumno.nombre_completo || '').trim().split(/\s+/).filter(Boolean);
  const nombresAlumno = partesNombre.length > 2 ? partesNombre.slice(0, -2).join(' ') : (partesNombre[0] || '');
  const apellidosAlumno = partesNombre.length > 2 ? partesNombre.slice(-2).join(' ') : partesNombre.slice(1).join(' ');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Libreta - ${esc(alumno.nombre_completo)}</title><style>
  @page{size:A4 landscape;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#eee;color:#4b1115;font-family:Arial,sans-serif}.sheet{width:297mm;height:210mm;padding:5mm;background:#fffaf0;page-break-after:always;position:relative;overflow:hidden}.sheet:before{content:"";position:absolute;inset:2.5mm;border:1px solid #8c121b;outline:1px solid #d6a64a;outline-offset:1.2mm;pointer-events:none}.spread{height:100%;display:grid;grid-template-columns:1fr 1fr;gap:5mm}.panel{position:relative;border:1px solid #d39b3b;border-radius:4mm;padding:5mm;overflow:hidden}.orn{height:2px;background:linear-gradient(90deg,transparent,#b77b22 25%,#8c121b 50%,#b77b22 75%,transparent);margin:2mm 0}.serif{font-family:Georgia,serif}.wine{color:#7f1018}.brand{text-align:center}.brand .college{font:700 13mm Georgia;color:#681016;line-height:.9}.brand .small{font:700 4mm Georgia;letter-spacing:.4mm}.logo{width:35mm;height:35mm;border-radius:50%;object-fit:cover;border:1.5mm solid #d2a13e}.logo.small{width:27mm;height:27mm}.photo{width:28mm;height:34mm;object-fit:cover;border:1mm solid #d2a13e;border-radius:2mm;background:white}.photo.empty{display:flex;align-items:center;justify-content:center;color:#aa9476}.titlebar{background:#8c1019;color:white;border:1mm solid #c99a37;border-radius:5mm;padding:2mm 5mm;font:700 7mm Georgia;text-align:center}.identity{border:1px solid #d3a14a;border-radius:3mm;padding:3mm;text-align:left;margin-top:3mm;font-size:3.4mm;line-height:1.8}.identity b{display:inline-block;min-width:25mm}.cover-grid{display:grid;grid-template-columns:31mm 1fr;gap:4mm;align-items:center;margin:3mm 0}.status{display:grid;grid-template-columns:29mm 1fr 25mm;gap:4mm;align-items:center}.statusbox{border:1px dashed #c89a4a;border-radius:3mm;padding:3mm;font:700 3.1mm Georgia;line-height:1.8}.scale{font-size:3mm;line-height:1.7}.parent-title,.section-title{background:#8c1019;color:white;text-align:center;padding:1.5mm;font:700 4.2mm Georgia;border-radius:2mm 2mm 0 0}.parent-table,.grades{width:100%;border-collapse:collapse;background:#fffdf7;font-size:2.6mm}.parent-table th,.parent-table td,.grades th,.grades td{border:1px solid #d6b77e;padding:1.1mm}.parent-table th,.grades th{background:#8c1019;color:white}.legend{margin-top:2mm}.legend-row{display:grid;grid-template-columns:10mm 1fr;border:1px solid #d7b67b;border-bottom:0;font-size:2.4mm}.legend-row:last-child{border-bottom:1px solid #d7b67b}.legend-key{color:white;font:700 5mm Georgia;text-align:center;padding:2mm}.legend-text{padding:1.2mm}.back{display:grid;grid-template-columns:2.05fr .95fr;gap:4mm;height:100%}.leftcol{display:flex;flex-direction:column;min-height:0}.back-title{font:700 5.4mm Georgia;margin:1mm 0;color:#781019}.grades{font-size:2.55mm}.grades td{height:5.2mm}.grades .area{font-weight:bold;width:33mm}.grades .grade{width:10mm;text-align:center;font-weight:bold}.bottom{display:grid;grid-template-columns:1.55fr .85fr;gap:3mm;margin-top:3mm;min-height:0}.conduct td{height:4.8mm}.comments{border:1px solid #d5a24a;border-radius:3mm;overflow:hidden}.comment{min-height:18mm;border-bottom:1px solid #d6b77e;padding:2mm;font-size:2.6mm;background:#fffdf7}.comment:last-child{border:0}.bubble{display:inline-flex;width:7mm;height:7mm;align-items:center;justify-content:center;border-radius:50%;background:#8c1019;color:white;font-weight:bold;margin-right:2mm}.sidebrand{text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:3mm}.sidebrand .verse{font:italic 3.3mm Georgia;line-height:1.4}.family{width:100%;height:48mm;border-radius:50% 50% 12% 12%;background:radial-gradient(circle at 50% 30%,#fff6dc,#edd2a0);display:flex;align-items:center;justify-content:center;color:#8c1019;font:700 5mm Georgia;border:1px solid #d7ad65}.footer{text-align:center;font:italic 2.8mm Georgia;margin-top:auto}@media print{html,body{background:white}.sheet{margin:0}.sheet:last-child{page-break-after:auto}}@media screen{.sheet{margin:8px auto;box-shadow:0 3px 18px #999}}
  </style></head><body>
  <section class="sheet"><div class="spread"><div class="panel">
    <div class="status"><div class="statusbox">SITUACIÓN AL FINALIZAR EL AÑO LECTIVO<br>Promovido: ____<br>Repite: ____<br>Recuperación:<br>____________</div><div class="brand"><p class="serif"><i>“La tradición es un reto para la educación”</i></p><div class="small">Colegio</div><div class="college">Harvard</div><img class="logo small" src="${insigniaHarvard}"></div><div class="scale"><b>Escala de equivalencia:</b><br>AD&nbsp; 16–20<br>A&nbsp;&nbsp; 11–15<br>B&nbsp;&nbsp; 06–10<br>C&nbsp;&nbsp; 00–05</div></div>
    <div class="parent-title">NOTA DEL PADRE DE FAMILIA</div><table class="parent-table"><thead><tr><th>CONCEPTO</th><th>I</th><th>II</th><th>III</th><th>IV</th></tr></thead><tbody><tr><td>Acompañamiento y apoyo familiar</td>${[1,2,3,4].map(p=>`<td>${observacion('NOTA_PADRE',p)}</td>`).join('')}</tr></tbody></table>
    <div class="legend">${[['AD','#1499a8','LOGRO DESTACADO','Supera lo esperado respecto a la competencia.'],['A','#4ca564','LOGRO ESPERADO','Alcanza satisfactoriamente lo programado.'],['B','#e29a17','EN PROCESO','Requiere acompañamiento para lograrlo.'],['C','#d9343a','EN INICIO','Necesita mayor tiempo y apoyo docente.']].map(x=>`<div class="legend-row"><div class="legend-key" style="background:${x[1]}">${x[0]}</div><div class="legend-text"><b>${x[2]}</b><br>${x[3]}</div></div>`).join('')}</div>
  </div><div class="panel brand"><div class="small">Colegio</div><div class="college">Harvard</div><div class="small">INICIAL – PRIMARIA – SECUNDARIA</div><div class="orn"></div><div class="cover-grid">${foto?`<img class="photo" src="${foto}">`:'<div class="photo empty">FOTO</div>'}<img class="logo" src="${insigniaHarvard}"></div><div class="titlebar">LIBRETA DE NOTAS</div><div class="identity"><b>ALUMNO:</b>${esc(alumno.nombre_completo)}<br><b>CÓDIGO:</b>${esc(alumno.codigo_alumno)}<br><b>GRADO:</b>${esc(alumno.grado)} &nbsp; <b>SECCIÓN:</b>${esc(alumno.seccion)}<br><b>NIVEL:</b>${esc(alumno.nivel)} &nbsp; <b>AÑO:</b>${esc(alumno.anio)}<br><b>TELÉFONO:</b>${esc(alumno.celular)}</div><p class="serif"><i>“Enseña al niño el camino en que debe andar, y cuando sea viejo no se apartará de él”</i></p><div class="identity"><b>Tutor(a):</b>${esc(alumno.tutor)}</div></div></div></section>
  <section class="sheet"><div class="back"><div class="leftcol"><div class="back-title">DISTRIBUCIÓN DE HORAS POR ÁREA Y CURSO</div><table class="grades"><thead><tr><th>ÁREAS CURRICULARES</th><th>CURSOS POR ÁREA</th><th>I</th><th>II</th><th>III</th><th>IV</th></tr></thead><tbody>${filasCursos}</tbody></table><div class="bottom"><div><div class="section-title">CONDUCTA Y HÁBITOS</div><table class="grades conduct"><thead><tr><th>CONCEPTOS</th><th>I</th><th>II</th><th>III</th><th>IV</th></tr></thead><tbody>${filasConducta}</tbody></table></div><div class="comments"><div class="section-title">COMENTARIO DEL PROFESOR</div>${[1,2,3,4].map(p=>`<div class="comment"><span class="bubble">${p}</span>${observacion('COMENTARIO_TUTOR',p)||observacion('COMENTARIO_DOCENTE',p)}</div>`).join('')}</div></div><div class="footer">Colegio Harvard · UGEL 06 · Año ${esc(alumno.anio)}</div></div><aside class="panel sidebrand"><p class="verse">“Enseña al niño el camino en que debe andar, y cuando sea viejo no se apartará de él”<br>(Proverbios 22:6)</p><img class="logo" src="${insigniaHarvard}"><div><b class="serif wine">DESDE 1985</b><p class="verse">Cultivamos mentes curiosas<br>y corazones felices</p></div><div class="family">COLEGIO<br>HARVARD</div></aside></div></section><script>window.onload=()=>setTimeout(()=>window.print(),450)</script></body></html>`;
  const conceptosPadre = criteriosPadre.length ? criteriosPadre.map(c => c.nombre) : [
    'Ayuda al niño en sus tareas', 'Ayuda a corregir las malas conductas del niño',
    'Asiste a los llamados del profesor', 'Cumple el Reglamento del Colegio',
    'Participa en las actividades', 'Asiste a las reuniones', 'Conducta del padre',
  ];
  const filasPadre = conceptosPadre.map(concepto => `<tr><td>${concepto}</td>${[1,2,3,4].map(p => `<td>${nota(notasPadre,concepto,p,'nombre')}</td>`).join('')}</tr>`).join('')
    + `<tr class="parent-observation"><td>Observación registrada</td>${[1,2,3,4].map(p => `<td>${observacion('NOTA_PADRE',p)}</td>`).join('')}</tr>`;
  const mejorasCaraUno = `<style>
    html,body,.sheet,.panel,.brand,.identity,.family,.parent-table,.grades,.comment,.legend-text{background:#fff!important;background-image:none!important}
    .sheet:first-of-type .spread{gap:3mm}.sheet:first-of-type .panel{padding:4mm 5mm;border-radius:1.5mm}
    .sheet:first-of-type .status{grid-template-columns:36mm 1fr 28mm;gap:3mm;align-items:start}
    .sheet:first-of-type .statusbox{min-height:65mm;padding:4mm 3mm 3mm;text-align:center;font-size:3.05mm;line-height:1.55;border:1px dashed #b9822f;background:#fff}
    .sheet:first-of-type .statusbox:before{content:'▤';display:block;margin:0 auto 2mm;width:10mm;height:10mm;border-radius:50%;background:#791018;color:white;text-align:center;line-height:10mm;font-size:5mm}
    .sheet:first-of-type .status .brand p{margin:0 0 1mm;font-size:3.05mm;white-space:nowrap}.sheet:first-of-type .status .brand p:after{content:'Álvaro Siza';display:block;text-align:right;font-size:2.8mm;font-weight:bold;margin:1mm 2mm 0 0}
    .sheet:first-of-type .brand .small{font-size:5.4mm;margin-top:1mm}.sheet:first-of-type .brand .college{font-size:14.5mm;line-height:.84;letter-spacing:-.6mm}
    .sheet:first-of-type .status .brand .college:after{content:'◆';display:block;font-size:3mm;color:#c08b35;letter-spacing:4mm;border-top:1px solid #c08b35;margin:2mm auto 0;width:80%}
    .sheet:first-of-type .logo.small{width:43mm;height:43mm;border:0;object-fit:contain;margin-top:0}
    .sheet:first-of-type .scale{margin-top:20mm;padding-left:4mm;border-left:1px solid #b9822f;font:3.05mm Georgia;line-height:1.85}.sheet:first-of-type .scale b{font-size:3.25mm}
    .sheet:first-of-type .parent-title{margin-top:0;padding:1.6mm;font-size:4.4mm;letter-spacing:.1mm;border-radius:3.5mm 3.5mm 0 0}
    .sheet:first-of-type .parent-table{font-size:2.25mm}.sheet:first-of-type .parent-table th,.sheet:first-of-type .parent-table td{padding:.6mm 1mm;height:4.25mm}.sheet:first-of-type .parent-table th:first-child,.sheet:first-of-type .parent-table td:first-child{width:56%}.sheet:first-of-type .parent-observation{font-size:1.7mm;color:#6f4c30}
    .sheet:first-of-type .legend{margin-top:2.2mm}.sheet:first-of-type .legend-row{grid-template-columns:11mm 1fr;font-size:2.15mm;min-height:11.4mm;background:#fff}.sheet:first-of-type .legend-key{font-size:5.3mm;padding:2.2mm 1mm}.sheet:first-of-type .legend-text{padding:1.15mm 1.5mm;line-height:1.22}.sheet:first-of-type .legend-text b{font-size:2.35mm;letter-spacing:.05mm}
    .sheet:first-of-type .panel:first-child:after{content:'—  ❦  —';display:block;text-align:center;color:#b9822f;font-size:5mm;margin-top:2mm}
    .sheet:first-of-type .spread>.panel.brand{padding:5mm 14mm 5mm 6mm;border:1px solid #a96f21;border-radius:1mm;box-shadow:inset 0 0 0 1.3mm #fff,inset 0 0 0 1.6mm #d7aa5c;justify-content:flex-start}
    .sheet:first-of-type .spread>.panel.brand:before{content:'❦';display:block;color:#b9822f;font-size:6mm;line-height:5mm;margin:-1mm auto 1mm}
    .sheet:first-of-type .spread>.panel.brand:after{content:'“Porque el Señor al que ama, disciplina” · Hebreos 12:6';position:absolute;right:0;top:0;width:9mm;height:100%;background:#741018;color:#fff;border-left:1mm solid #d3a348;writing-mode:vertical-rl;transform:rotate(180deg);display:flex;align-items:center;justify-content:center;font:italic 3.1mm Georgia;letter-spacing:.15mm}
    .sheet:first-of-type .spread>.panel.brand>.small:first-of-type{font-size:6.5mm;line-height:1;margin-top:1mm}.sheet:first-of-type .spread>.panel.brand>.college{font-size:16mm;line-height:.86}.sheet:first-of-type .spread>.panel.brand>.college+.small{font-size:3.6mm;border-top:1px solid #c28c34;padding-top:1.5mm;width:78%;margin:1.5mm auto 0}
    .sheet:first-of-type .spread>.panel.brand>.orn{display:none}.sheet:first-of-type .spread>.panel.brand .cover-grid{position:relative;grid-template-columns:31mm 1fr;min-height:57mm;align-items:center;margin:2mm 0 0;padding-right:20mm}
    .sheet:first-of-type .spread>.panel.brand .cover-grid:before{content:'AÑO: ${esc(alumno.anio)}';position:absolute;left:1mm;bottom:0;font:700 3.7mm Georgia;color:#701018}.sheet:first-of-type .spread>.panel.brand .cover-grid:after{content:'UGEL 06\\A R.D. 01009-02\\A R.D. 04890-07';white-space:pre;position:absolute;right:0;top:10mm;text-align:right;font:700 3mm Georgia;line-height:1.55;color:#381517}
    .sheet:first-of-type .spread>.panel.brand .photo{width:28mm;height:36mm;border:1px solid #c79235;border-radius:2mm;margin-bottom:9mm}.sheet:first-of-type .spread>.panel.brand .logo{width:55mm;height:55mm;border:0;object-fit:contain;margin-left:1mm}
    .sheet:first-of-type .spread>.panel.brand .titlebar{position:relative;width:84%;margin:-1mm auto 2mm;padding:2.1mm 3mm;border:1mm solid #c99a37;border-radius:1mm;font-size:6mm;box-shadow:0 0 0 .5mm #781019}.sheet:first-of-type .spread>.panel.brand .titlebar:before{content:'▤';display:inline-block;margin-right:3mm;color:#efd58d}.sheet:first-of-type .spread>.panel.brand .titlebar:after{content:'';position:absolute;inset:-2mm -6mm;border-top:1px solid #c99a37;border-bottom:1px solid #c99a37;z-index:-1}
    .sheet:first-of-type .spread>.panel.brand .titlebar+.identity{margin-top:2mm;padding:3mm 4mm;font:3.05mm Georgia;line-height:1.65;border-radius:2mm;text-transform:none}.sheet:first-of-type .spread>.panel.brand .titlebar+.identity b{font-size:3.1mm;color:#431014}
    .sheet:first-of-type .spread>.panel.brand>p.serif{font-size:2.85mm;line-height:1.35;margin:3mm 2mm 2mm;padding:0 7mm;position:relative}.sheet:first-of-type .spread>.panel.brand>p.serif:before,.sheet:first-of-type .spread>.panel.brand>p.serif:after{content:'❧';position:absolute;color:#b9822f;font-size:5mm;top:0}.sheet:first-of-type .spread>.panel.brand>p.serif:before{left:0}.sheet:first-of-type .spread>.panel.brand>p.serif:after{right:0;transform:scaleX(-1)}
    .sheet:first-of-type .spread>.panel.brand>.identity:last-child{margin-top:1mm;padding:2.5mm 4mm;border-radius:2mm;font:3.1mm Georgia;text-align:center;border:1px solid #d3a14a}.sheet:first-of-type .spread>.panel.brand>.identity:last-child:before{content:'●';display:inline-block;margin-right:3mm;color:#7b1119;font-size:5mm;vertical-align:middle}
    /* Ajuste fino de la portada: proporciones y jerarquia del diseno original */
    .sheet:first-of-type .spread>.panel.brand{padding:4mm 12mm 4mm 6mm;display:flex;flex-direction:column;justify-content:flex-start}
    .sheet:first-of-type .spread>.panel.brand:after{width:7.5mm;font-size:2.8mm;letter-spacing:.12mm}
    .sheet:first-of-type .spread>.panel.brand>.small:first-of-type{font-size:5.7mm;margin-top:0}
    .sheet:first-of-type .spread>.panel.brand>.college{font-size:14.5mm}
    .sheet:first-of-type .spread>.panel.brand>.college+.small{font-size:3.2mm;width:72%;padding-top:1.1mm;margin-top:1mm}
    .sheet:first-of-type .spread>.panel.brand .cover-grid{grid-template-columns:29mm 1fr;min-height:50mm;margin:1.5mm 0 6mm;padding-right:18mm}
    .sheet:first-of-type .spread>.panel.brand .cover-grid:before{left:0;bottom:-4mm;font-size:3.35mm;line-height:3.5mm}
    .sheet:first-of-type .spread>.panel.brand .cover-grid:after{right:0;top:8mm;font-size:2.75mm;line-height:1.45}
    .sheet:first-of-type .spread>.panel.brand .photo{width:25mm;height:32mm;margin-bottom:7mm}
    .sheet:first-of-type .spread>.panel.brand .logo{width:47mm;height:47mm;margin-left:2mm}
    .sheet:first-of-type .spread>.panel.brand .titlebar{width:76%;margin:0 auto 2.5mm;padding:2mm 3mm;border:.8mm solid #c99a37;border-radius:7mm;font-size:5.5mm;box-shadow:0 0 0 .45mm #781019}
    .sheet:first-of-type .spread>.panel.brand .titlebar:after{display:none}
    .sheet:first-of-type .student-card{display:grid;grid-template-columns:27mm 1fr 22mm 22mm;gap:.4mm 2mm;margin-top:1mm!important;padding:2.6mm 4mm!important;line-height:1.35!important}
    .sheet:first-of-type .student-card .wide{grid-column:2/5}
    .sheet:first-of-type .student-card .label{font-weight:bold;color:#431014}
    .sheet:first-of-type .student-card .level{color:#e958b4;font-weight:bold;text-transform:uppercase;border:1px solid #e99aac;border-radius:1.5mm;text-align:center;padding:.15mm 1mm}
    .sheet:first-of-type .student-card .school-levels{grid-column:1/5;color:#b4111b;font-size:2.35mm;font-weight:bold;margin-top:.5mm}
    .sheet:first-of-type .spread>.panel.brand>p.serif{margin:2.2mm 2mm 1.5mm;font-size:2.7mm}
    .sheet:first-of-type .spread>.panel.brand>.identity:last-child{margin-top:1mm;padding:2mm 4mm}
    .sheet:first-of-type .spread>.panel.brand>.identity:last-child:after{content:'❦';position:absolute;left:50%;bottom:1mm;transform:translateX(-50%);color:#b9822f;font-size:4.5mm}
    .sheet:first-of-type .cover-children{display:block;width:100%;height:51mm;object-fit:contain;object-position:center bottom;margin:auto auto -1mm}
    .sheet:nth-of-type(2){padding:4mm 5mm}
    .sheet:nth-of-type(2) .back{grid-template-columns:2.18fr .82fr;gap:3mm}
    .sheet:nth-of-type(2) .back-title{font-size:5.6mm;margin:1mm 0 2mm;padding-left:20mm;position:relative;line-height:1.05}
    .sheet:nth-of-type(2) .back-title:before{content:'▤';position:absolute;left:1mm;top:-4mm;width:16mm;height:14mm;padding-top:3mm;text-align:center;background:#81121b;color:#f4d589;border-bottom:1mm solid #c99a37;font-size:7mm}
    .sheet:nth-of-type(2) .back-title:after{content:'DE ACUERDO AL NUEVO CURRÍCULO NACIONAL';display:block;color:#c1842d;font:400 3.1mm Georgia;letter-spacing:.45mm;margin-top:1.2mm;border-bottom:1px solid #d6a64a;padding-bottom:1.2mm}
    .sheet:nth-of-type(2) .grades{font-size:2.65mm}
    .sheet:nth-of-type(2) .grades td{height:5.65mm;padding:1mm 1.2mm}
    .sheet:nth-of-type(2) .bottom{margin-top:3mm;grid-template-columns:1.58fr .82fr}
    .sheet:nth-of-type(2) .conduct td{height:5.55mm}
    .sheet:nth-of-type(2) .grades .area{width:42mm;padding:0 1.8mm;vertical-align:middle;white-space:nowrap}
    .sheet:nth-of-type(2) .grades .area,.sheet:nth-of-type(2) .conduct td:first-child{font-weight:700}
    .sheet:nth-of-type(2) .grades .area>span:last-child{display:inline-block;vertical-align:middle;white-space:nowrap;font-size:2.35mm;line-height:1}
    .sheet:nth-of-type(2) .row-icon{display:inline-flex;align-items:center;justify-content:center;color:#9b1723;font-family:"Segoe UI Symbol",Georgia,serif;font-weight:400;vertical-align:middle;line-height:1;margin-right:2mm}
    .sheet:nth-of-type(2) .area-icon{width:7mm;font-size:5.4mm;margin-right:1.5mm;text-align:center}
    .sheet:nth-of-type(2) .conduct-icon{width:5.5mm;height:5.5mm;font-size:4.2mm;margin-right:1.5mm}
    .sheet:nth-of-type(2) .comment{min-height:20.3mm;padding:2.3mm}
    .sheet:nth-of-type(2) .sidebrand{padding:4mm 3mm 2mm;justify-content:flex-start;overflow:hidden;background:#fff!important}
    .sheet:nth-of-type(2) .sidebrand .verse{font-size:3.15mm;margin:2mm 0 1mm;line-height:1.35}
    .sheet:nth-of-type(2) .side-emblem{display:block;width:64mm;height:64mm;object-fit:contain;margin:0 auto -2mm}
    .sheet:nth-of-type(2) .side-motto{font:italic 3.1mm Georgia;line-height:1.35;text-align:center;color:#7f1018;margin:0}
    .sheet:nth-of-type(2) .side-motto b{display:block;font-size:3.6mm;font-style:normal;letter-spacing:.35mm;margin-bottom:1mm}
    .sheet:nth-of-type(2) .side-family{display:block;width:100%;height:90mm;object-fit:contain;object-position:center bottom;margin:auto auto -3mm;transform:scale(1.12);transform-origin:center bottom}
  </style>`;
  let htmlFinal = html
    .replace(/<tbody><tr><td>Acompañamiento y apoyo familiar<\/td>.*?<\/tr><\/tbody>/, `<tbody>${filasPadre}</tbody>`)
    .replace('Supera lo esperado respecto a la competencia.','Cuando el estudiante evidencia un nivel superior a lo esperado respecto a la competencia. Demuestra aprendizajes que van más allá del nivel esperado.')
    .replace('Alcanza satisfactoriamente lo programado.','Cuando el estudiante evidencia el nivel esperado respecto a la competencia, demostrando manejo satisfactorio en todas las áreas propuestas y en el tiempo programado.')
    .replace('Requiere acompañamiento para lograrlo.','Cuando el estudiante está próximo o cerca al nivel esperado respecto a la competencia, requiere acompañamiento durante un tiempo razonable para lograrlo.')
    .replace('Necesita mayor tiempo y apoyo docente.','Cuando el estudiante muestra un progreso mínimo y evidencia dificultades frecuentes, necesita mayor tiempo de acompañamiento e intervención del docente.')
    .replace('</head>', `${mejorasCaraUno}</head>`);
  htmlFinal = htmlFinal.replace(/(<div class="cover-grid">.*?<img class="logo" src=")[^"]+/, `$1${insigniaJesus}`);
  htmlFinal = htmlFinal.replace(
    /(<div class="titlebar">LIBRETA DE NOTAS<\/div>)<div class="identity">.*?<\/div>(<p class="serif">)/,
    `$1<div class="identity student-card"><span class="label">APELLIDOS:</span><span class="wide">${esc(apellidosAlumno)}</span><span class="label">NOMBRES:</span><span class="wide">${esc(nombresAlumno)}</span><span class="label">GRADO:</span><span>${esc(alumno.grado)}</span><span class="label">SECCIÓN:</span><span>${esc(alumno.seccion)}</span><span class="label">NIVEL:</span><span class="level">${esc(alumno.nivel)}</span><span class="label">TELÉFONO:</span><span>${esc(alumno.celular)}</span><span class="school-levels">Inicial – Primaria – Secundaria</span></div>$2`
  );
  htmlFinal = htmlFinal.replace(
    /<aside class="panel sidebrand">.*?<\/aside>/,
    `<aside class="panel sidebrand"><p class="verse">“Enseña al niño el camino en que debe andar, y cuando sea viejo no se apartará de él”<br><b>(Proverbios 22:6)</b></p><img class="side-emblem" src="${insigniaFamilia}" alt="Insignia del Colegio Harvard con familia"><p class="side-motto"><b>DESDE EL 2002</b>Cultivamos mentes curiosas<br>y corazones felices</p><img class="side-family" src="${familiaLeyendo}" alt="Familia acompañando el aprendizaje"></aside>`
  );
  htmlFinal = htmlFinal.replace(
    /(<div class="identity"><b>Tutor\(a\):<\/b>.*?<\/div>)(<\/div><\/div><\/section>)/,
    `$1<img class="cover-children" src="${ninosPortada}" alt="Niños estudiando">$2`
  );
  ventana.document.open(); ventana.document.write(htmlFinal); ventana.document.close();
}

export default function Libretas() {
  const { usuario } = useAuth();
  const admin = usuario?.rol_codigo === 'SUPER_ADMIN';
  const [data, setData] = useState(null); const [tab, setTab] = useState('registro'); const [busy, setBusy] = useState(true);
  const [docenteFiltro, setDocenteFiltro] = useState('TODOS');
  const [asigId, setAsigId] = useState(''); const [periodoId, setPeriodoId] = useState(''); const [gradebook, setGradebook] = useState(null);
  const [notas, setNotas] = useState({}); const [motivo, setMotivo] = useState(''); const [comentarios, setComentarios] = useState({});
  const [area, setArea] = useState(''); const [curso, setCurso] = useState({ nombre:'', id_area:'' }); const [asignacion, setAsignacion] = useState({ id_aula:'', id_curso:'', id_cursos:[], id_docente:'' });
  const [merito, setMerito] = useState([]); const [audit, setAudit] = useState([]); const [acom, setAcom] = useState({ alumno:'', conducta:{}, padreNotas:{}, tutor:'', padre:'' });
  const recargar = async () => { setBusy(true); try { const r=await api.cargarLibretas(); setData(r.data.data); if(!asigId&&r.data.data.asignaciones[0]) setAsigId(String(r.data.data.asignaciones[0].id)); if(!periodoId&&r.data.data.periodos[0]) setPeriodoId(String(r.data.data.periodos[0].id)); } catch(e){toast.error(errorText(e));} finally{setBusy(false);} };
  useEffect(()=>{recargar();},[]);
  const seleccion = useMemo(()=>data?.asignaciones.find(a=>String(a.id)===String(asigId)),[data,asigId]);
  const responsables = useMemo(() => {
    const unicos = new Map();
    (data?.asignaciones || []).forEach(a => unicos.set(String(a.id_docente), { id: String(a.id_docente), nombre: a.docente }));
    return [...unicos.values()].sort((a,b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [data]);
  const asignacionesVisibles = useMemo(() => docenteFiltro === 'TODOS'
    ? (data?.asignaciones || [])
    : (data?.asignaciones || []).filter(a => String(a.id_docente) === docenteFiltro), [data, docenteFiltro]);
  const aulasConducta = useMemo(() => {
    const unicas = new Map();
    asignacionesVisibles.forEach(a => {
      if (!unicas.has(String(a.id_aula))) unicas.set(String(a.id_aula), a);
    });
    return [...unicas.values()];
  }, [asignacionesVisibles]);
  useEffect(() => {
    if (!asignacionesVisibles.some(a => String(a.id) === String(asigId))) {
      setAsigId(asignacionesVisibles[0] ? String(asignacionesVisibles[0].id) : '');
      setGradebook(null);
    }
  }, [docenteFiltro, data]);
  const periodo = data?.periodos.find(p=>String(p.id)===String(periodoId));
  const cargar = async()=>{if(!asigId||!periodoId)return;try{const r=await api.cargarNotas({id_asignacion:asigId,id_periodo:periodoId});setGradebook(r.data.data);setNotas(Object.fromEntries(r.data.data.alumnos.map(a=>[a.id,a.calificacion||''])));}catch(e){toast.error(errorText(e));}};
  useEffect(()=>{if(asigId&&periodoId)cargar();},[asigId,periodoId]);
  const saveNotas=async()=>{try{await api.guardarNotas({id_asignacion:Number(asigId),id_periodo:Number(periodoId),motivo,notas:Object.entries(notas).filter(([,v])=>v).map(([id,v])=>({id_alumno:Number(id),calificacion:v}))});toast.success('Notas guardadas');setMotivo('');cargar();}catch(e){toast.error(errorText(e));}};
  const saveComment=async alumno=>{if(!comentarios[alumno])return;try{await api.guardarComentarioDocente({id_asignacion:Number(asigId),id_periodo:Number(periodoId),id_alumno:alumno,id_catalogo:Number(comentarios[alumno])});toast.success('Comentario guardado');}catch(e){toast.error(errorText(e));}};
  const seleccionarAlumnoConducta = async id => {
    setAcom({ alumno:id, conducta:{}, padreNotas:{}, tutor:'', padre:'' });
    if (!id) return;
    try {
      const r = await api.cargarLibreta(Number(id));
      const libreta = r.data.data;
      const numeroPeriodo = Number(periodo?.numero);
      const valores = {};
      const valoresPadre = {};
      (data?.criterios || []).forEach(c => {
        const existente = (libreta.conducta || []).find(x => x.nombre === c.nombre && Number(x.numero) === numeroPeriodo);
        if (existente?.calificacion) valores[c.id] = existente.calificacion;
      });
      (data?.criteriosPadre || []).forEach(c => {
        const existente = (libreta.notasPadre || []).find(x => x.nombre === c.nombre && Number(x.numero) === numeroPeriodo);
        if (existente?.calificacion) valoresPadre[c.id] = existente.calificacion;
      });
      setAcom({ alumno:id, conducta:valores, padreNotas:valoresPadre, tutor:'', padre:'' });
    } catch(e) { toast.error(errorText(e)); }
  };
  const guardarConducta = async () => {
    if (!acom.alumno) return toast.error('Seleccione un alumno');
    try {
      await api.guardarAcompanamiento({id_alumno:Number(acom.alumno),id_periodo:Number(periodoId),conducta:Object.entries(acom.conducta).filter(([,v])=>v).map(([id,v])=>({id_criterio:Number(id),calificacion:v})),nota_padre:Object.entries(acom.padreNotas || {}).filter(([,v])=>v).map(([id,v])=>({id_criterio:Number(id),calificacion:v})),observaciones:[acom.tutor&&{tipo:'COMENTARIO_TUTOR',id_catalogo:Number(acom.tutor)},acom.padre&&{tipo:'NOTA_PADRE',id_catalogo:Number(acom.padre)}].filter(Boolean)});
      toast.success('Conducta y hábitos guardados');
      seleccionarAlumnoConducta(acom.alumno);
    } catch(e) { toast.error(errorText(e)); }
  };
  const tabs = admin ? tabsAdmin : [['registro','Mis cursos y notas',HiBookOpen], ...(usuario?.rol_codigo==='TUTOR'?[['acom','Conducta y tutoría',HiClipboardCheck]]:[])];
  if(busy&&!data)return <div className="p-8">Cargando módulo académico...</div>;
  const commentsDoc=data?.catalogo.filter(x=>x.tipo==='COMENTARIO_DOCENTE')||[], commentsTutor=data?.catalogo.filter(x=>x.tipo==='COMENTARIO_TUTOR')||[], notesParent=data?.catalogo.filter(x=>x.tipo==='NOTA_PADRE')||[];
  const editarArea = async item => { const nombre=window.prompt('Nuevo nombre del área',item.nombre); if(!nombre?.trim()||nombre.trim()===item.nombre)return; try{await api.editarArea(item.id,{nombre:nombre.trim(),orden:item.orden});await recargar();toast.success('Área actualizada');}catch(e){toast.error(errorText(e));} };
  const retirarArea = async item => { if(!window.confirm(`¿Retirar el área “${item.nombre}”? Sus cursos dejarán de mostrarse, pero las notas históricas se conservarán.`))return; try{await api.eliminarArea(item.id);await recargar();toast.success('Área retirada');}catch(e){toast.error(errorText(e));} };
  const editarCurso = async item => { const nombre=window.prompt('Nuevo nombre del curso',item.nombre); if(!nombre?.trim()||nombre.trim()===item.nombre)return; try{await api.editarCurso(item.id,{nombre:nombre.trim(),id_area:item.id_area,orden:item.orden});await recargar();toast.success('Curso actualizado');}catch(e){toast.error(errorText(e));} };
  const retirarCurso = async item => { if(!window.confirm(`¿Retirar el curso “${item.nombre}”? Las notas históricas se conservarán.`))return; try{await api.eliminarCurso(item.id);await recargar();toast.success('Curso retirado');}catch(e){toast.error(errorText(e));} };
  return <div className="p-4 md:p-7 space-y-5"><div className="bg-white border border-cream-200 rounded-2xl p-5 shadow-sm"><h1 className="text-2xl text-primary-800">Libretas y evaluación académica</h1><p className="text-sm text-cream-600 mt-1">Año escolar {data?.anio.anio} · Calificación AD, A, B y C</p></div>
    <div className="flex gap-2 overflow-x-auto">{tabs.map(([id,label,Icon])=><button key={id} onClick={()=>setTab(id)} className={`px-4 py-2 rounded-xl whitespace-nowrap flex items-center gap-2 ${tab===id?'bg-primary-700 text-white':'bg-white border border-cream-200 text-primary-700'}`}><Icon/>{label}</button>)}</div>
    {tab==='config'&&admin&&<section className="bg-white p-5 rounded-2xl border"><h2 className="text-lg">Asignación rápida de varios cursos</h2><p className="text-sm text-cream-600 mt-1">Elija el aula, marque todos los cursos del responsable y guarde una sola vez.</p><div className="grid md:grid-cols-3 gap-3 items-start"><select className="input-field mt-3" value={asignacion.id_aula} onChange={e=>setAsignacion({...asignacion,id_aula:e.target.value})}><option value="">Aula</option>{data?.aulas.map(x=><option key={x.id} value={x.id}>{x.nivel} · {x.grado} {x.seccion}</option>)}</select><SelectorCursos cursos={data?.cursos||[]} seleccionados={asignacion.id_cursos} onChange={ids=>setAsignacion({...asignacion,id_cursos:ids})}/><select className="input-field mt-3" value={asignacion.id_docente} onChange={e=>setAsignacion({...asignacion,id_docente:e.target.value})}><option value="">Docente</option>{data?.docentes.map(x=><option key={x.id} value={x.id}>{x.nombres} · {x.rol}</option>)}</select></div><button className="btn-primary mt-4" onClick={async()=>{try{const r=await api.asignarCurso(asignacion);setAsignacion({...asignacion,id_cursos:[]});recargar();toast.success(r.data.mensaje||'Cursos asignados');}catch(e){toast.error(errorText(e));}}}>Asignar {asignacion.id_cursos.length||''} curso{asignacion.id_cursos.length===1?'':'s'}</button></section>}
    {tab==='registro'&&<section className="bg-white rounded-2xl border border-cream-200 p-5 space-y-4"><div className={`grid gap-3 ${admin ? "md:grid-cols-3" : "md:grid-cols-2"}`}>{admin&&<label className="text-sm">Responsable<select className="input-field mt-1" value={docenteFiltro} onChange={e=>setDocenteFiltro(e.target.value)}><option value="TODOS">Todos los responsables</option>{responsables.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label>}<label className="text-sm">Curso y aula<select className="input-field mt-1" value={asigId} onChange={e=>setAsigId(e.target.value)}>{asignacionesVisibles.map(a=><option key={a.id} value={a.id}>{a.curso} · {a.grado} {a.seccion}{admin?` · ${a.docente}`:''}</option>)}</select></label><label className="text-sm">Bimestre<select className="input-field mt-1" value={periodoId} onChange={e=>setPeriodoId(e.target.value)}>{data?.periodos.map(p=><option key={p.id} value={p.id}>{p.nombre} · {p.estado}</option>)}</select></label></div>{!data?.asignaciones.length&&<p className="p-5 bg-amber-50 rounded-xl">Aún no tiene cursos asignados. El Superadministrador debe realizar la asignación.</p>}{gradebook&&<><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="bg-primary-700 text-white"><th className="p-3 text-left">Código</th><th className="p-3 text-left">Alumno</th><th className="p-3">Nota</th><th className="p-3 text-left">Comentario propio</th><th></th>{admin&&<th>Libreta</th>}</tr></thead><tbody>{gradebook.alumnos.map(a=><tr key={a.id} className="border-b border-cream-100"><td className="p-3">{a.codigo_alumno}</td><td className="p-3 font-medium">{a.nombre_completo}</td><td className="p-3"><select className="input-field min-w-20" value={notas[a.id]||''} onChange={e=>setNotas({...notas,[a.id]:e.target.value})}>{NOTAS.map(n=><option key={n} value={n}>{n||'—'}</option>)}</select></td><td className="p-3"><select className="input-field min-w-64" value={comentarios[a.id]||''} onChange={e=>setComentarios({...comentarios,[a.id]:e.target.value})}><option value="">Seleccione una opción</option>{commentsDoc.map(c=><option key={c.id} value={c.id}>{c.texto}</option>)}</select></td><td><button className="btn-gold" onClick={()=>saveComment(a.id)}>Guardar</button></td>{admin&&<td><button className="btn-primary flex gap-1" onClick={async()=>{try{const r=await api.cargarLibreta(a.id);imprimirLibreta(r.data.data);}catch(e){toast.error(errorText(e));}}}><HiPrinter/> Imprimir</button></td>}</tr>)}</tbody></table></div>{admin&&<input className="input-field" placeholder="Motivo obligatorio si modifica una nota existente" value={motivo} onChange={e=>setMotivo(e.target.value)}/>}<div className="flex justify-end"><button disabled={!admin&&periodo?.estado!=='ABIERTO'} className="btn-primary" onClick={saveNotas}>Guardar notas</button></div></>}</section>}
    {tab==='config'&&admin&&<section className="grid lg:grid-cols-3 gap-4"><div className="bg-white p-5 rounded-2xl border"><h2 className="text-lg">Nueva área</h2><input className="input-field my-3" value={area} onChange={e=>setArea(e.target.value)} placeholder="Nombre del área"/><button className="btn-primary" onClick={async()=>{try{await api.crearArea({nombre:area});setArea('');recargar();toast.success('Área guardada');}catch(e){toast.error(errorText(e));}}}>Guardar</button></div><div className="bg-white p-5 rounded-2xl border"><h2 className="text-lg">Nuevo curso</h2><select className="input-field mt-3" value={curso.id_area} onChange={e=>setCurso({...curso,id_area:e.target.value})}><option value="">Área</option>{data?.areas.map(x=><option key={x.id} value={x.id}>{x.nombre}</option>)}</select><input className="input-field my-3" value={curso.nombre} onChange={e=>setCurso({...curso,nombre:e.target.value})} placeholder="Curso"/><button className="btn-primary" onClick={async()=>{try{await api.crearCurso(curso);setCurso({nombre:'',id_area:''});recargar();toast.success('Curso guardado');}catch(e){toast.error(errorText(e));}}}>Guardar</button></div><div className="bg-white p-5 rounded-2xl border"><h2 className="text-lg">Asignar responsable</h2><select className="input-field mt-3" value={asignacion.id_aula} onChange={e=>setAsignacion({...asignacion,id_aula:e.target.value})}><option value="">Aula</option>{data?.aulas.map(x=><option key={x.id} value={x.id}>{x.nivel} · {x.grado} {x.seccion}</option>)}</select><select className="input-field mt-3" value={asignacion.id_curso} onChange={e=>setAsignacion({...asignacion,id_curso:e.target.value})}><option value="">Curso</option>{data?.cursos.map(x=><option key={x.id} value={x.id}>{x.area} · {x.nombre}</option>)}</select><select className="input-field my-3" value={asignacion.id_docente} onChange={e=>setAsignacion({...asignacion,id_docente:e.target.value})}><option value="">Docente</option>{data?.docentes.map(x=><option key={x.id} value={x.id}>{x.nombres} · {x.rol}</option>)}</select><button className="btn-primary" onClick={async()=>{try{await api.asignarCurso(asignacion);recargar();toast.success('Responsable asignado');}catch(e){toast.error(errorText(e));}}}>Asignar</button></div><div className="lg:col-span-3 grid md:grid-cols-2 gap-4"><div className="bg-white p-5 rounded-2xl border"><h2 className="text-lg mb-3">Áreas registradas</h2><div className="space-y-2">{data?.areas.map(x=><div key={x.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-cream-50 border border-cream-200"><span className="font-medium">{x.nombre}</span><div className="flex gap-2"><button title="Editar área" className="p-2 rounded-lg text-gold-700 hover:bg-gold-100" onClick={()=>editarArea(x)}><HiPencil/></button><button title="Retirar área" className="p-2 rounded-lg text-red-600 hover:bg-red-50" onClick={()=>retirarArea(x)}><HiTrash/></button></div></div>)}</div></div><div className="bg-white p-5 rounded-2xl border"><h2 className="text-lg mb-3">Cursos registrados</h2><div className="space-y-2 max-h-96 overflow-y-auto">{data?.cursos.map(x=><div key={x.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-cream-50 border border-cream-200"><span><b>{x.nombre}</b><small className="block text-cream-600">{x.area}</small></span><div className="flex gap-2"><button title="Editar curso" className="p-2 rounded-lg text-gold-700 hover:bg-gold-100" onClick={()=>editarCurso(x)}><HiPencil/></button><button title="Retirar curso" className="p-2 rounded-lg text-red-600 hover:bg-red-50" onClick={()=>retirarCurso(x)}><HiTrash/></button></div></div>)}</div></div></div></section>}
    {tab==='periodos'&&admin&&<section className="grid md:grid-cols-4 gap-4">{data?.periodos.map(p=><div key={p.id} className="bg-white p-5 rounded-2xl border"><h2>{p.nombre}</h2><p className="my-3 text-sm">Estado: <b>{p.estado}</b></p><select className="input-field" value={p.estado} onChange={async e=>{try{await api.cambiarPeriodo(p.id,e.target.value);recargar();toast.success('Bimestre actualizado');}catch(err){toast.error(errorText(err));}}}><option>ABIERTO</option><option>REVISION</option><option>CERRADO</option></select></div>)}</section>}
    {tab==='merito'&&admin&&<section className="bg-white p-5 rounded-2xl border"><div className="flex gap-3 mb-4"><button className="btn-primary" disabled={!seleccion} onClick={async()=>{try{const r=await api.cargarMerito({id_aula:seleccion.id_aula,id_periodo:periodoId||undefined});setMerito(r.data.data);}catch(e){toast.error(errorText(e));}}}>Calcular bimestre</button><button className="btn-gold" disabled={!seleccion} onClick={async()=>{const r=await api.cargarMerito({id_aula:seleccion.id_aula});setMerito(r.data.data);}}>Calcular anual</button></div>{merito.map(x=><div className="grid grid-cols-[70px_1fr_100px] border-b p-3" key={x.id}><b>#{x.posicion}</b><span>{x.codigo_alumno} · {x.nombre_completo}</span><b>{x.puntaje.toFixed(2)}</b></div>)}</section>}
    {tab==='auditoria'&&admin&&<section className="bg-white p-5 rounded-2xl border"><button className="btn-primary mb-4" onClick={async()=>{const r=await api.cargarAuditoriaNotas();setAudit(r.data.data);}}>Cargar historial</button><div className="space-y-2">{audit.map(x=><div key={x.id} className="p-3 border rounded-xl text-sm"><b>{x.alumno}</b> · {x.curso} · {x.periodo}: {x.calificacion_anterior||'Sin nota'} → {x.calificacion_nueva}<br/><span className="text-cream-600">{x.usuario} · {new Date(x.fecha).toLocaleString()} · {x.motivo||'Registro inicial'}</span></div>)}</div></section>}
    {tab==='acom'&&<section className="bg-white p-5 rounded-2xl border space-y-4"><div><h2 className="text-lg font-semibold text-primary-800">Conducta y hábitos</h2><p className="text-sm text-cream-600">Seleccione el aula, bimestre y alumno. Estas calificaciones no intervienen en el orden de mérito.</p></div><div className={`grid gap-3 ${admin?'md:grid-cols-3':'md:grid-cols-2'}`}>{admin&&<label className="text-sm">Responsable<select className="input-field mt-1" value={docenteFiltro} onChange={e=>setDocenteFiltro(e.target.value)}><option value="TODOS">Todos los responsables</option>{responsables.map(r=><option key={r.id} value={r.id}>{r.nombre}</option>)}</select></label>}<label className="text-sm">Aula<select className="input-field mt-1" value={seleccion?.id_aula||''} onChange={e=>{const aula=aulasConducta.find(a=>String(a.id_aula)===e.target.value);setAsigId(aula?String(aula.id):'');setAcom({alumno:'',conducta:{},tutor:'',padre:''});}}><option value="">Seleccione aula</option>{aulasConducta.map(a=><option key={a.id_aula} value={a.id_aula}>{a.grado} {a.seccion} · {a.nivel}</option>)}</select></label><label className="text-sm">Bimestre<select className="input-field mt-1" value={periodoId} onChange={e=>{setPeriodoId(e.target.value);setAcom({alumno:'',conducta:{},tutor:'',padre:''});}}>{data?.periodos.map(p=><option key={p.id} value={p.id}>{p.nombre} · {p.estado}</option>)}</select></label></div><select className="input-field" value={acom.alumno} onChange={e=>seleccionarAlumnoConducta(e.target.value)}><option value="">Seleccione alumno</option>{gradebook?.alumnos.map(a=><option key={a.id} value={a.id}>{a.codigo_alumno} · {a.nombre_completo}</option>)}</select><div className="grid md:grid-cols-2 gap-3">{data?.criterios.map(c=><label key={c.id} className="flex justify-between items-center gap-3 border border-cream-200 rounded-xl p-3"><span>{c.nombre}</span><select className="input-field !w-24" value={acom.conducta[c.id]||''} onChange={e=>setAcom({...acom,conducta:{...acom.conducta,[c.id]:e.target.value}})}>{NOTAS.map(n=><option key={n} value={n}>{n||'—'}</option>)}</select></label>)}</div><div className="grid md:grid-cols-2 gap-3"><select className="input-field" value={acom.tutor} onChange={e=>setAcom({...acom,tutor:e.target.value})}><option value="">Comentario del tutor (opcional)</option>{commentsTutor.map(c=><option key={c.id} value={c.id}>{c.texto}</option>)}</select><select className="input-field" value={acom.padre} onChange={e=>setAcom({...acom,padre:e.target.value})}><option value="">Nota del padre (opcional)</option>{notesParent.map(c=><option key={c.id} value={c.id}>{c.texto}</option>)}</select></div><div className="flex justify-end"><button className="btn-primary" disabled={!acom.alumno||(!admin&&periodo?.estado!=='ABIERTO')} onClick={guardarConducta}>Guardar conducta y hábitos</button></div></section>}
  </div>;
}
