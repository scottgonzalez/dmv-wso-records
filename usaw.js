import writeExcelFile from 'write-excel-file/node';
import { parse } from 'csv-parse/sync';
import {
    readdirSync,
    readFileSync,
    writeFileSync,
} from 'fs';
import {
    join,
} from 'path';
import {
    AGE_GROUP_MAP,
    BODY_WEIGHT_MAP,
    RECORD_TYPES,
    YOUTH_AGES,
} from './constants.js';

async function processRecords() {
    const owlcmsRecords = [];

    let ageGroup;
    let ageMin;
    let ageMax = 999;
    let bodyWeightMin;
    let bodyWeightMax;
    let gender;
    let isYouth = false;

    const records = parse(readFileSync('american-records.csv', {
        encoding: 'utf-8',
    }));
    records.forEach((record) => {
        // Start of new age group
        const recordMatches = /(\w+) (Women|Men) American Records/.exec(record[0]);
        if (recordMatches) {
            isYouth = false;
            switch (recordMatches[1]) {
                case 'Collegiate':
                    // TODO: See additional comment in `addRecord()`
                    ageGroup = 'C';
                    break;
                case 'Junior':
                    ageGroup = 'JR';
                    ageMin = 15;
                    ageMax = 20;
                    break;
                case 'Open':
                    ageGroup = 'Open';
                    ageMin = 0;
                    ageMax = 999;
                    break;
                case 'Youth':
                    isYouth = true;
                    const ageMatches = /(\d+)/.exec(record[0]);
                    switch (ageMatches[1]) {
                        case '13':
                            ageGroup = 'U13';
                            break;
                        case '14':
                            ageGroup = 'U15';
                            break;
                        case '16':
                            ageGroup = 'U17';
                            break;
                        default:
                            throw new Error(`Unrecognized youth age group: ${ageMatches[1]}`)
                    }

                    [ageMin, ageMax] = YOUTH_AGES.get(ageGroup);
                    break;
                default:
                    throw new Error(`Unrecognized age group: ${recordMatches[1]}`);
            }

            gender = recordMatches[2] === 'Men' ? 'M' : 'F';
            return;
        }

        // Start of new weight class
        const weightMatches = /(\+?\d+)kg(\+?)/.exec(record[0]);
        if (weightMatches) {
            bodyWeightMax = weightMatches[1];
            if (weightMatches[2]) {
                bodyWeightMax = `+${bodyWeightMax}`;
            }

            if (bodyWeightMax.startsWith('+')) {
                bodyWeightMin = parseInt(bodyWeightMax.substring(1));
                bodyWeightMax = `>${bodyWeightMin}`;
            } else {
                if (isYouth) {
                    bodyWeightMin = BODY_WEIGHT_MAP[ageGroup][gender].get(bodyWeightMax);
                } else {
                    bodyWeightMin = BODY_WEIGHT_MAP[gender].get(bodyWeightMax);
                }
            }
            return;
        }

        // Misc. line
        if (!RECORD_TYPES.has(record[0])) {
            return;
        }

        function addRecord({
            date,
            lift,
            name,
            place,
            record,
        }) {
            // TODO: Collegiate records must be stored under a new federation
            // since the age groups will overlap
            if (ageGroup === 'C') {
                return;
            }

            owlcmsRecords.push({
                federation: 'USA',
                recordName: 'USA',
                ageGroup,
                gender,
                ageMin,
                ageMax,
                bodyWeightMin,
                bodyWeightMax,
                lift,
                record,
                name,
                date,
                place,
            });
        }

        if (record[1] === 'Standard') {
            addRecord({
                // Date of IWF announcement for new weight classes
                date: '2018-07-05',
                lift: record[0],
                name: 'Standard',
                place: '',
                // Meeting the standard sets the record
                record: parseInt(record[3]) - 1,
            });

            return;
        }

        // console.log(record)
        addRecord({
            date: new Date(record[4]).toISOString().substring(0, 10),
            lift: record[0],
            name: record[1],
            place: record[5],
            record: parseInt(record[3]),
        });
    });

    return owlcmsRecords;
}

async function writeRecords(records) {
    await writeExcelFile(
        [
            Object.keys(records[0]).map((key) => {
                return {
                    value: key,
                };
            }),
            ...records.map((record) => {
                return Object.keys(record).map((key) => {
                    return {
                        value: record[key],
                    };
                });
            }),
        ],
        {
            filePath: 'usaw-owlcms-records.xlsx',
        },
    );
}

const records = await processRecords();
await writeRecords(records);
