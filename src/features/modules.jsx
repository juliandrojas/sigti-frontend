import React, { useEffect, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import 'datatables.net-responsive-dt';
import 'datatables.net-responsive-dt/css/responsive.dataTables.css';
import { createAssignment, createMaintenance, createMaintenanceRecord, createPeripheralStock, getActiveAssignments, getAssignmentOptions, getEquipmentAssignment, getEquipmentPeripheralCounts, getMaintenanceHistory, getMaintenanceRecords, getMaintenances, getPeripheralStock, getPhysicalPeripheralSummary, getSites, getSystemMetrics, getUserEquipment, getUsers, returnAssignment, saveEquipmentPeripheralCounts, updateMaintenance } from '../api.js';

DataTable.use(DT);

const peripheralLabels = {
  mouse: 'Mouse',
  keyboard: 'Teclado',
  charge: 'Cargador',
  cooling_base: 'Base refrigerante'
};

function normalizeAreaLabel(value) {
  const trimmed = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return 'ÁREA NO DEFINIDA';
  const normalized = trimmed.toLocaleUpperCase('es-CO');
  return normalized === 'RRHH' ? 'RECURSOS HUMANOS' : normalized;
}

const dataTableLanguage = {
  emptyTable: 'No hay registros disponibles.',
  info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
  infoEmpty: 'No hay registros disponibles.',
  infoFiltered: '(filtrado de _MAX_ registros)',
  lengthMenu: 'Mostrar _MENU_ registros',
  loadingRecords: 'Cargando…',
  processing: 'Procesando…',
  search: 'Buscar:',
  zeroRecords: 'No se encontraron coincidencias.',
  paginate: { first: 'Primero', last: 'Último', next: 'Siguiente', previous: 'Anterior' }
};

function SigtiDataTable({ data, columns, slots, children, className = '' }) {
  return <div className="table-card data-table-card"><DataTable
    data={data}
    columns={columns}
    slots={slots}
    className={'display sigti-data-table ' + className}
    options={{
      // Las celdas de acciones contienen componentes React. DataTables Responsive
      // intenta clonarlas en una fila secundaria y termina mostrando "[object HTMLDivElement]".
      // Conservamos las columnas y permitimos desplazamiento horizontal en pantallas estrechas.
      responsive: false,
      pageLength: 10,
      lengthMenu: [5, 10, 25, 50],
      layout: { topStart: 'pageLength', topEnd: 'search', bottomStart: 'info', bottomEnd: 'paging' },
      language: dataTableLanguage
    }}
  >{children}</DataTable></div>;
}

export function LoansOverview({ token }) {
  const [stock, setStock] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [search, setSearch] = useState('');
  const [assignmentSearch, setAssignmentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ itemType: 'mouse', brand: '', reference: '', model: '', location: 'SISTEMAS', quantity: 1, notes: '' });
  const [returningAssignment, setReturningAssignment] = useState(null);
  const [returnConditions, setReturnConditions] = useState({});
  const [returnNotes, setReturnNotes] = useState('');
  const [returning, setReturning] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [assignmentOptions, setAssignmentOptions] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({ employeeId: '', equipmentId: '', mouseStockId: '', keyboardStockId: '', coolingBaseStockId: '', notes: '' });
  const [assigning, setAssigning] = useState(false);
  const [toast, setToast] = useState('');

  function loadStock() {
    setLoading(true);
    setError('');
    Promise.all([getPeripheralStock(token), getActiveAssignments(token)])
      .then(([nextStock, nextAssignments]) => { setStock(nextStock); setAssignments(nextAssignments); })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadStock(); }, [token]);

  async function saveStock(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createPeripheralStock(token, { ...form, quantity: Number(form.quantity) });
      setForm({ itemType: 'mouse', brand: '', reference: '', model: '', location: 'SISTEMAS', quantity: 1, notes: '' });
      setRegisterOpen(false);
      loadStock();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function openReturn(assignment) {
    setReturningAssignment(assignment);
    setReturnConditions(Object.fromEntries(assignment.items.map((item) => [item.id, 'good'])));
    setReturnNotes('');
    setError('');
  }

  async function saveReturn(event) {
    event.preventDefault();
    if (!returningAssignment) return;
    setReturning(true);
    setError('');
    try {
      await returnAssignment(token, returningAssignment.id, {
        items: returningAssignment.items.map((item) => ({
          assignmentItemId: item.id,
          condition: returnConditions[item.id] ?? 'good'
        })),
        notes: returnNotes
      });
      setReturningAssignment(null);
      setToast('La devolución fue registrada correctamente.');
      loadStock();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setReturning(false);
    }
  }

  async function openAssignment() {
    setAssignmentOpen(true);
    setAssignmentOptions(null);
    setAssignmentForm({ employeeId: '', equipmentId: '', mouseStockId: '', keyboardStockId: '', coolingBaseStockId: '', notes: '' });
    setError('');
    try {
      setAssignmentOptions(await getAssignmentOptions(token));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function saveAssignment(event) {
    event.preventDefault();
    setAssigning(true);
    setError('');
    try {
      await createAssignment(token, {
        ...assignmentForm,
        employeeId: Number(assignmentForm.employeeId),
        equipmentId: Number(assignmentForm.equipmentId),
        mouseStockId: Number(assignmentForm.mouseStockId),
        keyboardStockId: Number(assignmentForm.keyboardStockId),
        coolingBaseStockId: assignmentForm.coolingBaseStockId ? Number(assignmentForm.coolingBaseStockId) : null
      });
      setAssignmentOpen(false);
      setToast('El kit fue asignado correctamente.');
      loadStock();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setAssigning(false);
    }
  }

  const stockRows = stock.filter((item) => !(
    item.item_type === 'cooling_base'
    && String(item.brand ?? '').trim().toLocaleLowerCase('es-CO') === 'cualquiera'
    && String(item.reference ?? '').trim().toLocaleLowerCase('es-CO') === 'cualquiera'
    && String(item.model ?? '').trim().toLocaleLowerCase('es-CO') === 'aaa'
    && String(item.location ?? '').trim().toLocaleLowerCase('es-CO') === 'contabilidad'
  )).map((item) => ({
    ...item,
    peripheral: peripheralLabels[item.item_type] ?? item.item_type,
    brandReference: [item.brand, item.reference].filter(Boolean).join(' · ') || '—',
    available: item.quantity_available + ' de ' + item.quantity_total
  }));
  const assignmentRows = assignments.map((assignment) => ({
    ...assignment,
    equipmentCode: assignment.equipment?.full_equipment_code ?? 'Sin código',
    equipmentName: [assignment.equipment?.brand, assignment.equipment?.model].filter(Boolean).join(' ') || 'Equipo no definido',
    area: normalizeAreaLabel(assignment.equipment?.area),
    kit: assignment.items.map((item) => (peripheralLabels[item.item_type] ?? item.item_type) + ' × ' + item.quantity).join(' · '),
    deliveryDate: formatDate(assignment.delivered_at?.slice(0, 10))
  }));
  const peripheralsByArea = Object.values(assignments.reduce((areasByName, assignment) => {
    const area = normalizeAreaLabel(assignment.equipment?.area);
    const current = areasByName[area] ?? { area, total: 0, quantities: {} };
    for (const item of assignment.items) {
      current.total += item.quantity;
      current.quantities[item.item_type] = (current.quantities[item.item_type] ?? 0) + item.quantity;
    }
    areasByName[area] = current;
    return areasByName;
  }, {})).sort((left, right) => left.area.localeCompare(right.area, 'es-CO'));
  const selectedEquipment = assignmentOptions?.equipment.find((item) => String(item.id) === assignmentForm.equipmentId);
  const stockOptions = (type) => assignmentOptions?.stock.filter((item) => item.item_type === type) ?? [];

  return <section aria-labelledby="loans-title">
    <div className="section-heading module-heading"><div><p className="eyebrow">INVENTARIO Y ASIGNACIONES</p><h1 id="loans-title">Inventario de Sistemas</h1></div><div className="section-actions"><button type="button" onClick={openAssignment}>+ Asignar kit</button><button className="secondary-button" type="button" onClick={() => setRegisterOpen(true)}>+ Registrar periférico</button></div></div>
    <p className="muted">Aquí se controla el stock disponible de Sistemas. Las asignaciones a empleados y el conteo físico por puesto se muestran en bloques separados.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p className="muted">Cargando inventario de Sistemas…</p> : <SigtiDataTable data={stockRows} columns={[{ data: 'peripheral' }, { data: 'brandReference' }, { data: 'model' }, { data: 'location' }, { data: 'available' }, { data: 'quantity_assigned' }, { data: 'quantity_cleaning' }, { data: 'quantity_damaged' }]}><thead><tr><th>Periférico</th><th>Marca / referencia</th><th>Modelo</th><th>Ubicación física</th><th>Disponibles</th><th>Asignados</th><th>En limpieza</th><th>Dañados</th></tr></thead></SigtiDataTable>}
    {!loading && <section className="history-card peripheral-area-card"><div className="section-heading"><div><p className="eyebrow">ASIGNACIONES POR ÁREA</p><h2>Periféricos entregados por área</h2><p>Se calcula únicamente a partir de los kits activos asignados a equipos.</p></div></div>{peripheralsByArea.length === 0 ? <p className="muted">Aún no hay kits registrados para calcular los periféricos por área.</p> : <div className="peripheral-area-grid">{peripheralsByArea.map((item) => <article key={item.area}><strong>{item.area}</strong><span>{item.total} {item.total === 1 ? 'periférico asignado' : 'periféricos asignados'}</span><small>{Object.entries(item.quantities).map(([type, quantity]) => `${peripheralLabels[type] ?? type} × ${quantity}`).join(' · ')}</small></article>)}</div>}</section>}
    {!loading && <section className="history-card active-loans-card"><div className="section-heading"><div><p className="eyebrow">KITS ENTREGADOS</p><h2>Préstamos pendientes de devolución</h2><p>{assignments.length} {assignments.length === 1 ? 'kit asignado' : 'kits asignados'} actualmente.</p></div></div><SigtiDataTable data={assignmentRows} columns={[{ data: 'employee_name' }, { data: 'equipmentCode' }, { data: 'equipmentName' }, { data: 'area' }, { data: 'kit' }, { data: 'deliveryDate' }, { data: 'id' }]} slots={{ 6: (_data, row) => <button className="table-action table-action-history" type="button" onClick={() => openReturn(row)}>Registrar devolución</button> }} className="active-loans-table"><thead><tr><th>Asignado a</th><th>Código</th><th>Equipo</th><th>Área</th><th>Kit entregado</th><th>Fecha de entrega</th><th>Acción</th></tr></thead></SigtiDataTable></section>}
    {registerOpen && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setRegisterOpen(false); }}><section className="success-modal record-modal" role="dialog" aria-modal="true" aria-labelledby="peripheral-form-title"><button className="modal-close" type="button" aria-label="Cerrar" onClick={() => setRegisterOpen(false)}>×</button><p className="eyebrow">INVENTARIO DE SISTEMAS</p><h2 id="peripheral-form-title">Registrar periférico en stock</h2><form className="record-form" onSubmit={saveStock}><div className="record-form-grid"><FormField label="Tipo" id="itemType"><select id="itemType" value={form.itemType} onChange={(event) => setForm((current) => ({ ...current, itemType: event.target.value }))}>{Object.entries(peripheralLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></FormField><FormField label="Cantidad inicial" id="stockQuantity"><input id="stockQuantity" type="number" min="1" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} required /></FormField><FormField label="Marca" id="stockBrand"><input id="stockBrand" value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} /></FormField><FormField label="Referencia" id="stockReference"><input id="stockReference" value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} /></FormField><FormField label="Modelo" id="stockModel"><input id="stockModel" value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} /></FormField><FormField label="Ubicación física" id="stockLocation"><select id="stockLocation" value={form.location} disabled><option value="SISTEMAS">SISTEMAS</option></select></FormField><FormField label="Observaciones" id="stockNotes" full><textarea id="stockNotes" rows="3" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></FormField></div><div className="form-actions"><button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar periférico'}</button><button className="secondary-button" type="button" onClick={() => setRegisterOpen(false)}>Cancelar</button></div></form></section></div>}
    {assignmentOpen && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !assigning) setAssignmentOpen(false); }}><section className="success-modal record-modal" role="dialog" aria-modal="true" aria-labelledby="assignment-form-title"><button className="modal-close" type="button" aria-label="Cerrar" disabled={assigning} onClick={() => setAssignmentOpen(false)}>×</button><p className="eyebrow">PRÉSTAMOS Y ASIGNACIONES</p><h2 id="assignment-form-title">Asignar kit de trabajo</h2>{!assignmentOptions ? <p className="muted">Cargando opciones disponibles…</p> : <form className="record-form" onSubmit={saveAssignment}><div className="record-form-grid"><FormField label="Empleado" id="assignmentEmployee"><select id="assignmentEmployee" value={assignmentForm.employeeId} onChange={(event) => setAssignmentForm((current) => ({ ...current, employeeId: event.target.value }))} required><option value="">Selecciona un empleado</option>{assignmentOptions.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></FormField><FormField label="Equipo EF" id="assignmentEquipment"><select id="assignmentEquipment" value={assignmentForm.equipmentId} onChange={(event) => setAssignmentForm((current) => ({ ...current, equipmentId: event.target.value, coolingBaseStockId: '' }))} required><option value="">Selecciona un equipo disponible</option>{assignmentOptions.equipment.map((equipment) => <option key={equipment.id} value={equipment.id}>{equipment.full_equipment_code} — {equipment.brand} {equipment.model}</option>)}</select></FormField><FormField label="Mouse" id="assignmentMouse"><select id="assignmentMouse" value={assignmentForm.mouseStockId} onChange={(event) => setAssignmentForm((current) => ({ ...current, mouseStockId: event.target.value }))} required><option value="">Selecciona un mouse</option>{stockOptions('mouse').map((item) => <option key={item.id} value={item.id}>{[item.brand, item.reference, item.model].filter(Boolean).join(' ') || 'Mouse'} · {item.location} ({item.quantity_available} disponible)</option>)}</select></FormField><FormField label="Teclado" id="assignmentKeyboard"><select id="assignmentKeyboard" value={assignmentForm.keyboardStockId} onChange={(event) => setAssignmentForm((current) => ({ ...current, keyboardStockId: event.target.value }))} required><option value="">Selecciona un teclado</option>{stockOptions('keyboard').map((item) => <option key={item.id} value={item.id}>{[item.brand, item.reference, item.model].filter(Boolean).join(' ') || 'Teclado'} · {item.location} ({item.quantity_available} disponible)</option>)}</select></FormField>{selectedEquipment?.equipment_type === 'Portátil' && <FormField label="Base refrigerante (opcional)" id="assignmentCoolingBase"><select id="assignmentCoolingBase" value={assignmentForm.coolingBaseStockId} onChange={(event) => setAssignmentForm((current) => ({ ...current, coolingBaseStockId: event.target.value }))}><option value="">No asignar base refrigerante</option>{stockOptions('cooling_base').map((item) => <option key={item.id} value={item.id}>{[item.brand, item.reference, item.model].filter(Boolean).join(' ') || 'Base refrigerante'} · {item.location} ({item.quantity_available} disponible)</option>)}</select></FormField>}<FormField label="Observaciones de la entrega" id="assignmentNotes" full><textarea id="assignmentNotes" rows="3" value={assignmentForm.notes} onChange={(event) => setAssignmentForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Entrega inicial, novedades o accesorios adicionales" /></FormField></div><div className="form-actions"><button type="submit" disabled={assigning}>{assigning ? 'Asignando…' : 'Confirmar asignación'}</button><button className="secondary-button" type="button" disabled={assigning} onClick={() => setAssignmentOpen(false)}>Cancelar</button></div></form>}</section></div>}
    {returningAssignment && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !returning) setReturningAssignment(null); }}><section className="success-modal record-modal" role="dialog" aria-modal="true" aria-labelledby="return-form-title"><button className="modal-close" type="button" aria-label="Cerrar" onClick={() => setReturningAssignment(null)} disabled={returning}>×</button><p className="eyebrow">PRÉSTAMO ACTIVO</p><h2 id="return-form-title">Registrar devolución</h2><p className="muted"><strong>{returningAssignment.employee_name}</strong> · {returningAssignment.equipment?.full_equipment_code}</p><form className="record-form" onSubmit={saveReturn}>{returningAssignment.items.map((item) => <FormField key={item.id} label={(peripheralLabels[item.item_type] ?? item.item_type) + ' × ' + item.quantity} id={'condition-' + item.id}><select id={'condition-' + item.id} value={returnConditions[item.id] ?? 'good'} onChange={(event) => setReturnConditions((current) => ({ ...current, [item.id]: event.target.value }))}><option value="good">En buen estado</option><option value="cleaning">Requiere limpieza</option><option value="damaged">Dañado</option><option value="missing">Faltante</option></select></FormField>)}<FormField label="Observaciones de la devolución" id="return-notes" full><textarea id="return-notes" rows="3" value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} placeholder="Novedades encontradas al recibir el kit" /></FormField><div className="form-actions"><button type="submit" disabled={returning}>{returning ? 'Registrando…' : 'Confirmar devolución'}</button><button className="secondary-button" type="button" disabled={returning} onClick={() => setReturningAssignment(null)}>Cancelar</button></div></form></section></div>}
    {toast && <div className="toast toast-success" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{toast}</div>}
  </section>;
}

