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