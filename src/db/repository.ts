import { v4 as uuidv4 } from 'uuid';
import { db, Apiary, Hive, Observation, Treatment, Queen } from './database';

// Apiary operations
export const createApiary = async (
  name: string,
  location?: string,
  image?: string
): Promise<Apiary> => {
  const apiary: Apiary = {
    id: uuidv4(),
    name,
    location,
    image,
    isActive: true,
    createdAt: Date.now(),
  };
  await db.apiaries.add(apiary);
  return apiary;
};

export const updateApiary = async (id: string, updates: Partial<Apiary>): Promise<void> => {
  await db.apiaries.update(id, updates);
};

export const getApiary = async (id: string): Promise<Apiary | undefined> => {
  return await db.apiaries.get(id);
};

export const getAllApiaries = async (activeOnly: boolean = false): Promise<Apiary[]> => {
  const allApiaries = await db.apiaries.toArray();
  if (activeOnly) {
    return allApiaries.filter((a) => a.isActive);
  }
  return allApiaries;
};

export const deleteApiary = async (id: string): Promise<void> => {
  await db.apiaries.delete(id);
  // Also delete associated hives and their data
  const hives = await db.hives.where('apiaryId').equals(id).toArray();
  for (const hive of hives) {
    await deleteHive(hive.id);
  }
};

// Hive operations
export const createHive = async (
  name: string,
  apiaryId?: string,
  location?: string,
  image?: string
): Promise<Hive> => {
  const hive: Hive = {
    id: uuidv4(),
    apiaryId,
    name,
    location,
    image,
    isActive: true,
    createdAt: Date.now(),
  };
  await db.hives.add(hive);
  return hive;
};

export const updateHive = async (id: string, updates: Partial<Hive>): Promise<void> => {
  await db.hives.update(id, updates);
};

export const getHive = async (id: string): Promise<Hive | undefined> => {
  return await db.hives.get(id);
};

export const getAllHives = async (activeOnly: boolean = false): Promise<Hive[]> => {
  const allHives = await db.hives.toArray();
  if (activeOnly) {
    return allHives.filter((h) => h.isActive);
  }
  return allHives;
};

export const getHivesForApiary = async (apiaryId: string): Promise<Hive[]> => {
  return await db.hives.where('apiaryId').equals(apiaryId).toArray();
};

export const deleteHive = async (id: string): Promise<void> => {
  await db.hives.delete(id);
  // Also delete associated observations
  await db.observations.where('hiveId').equals(id).delete();
  // Also delete associated queens
  await db.queens.where('hiveId').equals(id).delete();
};

// Observation operations
export const createObservation = async (
  hiveId: string,
  date: string,
  miteCount: number,
  trayDays: number,
  notes?: string
): Promise<Observation> => {
  if (trayDays < 1) {
    throw new Error('Antal dage skal være mindst 1');
  }
  if (miteCount < 0) {
    throw new Error('Antal mider kan ikke være negativt');
  }

  const mitesPerDay = parseFloat((miteCount / trayDays).toFixed(2));

  const observation: Observation = {
    id: uuidv4(),
    hiveId,
    date,
    miteCount,
    trayDays,
    mitesPerDay,
    notes,
    createdAt: Date.now(),
  };

  await db.observations.add(observation);
  return observation;
};

export const getObservationsForHive = async (hiveId: string): Promise<Observation[]> => {
  return await db.observations.where('hiveId').equals(hiveId).reverse().sortBy('date');
};

export const getObservationsForHiveByYear = async (
  hiveId: string,
  year: number
): Promise<Observation[]> => {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const observations = await db.observations
    .where('hiveId')
    .equals(hiveId)
    .and((obs) => obs.date >= startDate && obs.date <= endDate)
    .sortBy('date');

  return observations;
};

export const getLatestObservationForHive = async (
  hiveId: string
): Promise<Observation | undefined> => {
  const observations = await db.observations
    .where('hiveId')
    .equals(hiveId)
    .reverse()
    .sortBy('date');
  return observations[0];
};

