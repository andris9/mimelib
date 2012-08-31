var convert = require("encoding").convert,
    addressparser = require("addressparser");

this.foldLine = function(str, maxLength, foldAnywhere, afterSpace){
    if(foldAnywhere){
        return addBase64SoftLinebreaks(str, maxLength || 76);
    }
    return module.exports.mimeFunctions.foldLine(str, maxLength, !!afterSpace);
};

module.exports.encodeMimeWord = function(str, encoding, charset){
    return module.exports.mimeFunctions.encodeMimeWord(str, encoding, charset);
};

module.exports.decodeMimeWord = function(str){
    return module.exports.mimeFunctions.decodeMimeWord(str).toString("utf-8");
};

module.exports.parseMimeWords = function(str){
    return module.exports.mimeFunctions.decodeMimeWords(str).toString("utf-8");
};

module.exports.encodeQuotedPrintable = function(str, mimeWord, charset){
    return module.exports.mimeFunctions.encodeQuotedPrintable(str, charset);
};

module.exports.decodeQuotedPrintable = function(str, mimeWord, charset){
    charset = (charset || "").toString().toUpperCase().trim();
    var decodedString = module.exports.mimeFunctions.decodeQuotedPrintable(str, "utf-8", charset);
    return charset == "BINARY" ? decodedString : decodedString.toString("utf-8");
};

module.exports.encodeBase64 = function(str, charset){
    return module.exports.mimeFunctions.encodeBase64(str, charset);
};

module.exports.decodeBase64 = function(str, charset){
    return module.exports.mimeFunctions.decodeBase64(str, "utf-8", charset).toString("utf-8");
};

module.exports.parseAddresses = function(addresses){
    return [].concat.apply([], [].concat(addresses).map(addressparser));
};

module.exports.parseHeaders = function(headers){
    return module.exports.mimeFunctions.parseHeaders(headers);
};

module.exports.parseHeaderLine = function(line){
    if(!line)
        return {};
    var result = {}, parts = line.split(";"), pos;
    for(var i=0, len = parts.length; i<len; i++){
        pos = parts[i].indexOf("=");
        if(pos<0){
            result[!i?"defaultValue":"i-"+i] = parts[i].trim();
        }else{
            result[parts[i].substr(0,pos).trim().toLowerCase()] = parts[i].substr(pos+1).trim();
        }
    }
    return result;
};

