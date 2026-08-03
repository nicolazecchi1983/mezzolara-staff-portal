# Release A.11.3 — Document Engine Stabilization

## Interventi completati
- Unificata la stampa HTML sul Print Engine condiviso.
- Rimossa la seconda implementazione indipendente basata su `document.write`.
- Introdotto un registro centrale dei tipi documento.
- Introdotto un modello standard per i metadati documentali.
- Mantenuta la compatibilità con le chiamate esistenti a `pdfService`.
- Nessuna modifica a database, RLS, Storage o Edge Functions.

## Moduli
- `src/shared/print/printEngine.js`
- `src/services/pdfService.js`
- `src/shared/documents/documentRegistry.js`
- `src/shared/documents/documentTypes.js`

## Verifiche
- Controllo sintattico JavaScript completato.
- Match Report e Board usano un solo motore di stampa.
- Training Sheet mantiene il proprio generatore PDF raster, necessario per il layout A4.
