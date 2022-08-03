const fetch = require('node-fetch');
const xlsx = require('xlsx');
const telegram = require('./telegram_bot');
const mysql = require('mysql2/promise');
const path = require('path');
const htmlParser = require('node-html-parser');
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
    return (match ? match[1] : name)?.trim();
}
function sanitizeRegione(name) {
    return sanitizeProvincia(name)?.replaceAll('-', ' ');
}
function sanitizeCap(cap) {
    const match = /^"?(?<cap>\d+)/.exec(cap);
    return match ? match[1] : cap;
}
function sanitizePrefisso(prefisso) {
    const match = /^\d+/.exec(prefisso?.trim());
    return match ? match[0] : prefisso?.trim();
}
function sanitizeForTelegram(text) {
    const escapes = ['!', '-', '.'];
    for (let i = 0; i < escapes.length; i++) {
        text = text.replaceAll(escapes[i], `\\${escapes[i]}`);
    }
    return text;
}
function sanitizeEmail(email) {
    if (!email) return null;
    return email?.trim().replaceAll('/', '');
}
function sanitizeTelefono(numero) {
    if (!numero) return null;
    return numero.trim();
}
function sanitizeName(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll('-', '').replaceAll(' ', '').replaceAll("'", '');
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

        //#region 2. Reading file and mapping
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
                    "sigla": comune[14]?.trim().toUpperCase(),
                    "regione": sanitizeRegione(comune[10]),
                });
            }
            // Regioni
            if (comune[10] && !regioni.includes(sanitizeRegione(comune[10]))) {
                regioni.push(sanitizeRegione(comune[10]));
            }
        }
        //#endregion

        //#region 3. Fetching extra data
        // https://query.wikidata.org/#SELECT%20%3Fistat%20%3Fcap%20%3Fprefisso%20%3Fcoordinate%0AWHERE%20%7B%0A%20%20%3Fitem%20p%3AP31%2Fps%3AP31%2Fwdt%3AP279%2a%20wd%3AQ747074.%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP635%20%3Fistat.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP281%20%3Fcap.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP473%20%3Fprefisso.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP625%20%3Fcoordinate.%20%7D%0A%20%20%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20%0A%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20"it".%20%0A%20%20%20%20%23%20%3Fitem%20rdfs%3Alabel%20%3FitemLabel.%0A%20%20%7D%0A%7D
        console.log('[Updater] Fetching extra data');
        var url = 'https://query.wikidata.org/sparql?query=SELECT%20%3Fistat%20%3Fcap%20%3Fprefisso%20%3Fcoordinate%0AWHERE%20%7B%0A%20%20%3Fitem%20p%3AP31%2Fps%3AP31%2Fwdt%3AP279%2a%20wd%3AQ747074.%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP635%20%3Fistat.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP281%20%3Fcap.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP473%20%3Fprefisso.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP625%20%3Fcoordinate.%20%7D%0A%20%20%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20%0A%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20"it".%20%0A%20%20%20%20%23%20%3Fitem%20rdfs%3Alabel%20%3FitemLabel.%0A%20%20%7D%0A%7D';
        var responseBuffer = await fetch(url, { headers: { 'Accept': 'text/csv' } }).then(res => res.buffer());
        const comuniWithProblems = new Map();
        try {
            // Create binding map
            const map = new Map();
            const wikiLines = responseBuffer.toString().split('\r\n');
            for (let i = 1; i < wikiLines.length; i++) {
                const wikiLine = wikiLines[i].split(',');
                if (!map.has(wikiLine[0])) {
                    map.set(wikiLine[0], wikiLine);
                } else {
                    // Integrate the information
                    var currentData = map.get(wikiLine[0]);
                    for (let j = 1; j < currentData.length; j++) {
                        if (currentData[j]=='' && wikiLine[j]) {
                            currentData[j] = wikiLine[j];
                            map.set(currentData[0], currentData);
                        }
                    }
                }
            }

            // Binding data
            for (let i = 0; i < comuni.length; i++) {
                const comune = map.get(comuni[i].codice);
                if (comune) {
                    comuni[i].cap = sanitizeCap(comune.slice(1, comune.length-2).join(','));
                    comuni[i].prefisso = sanitizePrefisso(comune[comune.length-2]);
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

        //#region 4. Fetching contacts
        console.log('[Updater] Fetching contacts');
        url = 'https://dait.interno.gov.it/territorio-e-autonomie-locali/sut/elenco_contatti_comuni_italiani.php';
        responseBuffer = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.114 Safari/537.36 OPR/89.0.4447.48'
            }
        }).then(res => res.buffer());
        console.log('[Updater] Downloaded contacts');
        const comuniNotFound = [];
        try {
            const html = htmlParser.parse(responseBuffer.toString());
            const rows = html.querySelectorAll('table tbody tr');
            // Binding data
            const provinceValues = Array.from(province.values());
            const comuniSanitized = comuni.map(function(c) {
                return {
                    nome: sanitizeName(c.nome.trim().toLowerCase()),
                    provincia: provinceValues.find(p => p.nome==c.provincia)?.sigla.toLowerCase()
                };
            });
            for (let i = 0; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td');
                const provincia = cells[2].textContent.trim().toLowerCase();
                var nome = cells[1].textContent.trim().toLowerCase();
                if (nome.includes('/')) nome = nome.split('/')[0];
                nome = sanitizeName(nome);
                var indexOfComune = comuniSanitized.findIndex(c => c.nome==nome && c.provincia==provincia);
                if (indexOfComune<0) {
                    indexOfComune = comuniSanitized.findIndex(c => new RegExp(`^${nome}`).exec(c.nome) && c.provincia==provincia);
                }

                if (indexOfComune>=0) {
                    const comune = comuni[indexOfComune];
                    comune.email = sanitizeEmail(cells[3].textContent?.trim().split(' ')[0]); 
                    comune.pec = sanitizeEmail(cells[4].textContent?.trim()); 
                    comune.telefono = sanitizeTelefono(cells[5].textContent);
                    comune.fax = sanitizeTelefono(cells[6].textContent);

                    if ((comune.email && !comune.email.includes('@')) || (comune.pec && !comune.pec.includes('@'))) {
                        comuniNotFound.push({
                            nome: cells[1].textContent.trim(), 
                            provincia: cells[2].textContent.trim(),
                            rawEmail: cells[3].textContent?.trim(),
                            rawPec: cells[4].textContent?.trim(),
                            onlyEmails: true,
                        });
                    }
                } else {
                    comuniNotFound.push({
                        nome: cells[1].textContent.trim(), 
                        provincia: cells[2].textContent.trim(),
                        onlyEmails: false,
                    });
                }
            }
        } catch (err) {
            console.error('Error');
            console.error(err);
        }
        //#endregion

        //#region 5. Solving conflicts
        console.log('[Updater] Solving conflicts');
        // Dump errors
        if (comuniWithProblems.size > 0 || comuniNotFound.length > 0) {
            // comuniWithProblems
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
                    '`cap, prefisso, Point(lng lat)`'
                ), async (rep) => {
                    const success = /(\d+), ?(\d+), ?(.+)/gm.exec(rep.update.message.text.trim());
                    if (!success) await bot.sendText(`Dato non valido`);
                    return success;
                });

                if (reply) {
                    const match = /(\d+), ?(\d+), ?(.+)/gm.exec(reply.update.message.text.trim());
                    if (match) {
                        comuni[comuniWithProblemsKeys[i]].cap = match[1]=='null' ? null : sanitizeCap(match[1]);
                        comuni[comuniWithProblemsKeys[i]].prefisso = match[2]=='null' ? null : sanitizePrefisso(match[2]);
                        comuni[comuniWithProblemsKeys[i]].coordinate = match[3]=='null' ? null : getCoords(match[3]);
                    }
                }
            }

            // comuniNotFound
            for (let i = 0; i < comuniNotFound.length; i++) {
                if (comuniNotFound[i].onlyEmails) {
                    const reply = await bot.waitForReply(sanitizeForTelegram(
                        `❗ *Email del comune errate!*\n\n` +
                        `Comune: _${comuniNotFound[i].nome}_\n` +
                        `Provincia: _${comuniNotFound[i].provincia}_\n` +
                        `Email trovata: \`${comuniNotFound[i].rawEmail}\`\n` +
                        `Pec trovata: \`${comuniNotFound[i].rawPec}\`\n` +
                        `Rispondi a questo messaggio inviando *email* e *pec* in questo modo:\n` +
                        '`email, pec`'
                    ), async (rep) => {
                        const success = rep.update.message.text.split(',');
                        if (success.length<2) await bot.sendText(`Dato non valido`);
                        return success;
                    });
    
                    if (reply) {
                        const match = reply.update.message.text.split(',').map(c => c.trim().toLowerCase());
                        if (match) {
                            const indexComune = comuni.indexOf(c => c.codice.trim().toLowerCase() == match[0]);
                            if (indexComune>=0) {
                                comuni[indexComune].email = match[1]=='null' ? null : sanitizeEmail(match[1]);
                                comuni[indexComune].pec = match[2]=='null' ? null : sanitizeEmail(match[2]);
                            }
                        }
                    }
                } else {
                    const reply = await bot.waitForReply(sanitizeForTelegram(
                        `❗ *Contatti del comune non trovati!*\n\n` +
                        `Comune: _${comuniNotFound[i].nome}_\n` +
                        `Provincia: _${comuniNotFound[i].provincia}_\n` +
                        `Rispondi a questo messaggio inviando *codice ISTAT*, *email*, *pec*, *telefono* e *fax* in questo modo:\n` +
                        '`codice ISTAT, email, pec, telefono, fax`'
                    ), async (rep) => {
                        const success = rep.update.message.text.split(',');
                        if (success.length<5) await bot.sendText(`Dato non valido`);
                        return success;
                    });
    
                    if (reply) {
                        const match = reply.update.message.text.split(',').map(c => c.trim().toLowerCase());
                        if (match) {
                            const indexComune = comuni.indexOf(c => c.codice.trim().toLowerCase() == match[0]);
                            if (indexComune>=0) {
                                comuni[indexComune].email = match[1]=='null' ? null : sanitizeEmail(match[1]);
                                comuni[indexComune].pec = match[2]=='null' ? null : sanitizeEmail(match[2]);
                                comuni[indexComune].telefono = match[3]=='null' ? null : sanitizeTelefono(match[3]);
                                comuni[indexComune].fax = match[4]=='null' ? null : sanitizeTelefono(match[4]);
                            }
                        }
                    }
                }
            }
        } else {
            console.log('[Updater] No conflicts found');
        }
        //#endregion

        //#region 6. Sorting
        const comuniSorted = comuni.sort((a, b) => a.nome.localeCompare(b.nome));
        const provinceSorted = Array.from(province.values()).sort((a, b) => Number.parseInt(a.codice) - Number.parseInt(b.codice));
        const regioniSorted = regioni.sort((a, b) => a.localeCompare(b));
        //#endregion

        //#region 7. Update repos
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
            const dati = [
                comune.codice || null, 
                comune.nome || null, 
                comune.nomeStraniero || null, 
                comune.codiceCatastale || null, 
                comune.cap || null, 
                comune.prefisso || null, 
                comune.coordinate?.lat || null, 
                comune.coordinate?.lng || null, 
                provinceMap.get(comune.provincia) || null,
                comune.email,
                comune.pec,
                comune.telefono,
                comune.fax
            ];
            await db.execute(`INSERT INTO comuni VALUES (${new Array(dati.length).fill('?').join(',')})`, dati);
        }

        const endDate = new Date();
        const elapsedTime = (endDate-startDate)/1000;
        await bot.sendBytes(
            Buffer.from(JSON.stringify(backup), 'utf8'),
            'backup.json',
            `✔ *Aggiornamento database completato con successo*\n` +
            `Trovati ${comuni.length} comuni in ${elapsedTime.toFixed()} secondi`
        );
        console.log(`[Updater] Update complete, found ${comuni.length} comuni in ${elapsedTime.toFixed()} seconds`);
        //#endregion

        process.exit();
    }
})();