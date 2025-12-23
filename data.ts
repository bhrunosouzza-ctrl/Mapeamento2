
import { CaseRecord } from './types';

export const rawCsvDefault = `Helianderson Augusto;;;20;Av. Ana Moura;Alvorada II;1433;11/01/2025;Dengue
Hjoel Barroso;;;1;Pará;Timotinho;238;13/01/2025;Dengue/Chikun.
Juçara Natividade ;;;11;São Paulo;Alvorada I;482;21/01/2025;Dengue/Chikun.
André Luiz;;;21;Av.Ana Moura;Alvorada II;1644;25/01/2025;Dengue
Miguel Junior;;;49;Raimundo Gregorio;Ana Moura;30;21/01/2025;Dengue/Chikun.
Adenice Pedro;;;45;Raimundo Gregorio;Ana Moura;150;24/01/2025;Dengue
José Eustaquio;;;18;Rio de Janeiro;Alvorada II;251;04/02/2025;Dengue/Chikun.
Ana Luiza;;;3;Sul Dois;Ana Moura;78;05/02/2025;Dengue/Chikun.
Kenedy Lourenço;;;1;Rio Negro;Alvorada II;4;03/02/2025;Dengue/Chikun.
Matheus Torres;;;6;Rio Santo Antônio;Alvorada I;294;02/02/2025;Dengue/Chikun.
Talles Kaick;;;7;Estrela D'Alva;Bandeirantes;267;06/02/2025;Dengue
Tereza Veti;;;21;Av. Ana Moura;Alvorada II;1656;04/02/2025;Dengue/Chikun.
Marcelo Rodrigues;;;35;R. Nove;Ana Moura;125;12/02/2025;Dengue
Jessica Felix;;;26;R. dos Limões;Ana Moura;223;14/02/2025;Dengue
Albert Carlos;;;23;Sebastião Domingos;Ana Moura;26;16/02/2025;Dengue
Efraim Luka;;;3;Av. Amazonas;Alvorada I;241;14/02/2025;Dengue
Hugo Andrade;;;6;Av. Ana Moura;Alvorada I;1159;13/02/2025;Dengue/Chikun.
Sabrina Fernandes;;;27;Domigos Pererira;Bromélias;18;24/02/2025;Dengue
Enzo Kaiky;;;7;Tocantins;Alvorada II;69;11/03/2025;Dengue/Chikun.
Maria P. Carvalho;;;9;Av. Amazonas;Alvorada I;302;15/03/2025;Dengue
Taynara Jacques;;;20;Rio Grande do Sul;Alvorada II;405;13/04/2025;Dengue/Chikun.
Bela de Oliveira;;;1;Av. Ana Moura;Alvorada II;1198;13/04/2025;Dengue
Geraldo Magela ;;;4;R.03;São Cristóvão;37;10/04/2025;Dengue
Cassia Martins ;;;23;Jovino Augusto;Bromelias;747;09/04/2025;Dengue
Verônica Maria;;;19;Otaviano Eusebio;Bromelias;12;09/04/2025;Chikun.
Heitor de Belli;;;9;Rio Paranaiba;Alvorada II;166;11/04/2025;Dengue
Raul Granato;;;1;São Paulo;Alvorada I;137;20/04/2025;Dengue/Chikun.
Kaick de Oliveira;;;6;Av. Ana Moura;Timotinho;800;19/04/2025;Dengue/Chikun.
Andiuza Estefani;;;23;Manoel Mateus;Ana Moura;201;03/05/2025;Dengue
Efraim Luka;;;3;Av. Amazonas;Alvorada I;241;11/05/2025;Dengue/Chikun.
Gabriel Henrique;;;15;1 de janeiro;Centro Norte;35;11/05/2025;Dengue/Chikun.
Ana Laura;;;4;Av. Ana Moura;Timotinho;1048;11/05/2025;Dengue/Chikun.
Rayrone Miguel;;;3;Av Amazonas;Alvorada I;241;15/04/2025;Dengue/Chikun.
Maria Clara;;;11;Av. Jovino Augusto;Bromelias;547;11/05/2025;Dengue/Chikun.
Samuel Philipe;;;17;Rio Negro;Alvorada II;17A;20/05/2025;Dengue/Chikun.
Samuel Hahnemann;;;25;Av. Amazonas;Vale Bromelias;31;04/06/2025;Dengue
Maria do Rosario;;;5;Av. Ana Moura;Timotinho;656;19/05/2025;Dengue/Chikun.
Michelly Aparecida;;;17;Rio Negro;Alvorada II;1;05/08/2025;Dengue
Lorena Cristina;;;4;Dr. José Roque Pires;Funcionarios;31;16/08/2025;Dengue/Chikun.
José Mauricio;;;;João Fernandes;Ana Moura;S/n;29/09/2025;Dengue
Jhulia Camila;;;;Cruzeiro do Sul;Novo Tempo;509;07/10/2025;Dengue
Eloiza de Lisboa;;;;Av. Universal;Novo Tempo;327;07/10/2025;Dengue
Bernardo Belmiro;;;;Av. Ana Moura;Novo Tempo;2424;30/10/2025;Dengue
Ledo Apridio;;;;Rua do Luar;Novo Tempo;294;04/11/2025;Dengue
Ikaro Rafael;;;;Av. Universal;Novo Tempo;342;04/11/2025;Dengue`;

