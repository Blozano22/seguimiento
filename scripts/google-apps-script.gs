// ============================================================
// YULE - Google Apps Script para actualización de cursos y envío de correos
// Pegar en: Extensiones → Apps Script → reemplazar todo
// Luego: Implementar → Nueva implementación → Aplicación web
//   · Ejecutar como: Yo
//   · Quién tiene acceso: Cualquier usuario
// Copiar la URL generada a .env.local → GOOGLE_APPS_SCRIPT_URL
// ============================================================

const SECRET_TOKEN = 'yule-americana-2025';  // mismo valor que GOOGLE_APPS_SCRIPT_TOKEN en .env.local

// ── Entrada principal POST ───────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.token !== SECRET_TOKEN) {
      return json({ error: 'No autorizado' });
    }

    const { action } = body;

    if (action === 'update') {
      const { sheetName, asignatura, programa, updates } = body;
      const ok = updateCourseRow(sheetName, asignatura, programa, updates);
      return json({ success: ok, updated: ok });
    }

    if (action === 'sendEmail') {
      const { to, subject, html, text } = body;
      if (!to || !subject) return json({ error: 'Faltan campos: to, subject' });
      const destinatarios = Array.isArray(to) ? to.join(',') : to;
      MailApp.sendEmail({
        to: destinatarios,
        subject: subject,
        htmlBody: html || text || '',
        noReply: false,
      });
      return json({ success: true });
    }

    return json({ error: 'Acción desconocida' });

  } catch (err) {
    return json({ error: err.toString() });
  }
}

// ── Actualizar una fila por asignatura + programa ────────────
function updateCourseRow(sheetName, asignatura, programa, updates) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return false;

  const headers = data[0];
  const asigCol  = findCol(headers, 'Asignatura');
  const progCol  = findCol(headers, 'Programa');
  if (asigCol === -1) return false;

  const normAsig = norm(asignatura);
  const normProg = programa ? norm(programa) : null;
  let currentProg = '';
  let targetRow   = -1;

  for (let i = 1; i < data.length; i++) {
    if (progCol >= 0 && data[i][progCol] && data[i][progCol].toString().trim()) {
      currentProg = norm(data[i][progCol].toString().trim());
    }
    if (norm(data[i][asigCol] || '') === normAsig) {
      if (!normProg || currentProg === normProg) {
        targetRow = i;
        break;
      }
    }
  }

  if (targetRow === -1) return false;

  for (const colName of Object.keys(updates)) {
    const colIdx = findCol(headers, colName);
    if (colIdx === -1) continue;
    sheet.getRange(targetRow + 1, colIdx + 1).setValue(updates[colName]);
  }

  return true;
}

// ── Helpers ──────────────────────────────────────────────────
function norm(s) {
  return s.toString().trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function findCol(headers, colName) {
  const target = norm(colName);
  const aliases = {
    'estado':                   ['estado', 'estado '],
    'estado curso':             ['estado curso', 'estado curso '],
    'inicio gestor':            ['inicio gestor', 'inicio gestor '],
    'fin gestor':               ['fin gestor', 'fin gestor '],
    'gestor responsable':       ['gestor responsable', 'gestor responsable '],
    'fecha fin correccion gestor': ['fecha fin correccion gestor', 'fecha fin correccion docente'],
    'fecha inicio revision di': ['fecha inicio revision di', 'fecha inicio revision di '],
    'fecha fin revision di':    ['fecha fin revision di', 'fecha fin revision di '],
    'di responsable':           ['di responsable', 'di responsable '],
  };

  const candidates = aliases[target] || [target];

  for (let i = 0; i < headers.length; i++) {
    const h = norm(headers[i] || '');
    if (candidates.includes(h)) return i;
  }
  return -1;
}

function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
