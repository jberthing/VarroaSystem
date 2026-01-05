# Varroa Monitor

En PWA (Progressive Web App) til monitering af Varroa mider for biavlere. Appen kører lokalt på din computer og gemmer alle data lokalt i browseren (IndexedDB).

## ✨ Funktioner

- 🐝 **Administrer bistader** - Opret og administrer dine bistader med navn og placering
- 📊 **Registrer målinger** - Hurtigt indtast antal mider, dage og beregn automatisk mider pr. dag
- 📈 **Visualisér data** - Se grafer over midefald pr. dag for hvert bistade
- 🎯 **Overblik** - Dashboard med alle bistader sorteret efter højeste midefald
- 💾 **Backup** - Eksportér og importér data som JSON eller CSV
- 🔌 **Offline** - Fungerer uden internetforbindelse
- 📱 **Mobilvenlig** - Responsivt design der virker på computer, tablet og mobil

## 🚀 Kom i gang

### 📦 Installér appen (anbefalet)

Appen er tilgængelig online og kan installeres direkte på din computer som en selvstændig app:

**🌐 Link:** https://jberthing.github.io/VarroaSystem/

#### Installation i Microsoft Edge

1. Åbn linket ovenfor i Microsoft Edge
2. Klik på **⊕ App tilgængelig** ikonet i adresselinjen (øverst til højre)
3. Klik **Installér** i popup-vinduet
4. Appen installeres som en desktop-app og vises i Start-menuen
5. Åbn appen fra Start-menuen eller desktop-genvejen

**Alternativt:**
- Klik på **⋯** (tre prikker) → **Apps** → **Installér dette website som en app**

#### Installation i Google Chrome

1. Åbn linket ovenfor i Google Chrome
2. Klik på **⊕ Installér** ikonet i adresselinjen (øverst til højre)
3. Klik **Installér** i popup-vinduet
4. Appen installeres som en desktop-app og vises i Start-menuen
5. Åbn appen fra Start-menuen eller desktop-genvejen

**Alternativt:**
- Klik på **⋮** (tre prikker) → **Gem og del** → **Installér Varroa Monitor**

#### Efter installation

- Appen kører som en selvstændig app uden browserfane
- Find appen i Start-menuen under "V" for Varroa Monitor
- Appen kan pinnes til proceslinjen for nem adgang
- Alle data gemmes **lokalt** på din computer
- Appen fungerer offline efter installation

### 🛠️ Lokal udvikling (for udviklere)

#### Forudsætninger

- Node.js (version 18 eller nyere)
- npm (følger med Node.js)

#### Installation

1. Klon repository:
```powershell
git clone https://github.com/jberthing/VarroaSystem.git
cd VarroaSystem
```

2. Installér dependencies:
```powershell
npm install
```

#### Kør udviklings-server

```powershell
npm run dev
```

Appen åbnes på `http://localhost:5173`

#### Build til produktion

```powershell
npm run build
```

De byggede filer er i `dist/` mappen.

#### Deploy til GitHub Pages

```powershell
npm run deploy
```

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
