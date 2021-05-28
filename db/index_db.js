const express = require('express');
const cors = require('cors');
const enforce = require('express-sslify');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const path = './db/comuni.db'; 
const db = new sqlite3.Database(path, sqlite3.OPEN_READONLY);

// HANDLERS
function getComuni(params, res) {
    // Tutte le keys a lowercase
    Object.keys(params).forEach(key => params[key]=params[key].toLowerCase());

    // Preparo query
    if (params["onlyname"] && !params["provincia"] && !params["regione"]) {
        var query = `SELECT nome from comuni`;
    } else {
        var query = `SELECT comuni.nome as nome, comuni.codice as codice, regioni.nome as regione, province.nome as provincia, codiceCatastale, cap, lat, lng
                    FROM comuni LEFT JOIN province ON province.item=comuni.provincia LEFT JOIN regioni ON regioni.item=province.regione`;
    }

    if (params["provincia"]) { // Handle provincia
        query += ` WHERE province.nome="${params["provincia"]}" `;
    } else if (params["regione"]) { // Handle regione
        query += ` WHERE regioni.nome="${params["regione"]}" `;
    }

    query += ' ORDER BY comuni.nome';

    // Ottengo comuni
    db.all(query, function(err, comuni) {
        if (err) {
            res.status(500).send(err);
        } else {
            if (params["onlyname"]) comuni = comuni.map((c) => c.nome);
            res.status(200).send(comuni);
        }
    });
}
function getProvince(params, res) {
    var query = `SELECT province.nome as nome, codice, sigla, regioni.nome as regione
                FROM province LEFT JOIN regioni ON regioni.item=province.regione`;

    if (params["regione"]) { // Handle regione
        query += ` WHERE regioni.nome="${params["regione"]}" `;
    }

    query += ' ORDER BY province.nome';

    // Ottengo province
    db.all(query, function(err, province) {
        if (err) {
            res.status(500).send(err);
        } else {
            if (params["onlyname"]) province = province.map((c) => c.nome);
            res.status(200).send(province);
        }
    });
}
function getRegioni(params, res) {
    var query = 'SELECT nome from regioni ORDER BY nome';

    // Ottengo province
    db.all(query, function(err, regioni) {
        if (err) {
            res.status(500).send(err);
        } else {
            regioni = regioni.map((c) => c.nome);
            res.status(200).send(regioni);
        }
    });
}

// CONFIGURATION
app.use(cors());
//app.use(enforce.HTTPS({ trustProtoHeader: true }));

// ENDPOINTS 
// Tutti i comuni
app.get(['/api/comuni','/api/comune'], (req, res) => getComuni(req.query, res));
// Comuni di una regione
app.get('/api/comuni/:regione', (req, res) => {
    req.query["regione"] = req.params["regione"];
    getComuni(req.query, res);
});
// Comuni di una provincia
app.get('/api/comuni/provincia/:provincia', (req, res) => {
    req.query["provincia"] = req.params["provincia"];
    getComuni(req.query, res);
});

// Tutte le province
app.get('/api/province', (req, res) => getProvince(req.query, res));
// Province di una regione
app.get('/api/province/:regione', (req, res) => {
    req.query["regione"] = req.params["regione"];
    getProvince(req.query, res);
});

// Tutte le regioni
app.get('/api/regioni', (req, res) => getRegioni(req.query, res));

// DOCUMENTATION
app.use(express.static('docs'));

// DATABASE RELEASE
function exitHandler(options) {
    if (options.cleanup) db.close();
    if (options.exit) process.exit();
}
process.on('exit', exitHandler.bind(null,{cleanup:true}));
process.on('SIGINT', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR1', exitHandler.bind(null, {exit:true}));
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true}));

// STARTER
var listener = app.listen(process.env.PORT || 3000, () => console.log(`API comuni-ita is running on port ${listener.address().port}!`));