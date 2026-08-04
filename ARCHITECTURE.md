# STAFF — Architettura ufficiale

Versione architetturale: A.12.1

## Principio

STAFF è un monolite frontend modulare. Le funzionalità vengono organizzate per dominio e devono dipendere da infrastrutture condivise attraverso confini espliciti.

## Struttura

```text
src/
├── main.js                 Bootstrap dell'applicazione
├── components/             App shell e componenti UI generali
├── core/                   Regole trasversali senza dipendenze dai domini
├── modules/                Funzionalità di business organizzate per dominio
├── shared/                 Componenti riutilizzabili e indipendenti dai domini
├── services/               Servizi applicativi realmente trasversali
├── data/                   Dati statici temporanei
└── supabase.js             Configurazione del client Supabase
```

## Regole obbligatorie

1. `core` non importa mai da `modules`.
2. `shared` non importa mai da `modules`.
3. Le autorizzazioni comuni vivono in `core/accessControl.js` e `core/permissions.js`.
4. Non si creano nuovi accessi diretti a Supabase nei componenti UI.
5. Ogni nuova funzione di dominio viene inserita nel relativo modulo.
6. `localStorage` è ammesso per bozze, cache e preferenze; non come unica fonte permanente dei dati di dominio.
7. Nessun nuovo codice applicativo viene aggiunto a `components/app.js` senza estrarre o ridurre una responsabilità esistente.

## Flusso desiderato

```text
UI → Application Service → Domain → Repository → Infrastructure
```

## Debito tecnico controllato

- `components/app.js` resta temporaneamente il coordinatore principale e contiene ancora logica da estrarre.
- Alcuni servizi importano direttamente Supabase; sono ammessi dalla whitelist del controllo architetturale.
- Match Library utilizza ancora storage locale per una parte dei dati e dovrà convergere su Supabase.

## Controlli

```bash
npm run check:syntax
npm run check:architecture
npm run check
```

`npm run check:architecture` impedisce il ritorno di file obsoleti e verifica i principali confini di dipendenza.
