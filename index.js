const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();

var province = {"padova":"veneto","lodi":"lombardia","lecco":"lombardia","siena":"toscana","oristano":"sardegna","pescara":"abruzzo","milano":"lombardia","pistoia":"toscana","potenza":"basilicata","ragusa":"sicilia","foggia":"puglia","cuneo":"piemonte","matera":"basilicata","l'aquila":"abruzzo","rieti":"lazio","salerno":"campania","napoli":"campania","catania":"sicilia","frosinone":"lazio","cosenza":"calabria","brescia":"lombardia","pesaro e urbino":"marche","cremona":"lombardia","mantova":"lombardia","viterbo":"lazio","vibo valentia":"calabria","ascoli piceno":"marche","terni":"umbria","campobasso":"molise","isernia":"molise","bari":"puglia","caltanissetta":"sicilia","messina":"sicilia","alessandria":"piemonte","bergamo":"lombardia","rovigo":"veneto","verona":"veneto","roma":"lazio","reggio calabria":"calabria","piacenza":"emilia-romagna","sassari":"sardegna","enna":"sicilia","asti":"piemonte","torino":"piemonte","belluno":"veneto","varese":"lombardia","monza e della brianza":"lombardia","novara":"piemonte","agrigento":"sicilia","ancona":"marche","vicenza":"veneto","udine":"friuli-venezia giulia","avellino":"campania","caserta":"campania","biella":"piemonte","benevento":"campania","imperia":"liguria","trento":"trentino-alto adige","pavia":"lombardia","vercelli":"piemonte","savona":"liguria","teramo":"abruzzo","sondrio":"lombardia","parma":"emilia-romagna","como":"lombardia","catanzaro":"calabria","reggio nell'emilia":"emilia-romagna","trapani":"sicilia","bolzano/bozen":"trentino-alto adige","lecce":"puglia","ravenna":"emilia-romagna","palermo":"sicilia","valle d'aosta":"valle d'aosta","fermo":"marche","chieti":"abruzzo","treviso":"veneto","bologna":"emilia-romagna","lucca":"toscana","la spezia":"liguria","pordenone":"friuli-venezia giulia","barletta-andria-trani":"puglia","arezzo":"toscana","venezia":"veneto","verbano-cusio-ossola":"piemonte","macerata":"marche","latina":"lazio","sud sardegna":"sardegna","grosseto":"toscana","genova":"liguria","ferrara":"emilia-romagna","nuoro":"sardegna","cagliari":"sardegna","perugia":"umbria","siracusa":"sicilia","massa-carrara":"toscana","taranto":"puglia","firenze":"toscana","forlì-cesena":"emilia-romagna","modena":"emilia-romagna","rimini":"emilia-romagna","crotone":"calabria","livorno":"toscana","pisa":"toscana","brindisi":"puglia","prato":"toscana","gorizia":"friuli-venezia giulia","trieste":"friuli-venezia giulia"};
var regioni = ["veneto","lombardia","toscana","sardegna","abruzzo","basilicata","sicilia","puglia","piemonte","lazio","campania","calabria","marche","umbria","molise","emilia-romagna","friuli-venezia giulia","liguria","trentino-alto adige","valle d'aosta"];

function getComuni(params) {
    var comuni = [];
    if (params["provincia"] && province[params["provincia"]]) {
        comuni = JSON.parse(fs.readFileSync(`./regioni/${province[params["provincia"]]}.json`, 'utf8'));
        comuni = comuni.filter((c) => c.provincia == params["provincia"]);
    }
    else if (params["regione"] && regioni.includes(params["regione"])) {
        comuni = JSON.parse(fs.readFileSync(`./regioni/${params["regione"]}.json`, 'utf8'));
    }
    else {
        comuni = JSON.parse(fs.readFileSync(`./comuni.json`, 'utf8'));
    }

    if (params["withprovince"]) {
        var myProvince = [];
        comuni.forEach(function(c, index) { 
            if (c.nome.toLowerCase() == c.provincia) {
                myProvince.push(Object.assign({}, c));
                comuni[index].nome = "Provincia di " + c.nome; 
            }
        });
        comuni = comuni.concat(myProvince);
    }

    if (params["onlyname"]) {
        comuni.forEach((c, index) => comuni[index] = c.nome);
    }

    return comuni;
}

app.use(cors());

app.get('/api/comune', function(req, res) {
    res.send(getComuni(req.query));
});
app.get('/api/:regione', function(req, res) {
    req.query["regione"] = req.params["regione"];
    res.send(getComuni(req.query));
});

app.listen(process.env.PORT || 3000, () => console.log(`API comuni-ita is running!`));