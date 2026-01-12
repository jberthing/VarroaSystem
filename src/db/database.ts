import Dexie, { Table } from 'dexie';

export interface Apiary {
  id: string;
  name: string;
  location?: string;
  image?: string; // base64 encoded image
  isActive: boolean;
  createdAt: number;
}

export interface Hive {
  id: string;
  apiaryId?: string;
  name: string;
  location?: string;
  image?: string; // base64 encoded image
  isActive: boolean;
  createdAt: number;
}

export interface Observation {
  id: string;
  hiveId: string;
  date: string; // YYYY-MM-DD
  miteCount: number;
  trayDays: number;
  mitesPerDay: number;
  notes?: string;
  createdAt: number;
}

export interface Treatment {
  id: string;
  hiveId: string;
  date: string; // YYYY-MM-DD
  treatmentType: string;
  notes?: string;
  createdAt: number;
}

export class VarroaDB extends Dexie {
  apiaries!: Table<Apiary>;
  hives!: Table<Hive>;
  observations!: Table<Observation>;
  treatments!: Table<Treatment>;

  constructor() {
    super('VarroaDB');
    this.version(1).stores({
      hives: 'id, name, isActive, createdAt',
      observations: 'id, hiveId, date, createdAt, mitesPerDay',
    });
    // Version 2: Add treatments table
    this.version(2).stores({
      hives: 'id, name, isActive, createdAt',
      observations: 'id, hiveId, date, createdAt, mitesPerDay',
      treatments: 'id, hiveId, date, createdAt',
    });
    // Version 3: Add apiaries table and apiaryId to hives
    this.version(3).stores({
      apiaries: 'id, name, isActive, createdAt',
      hives: 'id, apiaryId, name, isActive, createdAt',
      observations: 'id, hiveId, date, createdAt, mitesPerDay',
      treatments: 'id, hiveId, date, createdAt',
    });
  }
}

export const db = new VarroaDB();
