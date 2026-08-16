export const EMPRESA_NOME = 'CHECKLIST VISITA LOJA';

export const EQUIPAMENTOS_MANUTENCAO = {
  'PDV e atendimento': [
    'Pré-venda',
    'Relógio de Ponto',
    'Self-checkout',
    'Self-pagamento',
    'Comanda',
    'Devolução',
    'Estação de Trabalho',
    'Impressora de Setor',
    'PDV',
    'PDV Touch',
    'Vasilhame',
    'Computador (CPU/Mini PC)',
    'Monitor',
    'Teclado PDV Smak',
    'Mouse Óptico',
    'Display de Cliente (Torre eletrônica)',
    'Leitor de Código de Barras Fixo (Mesa)',
    'Leitor de Código de Barras Manual (Movél)',
    'Leitor de Código de Barras Omnidirecional',
    'Leitor de QRCode / Câmera Biométrica',
    'Impressora ECF Térmica ELgin I9',
    'SSD',
    'Fonte de Alimentação',
    'PinPad',
    'Gaveta de Dinheiro'
  ],
  'Rede e energia': [
    'Access Point',
    'Nobreak',
    'Transformador 220p/110',
    'Filtro de Linha',
    'Switch de Rede Giga',
    'Roteador Wi-Fi Corporativo',
    'Cabo de Rede RJ45 Cat5e',
    'Cabo de Rede RJ45 Cat6'
  ],
  'Operação e infraestrutura': [
    'A Classificar',
    'Balança de Retaguarda',
    'Cancela de Estacionamento',
    'Coletor',
    'Painéis',
    'Terminal de Consulta',
    'Terminal de Consulta Gertec',
    'Balança de PDV',
    'Balança Urano',
    'Balança Toledo',
    'KIT CPU PDV',
    'CPU de PDV Completa'
  ],
  Segurança: [
    'Configuração do Link CFTV',
    'Gravador de Vídeo Digital (DVR/NVR)'
  ]
};

export const LOJAS_PADRAO = Array.from({ length: 104 }, (_, index) => {
  const number = index + 2;
  return {
    id: `loja-padrao-${number}`,
    name: `LOJA ${number}`,
    unit: `LOJA ${number}`
  };
});

export const SOLICITANTES_PADRAO = [
  'Gerente',
  'Subgerente',
  'CPD',
  'Encarregado (a) Depósito',
  'Encarregado (a) Linha de Frente',
  'Encarregado (a) de Mercearia',
  'Encarregado (a) de Frios',
  'Encarregado (a) de Padaria',
  'Encarregado (a) de Horti',
  'Encarregado (a) de Açougue',
  'Encarregado (a) Recebimento',
  'Analista de RH',
  'Outros'
];

export const SETORES_PADRAO = [
  'CPD',
  'Linha de Frente',
  'Televendas',
  'Mercearia',
  'Açougue',
  'Padaria',
  'Depósito',
  'Tesouraria',
  'Gerência',
  'Refeitório',
  'RH'
];
