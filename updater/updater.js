const fetch = require('node-fetch');
const xlsx = require('xlsx');
const telegram = require('./telegram_bot');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname + '\\..\\environment.env') });

//#region Utils
String.prototype.capitalize = function () {
    return this.split(' ').map((chunk) => { return chunk.substring(0, 1).toUpperCase() + chunk.substring(1).toLowerCase() }).join(' ');
};
function getCoords(point) {
    const match = /Point\((.+) (.+)\)/gm.exec(point);
    return match ? {
        lng: match[1],
        lat: match[2],
    } : {};
}
function sanitizeProvincia(name) {
    const match = /(.+)\/.+/.exec(name);
    return (match ? match[1] : name)?.trim().toLowerCase();
}
function sanitizeRegione(name) {
    return sanitizeProvincia(name)?.replaceAll('-', ' ');
}
function sanitizeCap(cap) {
    const match = /^"?(?<cap>\d+)/.exec(cap);
    return match ? match[1] : cap;
}
function sanitizeForTelegram(text) {
    const escapes = ['!', '-', '.'];
    for (let i = 0; i < escapes.length; i++) {
        text = text.replaceAll(escapes[i], `\\${escapes[i]}`);
    }
    return text;
}
//#endregion

(async () => {
    const startDate = new Date();
    //#region Setup
    const db = await mysql.createConnection({
        host: process.env.MYSQL_HOST || 'localhost',
        user: process.env.MYSQL_USERNAME || 'root',
        password: process.env.MYSQL_PASSWORD || null,
        database: process.env.MYSQL_DATABASE || 'comuni-ita'
    });
    const bot = new telegram.TelegramBot(async (ctx) => {
        if (new Date(ctx.update.message.date * 1000) >= startDate) {
            await bot.sendText(`‼ *Aggiornamento annullato*`);
            console.log('[Updater] Update canceled');
            process.exit();
        }
    });
    process.on('uncaughtException', async (err) => {
        console.error(err);
        await bot.sendText(
            `‼ *Errore*\n` +
            `Aggiornamento terminato con un errore:\n` +
            '```\n' +
            JSON.stringify(err) +
            '```'
        );
        process.exit();
    });
    //#endregion

    if (bot.user) {
        await bot.sendText('🔄 *Aggiornamento database iniziato*');

        //#region 1. Fetching file
        console.log('[Updater] Fetching file');
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0
        const buffer = await fetch("https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xls").then(res => res.buffer());
        const workbook = xlsx.read(buffer);
        const csv = xlsx.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]]).split('\n');
        //#endregion

        //#region Reading file and mapping
        console.log('[Updater] Reading file and mapping');
        const comuni = [];
        const regioni = [];
        const province = new Map();
        const codiciIstat = [];
        for (let i = 3; i < csv.length; i++) {
            const comune = csv[i].split(',');
            if (comune[5]) {
                codiciIstat.push(comune[3]);
                const nome = comune[5]?.trim();
                comuni.push({
                    "nome": nome.indexOf('/')>=0 ? nome.substring(0, nome.indexOf('/')) : nome,
                    "nomeStraniero": nome.indexOf('/')>=0 ? nome.substring(nome.indexOf('/')+1) : null,
                    "codice": comune[4]?.trim(),
                    "codiceCatastale": comune[19]?.trim(),
                    "regione": sanitizeRegione(comune[10]),
                    "provincia": sanitizeProvincia(comune[11]),
                });
            }
            // Province
            if (comune[2] && !province.has(comune[2]?.trim())) {
                province.set(comune[2]?.trim(), {
                    "nome": sanitizeProvincia(comune[11]),
                    "codice": comune[2]?.trim(),
                    "sigla": comune[14]?.trim().toLowerCase(),
                    "regione": sanitizeRegione(comune[10]),
                });
            }
            // Regioni
            if (comune[10] && !regioni.includes(sanitizeRegione(comune[10]))) {
                regioni.push(sanitizeRegione(comune[10]));
            }
        }
        //#endregion

        //#region Fetching extra data
        // https://query.wikidata.org/#SELECT%20%3Fistat%20%3Fcap%20%3Fcoordinate%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP31%20wd%3AQ747074.%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP635%20%3Fistat.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP281%20%3Fcap.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP625%20%3Fcoordinate.%20%7D%0A%20%20%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20%0A%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20"it".%20%0A%20%20%20%20%23%20%3Fitem%20rdfs%3Alabel%20%3FitemLabel.%0A%20%20%7D%0A%7D
        console.log('[Updater] Fetching extra data');
        const url = 'https://query.wikidata.org/sparql?query=SELECT%20%3Fistat%20%3Fcap%20%3Fcoordinate%0AWHERE%20%7B%0A%20%20%3Fitem%20p%3AP31%2Fps%3AP31%2Fwdt%3AP279*%20wd%3AQ747074.%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP635%20%3Fistat.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP281%20%3Fcap.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP625%20%3Fcoordinate.%20%7D%0A%20%20%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20%0A%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20%22it%22.%20%0A%20%20%20%20%23%20%3Fitem%20rdfs%3Alabel%20%3FitemLabel.%0A%20%20%7D%0A%7D';
        const responseBuffer = await fetch(url, { headers: { 'Accept': 'text/csv' } }).then(res => res.buffer());
        const comuniWithProblems = new Map();
        try {
            // Create binding map
            const map = new Map();
            const wikiLines = responseBuffer.toString().split('\r\n');
            for (let i = 1; i < wikiLines.length; i++) {
                const wikiLine = wikiLines[i].split(',');
                if (!map.has(wikiLine[0]))
                    map.set(wikiLine[0], wikiLine);
            }

            // Binding data
            for (let i = 0; i < comuni.length; i++) {
                const comune = map.get(comuni[i].codice);
                if (comune) {
                    comuni[i].cap = sanitizeCap(comune.slice(1, comune.length-1).join(','));
                    comuni[i].coordinate = getCoords(comune[comune.length-1]);
                } else {
                    comuniWithProblems.set(i, comuni[i]);
                }
            }
        } catch (err) {
            console.error('Error');
            console.error(err);
        }
        //#endregion

        //#region Solving conflicts
        console.log('[Updater] Solving conflicts');
        // Dump errors
        if (comuniWithProblems.size > 0) {
            const comuniWithProblemsKeys = Array.from(comuniWithProblems.keys());
            for (let i = 0; i < comuniWithProblemsKeys.length; i++) {
                const comune = comuniWithProblems.get(comuniWithProblemsKeys[i]);
                const reply = await bot.waitForReply(sanitizeForTelegram(
                    `❗ *Conflitto!*\n\n` +
                    `Comune: _${comune.nome}_\n` +
                    `Regione: _${comune.regione}_\n` +
                    `Provincia: _${comune.provincia}_\n` +
                    `Codice ISTAT: _${comune.codice}_\n` +
                    `Codice catasto: _${comune.codiceCatastale}_\n\n` +
                    `Rispondi a questo messaggio inviando *CAP* e *coordinate* in questo modo:\n` +
                    '`cap, Point(lat lon)`'
                ), async (rep) => {
                    const success = /(\d+), ?(.+)/gm.exec(rep.update.message.text.trim());
                    if (!success) await bot.sendText(`Dato non valido`);
                    return success;
                });

                if (reply) {
                    const match = /(\d+), ?(.+)/gm.exec(reply.update.message.text.trim());
                    if (match) {
                        comuni[comuniWithProblemsKeys[i]].cap = sanitizeCap(match[1]);
                        comuni[comuniWithProblemsKeys[i]].coordinate = getCoords(match[2]);
                        success = true;
                    }
                }
            }
        } else {
            console.log('[Updater] No conflicts found');
        }
        //#endregion

        //#region Sorting
        const comuniSorted = comuni.sort((a, b) => a.nome.localeCompare(b.nome));
        const provinceSorted = Array.from(province.values()).sort((a, b) => Number.parseInt(a.codice) - Number.parseInt(b.codice));
        const regioniSorted = regioni.sort((a, b) => a.localeCompare(b));
        //#endregion

        //#region Update repos
        console.log('[Updater] Backuping repo');
        const backup = {
            comuni: (await db.execute('SELECT * FROM comuni'))[0],
            province: (await db.execute('SELECT * FROM province'))[0],
            regioni: (await db.execute('SELECT * FROM regioni'))[0],
        };

        console.log('[Updater] Updating repo');
        await bot.sendText('⚙ *Sto scrivendo i dati nel database*');
        await db.execute('DELETE FROM regioni');
        await db.execute('DELETE FROM province');
        await db.execute('DELETE FROM comuni');

        for (let i = 0; i < regioniSorted.length; i++) {
            const regione = regioniSorted[i];
            await db.execute('INSERT INTO regioni VALUES (?)', [regione]);
        }

        const provinceMap = new Map();
        for (let i = 0; i < provinceSorted.length; i++) {
            const provincia = provinceSorted[i];
            provinceMap.set(provincia.nome, provincia.codice);
            await db.execute('INSERT INTO province VALUES (?,?,?,?)', [provincia.codice, provincia.nome, provincia.sigla, provincia.regione]);
        }

        for (let i = 0; i < comuniSorted.length; i++) {
            const comune = comuniSorted[i];
            await db.execute('INSERT INTO comuni VALUES (?,?,?,?,?,?,?,?)', [comune.codice || null, comune.nome || null, comune.nomeStraniero || null, comune.codiceCatastale || null, comune.cap || null, comune.coordinate?.lat || null, comune.coordinate?.lng || null, provinceMap.get(comune.provincia) || null]);
        }

        await bot.sendBytes(
            Buffer.from(JSON.stringify(backup), 'utf8'),
            'backup.json',
            `✔ *Aggiornamento database completato con successo*\n` +
            `Trovati ${comuni.length} comuni`
        );
        console.log(`[Updater] Update complete, found ${comuni.length} comuni`);
        //#endregion

        process.exit();
    }
})();