const express = require('express');
const fs = require('fs');
const cors = require('cors');
const enforce = require('express-sslify');
const app = express();

// HELPERS
const province = {
    "padova":"veneto",
    "lodi":"lombardia",
    "lecco":"lombardia",
    "siena":"toscana",
    "oristano":"sardegna",
    "pescara":"abruzzo",
    "milano":"lombardia",
    "pistoia":"toscana",
    "potenza":"basilicata",
    "ragusa":"sicilia",
    "foggia":"puglia",
    "cuneo":"piemonte",
    "matera":"basilicata",
    "l'aquila":"abruzzo",
    "rieti":"lazio",
    "salerno":"campania",
    "napoli":"campania",
    "catania":"sicilia",
    "frosinone":"lazio",
    "cosenza":"calabria",
    "brescia":"lombardia",
    "pesaro e urbino":"marche",
    "cremona":"lombardia",
    "mantova":"lombardia",
    "viterbo":"lazio",
    "vibo valentia":"calabria",
    "ascoli piceno":"marche",
    "terni":"umbria",
    "campobasso":"molise",
    "isernia":"molise",
    "bari":"puglia",
    "caltanissetta":"sicilia",
    "messina":"sicilia",
    "alessandria":"piemonte",
    "bergamo":"lombardia",
    "rovigo":"veneto",
    "verona":"veneto",
    "roma":"lazio",
    "reggio calabria":"calabria",
    "piacenza":"emilia romagna",
    "sassari":"sardegna",
    "enna":"sicilia",
    "asti":"piemonte",
    "torino":"piemonte",
    "belluno":"veneto",
    "varese":"lombardia",
    "monza e della brianza":"lombardia",
    "novara":"piemonte",
    "agrigento":"sicilia",
    "ancona":"marche",
    "vicenza":"veneto",
    "udine":"friuli venezia giulia",
    "avellino":"campania",
    "caserta":"campania",
    "biella":"piemonte",
    "benevento":"campania",
    "imperia":"liguria",
    "trento":"trentino alto adige",
    "pavia":"lombardia",
    "vercelli":"piemonte",
    "savona":"liguria",
    "teramo":"abruzzo",
    "sondrio":"lombardia",
    "parma":"emilia romagna",
    "como":"lombardia",
    "catanzaro":"calabria",
    "reggio emilia":"emilia romagna",
    "trapani":"sicilia",
    "bolzano":"trentino alto adige",
    "lecce":"puglia",
    "ravenna":"emilia romagna",
    "palermo":"sicilia",
    "aosta":"valle d'aosta",
    "fermo":"marche",
    "chieti":"abruzzo",
    "treviso":"veneto",
    "bologna":"emilia romagna",
    "lucca":"toscana",
    "la spezia":"liguria",
    "pordenone":"friuli venezia giulia",
    "barletta-andria-trani":"puglia",
    "arezzo":"toscana",
    "venezia":"veneto",
    "verbano-cusio-ossola":"piemonte",
    "macerata":"marche",
    "latina":"lazio",
    "sud sardegna":"sardegna",
    "grosseto":"toscana",
    "genova":"liguria",
    "ferrara":"emilia romagna",
    "nuoro":"sardegna",
    "cagliari":"sardegna",
    "perugia":"umbria",
    "siracusa":"sicilia",
    "massa-carrara":"toscana",
    "taranto":"puglia",
    "firenze":"toscana",
    "forlì-cesena":"emilia romagna",
    "modena":"emilia romagna",
    "rimini":"emilia romagna",
    "crotone":"calabria",
    "livorno":"toscana",
    "pisa":"toscana",
    "brindisi":"puglia",
    "prato":"toscana",
    "gorizia":"friuli venezia giulia",
    "trieste":"friuli venezia giulia"
};
const regioni = [
    "veneto",
    "lombardia",
    "toscana",
    "sardegna",
    "abruzzo",
    "basilicata",
    "sicilia",
    "puglia",
    "piemonte",
    "lazio",
    "campania",
    "calabria",
    "marche",
    "umbria",
    "molise",
    "emilia romagna",
    "friuli venezia giulia",
    "liguria",
    "trentino alto adige",
    "valle d'aosta"
];
function ApiResponse(status, data) {
    this.status = status;
    this.data = data;
}

// HANDLERS
function getComuni(params) {
    // Tutte le keys a lowercase
    Object.keys(params).forEach(key => params[key]=params[key].toLowerCase());

    var comuni = [];

    if (params["provincia"]) { // Handle provincia
        if (!province[params["provincia"]]) {
            return new ApiResponse(400, "Provincia inesistente");
        }
        comuni = JSON.parse(fs.readFileSync(`./regioni/${province[params["provincia"]]}.json`, 'utf8'));
        comuni = comuni.filter((c) => c.provincia == params["provincia"]);
    }
    else if (params["regione"]) { // Handle regione
        if (!regioni.includes(params["regione"])) {
            return new ApiResponse(400, "Regione inesistente");
        }
        comuni = JSON.parse(fs.readFileSync(`./regioni/${params["regione"]}.json`, 'utf8'));
    }
    else {
        comuni = JSON.parse(fs.readFileSync(`./comuni.json`, 'utf8'));
    }

    if (params["onlyname"]) {
        comuni = comuni.map((c) => c.nome);
    }

    return new ApiResponse(200, comuni);
}
function getProvince(params) {
    var output = JSON.parse(fs.readFileSync(`./province.json`, 'utf8'));

    if (params["regione"]) { // Handle regione
        if (!regioni.includes(params["regione"])) {
            return new ApiResponse(400, "Regione inesistente");
        }
        output = output.filter((p) => p.regione == params["regione"]);
    }

    if (params["onlyname"]) {
        output = output.map((p) => p.nome);
    }
    
    return new ApiResponse(200, output);
}
function getRegioni(params) {
    return new ApiResponse(200, regioni);
}

// CONFIGURATION
app.use(cors());
//app.use(enforce.HTTPS({ trustProtoHeader: true }));

// ENDPOINTS 
// Tutti i comuni
app.get(['/api/comuni','/api/comune'], function(req, res) {
    var result = getComuni(req.query);
    res.status(result.status).send(result.data);
});
// Comuni di una regione
app.get('/api/comuni/:regione', function(req, res) {
    req.query["regione"] = req.params["regione"];
    var result = getComuni(req.query);
    res.status(result.status).send(result.data);
});
// Comuni di una provincia
app.get('/api/comuni/provincia/:provincia', function(req, res) {
    req.query["provincia"] = req.params["provincia"];
    var result = getComuni(req.query);
    res.status(result.status).send(result.data);
});

// Tutte le province
app.get('/api/province', function(req, res) {
    var result = getProvince(req.query);
    res.status(result.status).send(result.data);
});
// Province di una regione
app.get('/api/province/:regione', function(req, res) {
    req.query["regione"] = req.params["regione"];
    var result = getProvince(req.query);
    res.status(result.status).send(result.data);
});

// Tutte le regioni
app.get('/api/regioni', function(req, res) {
    var result = getRegioni(req.query);
    res.status(result.status).send(result.data);
});

// DOCUMENTATION
app.use(express.static('docs'));

// STARTER
var listener = app.listen(process.env.PORT || 3000, () => console.log(`API comuni-ita is running on port ${listener.address().port}!`));