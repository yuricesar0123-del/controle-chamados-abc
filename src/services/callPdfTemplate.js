import { EMPRESA_NOME } from '../constants/catalogs';

export const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;')
  .replace(/\n/g, '<br />');

const normalizeList = (value, fallback = []) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return fallback;
};

const formatVisitTitle = unit => {
  const normalizedUnit = String(unit || '').trim();
  if (!normalizedUnit) return 'Checklist Visita Loja';
  const storeIdentifier = normalizedUnit.replace(/^loja\s*/i, '').trim();
  return storeIdentifier
    ? `Checklist Visita Loja ${storeIdentifier}`
    : `Checklist Visita ${normalizedUnit}`;
};

const formatCallNumber = value => {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return 'Não informado';
  if (/^(chamado|os)\b/i.test(normalizedValue)) return normalizedValue;
  return `Chamado #${normalizedValue.replace(/^#\s*/, '')}`;
};

const renderList = (items, emptyText) => {
  const normalizedItems = normalizeList(items);
  if (normalizedItems.length === 0) return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  return `<ul class="detail-list">${normalizedItems.map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
};

const renderEquipmentTable = (equipment, equipmentChecks = {}) => {
  const normalizedEquipment = normalizeList(equipment);
  if (normalizedEquipment.length === 0) {
    return '<div class="empty-state equipment-empty">Nenhum equipamento selecionado.</div>';
  }

  return `
    <table class="equipment-table">
      <thead>
        <tr>
          <th>Equipamento</th>
          <th class="status-column">OK</th>
          <th class="status-column">Ajustado</th>
          <th class="status-column">Defeito</th>
          <th class="observation-column">Observação</th>
          <th class="call-column">Chamado</th>
        </tr>
      </thead>
      <tbody>
        ${normalizedEquipment.map(item => {
          const check = equipmentChecks[item] || {};
          const status = check.status || '';
          const marker = value => status === value
            ? `<span class="status-marker status-${value}">X</span>`
            : '<span class="status-empty">-</span>';
          const callValue = status === 'defect'
            ? formatCallNumber(check.callNumber)
            : status === 'ok' || status === 'adjusted'
              ? 'Não se aplica'
              : '-';
          return `
            <tr>
              <td class="equipment-name">${escapeHtml(item)}</td>
              <td class="status-cell">${marker('ok')}</td>
              <td class="status-cell">${marker('adjusted')}</td>
              <td class="status-cell">${marker('defect')}</td>
              <td class="observation-cell">${escapeHtml(check.observation || 'Sem observação')}</td>
              <td class="equipment-call-cell ${status === 'defect' ? 'call-required' : 'call-not-applicable'}">${escapeHtml(callValue)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
};

const renderSignature = ({ signature, name, role }) => `
  <div class="signature-card">
    <div class="signature-area">
      ${signature
        ? `<img src="${signature}" class="signature-image" />`
        : '<div class="signature-missing">Assinatura não coletada</div>'}
    </div>
    <div class="signature-name">${escapeHtml(name || 'Não informado')}</div>
    <div class="signature-role">${escapeHtml(role)}</div>
  </div>
`;

export function buildCallPdfHtml({ data, logoDataUri = '', photosHtml = '' }) {
  const requesters = normalizeList(data.requesters, data.client ? [data.client] : []);
  const sectors = normalizeList(data.sectors, data.sector ? [data.sector] : []);
  const signatureCount = Number(Boolean(data.techSign)) + Number(Boolean(data.respSign));
  const signatureStatus = signatureCount === 2
    ? 'Assinaturas completas'
    : signatureCount === 1
      ? 'Assinatura parcial'
      : 'Sem assinaturas';
  const callNumber = String(data.id || '').slice(-6) || '------';
  const logo = logoDataUri ? `<img src="${logoDataUri}" class="brand-logo" />` : '';
  const visitTitle = formatVisitTitle(data.unit);

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <style>
          @page { size: A4; margin: 18mm 14mm 20mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #172033; background: #FFFFFF; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.45; }
          .document-header { border: 1px solid #D9E4F2; border-top: 6px solid #075FA8; border-radius: 7px; padding: 16px 18px; background: #F7FAFE; page-break-inside: avoid; }
          .header-table { width: 100%; border-collapse: collapse; }
          .header-table td { vertical-align: middle; }
          .brand-cell { width: 95px; }
          .brand-logo { display: block; max-width: 76px; max-height: 58px; object-fit: contain; }
          .document-kicker { color: #075FA8; font-size: 9px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; }
          .document-title { margin: 3px 0 2px; color: #172033; font-size: 22px; font-weight: 700; line-height: 1.1; }
          .company-name { color: #526070; font-size: 10px; font-weight: 700; text-transform: uppercase; }
          .meta-cell { width: 155px; text-align: right; }
          .call-number { color: #075FA8; font-size: 19px; font-weight: 700; }
          .meta-line { margin-top: 3px; color: #667383; font-size: 9px; }
          .status-pill { display: inline-block; margin-top: 7px; padding: 4px 9px; border-radius: 12px; color: #7A4D00; background: #FFF2CC; font-size: 8px; font-weight: 700; text-transform: uppercase; }
          .section { margin-top: 13px; border: 1px solid #DDE4EC; border-radius: 6px; overflow: hidden; page-break-inside: avoid; }
          .section.allow-break { page-break-inside: auto; }
          .section-title { padding: 8px 12px; color: #075FA8; background: #EEF5FC; border-bottom: 1px solid #DDE4EC; font-size: 10px; font-weight: 700; letter-spacing: .55px; text-transform: uppercase; break-after: avoid; page-break-after: avoid; }
          .section-body { padding: 11px 12px; }
          .info-grid { width: 100%; border-collapse: collapse; }
          .info-grid td { width: 50%; padding: 6px 9px; vertical-align: top; border: 1px solid #E7ECF2; }
          .info-label { display: block; margin-bottom: 2px; color: #687587; font-size: 8px; font-weight: 700; letter-spacing: .35px; text-transform: uppercase; }
          .info-value { color: #172033; font-size: 11px; font-weight: 600; }
          .detail-list { margin: 0; padding: 0; list-style: none; }
          .detail-list li { position: relative; min-height: 24px; padding: 5px 8px 5px 22px; border-bottom: 1px solid #EDF0F4; }
          .detail-list li:last-child { border-bottom: 0; }
          .detail-list li:before { content: ''; position: absolute; left: 8px; top: 10px; width: 5px; height: 5px; border-radius: 50%; background: #1479C9; }
          .two-column { display: table; width: 100%; table-layout: fixed; border-spacing: 9px 0; margin-left: -9px; }
          .column { display: table-cell; width: 50%; vertical-align: top; }
          .empty-state { padding: 8px; color: #7B8796; background: #F8FAFC; border: 1px dashed #CBD5E1; border-radius: 4px; font-style: italic; }
          .equipment-empty { margin: 11px 12px; }
          .equipment-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          .equipment-table thead { display: table-header-group; }
          .equipment-table tr { page-break-inside: avoid; }
          .equipment-table th { padding: 7px 6px; color: #526070; background: #F7F9FC; border-bottom: 1px solid #DDE4EC; font-size: 7.5px; letter-spacing: .25px; text-align: left; text-transform: uppercase; }
          .equipment-table td { padding: 7px 6px; border-bottom: 1px solid #E7ECF2; vertical-align: middle; }
          .equipment-table tbody tr:last-child td { border-bottom: 0; }
          .equipment-table th:first-child, .equipment-name { width: 22%; }
          .equipment-table .status-column { width: 9%; text-align: center; }
          .equipment-table .observation-column, .observation-cell { width: 32%; }
          .equipment-table .call-column, .equipment-call-cell { width: 19%; text-align: left; }
          .status-cell { text-align: center; }
          .status-marker { display: inline-block; min-width: 21px; padding: 2px 4px; border-radius: 4px; color: #FFFFFF; font-size: 8px; font-weight: 700; }
          .status-ok { background: #107C10; }
          .status-adjusted { background: #986F0B; }
          .status-defect { background: #D13438; }
          .status-empty { color: #A0A8B3; }
          .equipment-name { color: #172033; font-weight: 700; }
          .equipment-call-cell { font-size: 8px; font-weight: 700; }
          .call-required { color: #A4262C; }
          .call-not-applicable { color: #7B8796; font-weight: 600; }
          .observation-cell { color: #526070; font-size: 9px; }
          .photo-grid { text-align: left; break-before: avoid; page-break-before: avoid; }
          .photo-card { display: inline-block; width: 47.5%; margin: 5px 1%; vertical-align: top; border: 1px solid #DDE4EC; border-radius: 5px; overflow: hidden; page-break-inside: avoid; }
          .photo-image { display: block; width: 100%; height: 180px; padding: 5px; background: #F8FAFC; object-fit: contain; }
          .photo-caption { min-height: 31px; padding: 7px 9px; color: #39475A; background: #FFFFFF; border-top: 1px solid #E7ECF2; font-size: 9px; }
          .signatures { display: table; width: 100%; margin-top: 16px; border-spacing: 12px 0; page-break-inside: avoid; }
          .signature-card { display: table-cell; width: 50%; padding: 10px 12px; text-align: center; border: 1px solid #DDE4EC; border-radius: 6px; vertical-align: bottom; }
          .signature-area { height: 72px; border-bottom: 1px solid #7B8796; }
          .signature-image { width: 100%; height: 68px; object-fit: contain; }
          .signature-missing { padding-top: 28px; color: #8A94A3; font-size: 9px; font-style: italic; }
          .signature-name { margin-top: 6px; color: #172033; font-size: 10px; font-weight: 700; }
          .signature-role { margin-top: 1px; color: #075FA8; font-size: 9px; font-weight: 700; text-transform: uppercase; }
          .document-footer { margin-top: 16px; padding-top: 6px; border-top: 1px solid #DDE4EC; color: #7B8796; font-size: 8px; text-align: center; }
        </style>
      </head>
      <body>
        <header class="document-header">
          <table class="header-table">
            <tr>
              <td class="brand-cell">${logo}</td>
              <td>
                <div class="document-kicker">Relatório técnico de atendimento</div>
                <div class="document-title">${escapeHtml(visitTitle)}</div>
                <div class="company-name">${escapeHtml(EMPRESA_NOME)}</div>
              </td>
              <td class="meta-cell">
                <div class="call-number">#${escapeHtml(callNumber)}</div>
                <div class="meta-line">${escapeHtml(data.date || 'Data não informada')}</div>
                <div class="status-pill">${escapeHtml(signatureStatus)}</div>
              </td>
            </tr>
          </table>
        </header>

        <section class="section">
          <div class="section-title">Identificação da visita</div>
          <div class="section-body">
            <table class="info-grid">
              <tr>
                <td><span class="info-label">Unidade</span><span class="info-value">${escapeHtml(data.unit || 'Não informada')}</span></td>
                <td><span class="info-label">Local ou setor</span><span class="info-value">${escapeHtml(sectors.join(', ') || 'Não informado')}</span></td>
              </tr>
              <tr>
                <td><span class="info-label">Solicitante(s)</span><span class="info-value">${escapeHtml(requesters.join(', ') || 'Não informado')}</span></td>
                <td><span class="info-label">Responsável do local</span><span class="info-value">${escapeHtml(data.respName || 'Não informado')}</span></td>
              </tr>
              <tr>
                <td><span class="info-label">OS / Chamado</span><span class="info-value">${escapeHtml(formatCallNumber(data.serviceOrderNumber || data.serviceOrder))}</span></td>
                <td><span class="info-label">Empresa responsável</span><span class="info-value">${escapeHtml(data.responsibleCompany || 'Não informada')}</span></td>
              </tr>
              <tr>
                <td><span class="info-label">Entrada</span><span class="info-value">${escapeHtml(data.entryTime || 'Não informada')}</span></td>
                <td><span class="info-label">Saída</span><span class="info-value">${escapeHtml(data.exitTime || 'Não informada')}</span></td>
              </tr>
              <tr>
                <td colspan="2"><span class="info-label">Técnico</span><span class="info-value">${escapeHtml(data.techName || 'Não informado')}</span></td>
              </tr>
            </table>
          </div>
        </section>

        <section class="section allow-break">
          <div class="section-title">Atendimento realizado</div>
          <div class="section-body">${renderList(data.services, 'Nenhum atendimento informado.')}</div>
        </section>

        <section class="section allow-break">
          <div class="section-title">Checklist de equipamentos</div>
          ${renderEquipmentTable(data.equipment, data.equipmentChecks)}
        </section>

        <section class="section">
          <div class="section-title">Recursos utilizados</div>
          <div class="section-body">${renderList(data.materialsUsed, 'Nenhum recurso informado.')}</div>
        </section>

        <section class="section allow-break">
          <div class="section-title">Evidências fotográficas</div>
          <div class="section-body photo-grid">
            ${photosHtml || '<div class="empty-state">Nenhuma fotografia anexada.</div>'}
          </div>
        </section>

        <div class="signatures">
          ${renderSignature({ signature: data.techSign, name: data.techName, role: 'Técnico' })}
          ${renderSignature({ signature: data.respSign, name: data.respName, role: 'Responsável do local' })}
        </div>

        <footer class="document-footer">Documento gerado pelo ${escapeHtml(visitTitle)}. Registro armazenado no dispositivo do técnico.</footer>
      </body>
    </html>
  `;
}