module.exports.mimeFunctions = {

    mimeEncode: function(str, toCharset, fromCharset){
        toCharset = toCharset || "UTF-8";
        fromCharset = fromCharset || "UTF-8";

        var buffer = convert(str || "", toCharset, fromCharset),
            ranges = [[0x09],
                      [0x0A],
                      [0x0D],
                      [0x20],
                      [0x21],
                      [0x23, 0x3C],
                      [0x3E],
                      [0x40, 0x5E],
                      [0x60, 0x7E]],
            result = "";
        
        for(var i=0, len = buffer.length; i<len; i++){
            if(checkRanges(buffer[i], ranges)){
                result += String.fromCharCode(buffer[i]);
                continue;
            }
            result += "="+(buffer[i]<0x10?"0":"")+buffer[i].toString(16).toUpperCase();
        }

        return result;
    },

    mimeDecode: function(str, toCharset, fromCharset){
        str = (str || "").toString();
        toCharset = toCharset || "UTF-8";
        fromCharset = fromCharset || "UTF-8";

        var encodedBytesCount = (str.match(/\=[\da-fA-F]{2}/g) || []).length,
            bufferLength = str.length - encodedBytesCount * 2,
            chr, hex,
            buffer = new Buffer(bufferLength),
            bufferPos = 0;

        for(var i=0, len = str.length; i<len; i++){
            chr = str.charAt(i);
            if(chr == "=" && (hex = str.substr(i+1, 2).match(/[\da-fA-F]{2}/))){
                buffer[bufferPos++] = parseInt(hex, 16);
                i+=2;
                continue;
            }
            buffer[bufferPos++] = chr.charCodeAt(0);
        }

        if(fromCharset.toUpperCase().trim() == "BINARY"){
            return buffer;
        }
        return convert(buffer, toCharset, fromCharset);
    },

    encodeBase64: function(str, toCharset, fromCharset){
        var buffer = convert(str || "", toCharset, fromCharset);
        return addSoftLinebreaks(buffer.toString("base64"), "base64");
    },

    decodeBase64: function(str, toCharset, fromCharset){
        var buffer = new Buffer((str || "").toString(), "base64");
        return convert(buffer, toCharset, fromCharset);
    },

    decodeQuotedPrintable: function(str, toCharset, fromCharset){
        str = (str || "").toString();
        str = str.replace(/\=\r?\n/g, "");
        return this.mimeDecode(str, toCharset, fromCharset);
    },

    encodeQuotedPrintable: function(str, toCharset, fromCharset){
        var mimeEncodedStr = this.mimeEncode(str, toCharset, fromCharset);

        // fix line breaks
        mimeEncodedStr = mimeEncodedStr.replace(/\r?\n|\r/g, function(lineBreak, spaces){
            return "\r\n";
        }).replace(/[\t ]+$/gm, function(spaces){
            return spaces.replace(/ /g, "=20").replace(/\t/g, "=09");
        });

        return addSoftLinebreaks(mimeEncodedStr, "qp");
    },

    encodeMimeWord: function(str, encoding, toCharset, fromCharset){
        toCharset = (toCharset || "utf-8").toString().toUpperCase().trim();
        encoding = (encoding || "Q").toString().toUpperCase().trim().charAt(0);
        var encodedStr;

        if(encoding == "Q"){
            encodedStr = this.mimeEncode(str, toCharset, fromCharset);
            encodedStr = encodedStr.replace(/[\r\n\t_]/g, function(chr){
                var code = chr.charCodeAt(0);
                return "=" + (code<0x10?"0":"") + code.toString(16).toUpperCase();
            }).replace(/\s/g, "_");
        }else if(encoding == "B"){
            encodedStr = convert(str || "", toCharset, fromCharset).toString("base64").trim();
        }

        return "=?"+toCharset+"?"+encoding+"?"+encodedStr+"?=";
    },

    decodeMimeWord: function(str, toCharset){
        str = (str || "").toString().trim();

        var fromCharset, encoding, match;

        match = str.match(/^\=\?([\w_\-]+)\?([QB])\?([^\?]+)\?\=$/i);
        if(!match){
            return convert(str, toCharset);
        }

        fromCharset = match[1];
        encoding = (match[2] || "Q").toString().toUpperCase();
        str = (match[3] || "").replace(/_/g, " ");

        if(encoding == "B"){
            return this.decodeBase64(str, toCharset, fromCharset);
        }else if(encoding == "Q"){
            return this.mimeDecode(str, toCharset, fromCharset);    
        }else{
            return str;
        }

        
    },

    decodeMimeWords: function(str, toCharset){
        str = (str || "").toString();

        str = str.replace(/(\=\?[\w_\-]+\?[QB]\?[^\?]+\?\=)\s+(?=\=\?[\w_\-]+\?[QB]\?[^\?]+\?\=)/g,"$1").
                  replace(/\=\?[\w_\-]+\?[QB]\?[^\?]+\?\=/g, (function(mimeWord){
                      return this.decodeMimeWord(mimeWord);
                  }).bind(this));

        return convert(str, toCharset);
    },

    foldLine: function(str, lineLengthMax, afterSpace){
        lineLengthMax = lineLengthMax || 76;
        str = (str || "").toString().trim();

        var pos = 0, len = str.length, result = "", line, match, lineMargin = Math.floor(lineLengthMax/5);

        while(pos < len){
            line = str.substr(pos, lineLengthMax);
            if(line.length < lineLengthMax){
                result += line;
                break;
            }
            if((match = line.match(/^[^\n\r]*(\r?\n|\r)/))){
                line = match[0];
                result += line;
                pos += line.length;
                continue;
            }else if((match = line.substr(-lineMargin).match(/(\s+)[^\s]*$/))){
                line = line.substr(0, line.length - (match[0].length - (!!afterSpace ? (match[1] || "").length : 0)));
            }else if((match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/))){
                line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || "").length : 0));
            }
            result += line;
            pos += line.length;
            if(pos < len){
                result += "\r\n";
            }
        }

        return result;
    },

    encodeHeaderLine: function(key, value, toCharset, fromCharset){
        var decodedValue = convert((value || ""), "utf-8", fromCharset).toString("utf-8"),
            encodedValue;

        encodedValue = decodedValue.replace(/\w*[\u0080-\uFFFF]+\w*(?:\s+\w*[\u0080-\uFFFF]+\w*)?/g, (function(str){
            return this.encodeMimeWord(str, "Q", toCharset);
        }).bind(this));

        return this.foldLine(key+": "+encodedValue, 76);
    },

    parseHeaderLines: function(headers, toCharset){
        var lines = headers.split(/\r?\n|\r/),
            headersObj = {},
            key, value,
            header,
            i, len;

        for(i=lines.length-1; i>=0; i--){
            if(i && lines[i].match(/^\s/)){
                lines[i-1] += "\r\n" + lines[i];
                lines.splice(i, 1);
            }
        }

        for(i=0, len = lines.length; i<len; i++){
            header = this.decodeHeaderLine(lines[i]);
            key = (header[0] || "").toString().toLowerCase().trim();
            value = header[1] || "";
            if(!toCharset || (toCharset || "").toString().trim().match(/^utf[\-_]?8$/i)){
                value = value.toString("utf-8");
            }
            if(!headersObj[key]){
                headersObj[key] = [value];
            }else{
                headersObj[key].push(value);
            }
        }

        return headersObj;
    },

    decodeHeaderLine: function(header, toCharset){
        var line = (header || "").toString().replace(/(?:\r?\n|\r)[ \t]*/g, " ").trim(),
            match = line.match(/^\s*([^:]+):(.*)$/),
            key = (match && match[1] || "").trim(),
            value = (match && match[2] || "").trim();

        value = this.decodeMimeWords(value, toCharset);
        return [key, value];
    },

    parseAddresses: addressparser

};

