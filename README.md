# [Comuni ITA API](https://comuni-ita.herokuapp.com/)
![Versione](https://img.shields.io/github/package-json/v/Samurai016/comuni-ita?label=versione&style=flat-square)
[![Hosted on Heroku](https://img.shields.io/badge/Hosted%20on%20Heroku-passing?style=flat-square&logo=heroku&labelColor=430098&color=430098)](https://comuni-ita.herokuapp.com/)
[![Leggi la documentazione](https://img.shields.io/badge/Leggi%20la%20documentazione-passing?style=flat-square&logo=Read%20the%20Docs&labelColor=8CA1AF&color=8CA1AF&logoColor=white)](https://comuni-ita.herokuapp.com/)

Semplice API che permette di ottenere in formato JSON i comuni italiani.

**Contact information:**  
Nicolò Rebaioli  
https://rebaioli.altervista.org  
niko.reba@gmail.com  

**License:** [MIT](https://opensource.org/licenses/MIT)  
**Credits:** Logo inpired by: [Castle by Jasfart from the Noun Project](https://thenounproject.com/omataloon/)

### /comune

#### GET
##### Summary:

Ottieni la lista dei comuni.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| regione | query | La regione di cui si vuole i comuni. **In minuscolo**. | No | string |
| provincia | query | La provincia di cui si vuole i comuni. **In minuscolo**. Il parametro sovrascrive l'eventuale parametro `regione`. | No | string |
| withprovince | query | Può essere un valore qualunque. In caso il parametro abbia un valore, tra i risultati verrà inserito un comune "aggiuntivo" per ogni provincia. Tale comune avrà gli stessi parametri del capoluogo di provincia, con l'unica differenza che il nome presenterà la dicitura Provincia di ^capoluogo^. | No | string |
| onlyname | query | Può essere un valore qualunque. In caso il parametro abbia un valore, il risultato della query sarà un array di stringhe, tali stringhe rappresentano i nomi dei comuni selezionati. | No | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ---- |
| 200 | L'operazione ha avuto successo. | Array(Object) |
| 5XX | Errore del server. **Contattare lo sviluppatore.** | |

### /{regione}

#### GET
##### Summary:

Ottieni la lista dei comuni della regione specificata.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| regione | path | La regione di cui si vuole i comuni. **In minuscolo**. | **Si** | string |
| provincia | query | La provincia di cui si vuole i comuni. **In minuscolo**. Il parametro sovrascrive l'eventuale parametro `regione`. | No | string |
| withprovince | query | Può essere un valore qualunque. In caso il parametro abbia un valore, tra i risultati verrà inserito un comune "aggiuntivo" per ogni provincia. Tale comune avrà gli stessi parametri del capoluogo di provincia, con l'unica differenza che il nome presenterà la dicitura Provincia di ^capoluogo^. | No | string |
| onlyname | query | Può essere un valore qualunque. In caso il parametro abbia un valore, il risultato della query sarà un array di stringhe, tali stringhe rappresentano i nomi dei comuni selezionati. | No | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ---- |
| 200 | L'operazione ha avuto successo. | Array(Object) |
| 5XX | Errore del server. **Contattare lo sviluppatore.** | |