import {
    mkdirSync,
    rmSync,
    writeFileSync
} from 'fs';
import {
    join,
} from 'path';

rmSync('data', {
    force: true,
    recursive: true,
});

mkdirSync('data');

fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vTEQRRHeyO5Hs3ygRlo8M8dsN1p1YG_ZJjdTxktnB_sn6ppI4_mzWf1NgUzA7IUggenGD7AGvZ-n-zf/pub?output=xlsx')
    .then((response) => {
        return response.arrayBuffer();
    })
    .then((content) => {
        writeFileSync(join('data', 'dmv-wso-records.xlsx'), Buffer.from(content));
    });