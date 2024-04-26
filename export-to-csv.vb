REM  *****  BASIC  *****

Sub ExportToCsv
    document = ThisComponent

    GlobalScope.BasicLibraries.loadLibrary("Tools")
    FileDirectory = Tools.Strings.DirectoryNameoutofPath(document.getURL(), "/")

    Sheets = document.Sheets
    NumSheets = Sheets.Count - 1

    Dim Propval(1) as New com.sun.star.beans.PropertyValue
    Propval(0).Name = "FilterName"
    Propval(0).Value = "Text - txt - csv (StarCalc)"

    For I = 0 to NumSheets
        document.getCurrentController.setActiveSheet(Sheets(I))
        Filename = FileDirectory + "/" + Sheets(I).Name + ".csv"
        FileURL = convertToURL(Filename)
        document.StoreToURL(FileURL, Propval())
    Next I
End Sub