function EquipmentPeripheralRegistration({ token, equipment, currentCounts, onClose, onSaved }) {
  const equipmentCode = String(equipment.full_equipment_code ?? equipment.equipment_code ?? '').toUpperCase();
  // El primer carácter identifica la empresa; PO identifica que es portátil.
  const isPortableByCode = equipmentCode.startsWith('PO') || equipmentCode.slice(1, 3) === 'PO';
  const [form, setForm] = useState({ mouse: 0, keyboard: 0, charge: 0, cooling_base: 0, notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const next = { mouse: 0, keyboard: 0, charge: 0, cooling_base: 0, notes: '' };
    for (const item of currentCounts ?? []) {
      if (item.item_type !== 'charge' || isPortableByCode) next[item.item_type] = item.quantity;
    }
    next.notes = currentCounts?.find((item) => item.notes)?.notes ?? '';
    setForm(next);
  }, [currentCounts]);

  async function savePhysicalCount(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await saveEquipmentPeripheralCounts(token, equipment.id, {
        items: Object.keys(peripheralLabels).map((itemType) => ({ itemType, quantity: itemType === 'charge' && !isPortableByCode ? 0 : Number(form[itemType]) || 0 })),
        notes: form.notes
      });
      onSaved();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <section className="success-modal record-modal" role="dialog" aria-modal="true" aria-labelledby="equipment-peripherals-title">
      <button className="modal-close" type="button" aria-label="Cerrar" disabled={saving} onClick={onClose}>×</button>
      <p className="eyebrow">LEVANTAMIENTO FÍSICO</p>
      <h2 id="equipment-peripherals-title">Registrar periféricos del puesto</h2>
      <p className="muted"><strong>{equipment.full_equipment_code ?? equipment.equipment_code}</strong> · {equipment.brand} {equipment.model} · Área: {equipment.area || 'No definida'}</p>
      <p className="muted">Indica cuántos periféricos encontraste físicamente. Este registro no consulta ni descuenta el stock de Sistemas.</p>
      <form className="record-form" onSubmit={savePhysicalCount}>
        <div className="record-form-grid">
          <div className="kit-status"><strong>Equipo</strong><span>{equipment.full_equipment_code ?? equipment.equipment_code}</span><strong>Área</strong><span>{equipment.area || 'No definida'}</span></div>
          {Object.entries(peripheralLabels).filter(([itemType]) => itemType !== 'charge' || isPortableByCode).map(([itemType, label]) => <FormField key={itemType} label={label} id={'physical-' + itemType}><input id={'physical-' + itemType} type="number" min="0" value={form[itemType]} onChange={(event) => setForm((current) => ({ ...current, [itemType]: event.target.value }))} /></FormField>)}
          <FormField label="Observaciones del puesto" id="physicalNotes" full><textarea id="physicalNotes" rows="3" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Marca, estado, faltantes o novedades encontradas" /></FormField>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form-actions"><button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar periféricos encontrados'}</button><button className="secondary-button" type="button" disabled={saving} onClick={onClose}>Cancelar</button></div>
      </form>
    </section>
  </div>;
}

export function InventoryOverview({ token, onNavigate, openRegister = false, initialEditId = null }) {
  const [maintenances, setMaintenances] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [equipmentAssignment, setEquipmentAssignment] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [peripheralRegistrationOpen, setPeripheralRegistrationOpen] = useState(false);
  const [equipmentPeripherals, setEquipmentPeripherals] = useState([]);
  const [physicalSummary, setPhysicalSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [registerOpen, setRegisterOpen] = useState(openRegister);
  const [editingMaintenanceId, setEditingMaintenanceId] = useState(initialEditId);
  const [toast, setToast] = useState('');

  function loadMaintenances() {
    setLoading(true);
    Promise.all([getMaintenances(token), getPhysicalPeripheralSummary(token)])
      .then(([nextMaintenances, nextSummary]) => { setMaintenances(nextMaintenances); setPhysicalSummary(nextSummary); })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMaintenances();
  }, [token]);

  async function showHistory(maintenance) {
    setError('');
    setSelected(maintenance);
    setHistory([]);
    setEquipmentAssignment(null);
    setEquipmentPeripherals([]);
    setDetailLoading(true);
    try {
      const [maintenanceHistory, assignment, peripherals] = await Promise.all([
        getMaintenanceHistory(token, maintenance.id),
        getEquipmentAssignment(token, maintenance.id),
        getEquipmentPeripheralCounts(token, maintenance.id)
      ]);
      setHistory(maintenanceHistory);
      setEquipmentAssignment(assignment);
      setEquipmentPeripherals(peripherals);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setDetailLoading(false);
    }
  }

  function closeHistory() {
    setSelected(null);
    setHistory([]);
    setEquipmentAssignment(null);
    setPeripheralRegistrationOpen(false);
  }

  useEffect(() => {
    if (!selected) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') closeHistory();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selected]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const inventoryRows = maintenances.map((item) => ({
    ...item,
    code: item.full_equipment_code ?? item.equipment_code,
    equipment: [item.brand, item.model].filter(Boolean).join(' '),
    glpiLabel: item.glpi === null || item.glpi === undefined ? 'No definido' : item.glpi ? 'Sí' : 'No',
    lastMaintenance: formatDate(item.last_maintenance)
  }));

  return <section aria-labelledby="inventory-list-title">
    <div className="section-heading module-heading"><div><p className="eyebrow">CONTROL DE ACTIVOS</p><h1 id="inventory-list-title">Inventario de equipos</h1></div><button type="button" onClick={() => setRegisterOpen(true)}>+ Registrar equipo</button></div>
    <section className="history-card peripheral-area-card"><div className="section-heading"><div><p className="eyebrow">INVENTARIO FÍSICO</p><h2>Conteo de periféricos por puesto</h2><p>Registra los periféricos que encuentres en cada puesto de trabajo.</p></div></div>{physicalSummary.length === 0 ? <p className="muted">Aún no hay puestos con periféricos registrados.</p> : <div className="peripheral-area-grid">{physicalSummary.map((item) => <article key={item.area}><strong>{item.area}</strong><span>{item.total} {item.total === 1 ? 'periférico encontrado' : 'periféricos encontrados'}</span><small>{Object.entries(item.quantities).map(([type, quantity]) => `${peripheralLabels[type] ?? type} × ${quantity}`).join(' · ')}</small></article>)}</div>}</section>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p className="muted">Cargando equipos…</p> : <SigtiDataTable data={inventoryRows} columns={[{ data: 'code' }, { data: 'company' }, { data: 'site_name' }, { data: 'equipment' }, { data: 'responsible' }, { data: 'area' }, { data: 'glpiLabel' }, { data: 'lastMaintenance' }, { data: 'id' }]} slots={{ 8: (_data, row) => <div className="table-actions"><button className="table-action table-action-edit" type="button" onClick={() => setEditingMaintenanceId(row.id)}>Editar</button><button className="table-action table-action-history" type="button" onClick={() => showHistory(row)}>Ver ficha</button></div> }}><thead><tr><th>Código</th><th>Empresa</th><th>Sede</th><th>Equipo</th><th>Responsable</th><th>Área</th><th>GLPI</th><th>Último mantenimiento</th><th>Acciones</th></tr></thead></SigtiDataTable>}
    {selected && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closeHistory(); }}><section className="success-modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title"><button className="modal-close" type="button" aria-label="Cerrar ficha" onClick={closeHistory}>×</button><div className="section-heading"><div><p className="eyebrow">FICHA DE INVENTARIO</p><h2 id="history-title">{selected.full_equipment_code ?? selected.equipment_code}</h2></div><div className="section-actions"><button type="button" onClick={() => onNavigate('/sistemas/mantenimiento?equipmentId=' + selected.id)}>Seleccionar equipo para mantenimiento</button><button className="secondary-button" type="button" onClick={closeHistory}>Cerrar</button></div></div><p className="muted">{selected.brand} {selected.model} · Serial {selected.serial_number} · Sede {selected.site_name ?? 'no definida'}</p><section className="assignment-summary"><div className="assignment-summary-heading"><h3>Periféricos encontrados en el puesto</h3><button type="button" onClick={() => setPeripheralRegistrationOpen(true)}>+ Registrar periféricos</button></div>{detailLoading ? <p className="muted">Consultando levantamiento físico…</p> : equipmentPeripherals.length ? <><ul className="assigned-peripherals">{equipmentPeripherals.map((item) => <li key={item.id}><strong>{peripheralLabels[item.item_type] ?? item.item_type}</strong> × {item.quantity}</li>)}</ul>{equipmentPeripherals.find((item) => item.notes)?.notes && <div className="record-observations"><strong>Observaciones</strong><p>{equipmentPeripherals.find((item) => item.notes).notes}</p></div>}</> : <p className="muted">Aún no se han registrado los periféricos de este puesto.</p>}</section>{selected.observations && <div className="equipment-observations"><strong>Observaciones del equipo</strong><p>{selected.observations}</p></div>}<h3 className="detail-section-title">Historial de mantenimiento</h3>{detailLoading ? <p className="muted">Cargando historial…</p> : history.length === 0 ? <p className="muted">No hay registros de mantenimiento.</p> : <div className="history-list">{history.map((record) => <article key={record.id}><div><strong>{record.maintenance_type}</strong><span>{formatDate(record.maintenance_date)}</span></div><p>{record.description || 'Sin descripción.'}</p>{record.actions_taken && <div className="record-observations"><strong>Acciones realizadas</strong><p>{record.actions_taken}</p></div>}{record.observations && <div className="record-observations"><strong>Observaciones</strong><p>{record.observations}</p></div>}{record.next_maintenance_date && <small>Próximo: {formatDate(record.next_maintenance_date)}</small>}</article>)}</div>}</section></div>}
    {peripheralRegistrationOpen && selected && <EquipmentPeripheralRegistration token={token} equipment={selected} currentCounts={equipmentPeripherals} onClose={() => setPeripheralRegistrationOpen(false)} onSaved={() => { setPeripheralRegistrationOpen(false); setToast('Los periféricos encontrados fueron registrados.'); showHistory(selected); }} />}
    {registerOpen && <MaintenanceForm token={token} onNavigate={onNavigate} modal onSaved={loadMaintenances} onClose={() => { setRegisterOpen(false); if (openRegister) onNavigate('/sistemas/inventario'); }} />}
    {editingMaintenanceId && <MaintenanceForm token={token} maintenanceId={editingMaintenanceId} onNavigate={onNavigate} modal onSaved={() => { loadMaintenances(); setToast('La información del equipo fue actualizada correctamente.'); }} onClose={() => { setEditingMaintenanceId(null); if (initialEditId) onNavigate('/sistemas/inventario'); }} />}
    {toast && <div className="toast toast-success" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{toast}</div>}
  </section>;
}