export const deleteObservation = async (id: string): Promise<void> => {
  await db.observations.delete(id);
};

export const updateObservation = async (
  id: string,
  updates: Partial<Observation>
): Promise<void> => {
  // Recalculate mitesPerDay if relevant fields are updated
  if (updates.miteCount !== undefined || updates.trayDays !== undefined) {
    const current = await db.observations.get(id);
    if (current) {
      const miteCount = updates.miteCount ?? current.miteCount;
      const trayDays = updates.trayDays ?? current.trayDays;
      updates.mitesPerDay = parseFloat((miteCount / trayDays).toFixed(2));
    }
  }
  await db.observations.update(id, updates);
};

export const getAllObservations = async (): Promise<Observation[]> => {
  return await db.observations.toArray();
};

export const getObservationByHiveAndDate = async (
  hiveId: string,
  date: string
): Promise<Observation | undefined> => {
  return await db.observations
    .where('hiveId')
    .equals(hiveId)
    .and((obs) => obs.date === date)
    .first();
};

// Treatment operations
export const createTreatment = async (
  hiveId: string,
  date: string,
  treatmentType: string,
  notes?: string
): Promise<Treatment> => {
  const treatment: Treatment = {
    id: uuidv4(),
    hiveId,
    date,
    treatmentType,
    notes,
    createdAt: Date.now(),
  };

  await db.treatments.add(treatment);
  return treatment;
};

export const getTreatmentsForHive = async (hiveId: string): Promise<Treatment[]> => {
  return await db.treatments.where('hiveId').equals(hiveId).reverse().sortBy('date');
};

export const deleteTreatment = async (id: string): Promise<void> => {
  await db.treatments.delete(id);
};

export const updateTreatment = async (id: string, updates: Partial<Treatment>): Promise<void> => {
  await db.treatments.update(id, updates);
};

export const getAllTreatments = async (): Promise<Treatment[]> => {
  return await db.treatments.toArray();
};

// Queen operations
export const createQueen = async (
  hiveId: string,
  data: {
    name?: string;
    birthYear?: number;
    origin?: string;
    motherId?: string;
    rating?: number;
    notes?: string;
    isActive?: boolean;
  }
): Promise<Queen> => {
  if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
    throw new Error('Rating skal være mellem 1 og 5');
  }

  const isActive = data.isActive ?? true;
  if (isActive) {
    await db.queens.where('hiveId').equals(hiveId).and((q) => q.isActive).modify({
      isActive: false,
    });
  }

  const queen: Queen = {
    id: uuidv4(),
    hiveId,
    name: data.name?.trim() || undefined,
    birthYear: data.birthYear,
    origin: data.origin?.trim() || undefined,
    motherId: data.motherId || undefined,
    rating: data.rating,
    notes: data.notes?.trim() || undefined,
    isActive,
    createdAt: Date.now(),
  };

  await db.queens.add(queen);
  return queen;
};

export const updateQueen = async (id: string, updates: Partial<Queen>): Promise<void> => {
  if (updates.rating !== undefined && (updates.rating < 1 || updates.rating > 5)) {
    throw new Error('Rating skal være mellem 1 og 5');
  }

  let targetHiveId = updates.hiveId;
  if (!targetHiveId) {
    const current = await db.queens.get(id);
    targetHiveId = current?.hiveId;
  }

  if (updates.isActive && targetHiveId) {
    await db.queens
      .where('hiveId')
      .equals(targetHiveId)
      .and((q) => q.isActive && q.id !== id)
      .modify({ isActive: false });
  }

  await db.queens.update(id, updates);
};

export const deleteQueen = async (id: string): Promise<void> => {
  await db.queens.delete(id);
};

export const getQueensForHive = async (hiveId: string): Promise<Queen[]> => {
  return await db.queens.where('hiveId').equals(hiveId).reverse().sortBy('createdAt');
};

export const getActiveQueenForHive = async (hiveId: string): Promise<Queen | undefined> => {
  const queens = await db.queens.where('hiveId').equals(hiveId).and((q) => q.isActive).toArray();
  return queens[0];
};

