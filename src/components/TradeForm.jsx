import React, { useState, useEffect } from 'react'
import { notify } from '../utils/toast'

function TradeForm({ onSubmit, onUpdate, onCancel, editingTrade, userSettings, existingSymbols, onNewTag }) {
  const isEditing = !!editingTrade;

  const emptyForm = {
    time: new Date().toISOString().substring(11,16),
    date: new Date().toISOString().split('T')[0],
    symbol: '',
    type: 'long',
    entryPrice: '',
    initialSL: '',
    idealTP: '',
    fees: '0',
    notes: '',
    estrategia: '',
    emociones: '',
    ticksSL: '',
    ratio: '',
    beneficio: '',
    cantidad: '',
    sesion: '',
    resultado: '',
    comentario: '',
    captura: '',
    tags: []
  };

  const [formData, setFormData] = useState(emptyForm);
  const [tagsInput, setTagsInput] = useState('')
  const [savedTags, setSavedTags] = useState(userSettings?.tags || [])
  const [touched, setTouched] = useState({})

  // Validar si campo obligatorio está vacío
  const isFieldInvalid = (name) => {
    const requiredFields = ['date', 'symbol', 'type', 'ratio', 'beneficio', 'sesion', 'resultado']
    if (!requiredFields.includes(name)) return false
    const val = formData[name]
    if (name === 'type') return false // siempre tiene valor por defecto
    // Para campos numéricos, 0 es válido
    if (name === 'beneficio') return val === '' || val === null || val === undefined
    return !val || val === ''
  }

  useEffect(() => {
    if (editingTrade) {
      const dateObj = new Date(editingTrade.date);
      setFormData({
        date: dateObj.toISOString().split('T')[0],
        time: dateObj.toISOString().substring(11,16),
        symbol: editingTrade.symbol || '',
        type: editingTrade.type || 'long',
        entryPrice: editingTrade.entryPrice != null ? String(editingTrade.entryPrice) : '',
        initialSL: editingTrade.initialSL != null ? String(editingTrade.initialSL) : '',
        idealTP: editingTrade.idealTP != null ? String(editingTrade.idealTP) : '',
        fees: editingTrade.fees != null ? String(editingTrade.fees) : '0',
        notes: editingTrade.notes || '',
        estrategia: editingTrade.estrategia || '',
        emociones: editingTrade.emociones || '',
        ticksSL: editingTrade.ticksSL != null ? String(editingTrade.ticksSL) : '',
        ratio: editingTrade.ratio != null ? String(editingTrade.ratio) : '',
        beneficio: editingTrade.profit != null ? String(editingTrade.profit) : '',
        cantidad: editingTrade.cantidad != null ? String(editingTrade.cantidad) : '',
        sesion: editingTrade.sesion || '',
        resultado: editingTrade.resultado || '',
        comentario: editingTrade.comentario || '',
        captura: editingTrade.captura || '',
        tags: editingTrade.tags || []
      });
    } else {
      setFormData(emptyForm);
    }
  }, [editingTrade]);

  useEffect(() => {
    setSavedTags(userSettings?.tags || [])
  }, [userSettings?.tags])

  useEffect(() => {
    if (isEditing) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [isEditing]);

  const handleChange = (e) => {
    const { name, type, value, files } = e.target
    if (type === 'file') {
      if (files[0]) {
        const reader = new FileReader()
        reader.onload = (ev) => {
          setFormData(prev => ({ ...prev, [name]: ev.target.result }))
        }
        reader.readAsDataURL(files[0])
      }
    } else {
      setFormData(prev => {
        const updated = { ...prev, [name]: value };
        if (name === 'tags') return updated; // tags se maneja aparte
        // Recalcular ratio automáticamente cada vez que cambian los precios
        if (['entryPrice', 'initialSL', 'idealTP'].includes(name)) {
          const ep = parseFloat(updated.entryPrice) || 0;
          const sl = parseFloat(updated.initialSL) || 0;
          const tp = parseFloat(updated.idealTP) || 0;
          if (ep && sl && tp) {
            const denominator = ep - sl;
            if (denominator !== 0) {
              const calc = ((tp - ep) / denominator).toFixed(2);
              updated.ratio = calc;
            }
          } else {
            updated.ratio = '';
          }
        }
        return updated;
      });
    }
  }

  // Manejo de tags
  const addTag = () => {
    const tag = tagsInput.trim()
    if (!tag) return
    if (formData.tags.includes(tag)) { setTagsInput(''); return }
    setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
    if (!savedTags.includes(tag) && onNewTag) onNewTag(tag)
    setTagsInput('')
  }

  const removeTag = (idx) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== idx) }))
  }

  const handlePaste = (e) => {
    const items = e.clipboardData.items
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault()
        const blob = item.getAsFile()
        const reader = new FileReader()
        reader.onload = (ev) => {
          setFormData(prev => ({ ...prev, captura: ev.target.result }))
        }
        reader.readAsDataURL(blob)
        break
      }
    }
  }

  const pasteFromClipboard = async () => {
    try {
      const permission = await navigator.permissions.query({ name: 'clipboard-read' })
      if (permission.state === 'denied') {
        notify.error('Permiso para leer portapapeles denegado. Usa Ctrl+V en su lugar.')
        return
      }
      const items = await navigator.clipboard.read()
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type)
            const reader = new FileReader()
            reader.onload = (ev) => {
              setFormData(prev => ({ ...prev, captura: ev.target.result }))
            }
            reader.readAsDataURL(blob)
            return
          }
        }
      }
      notify.error('No se encontró ninguna imagen en el portapapeles. Copia una imagen primero.')
    } catch (err) {
      notify.error('No se pudo leer el portapapeles. Usa Ctrl+V para pegar la imagen.')
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validar campos obligatorios
    const requiredFields = ['date', 'symbol', 'ratio', 'beneficio', 'sesion', 'resultado'];
    const invalidFields = requiredFields.filter(name => isFieldInvalid(name));
    if (invalidFields.length > 0) {
      const fieldNames = { date: 'Fecha', symbol: 'Símbolo', ratio: 'Ratio', beneficio: 'Beneficio $', sesion: 'Sesión operativa', resultado: 'Resultado' };
      notify.error('Campos obligatorios incompletos: ' + invalidFields.map(n => fieldNames[n] || n).join(', '));
      return;
    }
    const beneficio = parseFloat(formData.beneficio);
    const fees = parseFloat(formData.fees);
    const beneficioNeto = beneficio + fees;
    const trade = {
      ...formData,
      entryPrice: parseFloat(formData.entryPrice),
      initialSL: parseFloat(formData.initialSL),
      idealTP: parseFloat(formData.idealTP),
      ratio: formData.ratio ? parseFloat(formData.ratio) : undefined,
      fees,
      profit: beneficio,
      beneficioNeto,
      tags: formData.tags,
      date: new Date(`${formData.date}T${formData.time}`).toISOString()
    };
    if (editingTrade) {
      onUpdate(trade);
    } else {
      onSubmit(trade);
      setFormData(emptyForm);
    }
    setTouched({}); // Limpiar touched al enviar
  };

  return (
    <div className="card bg-base-200 shadow-xl mb-6">
      <div className="card-body">
        <h2 className="card-title">{isEditing ? 'Editar Operación' : 'Nueva Operación'}</h2>
        <form onSubmit={handleSubmit} onPaste={handlePaste}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Fecha <span className="text-red-500">*</span></span></label>
              <input type="date" name="date" value={formData.date} onChange={handleChange}
                className={`input input-bordered w-full placeholder-gray-200 placeholder-opacity-20 ${isFieldInvalid('date') ? 'bg-red-500/20 border-red-500' : ''}`} required />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Hora</span></label>
              <input type="time" name="time" value={formData.time} onChange={handleChange}
                className="input input-bordered w-full" />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Símbolo <span className="text-red-500">*</span></span></label>
              <input list="symbol-options" name="symbol" placeholder="ej. AAPL, BTC/USD" value={formData.symbol}
                onChange={handleChange} className={`input input-bordered w-full placeholder-gray-200 placeholder-opacity-20 ${isFieldInvalid('symbol') ? 'bg-red-500/20 border-red-500' : ''}`} required />
              <datalist id="symbol-options">
                {existingSymbols && existingSymbols.map((sym, idx) => (
                  <option key={idx} value={sym} />
                ))}
              </datalist>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Tipo <span className="text-red-500">*</span></span></label>
              <select name="type" value={formData.type} onChange={handleChange}
                className="select select-bordered w-full bg-base-100" required>
                <option value="long">Long (Compra)</option>
                <option value="short">Short (Venta)</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Precio Entrada</span></label>
              <input type="number" name="entryPrice" step="any" placeholder="0.00" value={formData.entryPrice}
                onChange={handleChange} className="input input-bordered w-full placeholder-gray-200 placeholder-opacity-20" />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Precio SL</span></label>
              <input type="number" name="initialSL" step="any" placeholder="0.00" value={formData.initialSL}
                onChange={handleChange} className="input input-bordered w-full placeholder-gray-200 placeholder-opacity-20" />
            </div>
            <div className="form-control">
              <label className="label"><span className="label-text">Precio TP</span></label>
              <input type="number" name="idealTP" step="any" placeholder="0.00" value={formData.idealTP}
                onChange={handleChange} className="input input-bordered w-full placeholder-gray-200 placeholder-opacity-20" />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Estrategia</span></label>
              <input type="text" name="estrategia" placeholder="Ej. Breakout" value={formData.estrategia}
                onChange={handleChange} className="input input-bordered w-full placeholder-gray-200 placeholder-opacity-20" />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Emociones</span></label>
              <input type="text" name="emociones" placeholder="Ej. Emocionado" value={formData.emociones}
                onChange={handleChange} className="input input-bordered w-full placeholder-gray-200 placeholder-opacity-20" />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Comisiones</span></label>
              <input type="number" name="fees" step="any" placeholder="0.00" value={formData.fees}
                onChange={handleChange} className="input input-bordered w-full placeholder-gray-200 placeholder-opacity-20" />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Ticks de SL</span></label>
              <input type="number" name="ticksSL" step="any" placeholder="0" value={formData.ticksSL}
                onChange={handleChange} className="input input-bordered w-full placeholder-gray-200 placeholder-opacity-20" />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Ratio <span className="text-red-500">*</span></span></label>
              <input type="number" name="ratio" step="any" placeholder="1.0" value={formData.ratio}
                onChange={handleChange} className={`input input-bordered w-full placeholder-gray-200 placeholder-opacity-20 ${isFieldInvalid('ratio') ? 'bg-red-500/20 border-red-500' : ''}`} required />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Beneficio $ <span className="text-red-500">*</span></span></label>
              <input type="number" name="beneficio" step="any" placeholder="0.00" value={formData.beneficio}
                onChange={handleChange} className={`input input-bordered w-full placeholder-gray-200 placeholder-opacity-20 ${isFieldInvalid('beneficio') ? 'bg-red-500/20 border-red-500' : ''}`} required />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Beneficio Neto</span></label>
              <input type="number" value={(parseFloat(formData.beneficio || 0) - parseFloat(formData.fees || 0)).toFixed(2)} readOnly
                className="input input-bordered w-full bg-gray-800 text-gray-300" />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Cantidad (Lots/Contracts)</span></label>
              <input type="number" name="cantidad" step="any" placeholder="1.00" value={formData.cantidad}
                onChange={handleChange} className="input input-bordered w-full placeholder-gray-200 placeholder-opacity-20" />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Sesión operativa <span className="text-red-500">*</span></span></label>
              {userSettings && userSettings.sessions && userSettings.sessions.length > 0 ? (
                 <select name="sesion" value={formData.sesion} onChange={handleChange}
                   className={`select select-bordered w-full bg-base-100 ${isFieldInvalid('sesion') ? 'border-red-500' : ''}`} required>
                  <option value="">Selecciona una sesión</option>
                  {userSettings.sessions.map((sess, idx) => (
                    <option key={idx} value={sess.name}>{sess.name} ({sess.start} - {sess.end})</option>
                  ))}
                </select>
              ) : (
                <input type="text" name="sesion" placeholder="Ej. Matutina" value={formData.sesion}
                  onChange={handleChange} className={`input input-bordered w-full placeholder-gray-200 placeholder-opacity-20 ${isFieldInvalid('sesion') ? 'bg-red-500/20 border-red-500' : ''}`} required />
              )}
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Resultado <span className="text-red-500">*</span></span></label>
              <select name="resultado" value={formData.resultado} onChange={handleChange}
                className={`select select-bordered w-full bg-base-100 ${isFieldInvalid('resultado') ? 'border-red-500' : ''}`} required>
                <option value="">Selecciona un resultado</option>
                <option value="TakeProfit">TakeProfit</option>
                <option value="StopLoss">StopLoss</option>
                <option value="BreakEven">BreakEven</option>
                <option value="CierreManual">CierreManual</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Comentario</span></label>
              <textarea name="comentario" placeholder="Comentarios adicionales..." value={formData.comentario}
                onChange={handleChange} className="textarea textarea-bordered h-20"></textarea>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Captura de trade</span>
              </label>
              <div className="flex gap-2 items-center">
                <button type="button" className="btn btn-outline btn-sm" onClick={pasteFromClipboard}>
                  📋 Pegar imagen
                </button>
                <span className="text-xs opacity-50">o usa Ctrl+V</span>
              </div>
              {formData.captura && formData.captura.startsWith('data:image') && (
                <div className="mt-2">
                  <img src={formData.captura} alt="Preview" className="h-32 object-cover rounded" />
                  <button type="button" className="btn btn-xs btn-ghost mt-1" onClick={() => setFormData(prev => ({ ...prev, captura: '' }))}>Eliminar imagen</button>
                </div>
              )}
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Tags</span></label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag, idx) => (
                  <span key={idx} className="badge badge-primary gap-1">
                    {tag}
                    <button type="button" className="btn btn-xs btn-circle btn-ghost" onClick={() => removeTag(idx)}>✕</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)}
                  placeholder="Escribe un tag y pulsa Enter..." className="input input-bordered flex-1"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} />
                <button type="button" className="btn btn-sm btn-primary" onClick={addTag}>Añadir</button>
              </div>
              {savedTags.length > 0 && (
                <div className="mt-2">
                  <span className="text-xs opacity-60">Tags guardados (click para añadir):</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {savedTags.map((tag, idx) => (
                      <button type="button" key={idx} className="badge badge-outline badge-sm cursor-pointer hover:badge-primary"
                        onClick={() => {
                          if (!formData.tags.includes(tag)) {
                            setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }))
                          }
                        }}>
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card-actions justify-end mt-4">
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="btn btn-primary">{isEditing ? 'Modificar Operación' : 'Guardar Operación'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TradeForm
