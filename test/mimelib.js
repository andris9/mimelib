var testCase = require('nodeunit').testCase,
    mimelib = require("../index");

exports["Quoted printable"] = {
    "Encode short string": function(test){
        test.equal("Tere =D5=C4=D6=DC!", mimelib.encodeQuotedPrintable("Tere ÕÄÖÜ!", null, "Latin_1"));
        test.equal("Tere =C3=95=C3=84=C3=96=C3=9C=C5=A0=C5=BD!", mimelib.encodeQuotedPrintable("Tere ÕÄÖÜŠŽ!", null, "UTF-8"));
        test.equal("Tere =D0=DE!", mimelib.encodeQuotedPrintable("Tere ŠŽ!", null, "Win-1257"));
        test.done();
    },

    "Encode long string": function(test){
        var longLine = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"+
                       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"+
                       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"+
                       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
            longLineEncoded = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLM=\r\n"+
                              "NOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ=\r\n"+
                              "abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklm=\r\n"+
                              "nopqrstuvwxyz0123456789";

        test.equal(longLineEncoded, mimelib.encodeQuotedPrintable(longLine));
        test.done();
    },

    "Wordwrap long string with UTF-8 sequence on edge": function(test){
        var longLine = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"+
                       "ABCDEFGHIÄÄÄPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"+
                       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"+
                       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
            longLineEncoded = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI=\r\n"+
                              "=C3=84=C3=84=C3=84PQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ=\r\n"+
                              "KLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVW=\r\n"+
                              "XYZabcdefghijklmnopqrstuvwxyz0123456789";
        test.equal(longLineEncoded, mimelib.encodeQuotedPrintable(longLine));
        test.done();
    },

    "Decode string": function(test){
        var longLine = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"+
                       "ABCDEFGHIÄÄÄPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"+
                       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"+
                       "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
            longLineEncoded = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHI=\r\n"+
                              "=C3=84=C3=84=C3=84PQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJ=\r\n"+
                              "KLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVW=\r\n"+
                              "XYZabcdefghijklmnopqrstuvwxyz0123456789";

        test.equal(longLine, mimelib.decodeQuotedPrintable(longLineEncoded));
        test.done();
    }
}

exports["Base64"] = {
    "Convert string": function(test){
        test.equal("VGVyZSDVxNbcIQ==", mimelib.encodeBase64("Tere ÕÄÖÜ!", "Latin_1"));
        test.done();
    },

    "Decode string": function(test){
        test.equal("Tere ÕÄÖÜ!", mimelib.decodeBase64("VGVyZSDVxNbcIQ==", "Latin_1"));
        test.done();
    }
}

exports["Mime Words"] = {
    "Encode Mime Word QP": function(test){
        test.equal("=?ISO-8859-13?Q?J=F5ge-va=DE?=", mimelib.encodeMimeWord("Jõge-vaŽ", "Q", "iso-8859-13"));
        test.done();
    },

    "Decode Mime Word QP": function(test){
        test.equal("Jõge-vaŽ", mimelib.decodeMimeWord("=?ISO-8859-13?Q?J=F5ge-va=DE?="));
        test.done();
    },

    "Parse Mime Words": function(test){
        test.equal("Jõge-vaŽ zz Jõge-vaŽJõge-vaŽJõge-vaŽ", mimelib.parseMimeWords("=?ISO-8859-13?Q?J=F5ge-va=DE?= zz =?ISO-8859-13?Q?J=F5ge-va=DE?= =?ISO-8859-13?Q?J=F5ge-va=DE?= =?ISO-8859-13?Q?J=F5ge-va=DE?="))
        test.done();
    }
}

