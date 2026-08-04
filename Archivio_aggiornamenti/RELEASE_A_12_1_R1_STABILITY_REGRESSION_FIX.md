# RELEASE A.12.1-R1 — Stability & Regression Fix

## Obiettivo
Ripristinare la stampa del Match Report senza modificare funzioni, dati o interfaccia.

## Causa individuata
Le regole storiche di stampa della Training Sheet contenevano una regola globale che, durante la stampa, rendeva invisibili tutti gli elementi della pagina salvo `[data-ts-preview]`.

La pagina dedicata al Match Report caricava lo stesso foglio stile e veniva quindi resa invisibile nell'anteprima PDF, producendo pagine bianche.

## Correzione
- La classe contestuale di stampa viene ora assegnata sia a `<html>` sia a `<body>`.
- Il contesto `match-print-body` isola il Match Report dalle regole della Training Sheet.
- `#printRoot` e i suoi discendenti vengono resi esplicitamente visibili.
- Vengono annullati altezza A4 rigida e `overflow:hidden` ereditati dalle vecchie regole.
- Aggiunto controllo automatico `npm run check:print`.

## Impatto
- Nessuna modifica SQL.
- Nessuna modifica ai dati.
- Nessuna modifica grafica nell'app.
- Nessuna nuova funzionalità.
- Correzione limitata al flusso di stampa dedicato.
