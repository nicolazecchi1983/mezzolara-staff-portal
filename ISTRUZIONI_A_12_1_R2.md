# STAFF A.12.1-R2 — Istruzioni

1. Conservare il file `.env` della versione attuale.
2. Sostituire la cartella `NZ` con quella contenuta nello ZIP.
3. Reinserire `.env` nella nuova cartella `NZ`.
4. Aprire il terminale nella cartella `NZ`.
5. Eseguire:

```bash
npm install
npm run check
npm run dev
```

## Verifica mirata
1. Aprire una gara dalla Match Library oppure il Match Sheet Editor.
2. Compilare almeno data, ora e avversario.
3. Arrivare al Report.
4. Premere `Crea report PDF`.
5. Nell'anteprima premere `Stampa / salva PDF`.
6. Tornare al Calendario.
7. La gara deve comparire nel giorno corretto con la dicitura `REPORT`.

Nessun SQL richiesto.
