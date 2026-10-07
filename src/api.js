const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

async function safeFetch(url, options) {
  try {
    return await window.fetch(url, options);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('No fue posible conectarse con el servidor de SIGTI. Verifica que el backend esté iniciado y que esta dirección tenga permiso para comunicarse con él.');
    }
    throw new Error('No fue posible completar la solicitud al servidor de SIGTI. Intenta nuevamente.');
  }
}

export async function login(credentials) {
  const response = await safeFetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible iniciar sesión.');
  return body;
}

export async function getCurrentUser(token) {
  const response = await safeFetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'La sesión no es válida.');
  return body.user;
}

export async function getUsers(token) {
  const response = await safeFetch(`${API_URL}/users`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar los usuarios.');
  return body.users;
}

export async function getUserEquipment(token, userId) {
  const response = await safeFetch(`${API_URL}/users/${encodeURIComponent(userId)}/equipment`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar los equipos asignados.');
  return body;
}

export async function getInventoryReport(token) {
  const response = await safeFetch(`${API_URL}/inventory-report`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar tu reporte de inventario.');
  return body.report;
}

export async function saveInventoryReport(token, data) {
  const response = await safeFetch(`${API_URL}/inventory-report`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible guardar tu reporte de inventario.');
  return body.report;
}

export async function getInventoryReports(token) {
  const response = await safeFetch(`${API_URL}/inventory-reports`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar los reportes de inventario.');
  return body.reports;
}

export async function getTickets(token) {
  const response = await safeFetch(`${API_URL}/tickets`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar las solicitudes.');
  return body.tickets;
}

export async function createTicket(token, data) {
  const response = await safeFetch(`${API_URL}/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible registrar la solicitud.');
  return body.ticket;
}

export async function resolveTicket(token, ticketId, data) {
  const response = await safeFetch(`${API_URL}/tickets/${encodeURIComponent(ticketId)}/resolve`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible resolver la solicitud.');
  return body.ticket;
}

export async function getSystemMetrics(token) {
  const response = await safeFetch(`${API_URL}/dashboard/systems`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar las métricas.');
  return body.metrics;
}

export async function createMaintenance(token, data) {
  const response = await safeFetch(`${API_URL}/maintenances`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible guardar el mantenimiento.');
  return body;
}

export async function updateMaintenance(token, id, data) {
  const response = await safeFetch(`${API_URL}/maintenances/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible actualizar el equipo.');
  return body;
}

export async function getMaintenances(token) {
  const response = await safeFetch(`${API_URL}/maintenances`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar los equipos.');
  return body.maintenances;
}

export async function getPeripheralStock(token) {
  const response = await safeFetch(API_URL + '/peripheral-stock', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar el stock de periféricos.');
  return body.stock;
}

export async function createPeripheralStock(token, data) {
  const response = await safeFetch(API_URL + '/peripheral-stock', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible registrar el periférico.');
  return body.stockItem;
}

export async function getActiveAssignments(token) {
  const response = await safeFetch(API_URL + '/assignments', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar los préstamos activos.');
  return body.assignments;
}

export async function returnAssignment(token, assignmentId, data) {
  const response = await safeFetch(API_URL + '/assignments/' + assignmentId + '/return', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible registrar la devolución.');
  return body.assignment;
}

export async function getAssignmentOptions(token) {
  const response = await safeFetch(API_URL + '/assignment-options', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar las opciones de asignación.');
  return body;
}

export async function createAssignment(token, data) {
  const response = await safeFetch(API_URL + '/assignments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token
    },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible asignar el kit.');
  return body.assignment;
}

export async function getMaintenanceRecords(token) {
  const response = await safeFetch(`${API_URL}/maintenance-records`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar los registros de mantenimiento.');
  return body.records;
}

export async function getSites(token, company) {
  const response = await safeFetch(`${API_URL}/sites?company=${encodeURIComponent(company)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar las sedes.');
  return body.sites;
}

export async function getMaintenanceHistory(token, maintenanceId) {
  const response = await safeFetch(`${API_URL}/maintenances/${maintenanceId}/history`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar el historial.');
  return body.history;
}

export async function getEquipmentAssignment(token, maintenanceId) {
  const response = await safeFetch(`${API_URL}/maintenances/${maintenanceId}/assignment`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar la asignación del equipo.');
  return body.assignment;
}

export async function getEquipmentPeripheralCounts(token, maintenanceId) {
  const response = await safeFetch(`${API_URL}/maintenances/${maintenanceId}/peripherals`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar los periféricos del puesto.');
  return body.peripherals;
}

export async function saveEquipmentPeripheralCounts(token, maintenanceId, data) {
  const response = await safeFetch(`${API_URL}/maintenances/${maintenanceId}/peripherals`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible guardar los periféricos del puesto.');
  return body.peripherals;
}

export async function getPhysicalPeripheralSummary(token) {
  const response = await safeFetch(`${API_URL}/physical-peripherals/summary`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible cargar el resumen físico de periféricos.');
  return body.summary;
}

export async function createMaintenanceRecord(token, maintenanceId, data) {
  const response = await safeFetch(`${API_URL}/maintenances/${maintenanceId}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message ?? 'No fue posible registrar el mantenimiento.');
  return body;
}