const neighborhoodCoords: Record<string, [number, number]> = {
  'Alvorada': [-19.5946, -42.6615],
  'Timotinho': [-19.5781, -42.6325],
  'Ana Moura': [-19.6011, -42.6705],
  'Bandeirantes': [-19.5851, -42.6525],
  'Bromélias': [-19.5811, -42.6155],
  'Bromelias': [-19.5811, -42.6155],
  'São Cristóvão': [-19.5751, -42.6425],
  'Centro Norte': [-19.5841, -42.6285],
  'Vale Bromelias': [-19.5831, -42.6105],
  'Funcionarios': [-19.5881, -42.6355],
  'Novo Tempo': [-19.6051, -42.6855],
};

const getMonthName = (date: Date) => {
  return date.toLocaleString('pt-BR', { month: 'long' });
};

const normalizeNeighborhood = (name: string): string => {
  const n = name?.trim() || 'Desconhecido';
  if (n.startsWith('Alvorada')) return 'Alvorada';
  if (n.startsWith('Bromélia') || n.startsWith('Bromelia')) return 'Bromélias';
  return n;
};

// Função de parsing de data robusta
const parseDate = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  
  // Limpa caracteres estranhos
  const cleanStr = dateStr.trim();
  
  // Tenta formato DD/MM/YYYY
  if (cleanStr.includes('/')) {
    const [d, m, y] = cleanStr.split('/').map(n => parseInt(n));
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      // Ajuste para ano com 2 dígitos
      const fullYear = y < 100 ? 2000 + y : y;
      const date = new Date(fullYear, m - 1, d);
      if (!isNaN(date.getTime())) return date;
    }
  }

  // Tenta formato ISO (YYYY-MM-DD)
  const isoDate = new Date(cleanStr);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Se tudo falhar, retorna data atual para não quebrar o app
  console.warn(`Data inválida detectada: "${dateStr}". Usando data atual.`);
  return new Date();
};

export const parseRawData = (data: string): CaseRecord[] => {
  return data.split('\n')
    .filter(line => line.trim())
    .map((line, index) => {
      const parts = line.split(';');
      
      // Sanitização básica das partes
      const nome = parts[0]?.trim() || 'N/A';
      const quarteirao = parts[3]?.trim() || 'N/A';
      const logradouro = parts[4]?.trim() || 'N/A';
      const rawNeighborhood = parts[5]?.trim() || 'Desconhecido';
      const neighborhood = normalizeNeighborhood(rawNeighborhood);
      const numero = parts[6]?.trim() || 'S/N';
      const dateStr = parts[7]?.trim();
      const suspeita = parts[8]?.trim() || 'N/A';

      // Ignora cabeçalhos se a linha parecer ser um
      if (nome.toLowerCase().includes('nome') || dateStr?.toLowerCase().includes('data')) {
        return null;
      }

      const date = parseDate(dateStr || '');
      const baseCoord = neighborhoodCoords[neighborhood] || [-19.58, -42.63];
      
      const coords: [number, number] = [
        baseCoord[0] + (Math.random() - 0.5) * 0.005,
        baseCoord[1] + (Math.random() - 0.5) * 0.005
      ];

      return {
        id: `case-${index}-${Date.now()}`,
        nome,
        quarteirao,
        logradouro,
        bairro: neighborhood,
        numero,
        dataSintomas: date,
        mes: getMonthName(date),
        suspeita,
        coords
      };
    })
    .filter(c => c !== null) as CaseRecord[];
};
