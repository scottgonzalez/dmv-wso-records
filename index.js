import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import {
    readdirSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import {
    join,
} from 'path';

const RECORD_TYPES = new Set([
    'Snatch',
    'Clean & Jerk',
    'Total',
]);

const ageGroupMap = new Map([
    ['13U', 'U13'],
    ['14-15', 'U15'],
    ['16-17', 'U17'],
]);

const youthAges = new Map([
    ['U13', [0, 13]],
    ['U15', [14, 15]],
    ['U17', [16, 17]],
])

const bwMap = {
    'U13': {
        F: new Map([
            ['30', 0],
            ['33', 30],
            ['36', 33],
            ['40', 36],
            ['45', 40],
            ['49', 45],
            ['55', 49],
            ['59', 55],
            ['64', 59],
        ]),
        M: new Map([
            ['32', 0],
            ['36', 32],
            ['39', 36],
            ['44', 39],
            ['49', 44],
            ['55', 49],
            ['61', 55],
            ['67', 61],
            ['73', 67],
        ]),
    },
    'U15': {
        F: new Map([
            ['36', 0],
            ['40', 36],
            ['45', 40],
            ['49', 45],
            ['55', 49],
            ['59', 55],
            ['64', 59],
            ['71', 64],
            ['76', 71],
        ]),
        M: new Map([
            ['39', 0],
            ['44', 39],
            ['49', 44],
            ['55', 49],
            ['61', 55],
            ['67', 61],
            ['73', 67],
            ['81', 73],
            ['89', 81],
        ]),
    },
    'U17': {
        F: new Map([
            ['40', 36],
            ['45', 40],
            ['49', 45],
            ['55', 49],
            ['59', 55],
            ['64', 59],
            ['71', 64],
            ['76', 71],
            ['81', 76],
        ]),
        M: new Map([
            ['49', 44],
            ['55', 49],
            ['61', 55],
            ['67', 61],
            ['73', 67],
            ['81', 73],
            ['89', 81],
            ['96', 89],
            ['102', 96],
        ]),
    },
    F: new Map([
        ['45', 0],
        ['49', 45],
        ['55', 49],
        ['59', 55],
        ['64', 59],
        ['71', 64],
        ['76', 71],
        ['81', 76],
        ['87', 81],
    ]),
    M: new Map([
        ['55', 0],
        ['61', 55],
        ['67', 61],
        ['73', 67],
        ['81', 73],
        ['89', 81],
        ['96', 89],
        ['102', 96],
        ['109', 102],
    ]),
};

const owlcmsRecords = [];

readdirSync('data').forEach((path) => {
    if (!path.endsWith('.csv')) {
        return;
    }

    const recordsCsv = readFileSync(join('data', path), {
        encoding: 'utf-8',
    });

    const gender = path.includes('Women') ? 'F' : 'M';

    let ageGroup;
    let ageLow;
    let ageCat = 999;
    let bwLow;
    let bwCat;
    let isYouth = false;

    if (path.includes('Masters')) {
        ageGroup = /\d+\+?/.exec(path)[0];
        ageLow = parseInt(ageGroup);
        ageCat = ageGroup.endsWith('+') ? 999 : ageLow + 4;
        ageGroup = gender + ageGroup;
    } else if (path.includes('Senior')) {
        ageGroup = 'SR';
        ageLow = 15;
    } else if (path.includes('Junior')) {
        ageGroup = 'JR';
        ageLow = 15;
        ageCat = 20;
    } else {
        isYouth = true;
    }

    parse(recordsCsv, {
        trim: true,
    }).forEach((record, index) => {
        if (index === 0) {
            return;
        }

        if (!RECORD_TYPES.has(record[0])) {
            if (isYouth) {
                [ageGroup, bwCat] = record[0].split(' ');
                ageGroup = ageGroupMap.get(ageGroup);
                [ageLow, ageCat] = youthAges.get(ageGroup);
            } else {
                [bwCat] = record[0].split(' ');
            }

            if (bwCat.endsWith('+')) {
                bwLow = bwCat.substring(0, bwCat.length - 1);
                bwCat = 999;
            } else {
                if (isYouth) {
                    bwLow = bwMap[ageGroup][gender].get(bwCat);
                } else {
                    bwLow = bwMap[gender].get(bwCat);
                }
            }

            return;
        }

        if (record[1] === 'None Established') {
            return;
        }

        owlcmsRecords.push({
            Federation: 'DMV',
            RecordName: 'DMV',
            AgeGroup: ageGroup,
            Gender: gender,
            ageLow,
            ageUpper: ageCat,
            bwLow,
            bwUpper: bwCat,
            Lift: record[0],
            Record: record[3],
            Name: record[1],
            Born: '',
            Nation: '',
            Date: new Date(record[4]).toISOString().substring(0, 10),
            Place: record[6],
        });
    });
});

writeFileSync('owlcms-records.csv', stringify(owlcmsRecords, {
    header: true,
}));
