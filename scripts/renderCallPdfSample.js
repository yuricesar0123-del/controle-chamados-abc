const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');
const babel = require('@babel/core');

const projectRoot = path.resolve(__dirname, '..');
const templatePath = path.join(projectRoot, 'src', 'services', 'callPdfTemplate.js');
const source = fs.readFileSync(templatePath, 'utf8');
const transformed = babel.transformSync(source, {
  filename: templatePath,
  plugins: [
    '@babel/plugin-transform-modules-commonjs',
    '@babel/plugin-transform-optional-chaining',
    '@babel/plugin-transform-nullish-coalescing-operator',
  ],
}).code;

const templateModule = { exports: {} };
const loadTemplate = new Function('require', 'module', 'exports', transformed);
loadTemplate(
  request => {
    if (request === '../constants/catalogs') return { EMPRESA_NOME: 'CHECKLIST VISITA LOJA' };
    return require(request);
  },
  templateModule,
  templateModule.exports,
);

const { buildCallPdfHtml, escapeHtml } = templateModule.exports;
const logoBase64 = fs.readFileSync(path.join(projectRoot, 'assets', 'logo-pdf.png')).toString('base64');
const logoDataUri = `data:image/png;base64,${logoBase64}`;
const photoCaptions = [
  'Equipamento antes da manutenção preventiva.',
  'Validação final do conjunto instalado no PDV.',
];
const photosHtml = photoCaptions.map((caption, index) => `
  <div class="photo-card">
    <img src="${logoDataUri}" class="photo-image" />
    <div class="photo-caption"><strong>Foto ${index + 1}</strong><br />${escapeHtml(caption)}</div>
  </div>
`).join('');

const signatureSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="500" height="120" viewBox="0 0 500 120">
    <path d="M25 80 C85 20, 105 105, 155 55 S220 78, 270 38 S345 92, 460 47" fill="none" stroke="#172033" stroke-width="5" stroke-linecap="round"/>
  </svg>
`);

const html = buildCallPdfHtml({
  logoDataUri,
  photosHtml,
  data: {
    id: '1755299000123',
    date: '15/08/2026 21:45:00',
    unit: 'LOJA 25',
    requesters: ['Gerente', 'CPD'],
    sectors: ['CPD', 'Linha de Frente'],
    respName: 'Mariana Oliveira',
    techName: 'Yuri César',
    serviceOrderNumber: '2474',
    responsibleCompany: 'KATE',
    entryTime: '08:15',
    exitTime: '11:42',
    services: [
      'Verificação completa do equipamento e diagnóstico da falha informada.',
      'Substituição do SSD, limpeza interna e validação do sistema operacional.',
      'Teste de impressão, comunicação de rede e operação assistida com o responsável do local.',
    ],
    equipment: ['CPU de PDV Completa', 'SSD', 'Balança de PDV', 'Self-checkout', 'Relógio de Ponto'],
    equipmentChecks: {
      'CPU de PDV Completa': { status: 'adjusted', observation: 'Limpeza, montagem e teste final realizados.' },
      SSD: { status: 'adjusted', observation: 'Substituído por unidade de 480 GB.' },
      'Balança de PDV': { status: 'ok', observation: 'Pesagem e comunicação validadas.' },
      'Self-checkout': { status: 'defect', callNumber: '2474', observation: 'Leitor apresenta falha intermitente; encaminhado para manutenção.' },
      'Relógio de Ponto': { status: 'ok', observation: '' },
    },
    materialsUsed: ['1 SSD 480 GB', 'Cabo de rede RJ45 Categoria 6'],
    techSign: `data:image/svg+xml;charset=utf-8,${signatureSvg}`,
    respSign: null,
  },
});

const tempDirectory = path.join(projectRoot, 'tmp', 'pdfs');
const outputDirectory = path.join(projectRoot, 'output', 'pdf');
fs.mkdirSync(tempDirectory, { recursive: true });
fs.mkdirSync(outputDirectory, { recursive: true });

const htmlPath = path.join(tempDirectory, 'checklist-profissional-amostra.html');
const pdfPath = path.join(outputDirectory, 'checklist-profissional-amostra.pdf');
fs.writeFileSync(htmlPath, html, 'utf8');

const edgeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];
const browserPath = edgeCandidates.find(candidate => fs.existsSync(candidate));
if (!browserPath) throw new Error('Edge ou Chrome não encontrado para renderizar a amostra.');
const browserProfilePath = path.join(tempDirectory, `browser-profile-${process.pid}-${Date.now()}`);
if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);

const result = spawnSync(browserPath, [
  '--headless=new',
  '--disable-gpu',
  '--disable-extensions',
  `--user-data-dir=${browserProfilePath}`,
  '--no-pdf-header-footer',
  `--print-to-pdf=${pdfPath}`,
  pathToFileURL(htmlPath).href,
], { encoding: 'utf8' });

if (result.status !== 0 || !fs.existsSync(pdfPath)) {
  throw new Error(result.error?.message || result.stderr || result.stdout || `Falha ao gerar a amostra em PDF (status ${result.status}).`);
}

fs.rmSync(browserProfilePath, { recursive: true, force: true });

console.log(pdfPath);
