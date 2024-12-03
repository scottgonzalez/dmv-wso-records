import readExcelFile, {
    readSheetNames,
} from 'read-excel-file/node';
import writeExcelFile from 'write-excel-file/node';
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

const wso = 'ohio';
const wsos = {
    dmv: {
        official: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTEQRRHeyO5Hs3ygRlo8M8dsN1p1YG_ZJjdTxktnB_sn6ppI4_mzWf1NgUzA7IUggenGD7AGvZ-n-zf/pub?output=xlsx',
    },
    ohio: {
        official: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSpK9vU5Rr60wxr9r85KYW1VmHqB564zXmod_crL73LqYCatLmGOo7cdOsWvu319HspCxnB3WmXa2tw/pub?output=xlsx'
    }
}

const googlePath = wsos[wso].official;
const wsoExcelPath = `${wso}-wso-records.xlsx`;
const owlcmsPath = `${wso}-owlcms-records.xlsx`;

async function downloadRecords() {
    const response = await fetch(googlePath);
    const content = await response.arrayBuffer();

    writeFileSync(wsoExcelPath, Buffer.from(content));
}

async function processRecords() {
    const owlcmsRecords = [];

    const sheetNames = await readSheetNames(wsoExcelPath);
    await Promise.all(sheetNames.map(async (sheetName) => {
        const gender = sheetName.includes('Women') ? 'F' : 'M';

        let ageGroup;
        let ageMin;
        let ageMax = 999;
        let bodyWeightMin;
        let bodyWeightMax;
        let isYouth = false;

        if (sheetName.includes('Masters')) {
            ageGroup = /\d+\+?/.exec(sheetName)[0];
            ageMin = parseInt(ageGroup);
            ageMax = ageGroup.endsWith('+') ? 999 : ageMin + 4;
            ageGroup = gender + ageGroup;
        } else if (sheetName.includes('Senior')) {
            ageGroup = 'SR';
            ageMin = 15;
        } else if (sheetName.includes('Junior')) {
            ageGroup = 'JR';
            ageMin = 15;
            ageMax = 20;
        } else {
            isYouth = true;
        }

        const records = await readExcelFile(wsoExcelPath, {
            sheet: sheetName
        });
        records.forEach((record, index) => {
            if (index === 0) {
                return;
            }

            if (!RECORD_TYPES.has(record[0])) {
                if (isYouth) {
                    [ageGroup, bodyWeightMax] = record[0].split(' ');
                    ageGroup = AGE_GROUP_MAP.get(ageGroup);
                    [ageMin, ageMax] = YOUTH_AGES.get(ageGroup);
                } else {
                    [bodyWeightMax] = record[0].split(' ');
                }

                if (bodyWeightMax.endsWith('+')) {
                    bodyWeightMin = parseInt(bodyWeightMax.substring(0, bodyWeightMax.length - 1));
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

            function addRecord({
                date,
                lift,
                name,
                place,
                record,
            }) {
                owlcmsRecords.push({
                    federation: 'DMV',
                    recordName: 'DMV',
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

            if (record[1] === 'None Established') {
                addRecord({
                    date: '2015-01-01',
                    lift: record[0],
                    name: 'STANDARD',
                    place: '',
                    record: 1,
                });

                return;
            }

            addRecord({
                date: new Date(record[4]).toISOString().substring(0, 10),
                lift: record[0],
                name: record[1],
                place: record[6],
                record: record[3],
            });
        });
    }));

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
            filePath: owlcmsPath,
        },
    );
}

await downloadRecords();
const records = await processRecords();
await writeRecords(records);
