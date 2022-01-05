const express = require('express');
const cors = require('cors');
const enforce = require('express-sslify');
const app = express();
const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    const db = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USERNAME || 'root',
        password: process.env.MYSQL_PASSWORD || null,
        database: process.env.MYSQL_DATABASE || 'comuni-ita'
    });

    // HELPERS
    class ApiResponse {
        constructor(status, data) {
            this.status = status;
            this.data = data;
        }
    }
    async function getFromDb(query, params, field) {
        const res = (await db.execute(query, params))[0];
        return field ? res.map((item) => field=='nomeStraniero' ? (item[field] || item['nome']) : item[field]) : res;
    }
    const regioni = await getFromDb('SELECT * FROM regioni ORDER BY nome', null, 'nome');

    // HANDLERS
    async function getComuni(params) {
        // Tutte le keys a lowercase
        Object.keys(params).forEach(key => params[key] = params[key].toLowerCase());

        var query = 'SELECT c.* FROM comuni c LEFT JOIN province p ON c.provincia=p.codice INNER JOIN regioni r ON p.regione=r.nome';
        var queryParams = [];

        if (params["provincia"]) { // Handle provincia
            if ((await getFromDb('SELECT nome FROM province WHERE nome=?', [params["provincia"]])).length<1) {
                return new ApiResponse(400, "Provincia inesistente");
            }
            query += ' WHERE p.nome=?';
            queryParams.push(params["provincia"]);
        }
        else if (params["regione"]) { // Handle regione
            if (!regioni.includes(params["regione"])) {
                return new ApiResponse(400, "Regione inesistente");
            }
            query += ' WHERE r.nome=?';
            queryParams.push(params["regione"]);
        }
        query += ' ORDER BY c.nome';

        var field = null;
        if (params["onlyname"]) field = 'nome';
        if (params["onlyforeignname"]) field = 'nomeStraniero';

        var result = await getFromDb(query, queryParams, field);
        for (let i = 0; i < result.length; i++) {
            result[i].coordinate = {
                lat: result[i].lat,
                lng: result[i].lng
            };
            delete result[i].lat;
            delete result[i].lng;
        }

        return new ApiResponse(200, result);
    }
    async function getProvince(params) {
        // Tutte le keys a lowercase
        Object.keys(params).forEach(key => params[key] = params[key].toLowerCase());

        var query = 'SELECT * FROM province';
        var queryParams = [];

        if (params["regione"]) { // Handle regione
            if (!regioni.includes(params["regione"])) {
                return new ApiResponse(400, "Regione inesistente");
            }
            query += ' WHERE regione=?';
            queryParams.push(params["regione"]);
        }
        query += ' ORDER BY nome';

        return new ApiResponse(200, await getFromDb(query, queryParams, params["onlyname"] ? 'nome' : null));
    }
    async function getRegioni(params) {
        return new ApiResponse(200, regioni);
    }

    // CONFIGURATION
    app.use(cors());
    if (process.env.ENABLE_HTTPS)
        app.use(enforce.HTTPS({ trustProtoHeader: true }));

    // ENDPOINTS 
    // Tutti i comuni
    app.get(['/api/comuni', '/api/comune'], async function (req, res) {
        const result = await getComuni(req.query);
        res.status(result.status).send(result.data);
    });
    // Comuni di una regione
    app.get('/api/comuni/:regione', async function (req, res) {
        req.query["regione"] = req.params["regione"];
        const result = await getComuni(req.query);
        res.status(result.status).send(result.data);
    });
    // Comuni di una provincia
    app.get('/api/comuni/provincia/:provincia', async function (req, res) {
        req.query["provincia"] = req.params["provincia"];
        const result = await getComuni(req.query);
        res.status(result.status).send(result.data);
    });

    // Tutte le province
    app.get('/api/province', async function (req, res) {
        const result = await getProvince(req.query);
        res.status(result.status).send(result.data);
    });
    // Province di una regione
    app.get('/api/province/:regione', async function (req, res) {
        req.query["regione"] = req.params["regione"];
        const result = await getProvince(req.query);
        res.status(result.status).send(result.data);
    });

    // Tutte le regioni
    app.get('/api/regioni', async function (req, res) {
        const result = await getRegioni(req.query);
        res.status(result.status).send(result.data);
    });

    // DOCUMENTATION
    app.use(express.static('docs'));

    // STARTER
    var listener = app.listen(process.env.PORT || 3000, () => console.log(`API comuni-ita is running on port ${listener.address().port}!`));
})();