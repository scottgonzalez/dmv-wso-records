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

    const records = parse(readFileSync('american-records-masters.csv', {
        encoding: 'utf-8',
    }));
    records.forEach((record) => {
        // Start of new age group
        const recordMatches = /(.+) (Women|Men).s Masters American Records/.exec(record[0]);
        if (recordMatches) {
            const ageGroupMatches = /^([MW])(\d+)/.exec(recordMatches[1]);
            if (!ageGroupMatches) {
                throw new Error(`Unrecognized age group: ${recordMatches[1]}`);
            }
            ageGroup = ageGroupMatches[0];
            ageMin = parseInt(ageGroupMatches[2]);
            ageMax = ageMin + 4;
            gender = recordMatches[2] === 'Men' ? 'M' : 'F';

            if (
                (gender === 'M' && ageMin === 90)
                || (gender === 'F' && ageMin === 80)
            ) {
                ageMax = 999;
            }

            // console.log({ ageGroup, ageMin, ageMax, gender });
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

        // Some age groups are missing standards. We need to skip over these
        // since without any record or standard listed, any lift would set
        // the record, which would be incorrect.
        if (record[1] === '') {
            console.log('Missing standard for', ageGroup, bodyWeightMax, record[0]);
            return;
        }

        // console.log(record);
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
            filePath: 'usaw-owlcms-masters-records.xlsx',
        },
    );
}

const records = await processRecords();
await writeRecords(records);