export function MaintenanceRecordsOverview({ token, onNavigate }) {
  const [records, setRecords] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [recordFormOpen, setRecordFormOpen] = useState(false);
  const [recordSaving, setRecordSaving] = useState(false);
  const [recordStatus, setRecordStatus] = useState('');
  const [recordForm, setRecordForm] = useState({ maintenanceId: '', maintenanceDate: todayIso(), maintenanceType: 'Preventivo', description: '', actionsTaken: '', observations: '' });
  const isEquipmentLocked = Boolean(new URLSearchParams(window.location.search).get('equipmentId'));

  function closeRecordForm() {
    window.history.replaceState({}, '', '/sistemas/mantenimiento');
    setRecordFormOpen(false);
    setRecordStatus('');
  }

  useEffect(() => {
    getMaintenanceRecords(token)
      .then(setRecords)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    getMaintenances(token)
      .then((items) => {
        setEquipment(items);
        const requestedId = new URLSearchParams(window.location.search).get('equipmentId');
        if (requestedId && items.some((item) => String(item.id) === requestedId)) {
          setRecordForm((current) => ({ ...current, maintenanceId: requestedId }));
          setRecordFormOpen(true);
        }
      })
      .catch((requestError) => setError(requestError.message));
  }, [token]);

  async function saveRecord(event) {
    event.preventDefault();
    setRecordSaving(true);
    setRecordStatus('');
    try {
      await createMaintenanceRecord(token, recordForm.maintenanceId, recordForm);
      setRecords(await getMaintenanceRecords(token));
      setRecordForm({ maintenanceId: '', maintenanceDate: todayIso(), maintenanceType: 'Preventivo', description: '', actionsTaken: '', observations: '' });
      closeRecordForm();
    } catch (requestError) {
      setRecordStatus(requestError.message);
    } finally {
      setRecordSaving(false);
    }
  }

  const maintenanceRows = records.map((record) => ({
    ...record,
    maintenanceDate: formatDate(record.maintenance_date),
    equipmentCode: record.equipment?.full_equipment_code ?? record.equipment?.equipment_code ?? 'No definido',
    equipmentName: [record.equipment?.brand, record.equipment?.model].filter(Boolean).join(' '),
    company: record.equipment?.company ?? 'No definida',
    description: record.observations || record.description || 'Sin observaciones',
    nextMaintenanceDate: formatDate(record.next_maintenance_date)
  }));

  return <section aria-labelledby="maintenance-records-title">
    <div className="section-heading module-heading"><div><p className="eyebrow">HISTORIAL TÉCNICO</p><h1 id="maintenance-records-title">Mantenimientos</h1></div><div className="section-actions"><button type="button" onClick={() => { setRecordForm({ maintenanceId: '', maintenanceDate: todayIso(), maintenanceType: 'Preventivo', description: '', actionsTaken: '', observations: '' }); setRecordFormOpen(true); setRecordStatus(''); }}>+ Registrar mantenimiento</button><button className="secondary-button" type="button" onClick={() => onNavigate('/sistemas/inventario')}>Ver inventario</button></div></div>
    {error && <p className="error" role="alert">{error}</p>}
    {loading ? <p className="muted">Cargando mantenimientos…</p> : <SigtiDataTable data={maintenanceRows} columns={[{ data: 'maintenanceDate' }, { data: 'equipmentCode' }, { data: 'equipmentName' }, { data: 'company' }, { data: 'maintenance_type' }, { data: 'technician_name' }, { data: 'description' }, { data: 'nextMaintenanceDate' }]}><thead><tr><th>Fecha</th><th>Código</th><th>Equipo</th><th>Empresa</th><th>Tipo</th><th>Técnico</th><th>Descripción</th><th>Próximo mantenimiento</th></tr></thead></SigtiDataTable>}
    {recordFormOpen && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closeRecordForm(); }}><div className="success-modal record-modal" role="dialog" aria-modal="true" aria-labelledby="new-record-title"><button className="modal-close" type="button" aria-label="Cerrar" onClick={closeRecordForm}>×</button><p className="eyebrow">HISTORIAL TÉCNICO</p><h2 id="new-record-title">Registrar mantenimiento</h2><form className="record-form" onSubmit={saveRecord}><div className="record-form-grid"><FormField label="Equipo" id="recordMaintenanceId"><select id="recordMaintenanceId" value={recordForm.maintenanceId} onChange={(event) => setRecordForm((current) => ({ ...current, maintenanceId: event.target.value }))} disabled={isEquipmentLocked} required><option value="">Selecciona un equipo</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.full_equipment_code ?? item.equipment_code} — {item.brand} {item.model}</option>)}</select></FormField><FormField label="Fecha del mantenimiento" id="globalMaintenanceDate"><input id="globalMaintenanceDate" type="date" value={recordForm.maintenanceDate} onChange={(event) => setRecordForm((current) => ({ ...current, maintenanceDate: event.target.value }))} required /></FormField><FormField label="Tipo" id="globalMaintenanceType"><select id="globalMaintenanceType" value={recordForm.maintenanceType} onChange={(event) => setRecordForm((current) => ({ ...current, maintenanceType: event.target.value }))}><option>Preventivo</option><option>Correctivo</option><option>Diagnóstico</option><option>Otro</option></select></FormField><FormField label="Descripción" id="globalRecordDescription" full><textarea id="globalRecordDescription" value={recordForm.description} onChange={(event) => setRecordForm((current) => ({ ...current, description: event.target.value }))} rows="3" required /></FormField><FormField label="Acciones realizadas" id="globalActionsTaken" full><textarea id="globalActionsTaken" value={recordForm.actionsTaken} onChange={(event) => setRecordForm((current) => ({ ...current, actionsTaken: event.target.value }))} rows="3" /></FormField><FormField label="Observaciones" id="globalRecordObservations" full><textarea id="globalRecordObservations" value={recordForm.observations} onChange={(event) => setRecordForm((current) => ({ ...current, observations: event.target.value }))} rows="3" /></FormField></div><div className="form-actions"><button type="submit" disabled={recordSaving}>{recordSaving ? 'Guardando…' : 'Guardar mantenimiento'}</button><button className="secondary-button" type="button" onClick={closeRecordForm}>Cancelar</button></div>{recordStatus && <p className="error" role="alert">{recordStatus}</p>}</form></div></div>}
  </section>;
}

