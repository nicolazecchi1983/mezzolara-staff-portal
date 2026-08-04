# Installazione A.12.1

1. Conservare il file `.env` della versione corrente.
2. Sostituire la cartella `NZ` con quella contenuta nello ZIP.
3. Reinserire `.env` nella nuova cartella `NZ`.
4. Aprire il terminale nella cartella `NZ`.
5. Eseguire:

```bash
npm install
npm run check
```

6. Avviare il software:

```bash
npm run dev
```

7. Verificare accesso, Calendario, Training Library, Match Library e Match Sheet.
8. Pubblicare:

```bash
git add .
git commit -m "Release A.12.1 Architecture Organization"
git push
```

## SQL

Nessun comando SQL richiesto.
