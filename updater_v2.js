const fetch = require('node-fetch');
const xlsx = require('xlsx');
const fs = require('fs');
String.prototype.capitalize = function() {
    return this.split(' ').map((chunk) => {return chunk.substring(0,1).toUpperCase() + chunk.substring(1).toLowerCase() }).join(' ');
};

(async () => {
    console.log('1. Fetch file');
    // https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xls
    //const buffer2 = await fetch("https://www.istat.it/storage/codici-unita-amministrative/Elenco-comuni-italiani.xls").then(res => res.buffer());
    const buffer2 = fs.readFileSync('Elenco-comuni-italiani.xls');
    const workbook = xlsx.read(buffer2);
    var sheet_name_list = workbook.SheetNames;
    var xlData = xlsx.utils.sheet_to_csv(workbook.Sheets[sheet_name_list[0]]);
    console.log(xlData); return;

    // const buffer = await fetch("https://www.anpr.interno.it/wp-content/uploads/ANPR_archivio_comuni.csv").then(res => res.buffer());
    // if (buffer.length<=0) {
    //     console.error('Error while fetching');
    //     return;
    // }
    const buffer = fs.readFileSync('ANPR_archivio_comuni.csv');

    // 2. Read file and filtering
    console.log('2. Read file and filtering');
    const lines = buffer.toString().split('\n');
    const comuni = [];
    const codiciIstat = [];
    for (let i = 1; i < lines.length; i++) {
        const comune = lines[i].split(',');
        if (comune[13] == '"A"') {
            codiciIstat.push(comune[3]);
            comuni.push({
                "nome": comune[5]?.replaceAll('"', '').capitalize(),
                "codice": comune[3]?.replaceAll('"', ''),
                "codiceCatastale": comune[4]?.replaceAll('"', ''),
            });
        }
    }

    // 3. Fetch extra data
    // https://query.wikidata.org/#SELECT%20%3Fcap%20%3Fcoordinate%20%3FcapoluogoLabel%20%3FregioneLabel%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP31%20wd%3AQ747074.%0A%20%20FILTER%28%3Fistat%20IN%20%28"028001"%2C%20"065001"%29%29.%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP635%20%3Fistat.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP131%20%3Fprovincia.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fprovincia%20wdt%3AP131%20%3Fregione.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fprovincia%20wdt%3AP36%20%3Fcapoluogo.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP281%20%3Fcap.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP625%20%3Fcoordinate.%20%7D%0A%20%20%0A%20%20%23%20FILTER%28NOT%20EXISTS%20%7B%20%3Fprovincia%20wdt%3AP31%20wd%3AQ15110.%20%7D%29%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20%0A%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20"it".%20%0A%20%20%20%20%3Fitem%20rdfs%3Alabel%20%3FitemLabel.%0A%20%20%20%20%3Fcapoluogo%20rdfs%3Alabel%20%3FcapoluogoLabel.%20%0A%20%20%20%20%3Fregione%20rdfs%3Alabel%20%3FregioneLabel.%20%0A%20%20%7D%0A%7D
    function getCoords(point) {
        const match = /Point\((.+) (.+)\)/gm.exec(point);
        return match ? {
            lat: match[1],
            lng: match[2],
        } : {};
    }

    const url = 'https://query.wikidata.org/sparql?query=SELECT%20DISTINCT%20%3Fistat%20%3Fcap%20%3Fcoordinate%20%3FcapoluogoLabel%20%3FregioneLabel%0AWHERE%20%7B%0A%20%20%3Fitem%20wdt%3AP31%20wd%3AQ747074.%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP635%20%3Fistat.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP131%20%3Fprovincia.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fprovincia%20wdt%3AP131%20%3Fregione.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fprovincia%20wdt%3AP36%20%3Fcapoluogo.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP281%20%3Fcap.%20%7D%0A%20%20OPTIONAL%20%7B%20%3Fitem%20wdt%3AP625%20%3Fcoordinate.%20%7D%0A%20%20%0A%20%20%23%20FILTER(NOT%20EXISTS%20%7B%20%3Fprovincia%20wdt%3AP31%20wd%3AQ15110.%20%7D)%0A%20%20SERVICE%20wikibase%3Alabel%20%7B%20%0A%20%20%20%20bd%3AserviceParam%20wikibase%3Alanguage%20"it".%20%0A%20%20%20%20%3Fitem%20rdfs%3Alabel%20%3FitemLabel.%0A%20%20%20%20%3Fcapoluogo%20rdfs%3Alabel%20%3FcapoluogoLabel.%20%0A%20%20%20%20%3Fregione%20rdfs%3Alabel%20%3FregioneLabel.%20%0A%20%20%7D%0A%7D';
    const responseBuffer = await fetch(url, {headers:{'Accept':'text/csv'}}).then(res => res.buffer());
    try {
        // Create binding map
        const map = new Map();
        const wikiLines = responseBuffer.toString().split('\r\n');
        for (let i = 1; i < wikiLines.length; i++) {
            const wikiLine = wikiLines[i].split(',');
            map.set(wikiLine[0], wikiLine);
        }
        fs.writeFileSync('wikidata.csv', responseBuffer.toString());

        // Binding data
        const province = [];
        for (let i = 0; i < comuni.length; i++) {
            const comune = map.get(comuni[i].codice);
            if (comune) {
                comuni[i].regione = comune[4].toLowerCase().replaceAll('-', ' ');
                comuni[i].provincia = comune[3].toLowerCase();
                comuni[i].cap = comune[1];
                comuni[i].coordinate = getCoords(comune[2]);
                if (!province.includes(comune[3].toLowerCase()))
                    province.push(comune[3].toLowerCase());
            }
        }
        fs.writeFileSync('province.json', JSON.stringify(province));
    } catch (err) {
        console.error('Error');
    }

    // 4. Update repos
    fs.writeFileSync('comuni_updated.json', JSON.stringify(comuni));
    console.log(comuni);

    // 5. Update settings
})();