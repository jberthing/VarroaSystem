# Varroa Monitor

En PWA (Progressive Web App) til monitering af Varroa mider for biavlere. Appen kører lokalt på din Windows-computer og gemmer alle data lokalt i browseren (IndexedDB).

## ✨ Funktioner

- 🐝 **Administrer bistader** - Opret og administrer dine bistader med navn og placering
- 📊 **Registrer målinger** - Hurtigt indtast antal mider, dage og beregn automatisk mider pr. dag
- 📈 **Visualisér data** - Se grafer over midefald pr. dag for hvert bistade
- 🎯 **Overblik** - Dashboard med alle bistader sorteret efter højeste midefald
- 💾 **Backup** - Eksportér og importér data som JSON eller CSV
- 🔌 **Offline** - Fungerer uden internetforbindelse
- 📱 **Mobilvenlig** - Responsivt design der virker på computer, tablet og mobil

## 🚀 Kom i gang

### Forudsætninger

- Node.js (version 18 eller nyere)
- npm (følger med Node.js)

### Installation

1. Åbn PowerShell/Terminal i projektmappen
2. Installér dependencies:

```powershell
npm install
```

### Kør udviklings-server

```powershell
npm run dev
```

Appen åbnes på `http://localhost:5173`

### Build til produktion

```powershell
npm run build
```

De byggede filer er i `dist/` mappen.

### Preview af produktion build

```powershell
npm run preview
```

## 📦 Installér som PWA på Windows

1. Åbn appen i Microsoft Edge eller Chrome
2. Klik på "Installér" ikonet i adresselinjen (eller menu → "Installér Varroa Monitor")
3. Appen installeres som en desktop-app i Start-menuen
4. Kan nu køre som en selvstændig app uden browserfane

## 💾 Data

- Alle data gemmes **lokalt** i din browser (IndexedDB)
- Ingen data sendes til en server
- Husk at lave backup regelmæssigt via "Import/Eksport" siden

## 🧪 Test med demo-data

1. Gå til "Import/Eksport" siden
2. Klik på "Indlæs demo-data"
3. Du får nu 3 bistader med 30 dages testdata

## 📖 Anvendelse

### Opret bistade

1. Gå til "Bistader"
2. Klik "+ Nyt bistade"
3. Indtast navn (f.eks. "Bigård 1 - Stade A") og evt. placering
4. Klik "Opret bistade"

### Registrér måling

1. Klik "⚡ Ny registrering" fra Oversigt eller på et specifikt bistade
2. Vælg bistade (hvis ikke allerede valgt)
3. Indtast antal mider og antal dage bakken har været i familien
4. Klik "Gem registrering"
5. Mider pr. dag beregnes automatisk: `antal mider / dage`

### Se data

- **Oversigt**: Alle bistader med seneste mider/dag og trend (↑/↓/→)
- **Bistade detalje**: Graf over tid + liste af seneste 10 registreringer
- **Eksportér**: Download data som JSON (backup) eller CSV (Excel)

## 🏗️ Teknisk stack

- **Frontend**: React 18 + TypeScript
- **Build**: Vite
- **Routing**: React Router
- **Database**: Dexie.js (IndexedDB wrapper)
- **Grafer**: Chart.js + react-chartjs-2
- **PWA**: vite-plugin-pwa

## 📁 Projektstruktur

```
src/
├── components/       # Genbrugelige komponenter
│   ├── Layout.tsx
│   └── QuickObservationForm.tsx
├── pages/           # Side-komponenter
│   ├── Dashboard.tsx
│   ├── Hives.tsx
│   ├── HiveDetail.tsx
│   └── ImportExport.tsx
├── db/              # Database og data-lag
│   ├── database.ts
│   └── repository.ts
├── utils/           # Hjælpefunktioner
│   ├── dateUtils.ts
│   ├── fileUtils.ts
│   └── calculations.ts
├── App.tsx          # Hoved-app med routing
└── main.tsx         # Entry point
```

## 🎨 Farver og design

- **Primær**: Gul/Orange (#fbbf24, #f59e0b) - CTA knapper
- **Grøn** (#10b981): Lav midetæthed (< 5 mider/dag)
- **Gul** (#f59e0b): Middel midetæthed (5-10 mider/dag)
- **Rød** (#ef4444): Høj midetæthed (≥ 10 mider/dag)

## 🐛 Fejlfinding

**Problem**: Appen starter ikke
- Sørg for at alle dependencies er installeret: `npm install`
- Tjek at Node.js er installeret: `node --version`

**Problem**: Data forsvinder
- Data gemmes i browserens IndexedDB
- Slet ikke browser cache/data
- Lav regelmæssige backups via "Import/Eksport"

**Problem**: Grafer vises ikke
- Tjek browser konsollen for fejl
- Prøv at genindlæse siden (F5)

## 📝 Licens

Dette projekt er udviklet som et værktøj til biavlere.

## 👨‍💻 Support

For spørgsmål eller problemer, kontakt udvikleren.
