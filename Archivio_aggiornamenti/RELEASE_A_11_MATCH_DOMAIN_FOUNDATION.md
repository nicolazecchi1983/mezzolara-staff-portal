# Release A.11 - Match Domain Foundation

## Obiettivo
Separare le fondamenta del dominio Match Sheet dal file monolitico `app.js`, senza modificare il comportamento visibile del portale.

## Moduli introdotti
- `src/modules/match/matchModel.js`
- `src/modules/match/matchDraftRepository.js`
- `src/modules/match/matchService.js`
- `src/modules/match/matchValidation.js`
- `src/modules/match/matchPermissions.js`
- `src/shared/pitch/formationLayouts.js`

## Migrazioni effettuate
- Modello e raccolta dati Match Sheet centralizzati.
- Salvataggio bozza versionato e compatibile con la chiave precedente.
- Sistemi di gioco e coordinate del campo spostati in un modulo condiviso.
- Match Sheet e Board usano la stessa fonte per le disposizioni tattiche supportate.
- Validazione e permessi predisposti come moduli dedicati.

## Compatibilità
La bozza precedente `nz-match-sheet-editor-v1` viene letta e migrata automaticamente alla nuova chiave `nz-match-sheet-editor-v2` al primo salvataggio.

## Supabase
Nessuna modifica SQL, RLS, Storage o Edge Function.
