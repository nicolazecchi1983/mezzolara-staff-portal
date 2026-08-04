# Release A.12.1 — Architecture Organization

## Obiettivo

Rendere la struttura del progetto più coerente e verificabile senza modificare funzionalità, interfaccia o database.

## Modifiche

- centralizzato l'access control in `src/core/accessControl.js`;
- eliminati i percorsi duplicati `src/app/accessControl.js` e `src/services/accessControl.js`;
- rimossi file e asset Vite non utilizzati;
- rimosso il file anomalo `src/components/.js` non importato;
- aggiunto `ARCHITECTURE.md` come contratto architetturale ufficiale;
- aggiunto controllo automatico dei confini architetturali;
- aggiunto controllo sintattico completo;
- aggiornati nome e versione del package.

## File rimossi

- `src/components/.js`
- `src/counter.js`
- `src/services/accessControl.js`
- `src/app/accessControl.js`
- `src/assets/javascript.svg`
- `src/assets/vite.svg`

## Comandi di verifica

```bash
npm run check:syntax
npm run check:architecture
npm run build
```

## Database

Nessuna modifica SQL richiesta.

## Compatibilità

La release non modifica il comportamento visibile dell'applicazione.

## Validazione eseguita

- controllo sintattico: superato su 51 file;
- controllo architetturale: superato su 49 file JavaScript;
- build Vite: da eseguire sul PC locale, perché il registry npm dell'ambiente di generazione non esponeva il pacchetto Vite richiesto.
