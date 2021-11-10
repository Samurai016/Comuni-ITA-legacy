const express = require('express');
const fs = require('fs');
const cors = require('cors');
const enforce = require('express-sslify');
const app = express();
const path = require('path');
require('dotenv').config({path: path.resolve(__dirname+'\\..\\environment.env')});

// HELPERS
const provinceJson = JSON.parse(fs.readFileSync(`./province.json`, 'utf8'));
const province = {};
provinceJson.forEach(provincia => {
    province[provincia.nome] = provincia.regione;
});
const regioni = JSON.parse(fs.readFileSync(`./regioni.json`, 'utf8'));
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
if (process.env.ENABLE_HTTPS)
    app.use(enforce.HTTPS({ trustProtoHeader: true }));

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