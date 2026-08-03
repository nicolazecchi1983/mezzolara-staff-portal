# Release A.11.2 — Match Report & PDF Architecture

## Obiettivo
Separare costruzione del report, rendering, validazione e stampa dalla UI monolitica della Match Sheet.

## Moduli introdotti
- `src/modules/match/matchReportModel.js`
- `src/modules/match/matchReportRenderer.js`
- `src/modules/match/matchReportService.js`
- `src/modules/match/matchReportValidation.js`
- `src/modules/match/matchReportPrint.js`

## Risultato
- un solo modello alimenta anteprime progressive e report finale;
- la stampa non legge più dati direttamente dal form;
- gestione popup e attesa asset isolata;
- chiusura anteprima con Escape e ripristino del focus;
- nessuna modifica a database, RLS, Storage o Edge Functions;
- `app.js` ridotto di circa 76 righe.

## Test richiesti
1. Compilare tutte le cinque sezioni della Match Sheet.
2. Verificare le anteprime sotto i passaggi 1–4.
3. Verificare il report finale nel passaggio 5.
4. Aprire l’anteprima di stampa.
5. Chiudere con Escape e verificare il ritorno del focus.
6. Stampare o salvare come PDF.
7. Ricaricare la pagina e verificare la bozza.
8. Eseguire `npm run build`.
