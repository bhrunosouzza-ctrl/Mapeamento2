
export interface CaseRecord {
  id: string;
  nome: string;
  quarteirao: string;
  logradouro: string;
  bairro: string;
  numero: string;
  dataSintomas: Date;
  mes: string;
  suspeita: string;
  coords: [number, number];
}

export interface NeighborhoodStats {
  bairro: string;
  count: number;
  percentage: number;
}

export interface MonthStats {
  mes: string;
  count: number;
}
