# DMV WSO Records

Parses all [DMV WSO records](https://dmvweightlifting.org/wso-records/) and converts them to the format for [owlcms records management](https://jflamy.github.io/owlcms4/#/2500RecordsManagement).

## Download new records

Remove all existing data and downloads the current spreadsheet:

```bash
node download.js
```

## Generate new CSV files

Use the `export-to-csv.vb` macro to export all sheets as CSVs using LibreOffice.

## Generate new owlcms records file

Generate `owlcms-records.csv`:

```bash
node index.js
```

Open the generated CSV in LibreOffice and save as an `.xlsx` file.