export const getAllQueens = async (): Promise<Queen[]> => {
  return await db.queens.toArray();
};

// Export/Import
export const exportAllData = async () => {
  const apiaries = await db.apiaries.toArray();
  const hives = await db.hives.toArray();
  const observations = await db.observations.toArray();
  const treatments = await db.treatments.toArray();
  const queens = await db.queens.toArray();
  return { apiaries, hives, observations, treatments, queens };
};

export const importAllData = async (data: {
  apiaries?: Apiary[];
  hives: Hive[];
  observations: Observation[];
  treatments?: Treatment[];
  queens?: Queen[];
}): Promise<void> => {
  await db.transaction(
    'rw',
    db.apiaries,
    db.hives,
    db.observations,
    db.treatments,
    db.queens,
    async () => {
    await db.apiaries.clear();
    await db.hives.clear();
    await db.observations.clear();
    await db.treatments.clear();
    await db.queens.clear();
    if (data.apiaries) {
      await db.apiaries.bulkAdd(data.apiaries);
    }
    await db.hives.bulkAdd(data.hives);
    await db.observations.bulkAdd(data.observations);
    if (data.treatments) {
      await db.treatments.bulkAdd(data.treatments);
    }
    if (data.queens) {
      await db.queens.bulkAdd(data.queens);
    }
  });
};

export const clearAllData = async (): Promise<void> => {
  await db.transaction(
    'rw',
    db.apiaries,
    db.hives,
    db.observations,
    db.treatments,
    db.queens,
    async () => {
    await db.apiaries.clear();
    await db.hives.clear();
    await db.observations.clear();
    await db.treatments.clear();
    await db.queens.clear();
  });
};

// Seed demo data
export const seedDemoData = async (): Promise<void> => {
  await clearAllData();

  const apiary1 = await createApiary('Bigård 1', 'Nordlige mark');
  const apiary2 = await createApiary('Bigård 2', 'Sydlige mark');

  const hive1 = await createHive('Stade A', apiary1.id);
  const hive2 = await createHive('Stade B', apiary1.id);
  const hive3 = await createHive('Stade C', apiary2.id);

  await createQueen(hive1.id, { name: 'Dronning A', birthYear: new Date().getFullYear() - 1 });
  await createQueen(hive2.id, { name: 'Dronning B', birthYear: new Date().getFullYear() - 2 });
  await createQueen(hive3.id, { name: 'Dronning C', birthYear: new Date().getFullYear() - 1 });

  // Create observations over the past 30 days
  const today = new Date();
  const dates: string[] = [];
  for (let i = 30; i >= 0; i -= 3) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  // Hive 1: increasing mite count (problematic)
  for (let i = 0; i < dates.length; i++) {
    await createObservation(hive1.id, dates[i], Math.floor(15 + i * 2.5 + Math.random() * 5), 3);
  }

  // Hive 2: moderate stable mite count
  for (let i = 0; i < dates.length; i++) {
    await createObservation(hive2.id, dates[i], Math.floor(20 + Math.random() * 8), 3);
  }

  // Hive 3: low stable mite count (good)
  for (let i = 0; i < dates.length; i++) {
    await createObservation(hive3.id, dates[i], Math.floor(5 + Math.random() * 5), 3);
  }

  // Add some treatments
  const treatmentDate1 = new Date(today);
  treatmentDate1.setDate(treatmentDate1.getDate() - 20);
  await createTreatment(
    hive1.id,
    treatmentDate1.toISOString().split('T')[0],
    'Oxalsyre',
    'Første behandling'
  );

  const treatmentDate2 = new Date(today);
  treatmentDate2.setDate(treatmentDate2.getDate() - 15);
  await createTreatment(hive2.id, treatmentDate2.toISOString().split('T')[0], 'Myresyre');

  const treatmentDate3 = new Date(today);
  treatmentDate3.setDate(treatmentDate3.getDate() - 10);
  await createTreatment(
    hive1.id,
    treatmentDate3.toISOString().split('T')[0],
    'Thymol',
    'Opfølgningsbehandling'
  );
};