export function SystemMetrics({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSystemMetrics(token).then(setMetrics).catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) return <p className="error" role="alert">{error}</p>;
  const cards = [
    ['Componentes registrados', metrics?.inventoryItems, 'Inventario disponible en bodega.'],
    ['Solicitudes totales', metrics?.tickets, 'Tickets registrados en la mesa de ayuda.'],
    ['Mantenimientos', metrics?.maintenances, 'Hojas de vida técnica registradas.'],
    ['Préstamos activos', metrics?.activeLoans, 'Equipos o componentes pendientes de devolución.']
  ];

  return <section className="cards metrics" aria-label="Métricas de sistemas">
    {cards.map(([title, value, description]) => <article key={title}><p className="metric-value">{metrics ? value : '—'}</p><h3>{title}</h3><p>{description}</p></article>)}
  </section>;
}

function WelcomeBanner({ user, title }) {
  return <section className="welcome dashboard-welcome"><p>Bienvenido(a) {user.name}</p><h1>{title}</h1><span>{user.role}</span></section>;
}

export function EmployeeDashboard({ token, user }) {
  return <EmployeesSection token={token} user={user} />;
}

export function SystemDashboard({ token, user }) {
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSystemMetrics(token).then(setMetrics).catch((requestError) => setError(requestError.message));
  }, [token]);

  if (error) return <p className="error" role="alert">{error}</p>;
  const stats = metrics?.stats;
  const maxType = Math.max(...(stats?.computerByType?.map((item) => item.value) ?? [1]));

  return <>
    <WelcomeBanner user={user} title="Resumen de Gestión de TI" />
    <section className="dashboard-stats" aria-labelledby="dashboard-title"><div className="section-heading"><div><p className="eyebrow">INDICADORES PRINCIPALES</p><h2 id="dashboard-title">Resumen operativo</h2></div></div><div className="dashboard-stat-grid"><article className="stat-card"><span>Mantenimientos este mes</span><strong>{stats ? stats.maintenancesThisMonth : '—'}</strong><small>Intervenciones registradas</small></article><article className="stat-card"><span>Equipos de cómputo</span><strong>{stats ? stats.computerTotal : '—'}</strong><small>Portátiles, torres y todo en uno</small></article><article className="stat-card"><span>Equipos en GLPI</span><strong>{stats ? stats.glpiRegistered : '—'}</strong><small>Activos asociados</small></article><article className="stat-card"><span>Mantenimientos vencidos</span><strong>{stats ? stats.overdueMaintenances : '—'}</strong><small>Fecha programada anterior a hoy</small></article><article className="stat-card"><span>Vencen en 30 días</span><strong>{stats ? stats.dueSoonMaintenances : '—'}</strong><small>Atención y planificación inmediata</small></article><article className="stat-card"><span>Equipos al día</span><strong>{stats ? stats.upToDateMaintenances : '—'}</strong><small>Sin vencimiento en los próximos 30 días</small></article><article className="stat-card"><span>Componentes registrados</span><strong>{metrics ? metrics.inventoryItems : '—'}</strong><small>Inventario disponible en bodega</small></article><article className="stat-card"><span>Préstamos activos</span><strong>{metrics ? metrics.activeLoans : '—'}</strong><small>Equipos o componentes pendientes de devolución</small></article></div><div className="dashboard-panels"><article className="dashboard-panel"><h3>Equipos de cómputo por tipo</h3>{stats?.computerByType?.map((item) => <div className="bar-row" key={item.label}><div><span>{item.label}</span><strong>{item.value}</strong></div><div className="bar-track"><span style={{ width: item.value > 0 ? `${(item.value / maxType) * 100}%` : '0%' }} /></div></div>)}</article><article className="dashboard-panel"><h3>Equipos por empresa</h3>{stats?.equipmentByCompany?.map((item) => <div className="company-row" key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</article></div></section>
  </>;
}

const areas = ['ACTIVOS FIJOS', 'BIENESTAR', 'CALIDAD', 'CAMPOS', 'COMPRAS', 'CONTABILIDAD', 'GERENCIA', 'GERENCIA ADMINISTRATIVA Y FINANCIERA', 'JURIDICA', 'MANTENIMIENTO', 'MERCADEO', 'NOMINA', 'OPERACIONES', 'RECURSOS HUMANOS', 'SALUD OCUPACIONAL', 'SENA', 'SISTEMAS'];
const ramOptions = ['4 GB', '8 GB', '12 GB', '16 GB', '32 GB', '64 GB'];
const operatingSystems = ['WIN 10 Pro', 'WIN 10 Single Lenguaje', 'WIN 11 Pro', 'WIN 7 Pro', 'WIN 8.1 Single Lenguaje', 'MacOS', 'WIN 11 Single Lenguaje', 'WIN 11 Pro For Workstations'];
const storageOptions = ['No aplica', '128 GB', '250 GB', '500 GB', '1 TB', '2 TB'];
const screenSizes = ['12 pulgadas', '13 pulgadas', '14 pulgadas', '15.6 pulgadas', '17 pulgadas', '19 pulgadas', '21.5 pulgadas', '23.8 pulgadas', '24 pulgadas'];

function MaintenanceForm({ token, maintenanceId, onNavigate, modal = false, onClose, onSaved }) {
  const [form, setForm] = useState(createEmptyMaintenanceForm);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedEquipment, setSavedEquipment] = useState(null);
  const [toast, setToast] = useState('');
  const editing = Boolean(maintenanceId);

  useEffect(() => {
    getUsers(token)
      .then(setUsers)
      .catch((requestError) => setStatus({ type: 'error', message: requestError.message }));
  }, [token]);

  useEffect(() => {
    setSites([]);
    setForm((current) => ({ ...current, siteId: '' }));
    getSites(token, form.company)
      .then(setSites)
      .catch((requestError) => setStatus({ type: 'error', message: requestError.message }));
  }, [token, form.company]);

  useEffect(() => {
    if (!maintenanceId) return;
    getMaintenances(token)
      .then((items) => {
        const item = items.find((candidate) => String(candidate.id) === String(maintenanceId));
        if (!item) throw new Error('No se encontró el equipo que deseas editar.');
        setForm({
          company: item.company, siteId: item.site_id ?? '', equipmentCode: item.equipment_code ?? '', ipAddress: item.ip_address ?? '', area: item.area ?? '', responsible: item.responsible ?? '', brand: item.brand ?? '', model: item.model ?? '', serialNumber: item.serial_number ?? '', assetType: item.equipment_type ?? 'Portátil', processor: item.processor_model ?? '', ram: item.ram ?? '8 GB', operatingSystem: item.os ?? 'WIN 11 Pro', hdd: item.hdd_size ?? 'No aplica', ssd: item.ssd_size ?? 'No aplica', isNvme: item.is_nvme ?? false, screenSize: item.screen_size ?? '14 pulgadas', antivirus: item.antivirus ?? 'Sophos', glpi: item.glpi ?? false, observations: item.observations ?? ''
        });
      })
      .catch((requestError) => setStatus({ type: 'error', message: requestError.message }));
  }, [token, maintenanceId]);

  useEffect(() => {
    if (!modal) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modal, onClose]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(''), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  function closeSavedModal() {
    const wasSaved = Boolean(savedEquipment);
    setSavedEquipment(null);
    setForm(createEmptyMaintenanceForm());
    setStatus(null);
    if (wasSaved) onSaved?.();
    if (modal) onClose?.();
  }

  function update(field, value) {
    setStatus(null);
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const result = editing ? await updateMaintenance(token, maintenanceId, form) : await createMaintenance(token, form);
      setStatus(null);
      if (editing) {
        setToast('Los cambios de ' + (result.maintenance.full_equipment_code ?? result.maintenance.equipment_code) + ' fueron guardados correctamente.');
        onSaved?.();
        onClose?.();
      } else {
        setSavedEquipment({
          code: result.maintenance.full_equipment_code,
          responsible: result.maintenance.responsible || form.responsible,
          nextMaintenance: formatDate(result.record.next_maintenance_date),
          title: 'Equipo guardado correctamente'
        });
      }
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSaving(false);
    }
  }

  const formContent = <section className={`maintenance-card ${modal ? 'equipment-form-modal' : ''}`} aria-labelledby="maintenance-title">
    {modal && <button className="modal-close" type="button" aria-label="Cerrar registro de equipo" onClick={onClose}>×</button>}
    <div className="section-heading module-heading"><div><p className="eyebrow">INVENTARIO TÉCNICO</p><h1 id="maintenance-title">{editing ? 'Editar equipo' : 'Registrar equipo'}</h1></div>{!modal && <button className="secondary-button" type="button" onClick={() => onNavigate('/sistemas/inventario')}>← Volver al inventario</button>}</div>
    <form className="maintenance-form" onSubmit={submit}>
      <FormField label="Empresa" id="company"><select id="company" value={form.company} onChange={(event) => update('company', event.target.value)}><option>Petrocasinos</option><option>Cosecharte</option></select></FormField>
      <FormField label="Sede" id="siteId"><select id="siteId" value={form.siteId} onChange={(event) => update('siteId', event.target.value ? Number(event.target.value) : '')} required><option value="">Selecciona una sede</option>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select></FormField>
      <FormField label="Código EF" id="equipmentCode"><input id="equipmentCode" value={form.equipmentCode} onChange={(event) => update('equipmentCode', event.target.value.toUpperCase())} pattern="EF[0-9]{3,4}" placeholder="Ej. EF1234" title="Usa el formato EF seguido de 3 o 4 dígitos." required /></FormField>
      <FormField label="IP" id="ipAddress"><input id="ipAddress" value={form.ipAddress} onChange={(event) => update('ipAddress', event.target.value)} placeholder="Ej. 172.16.1.51" /></FormField>
      <FormField label="Área" id="area"><select id="area" value={form.area} onChange={(event) => update('area', event.target.value)} required><option value="">Selecciona un área</option>{areas.map((area) => <option key={area}>{area}</option>)}</select></FormField>
      <FormField label="Usuario" id="responsible"><select id="responsible" value={form.responsible} onChange={(event) => update('responsible', event.target.value)} required><option value="">Selecciona un usuario</option>{form.responsible && !users.some((user) => user.name === form.responsible) && <option value={form.responsible}>{form.responsible} (registro histórico)</option>}{users.map((user) => <option key={user.id} value={user.name}>{user.name}</option>)}</select></FormField>
      <FormField label="Marca" id="brand"><input id="brand" value={form.brand} onChange={(event) => update('brand', event.target.value)} required /></FormField>
      <FormField label="Modelo" id="model"><input id="model" value={form.model} onChange={(event) => update('model', event.target.value)} required /></FormField>
      <FormField label="Serial" id="serialNumber"><input id="serialNumber" value={form.serialNumber} onChange={(event) => update('serialNumber', event.target.value)} required /></FormField>
      <FormField label="Tipo de activo" id="assetType"><select id="assetType" value={form.assetType} onChange={(event) => update('assetType', event.target.value)}><option>Portátil</option><option>Torre</option><option>Todo en Uno</option></select></FormField>
      <FormField label="Procesador" id="processor"><input id="processor" value={form.processor} onChange={(event) => update('processor', event.target.value)} placeholder="Ej. i5-1235U 1.30 GHz" required /></FormField>
      <FormField label="RAM" id="ram"><select id="ram" value={form.ram} onChange={(event) => update('ram', event.target.value)}>{ramOptions.map((option) => <option key={option}>{option}</option>)}</select></FormField>
      <FormField label="Sistema operativo" id="operatingSystem"><select id="operatingSystem" value={form.operatingSystem} onChange={(event) => update('operatingSystem', event.target.value)}>{operatingSystems.map((option) => <option key={option}>{option}</option>)}</select></FormField>
      <FormField label="HDD" id="hdd"><select id="hdd" value={form.hdd} onChange={(event) => update('hdd', event.target.value)}>{storageOptions.map((option) => <option key={option}>{option}</option>)}</select></FormField>
      <FormField label="SSD" id="ssd"><select id="ssd" value={form.ssd} onChange={(event) => { update('ssd', event.target.value); if (event.target.value === 'No aplica') update('isNvme', false); }}>{storageOptions.map((option) => <option key={option}>{option}</option>)}</select>{form.ssd !== 'No aplica' && <label className="checkbox"><input type="checkbox" checked={form.isNvme} onChange={(event) => update('isNvme', event.target.checked)} /> El SSD es NVMe</label>}</FormField>
      <FormField label="Tamaño de pantalla" id="screenSize"><select id="screenSize" value={form.screenSize} onChange={(event) => update('screenSize', event.target.value)}>{screenSizes.map((option) => <option key={option}>{option}</option>)}</select></FormField>
      <FormField label="Antivirus" id="antivirus"><select id="antivirus" value={form.antivirus} onChange={(event) => update('antivirus', event.target.value)}><option>Sophos</option><option>Defender</option></select></FormField>
      <FormField label="GLPI" id="glpi"><label className="checkbox"><input id="glpi" type="checkbox" checked={form.glpi} onChange={(event) => update('glpi', event.target.checked)} /> Equipo registrado en GLPI</label></FormField>
      <FormField label="Observaciones" id="observations" full><textarea id="observations" value={form.observations} onChange={(event) => update('observations', event.target.value)} rows="4" /></FormField>
      <div className="form-actions"><button type="submit" disabled={saving}>{saving ? (editing ? 'Actualizando equipo…' : 'Registrando equipo…') : (editing ? 'Guardar cambios' : 'Registrar equipo')}</button>{status && <p className="error" role="alert">{status.message}</p>}</div>
    </form>
    {savedEquipment && <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) closeSavedModal(); }}>
      <div className="success-modal" role="dialog" aria-modal="true" aria-labelledby="saved-equipment-title">
        <button className="modal-close" type="button" aria-label="Cerrar" onClick={closeSavedModal}>×</button>
        <p className="eyebrow">REGISTRO COMPLETADO</p>
        <h2 id="saved-equipment-title">{savedEquipment.title}</h2>
        <div className="saved-equipment-details">
          <div><span>Asignado a</span><strong>{savedEquipment.responsible}</strong></div>
          <div><span>Código completo</span><strong>{savedEquipment.code}</strong></div>
          <div><span>Próximo mantenimiento</span><strong>{savedEquipment.nextMaintenance}</strong></div>
        </div>
        <button type="button" onClick={closeSavedModal}>Aceptar</button>
      </div>
    </div>}
  </section>;

  return <>{modal ? <div className="modal-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>{formContent}</div> : formContent}{toast && <div className="toast toast-success" role="status" aria-live="polite"><span aria-hidden="true">✓</span>{toast}</div>}</>;
}

