import { useState } from 'react';

export default function CampoOpciones({ label, value = '', onChange, options, className = '', disabled = false }) {
  const esValorPersonalizado = Boolean(value) && !options.includes(value);
  const [otro, setOtro] = useState(esValorPersonalizado);

  const cambiarOpcion = (event) => {
    const seleccion = event.target.value;
    if (seleccion === '__OTRO__') {
      setOtro(true);
      onChange('');
    } else {
      setOtro(false);
      onChange(seleccion);
    }
  };

  return <label className={`text-sm ${className}`}>
    {label}
    <select disabled={disabled} value={otro ? '__OTRO__' : value} onChange={cambiarOpcion} className="input-field mt-1 disabled:bg-stone-100">
      <option value="">Seleccione...</option>
      {options.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
      <option value="__OTRO__">Otro</option>
    </select>
    {otro && <input disabled={disabled} autoFocus value={value} onChange={(event) => onChange(event.target.value)} placeholder="Especifique..." className="input-field mt-2 disabled:bg-stone-100"/>}
  </label>;
}
