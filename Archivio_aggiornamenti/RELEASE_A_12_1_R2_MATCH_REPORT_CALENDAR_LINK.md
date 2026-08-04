# RELEASE A.12.1-R2 — Match Report Calendar Link

## Obiettivo
Correggere il flusso per cui il Match Report veniva creato e stampato, ma non veniva registrato nel Calendario.

## Correzione
- Il comando "Stampa / salva PDF" pubblica prima il report nel Calendario.
- Se la gara esiste già nel Calendario, l'evento viene aggiornato.
- Se la gara proviene dalla Match Library locale o dall'editor libero, viene creato un nuovo evento partita.
- Il report completo viene conservato nei metadati `notes` dell'evento.
- Nel Calendario compare l'indicazione `REPORT`.
- Nella Match Library lo stato diventa `Report salvato`.

## Database
Nessuna migrazione SQL richiesta. Sono usati i campi già esistenti della tabella `events`.

## Test
- controllo sintattico: PASS
- controllo architetturale: PASS
- regressione stampa: 5/5 PASS
- creazione evento Calendario da Match Report: PASS
- aggiornamento evento Calendario esistente: PASS

## Vincoli
Nessuna modifica grafica generale e nessuna nuova funzionalità estranea al fix.
