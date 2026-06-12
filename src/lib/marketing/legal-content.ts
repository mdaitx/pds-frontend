/** Conteúdo legal publicado — baseado em docs/PRIVACIDADE-E-TERMOS.md */

export const LEGAL_CONTACT_EMAIL = 'mathiasdaitx@rede.ulbra.br';
export const LEGAL_ENTITY_NAME = 'Truck Finanças';
export const LEGAL_FORUM = 'Comarca de São Paulo/SP';

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  list?: string[];
};

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'quem-somos',
    title: '1. Quem somos',
    paragraphs: [
      'O Truck Finanças é uma aplicação para gestão financeira de viagens, despesas, adiantamentos, acertos, frota e equipe de pequenas operações de transporte.',
      `Controlador dos dados: ${LEGAL_ENTITY_NAME}. Contato de privacidade: ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    id: 'dados',
    title: '2. Dados coletados',
    paragraphs: ['Podemos tratar os seguintes dados, conforme o uso do sistema:'],
    list: [
      'Dados de conta: nome, e-mail, telefone, foto e papel do usuário.',
      'Dados de empresa: razão social/nome, CPF/CNPJ, contato, endereço e preferências.',
      'Dados de motorista: nome, CPF, RG, CNH, telefone, e-mail, chave PIX, dados bancários, comissão e status.',
      'Dados de veículo: placa, marca, modelo, ano, tipo, status, apelido e foto.',
      'Dados de viagem: cliente, origem, destino, datas, frete, km, tipo de carga, status e observações.',
      'Dados financeiros: despesas, categorias, adiantamentos, comprovantes, acertos, comissões e pagamentos.',
      'Dados técnicos: logs, endereço IP, identificadores de sessão, navegador, dispositivo e eventos de segurança.',
      'Dados de assinatura: status do plano, quantidade de veículos e identificadores de cobrança do provedor de pagamento.',
    ],
  },
  {
    id: 'finalidades',
    title: '3. Finalidades',
    paragraphs: ['Usamos os dados para:'],
    list: [
      'Autenticar usuários e proteger contas.',
      'Operar fluxos de empresa, equipe, veículos, motoristas, viagens, despesas, adiantamentos e acertos.',
      'Gerar dashboards, relatórios e PDFs.',
      'Enviar e-mails transacionais, convites, recuperação de senha e notificações operacionais.',
      'Processar assinatura, trial, checkout e controle de acesso por plano.',
      'Prevenir fraude, investigar incidentes e manter logs de segurança.',
      'Cumprir obrigações legais e melhorar estabilidade e suporte.',
    ],
  },
  {
    id: 'bases',
    title: '4. Bases legais',
    paragraphs: [
      'O tratamento pode se apoiar em execução de contrato, cumprimento de obrigação legal ou regulatória, legítimo interesse e consentimento quando exigido pela LGPD.',
    ],
  },
  {
    id: 'compartilhamento',
    title: '5. Compartilhamento',
    paragraphs: ['Dados podem ser compartilhados com fornecedores necessários à operação:'],
    list: [
      'Supabase: autenticação, banco de dados e storage.',
      'Provedor de hospedagem do frontend e backend.',
      'Stripe: pagamentos e assinatura.',
      'Ferramentas de logs, monitoramento e suporte, quando habilitadas.',
    ],
  },
  {
    id: 'seguranca',
    title: '6. Armazenamento e segurança',
    paragraphs: [
      'Aplicamos autenticação por token, autorização por papel, isolamento por empresa, validação de entrada, CORS configurável e políticas de acesso no Supabase.',
      'Antes do lançamento público, revise se comprovantes devem migrar para bucket privado ou URLs assinadas, conforme sua política interna.',
    ],
  },
  {
    id: 'retencao',
    title: '7. Retenção',
    paragraphs: [
      'Mantemos dados pelo tempo necessário para operar a conta, cumprir contrato, resolver disputas e preservar histórico financeiro. Após encerramento, dados podem ser anonimizados, excluídos ou retidos quando houver obrigação legal.',
    ],
  },
  {
    id: 'direitos',
    title: '8. Direitos do titular',
    paragraphs: [
      'Conforme a LGPD, você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, anonimização, eliminação, informações sobre compartilhamento e revogação de consentimento quando aplicável.',
      `Envie solicitações para ${LEGAL_CONTACT_EMAIL}.`,
    ],
  },
  {
    id: 'cookies',
    title: '9. Cookies e tecnologias semelhantes',
    paragraphs: [
      'Usamos cookies e armazenamento local necessários para sessão, autenticação e funcionamento da aplicação. Ferramentas analíticas opcionais serão documentadas aqui antes de serem habilitadas.',
    ],
  },
  {
    id: 'alteracoes',
    title: '10. Alterações',
    paragraphs: [
      'Esta política pode ser atualizada. Mudanças relevantes serão comunicadas por meio adequado dentro do produto, e-mail ou página pública.',
    ],
  },
];

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'aceitacao',
    title: '1. Aceitação',
    paragraphs: [
      'Ao criar conta ou usar o Truck Finanças, você declara que leu e aceita estes termos. Se estiver usando em nome de uma empresa, declara ter autorização para representá-la.',
    ],
  },
  {
    id: 'objeto',
    title: '2. Objeto',
    paragraphs: [
      'O Truck Finanças oferece software para organização de viagens, despesas, adiantamentos, acertos, relatórios, equipe, frota e assinatura. O sistema não substitui consultoria contábil, fiscal, jurídica ou trabalhista.',
    ],
  },
  {
    id: 'contas',
    title: '3. Contas e responsabilidade',
    paragraphs: ['O usuário deve:'],
    list: [
      'Informar dados verdadeiros e mantê-los atualizados.',
      'Manter credenciais em sigilo e conceder acesso apenas a pessoas autorizadas.',
      'Revisar lançamentos financeiros antes de finalizar acertos.',
      'Guardar documentos originais quando exigido por lei ou política interna.',
    ],
  },
  {
    id: 'uso',
    title: '4. Uso permitido',
    paragraphs: ['É proibido violar leis, acessar dados de outra empresa, burlar controles, enviar malware ou usar o serviço fora da gestão autorizada.'],
  },
  {
    id: 'planos',
    title: '5. Planos, trial e pagamentos',
    paragraphs: [
      'O produto pode oferecer trial e planos pagos por veículo. Condições de preço, renovação e cancelamento são exibidas no checkout ou comunicação comercial vigente.',
      'Pagamentos são processados pelo gateway configurado (Stripe). O sistema pode restringir funcionalidades quando o plano expirar ou houver falha de pagamento.',
    ],
  },
  {
    id: 'disponibilidade',
    title: '6. Disponibilidade',
    paragraphs: [
      'Empregamos esforços razoáveis para manter o serviço disponível, mas podem ocorrer manutenções, indisponibilidades de provedores ou eventos fora do nosso controle.',
    ],
  },
  {
    id: 'dados-backup',
    title: '7. Dados e backups',
    paragraphs: [
      'O usuário é responsável por conferir informações inseridas e manter controles internos adequados. Recomendamos rotina de backup documentada antes do uso em produção.',
    ],
  },
  {
    id: 'pi',
    title: '8. Propriedade intelectual',
    paragraphs: [
      'Código, interface, marca e fluxos do produto pertencem aos respectivos titulares. O usuário recebe licença limitada, não exclusiva e revogável para usar o sistema conforme estes termos.',
    ],
  },
  {
    id: 'limitacao',
    title: '9. Limitação de responsabilidade',
    paragraphs: [
      'Na máxima extensão permitida por lei, o Truck Finanças não se responsabiliza por perdas indiretas, lucros cessantes, decisões com dados incorretos inseridos pelo usuário ou falhas de terceiros.',
    ],
  },
  {
    id: 'encerramento',
    title: '10. Encerramento',
    paragraphs: [
      'Contas podem ser suspensas ou encerradas em caso de violação dos termos, risco de segurança, inadimplência ou encerramento contratual, observada a política de privacidade.',
    ],
  },
  {
    id: 'suporte',
    title: '11. Suporte',
    paragraphs: [
      `Canal de suporte: ${LEGAL_CONTACT_EMAIL}. Horário de atendimento: dias úteis, 9h às 18h (horário de Brasília).`,
    ],
  },
  {
    id: 'foro',
    title: '12. Foro e lei aplicável',
    paragraphs: [
      `Estes termos são regidos pelas leis brasileiras. Foro: ${LEGAL_FORUM}, salvo disposição legal em sentido contrário.`,
    ],
  },
];
