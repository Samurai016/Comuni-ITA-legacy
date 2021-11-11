# [Comuni ITA API](https://comuni-ita.herokuapp.com/)
![Versione](https://img.shields.io/github/package-json/v/Samurai016/comuni-ita?label=versione&style=flat-square)
[![Hosted on Heroku](https://img.shields.io/badge/Hosted%20on%20Heroku-passing?style=flat-square&logo=heroku&labelColor=430098&color=430098)](https://comuni-ita.herokuapp.com/)
[![Leggi la documentazione](https://img.shields.io/badge/Leggi%20la%20documentazione-passing?style=flat-square&logo=Read%20the%20Docs&labelColor=8CA1AF&color=8CA1AF&logoColor=white)](https://comuni-ita.herokuapp.com/)

Semplice API che permette di ottenere in formato JSON i comuni italiani.

**License:** [MIT](https://opensource.org/licenses/MIT)  
**Credits:** Logo inpired by: [Castle by Jasfart from the Noun Project](https://thenounproject.com/omataloon/)

# Endpoints

## ![GET](https://img.shields.io/static/v1?label=%20&message=GET&color=187bdf&style=flat-square) /api/comuni

Ottieni la lista di tutti i comuni italiani.

**Questo endpoint nelle versioni precedenti alla [2.0.0](https://github.com/Samurai016/Comuni-ITA/releases/tag/2.0.0) era disponibile all'url `/comune`.  \
        Ora quell'URL è deprecato, rimarrà disponibile, ma si consiglia l'aggiornamento dei propri progetti al nuovo URL.**

### [Documentazione](https://comuni-ita.herokuapp.com/#operation/comuni)

## ![GET](https://img.shields.io/static/v1?label=%20&message=GET&color=187bdf&style=flat-square) /api/comuni/{regione}

Ottieni la lista di tutti i comuni della regione indicata.

### [Documentazione](https://comuni-ita.herokuapp.com/#operation/comuni-regione)

## ![GET](https://img.shields.io/static/v1?label=%20&message=GET&color=187bdf&style=flat-square) /api/comuni/provincia/{provincia}

Ottieni la lista di tutti i comuni della provincia indicata.

### [Documentazione](https://comuni-ita.herokuapp.com/#operation/comuni-provincia)

## ![GET](https://img.shields.io/static/v1?label=%20&message=GET&color=187bdf&style=flat-square) /api/province

Ottieni la lista di tutte le province italiane.

### [Documentazione](https://comuni-ita.herokuapp.com/#operation/province)

## ![GET](https://img.shields.io/static/v1?label=%20&message=GET&color=187bdf&style=flat-square) /api/province/{regione}

Ottieni la lista di tutte le province della regione indicata.

### [Documentazione](https://comuni-ita.herokuapp.com/#operation/province-regione)

## ![GET](https://img.shields.io/static/v1?label=%20&message=GET&color=187bdf&style=flat-square) /api/regioni

Ottieni la lista delle regioni italiane.

### [Documentazione](https://comuni-ita.herokuapp.com/#operation/regioni)

# Dettagli sulle regioni e sulle province

Per evitare incongruenze coi nomi di regioni e province, si consiglia di verificare i nomi attraverso gli endpoint `/api/regioni` e `/api/province`.  \
In generale i nomi vanno scritti utilizzando i caratteri speciali come apostrofi, spazi o trattini.

# Installazione su server proprio

Tramite questa repo è possibile installare l'API su un proprio server NodeJS.

### Sistema di aggiornamento
Il sistema di aggiornamento della API prevede un sistema di logging tramite un bot Telegram. Il bot serve, oltre che per essere notificati sullo stato dell'aggiornamento da remoto, sia per la risoluzione di eventuali problemi/conflitti occorsi durante il fetch automatico dei dati.
Prima di poter installare l'API quindi, crea un bot Telegram tramite [BotFather](https://t.me/botfather) (Puoi chiamarlo come vuoi, il codice per il suo funzionamento è incluso in questa repo). 

## Prerequisti del server
* **MySQL**
* **Node.js v15**  \
  Verificalo con il comando
  ```bash
  node --version
  # v15.x.x
  ```
  Se il comando non viene trovato o la versione installato è precedente alla `15.0.0`, procedi ad installare o aggiornare node scaricandolo dal [sito ufficiale](https://nodejs.org/).

## Procedura di installazione
* Nella cartella scelta scarica la presente repo o clonala con il comando
  ```bash
  git clone https://github.com/Samurai016/Comuni-ITA.git
  ```
* Crea un file chiamato `environment.env` con il seguente contenuto: 
  ```
  TELEGRAM_CHAT=<Chat ID>
  BOT_KEY=<Token del bot>
  MYSQL_HOST=<Server MySQL>
  MYSQL_DATABASE=<Nome del database>
  MYSQL_USERNAME=<Username del database>
  ```
  * **TELEGRAM_CHAT** = è l'id della chat, più avanti nella guida ti verrà detto come compilarlo.
  * **BOT_KEY** = è il token del bot che ti viene fornito da BotFather al momento della creazione del bot, puoi anche ottenerla chiedendola direttamente a BotFather.
* Crea il database MySQL usando il file [comuni-ita.sql](https://github.com/Samurai016/Comuni-ITA/blob/master/comuni-ita.sql).
* Avvia il primo aggiornamento dell'API usando il comando
  ```bash
  npm run update
  ```
* Invia al bot il comando `/start`, il bot ti risponderà con il tuo chat ID da inserire nel file `environment.env`.
* Aggiorna il file `environment.env` con il chat ID e riavvia l'aggiornamento per popolare il database.
* Una volta completato l'aggiornamento avvia l'API con il comando
  ```bash
  npm start
  ```
  
Ogni volta che vorrai aggiornare l'API ti basterà avviare il comando `npm run update`.