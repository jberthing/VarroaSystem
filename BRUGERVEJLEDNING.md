# 🐝 VARROA MONITOR - INSTALLATIONS- OG BRUGSGUIDE

## Til distributøren (dig)

### Send denne fil til kolleger:
📦 **Varroa-Monitor-Portable.zip** (ca. 500 KB)

Filen findes i: `C:\temp2\varroa\VarroaSystem\Varroa-Monitor-Portable.zip`

---

## Til brugeren (din kollega)

### TRIN 1: Udpak filerne
1. Højreklik på **Varroa-Monitor-Portable.zip**
2. Vælg "Udpak alle..." 
3. Vælg en placering (f.eks. `C:\Varroa` eller Skrivebord)
4. Klik "Udpak"

### TRIN 2: Start appen
1. Åbn den udpakkede mappe
2. **Dobbeltklik på START_VARROA.bat**
3. Et sort vindue åbner (luk IKKE dette vindue!)
4. Din browser åbner automatisk med appen

### TRIN 3: Brug appen
- Appen kører nu i din browser
- Opret bigårde, bistader og registrer mider
- Al data gemmes automatisk i din browser

### TRIN 4: Afslut appen
- Luk browserfanen
- Luk det sorte kommandovindue (eller tryk Ctrl+C)

### Næste gang du vil bruge appen:
- Dobbeltklik bare på **START_VARROA.bat** igen
- Dine data er stadig der!

---

## Ofte stillede spørgsmål

### Kan jeg flytte mappen?
Ja, du kan flytte hele mappen hvor som helst. Bare dobbeltklik på START_VARROA.bat fra den nye placering.

### Skal jeg være online?
Nej! Appen fungerer 100% offline efter første start.

### Hvor gemmes mine data?
Data gemmes i din browsers lokale lager (IndexedDB). De slettes IKKE når du lukker browseren eller appen.

### Kan jeg bruge det på flere computere?
Ja, installer bare appen på hver computer. Data er ikke synkroniseret mellem computere (hver computer har sin egen lokale data).

### Hvordan sikkerhedskopierer jeg mine data?
1. Åbn appen
2. Gå til "Import/Eksport" i menuen
3. Klik "Eksporter data (JSON)"
4. Gem filen et sikkert sted

### Hvordan flytter jeg data til en ny computer?
1. Eksporter data fra den gamle computer (se ovenfor)
2. Installer appen på den nye computer
3. Gå til "Import/Eksport"
4. Klik "Importer data" og vælg den gemte fil

### Browser lukker ikke automatisk?
Åbn manuelt Chrome eller Edge og gå til: **http://localhost:8000**

### "Port 8000 er optaget" fejl?
Luk andre programmer der måske bruger port 8000, eller genstart computeren.

### Data forsvundet?
- Sørg for du bruger samme browser hver gang (Chrome eller Edge)
- Sørg for browseren IKKE er i "Inkognito" / "InPrivate" mode
- Tjek om browser cache er blevet ryddet

---

## Systemkrav

✅ Windows 10 eller nyere
✅ Chrome eller Edge browser (normalt allerede installeret)
✅ Python (kommer med Windows) ELLER PowerShell (kommer med Windows)

Ingen andre krav!

---

## Support og opdateringer

Kontakt distributøren for:
- Hjælp med installation
- Fejlrapporter
- Opdateringer til appen

---

## Tekniske detaljer (for nysgerrige)

- **Frontend:** React + TypeScript
- **Database:** IndexedDB (lokal browser database)
- **Charts:** Chart.js
- **Offline:** Progressive Web App (PWA)
- **Server:** Python SimpleHTTPServer eller PowerShell HTTP Listener

Alt kører lokalt på din computer. Ingen data sendes nogen steder.
