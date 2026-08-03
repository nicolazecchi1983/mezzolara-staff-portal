# Release A.12 — Match Library

## Funzionalità
- Nuova voce `Match Library` nella navigazione.
- Archivio unico delle gare della stagione.
- Importazione automatica e non duplicata delle partite presenti nel Calendario.
- Creazione manuale di una gara.
- Ricerca per avversario, competizione e impianto.
- Filtri per competizione, casa/trasferta ed esito.
- Apertura diretta del Match Sheet dalla gara selezionata.
- Interfaccia responsive desktop e smartphone.

## Architettura
- `matchLibraryModel.js`: normalizzazione e regole del dato.
- `matchLibraryRepository.js`: persistenza locale versionata.
- `matchLibraryService.js`: unione tra archivio e calendario.
- Nessuna modifica SQL richiesta.

## Nota dati
In questa release le gare create direttamente nella Match Library vengono salvate nel browser. Le gare del Calendario continuano a provenire da Supabase. Una futura migrazione potrà portare l'intero archivio su una tabella dedicata senza modificare l'interfaccia del modulo.