// Lines can't be longer that 76 + <CR><LF> = 78 bytes
// http://tools.ietf.org/html/rfc2045#section-6.7
function addSoftLinebreaks(str, encoding){
    var lineLengthMax = 76;

    encoding = (encoding || "base64").toString().toLowerCase().trim();
    
    if(encoding == "qp"){
        return addQPSoftLinebreaks(str, lineLengthMax);
    }else{
        return addBase64SoftLinebreaks(str, lineLengthMax);
    }
}

function addBase64SoftLinebreaks(base64EncodedStr, lineLengthMax){
    base64EncodedStr = (base64EncodedStr || "").toString().trim();
    return base64EncodedStr.replace(new RegExp(".{" +lineLengthMax+ "}", "g"),"$&\r\n").trim();
}

function addQPSoftLinebreaks(mimeEncodedStr, lineLengthMax){
    var pos = 0, len = mimeEncodedStr.length, 
        match, code, line, 
        lineMargin = Math.floor(lineLengthMax/3), 
        result = "";

    // insert soft linebreaks where needed
    while(pos < len){
        line = mimeEncodedStr.substr(pos, lineLengthMax);
        if((match = line.match(/\r\n/))){
            line = line.substr(0, match.index + match[0].length);
            result += line;
            pos += line.length;
            continue;
        }

        if(line.substr(-1)=="\n"){
            // nothing to change here
            result += line;
            pos += line.length;
            continue;
        }else if((match = line.substr(-lineMargin).match(/\n.*?$/))){
            // truncate to nearest line break
            line = line.substr(0, line.length - (match[0].length - 1));
            result += line;
            pos += line.length;
            continue;
        }else if(line.length > lineLengthMax - lineMargin && (match = line.substr(-lineMargin).match(/[ \t\.,!\?][^ \t\.,!\?]*$/))){
            // truncate to nearest space
            line = line.substr(0, line.length - (match[0].length - 1));
        }else if(line.substr(-1)=="\r"){
            line = line.substr(0, line.length-1);
        }else{
            if(line.match(/\=[\da-f]{0,2}$/i)){

                // push incomplete encoding sequences to the next line
                if((match = line.match(/\=[\da-f]{0,1}$/i))){
                    line = line.substr(0, line.length - match[0].length);
                }

                // ensure that utf-8 sequences are not split
                while(line.length>3 && line.length < len - pos && !line.match(/^(?:=[\da-f]{2}){1,4}$/i) && (match = line.match(/\=[\da-f]{2}$/ig))){
                    code = parseInt(match[0].substr(1,2), 16);
                    if(code<128){
                        break;
                    }

                    line = line.substr(0, line.length-3);

                    if(code >=0xC0){
                        break;
                    }
                }
                
            }
        }
        
        if(pos + line.length < len && line.substr(-1)!="\n"){
            if(line.length==76){
                line = line.substr(0, line.length-1);
            }
            pos += line.length;
            line += "=\r\n";
        }else{
            pos += line.length;
        }
        
        result += line;
    }

    return result;
}

function checkRanges(nr, ranges){
    for(var i = ranges.length - 1; i >= 0; i--){
        if(!ranges[i].length){
            continue;
        }
        if(ranges[i].length == 1 && nr == ranges[i][0]){
            return true;
        }
        if(ranges[i].length == 2 && nr >= ranges[i][0] && nr <= ranges[i][1]){
            return true;
        }
    }
    return false;
}