function createEmptyMaintenanceForm() {
  return {
    company: 'Petrocasinos', siteId: '', equipmentCode: '', ipAddress: '', area: '', responsible: '', brand: '', model: '', serialNumber: '', assetType: 'Portátil', processor: '', ram: '8 GB', operatingSystem: 'WIN 11 Pro', hdd: 'No aplica', ssd: 'No aplica', isNvme: false, screenSize: '14 pulgadas', antivirus: 'Sophos', glpi: false, observations: ''
  };
}

function formatDate(value) {
  if (!value) return 'pendiente';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

function FormField({ label, id, children, full = false }) {
  return <div className={`form-field ${full ? 'full' : ''}`}><label htmlFor={id}>{label}</label>{children}</div>;
}

function EmployeesSection({ token, user }) {
  const [equipmentData, setEquipmentData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getUserEquipment(token, user.id)
      .then(setEquipmentData)
      .catch((requestError) => setError(requestError.message));
  }, [token, user.id]);

  return <section className="history-card employee-equipment-card" aria-labelledby="my-equipment-title">
      <div className="section-heading"><div><p className="eyebrow">INVENTARIO PERSONAL</p><h1 id="my-equipment-title">Activos asignados</h1><p>Equipos y periféricos registrados a tu nombre.</p></div></div>
      {error && <p className="error" role="alert">{error}</p>}
      {!equipmentData && !error && <p className="muted">Consultando tus equipos asignados…</p>}
      {equipmentData && equipmentData.equipment.length === 0 && equipmentData.assignments.length === 0 && <p className="muted">No tienes equipos o periféricos asignados actualmente.</p>}
      {equipmentData?.equipment.length > 0 && <div className="employee-equipment-list">{equipmentData.equipment.map((item) => <article key={item.id}>
        <div><strong>{item.full_equipment_code ?? item.equipment_code}</strong><span>{item.equipment_type}</span></div>
        <p>{item.brand} {item.model} · Serial {item.serial_number}</p>
        <small>{item.company} · {item.site_name ?? 'Sede no definida'} · Área {item.area}</small>
      </article>)}</div>}
      {equipmentData?.assignments.map((assignment) => <article className="employee-assignment" key={`assignment-${assignment.id}`}>
        <div><strong>Kit de periféricos</strong><span>Entregado {formatDate(assignment.delivered_at?.slice(0, 10))}</span></div>
        <p>{assignment.equipment?.full_equipment_code ?? 'Equipo asociado no encontrado'}</p>
        <small>{assignment.items.map((item) => `${peripheralLabels[item.item_type] ?? item.item_type} × ${item.quantity}`).join(' · ')}</small>
      </article>)}
  </section>;
}

