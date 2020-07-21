"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const iconv = __importStar(require("iconv-lite"));
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
exports.sleep = sleep;
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
exports.escapeHtml = escapeHtml;
function escapeRegExp(str) {
    return str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&');
}
exports.escapeRegExp = escapeRegExp;
/**
 * Remove the comments if any
 */
function stripComments(text, commentSign) {
    const pattern = '([^\\\\]|^)' + commentSign + '.*$';
    const reg = RegExp(pattern, 'gm');
    return text.replace(reg, '$1');
}
exports.stripComments = stripComments;
/**
 * Finding the longest substring containing balanced {...}
 * @param s a string
 */
function getLongestBalancedString(s) {
    let nested = 1;
    let i = 0;
    for (i = 0; i < s.length; i++) {
        switch (s[i]) {
            case '{':
                nested++;
                break;
            case '}':
                nested--;
                break;
            case '\\':
                // skip an escaped character
                i++;
                break;
            default:
        }
        if (nested === 0) {
            break;
        }
    }
    return s.substring(0, i);
}
exports.getLongestBalancedString = getLongestBalancedString;
/**
 * Given an input file determine its full path using the prefixes dirs
 */
function resolveFile(dirs, inputFile, suffix = '.tex') {
    if (inputFile.startsWith('/')) {
        dirs.unshift('');
    }
    for (const d of dirs) {
        let inputFilePath = path.resolve(d, inputFile);
        if (path.extname(inputFilePath) === '') {
            inputFilePath += suffix;
        }
        if (!fs.existsSync(inputFilePath) && fs.existsSync(inputFilePath + suffix)) {
            inputFilePath += suffix;
        }
        if (fs.existsSync(inputFilePath)) {
            return inputFilePath;
        }
    }
    return undefined;
}
exports.resolveFile = resolveFile;
exports.iconvLiteSupportedEncodings = ['utf8', 'utf16le', 'UTF-16BE', 'UTF-16', 'Shift_JIS', 'Windows-31j', 'Windows932', 'EUC-JP', 'GB2312', 'GBK', 'GB18030', 'Windows936', 'EUC-CN', 'KS_C_5601', 'Windows949', 'EUC-KR', 'Big5', 'Big5-HKSCS', 'Windows950', 'ISO-8859-1', 'ISO-8859-1', 'ISO-8859-2', 'ISO-8859-3', 'ISO-8859-4', 'ISO-8859-5', 'ISO-8859-6', 'ISO-8859-7', 'ISO-8859-8', 'ISO-8859-9', 'ISO-8859-10', 'ISO-8859-11', 'ISO-8859-12', 'ISO-8859-13', 'ISO-8859-14', 'ISO-8859-15', 'ISO-8859-16', 'windows-874', 'windows-1250', 'windows-1251', 'windows-1252', 'windows-1253', 'windows-1254', 'windows-1255', 'windows-1256', 'windows-1257', 'windows-1258', 'koi8-r', 'koi8-u', 'koi8-ru', 'koi8-t'];
function convertFilenameEncoding(filePath) {
    for (const enc of exports.iconvLiteSupportedEncodings) {
        try {
            const fpath = iconv.decode(Buffer.from(filePath, 'binary'), enc);
            if (fs.existsSync(fpath)) {
                return fpath;
            }
        }
        catch (e) {
        }
    }
    return undefined;
}
exports.convertFilenameEncoding = convertFilenameEncoding;
/**
 * Prefix that server.ts uses to distiguish requests on pdf files from others.
 * We use '.' because it is not converted by encodeURIComponent and other functions.
 * See https://stackoverflow.com/questions/695438/safe-characters-for-friendly-url
 * See https://tools.ietf.org/html/rfc3986#section-2.3
 */
exports.pdfFilePrefix = 'pdf..';
/**
 * We encode the path with base64url after calling encodeURIComponent.
 * The reason not using base64url directly is that we are not sure that
 * encodeURIComponent, unescape, and btoa trick is valid on node.js.
 * - https://en.wikipedia.org/wiki/Base64#URL_applications
 * - https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/btoa#Unicode_strings
 */
function encodePath(url) {
    const s = encodeURIComponent(url);
    const b64 = Buffer.from(s).toString('base64');
    const b64url = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return b64url;
}
exports.encodePath = encodePath;
function decodePath(b64url) {
    const tmp = b64url + '='.repeat((4 - b64url.length % 4) % 4);
    const b64 = tmp.replace(/-/g, '+').replace(/_/g, '/');
    const s = Buffer.from(b64, 'base64').toString();
    return decodeURIComponent(s);
}
exports.decodePath = decodePath;
function encodePathWithPrefix(pdfFilePath) {
    return exports.pdfFilePrefix + encodePath(pdfFilePath);
}
exports.encodePathWithPrefix = encodePathWithPrefix;
function decodePathWithPrefix(b64urlWithPrefix) {
    const s = b64urlWithPrefix.replace(exports.pdfFilePrefix, '');
    return decodePath(s);
}
exports.decodePathWithPrefix = decodePathWithPrefix;
function svgToDataUrl(xml) {
    const svg64 = Buffer.from(unescape(encodeURIComponent(xml)), 'binary').toString('base64');
    const b64Start = 'data:image/svg+xml;base64,';
    return b64Start + svg64;
}
exports.svgToDataUrl = svgToDataUrl;
function replaceArgumentPlaceholders(rootFile, tmpDir) {
    return (arg) => {
        const configuration = vscode.workspace.getConfiguration('latex-workshop');
        const docker = configuration.get('docker.enabled');
        const rootFileParsed = path.parse(rootFile);
        const docfile = rootFileParsed.name;
        const docfileExt = rootFileParsed.base;
        const dirW32 = path.normalize(rootFileParsed.dir);
        const dir = dirW32.split(path.sep).join('/');
        const docW32 = path.join(dirW32, docfile);
        const doc = docW32.split(path.sep).join('/');
        const docExtW32 = path.join(dirW32, docfileExt);
        const docExt = docExtW32.split(path.sep).join('/');
        const expandPlaceHolders = (a) => {
            return a.replace(/%DOC%/g, docker ? docfile : doc)
                .replace(/%DOC_W32%/g, docker ? docfile : docW32)
                .replace(/%DOC_EXT%/g, docker ? docfileExt : docExt)
                .replace(/%DOC_EXT_W32%/g, docker ? docfileExt : docExtW32)
                .replace(/%DOCFILE_EXT%/g, docfileExt)
                .replace(/%DOCFILE%/g, docfile)
                .replace(/%DIR%/g, docker ? './' : dir)
                .replace(/%DIR_W32%/g, docker ? './' : dirW32)
                .replace(/%TMPDIR%/g, tmpDir);
        };
        const outDirW32 = path.normalize(expandPlaceHolders(configuration.get('latex.outDir')));
        const outDir = outDirW32.split(path.sep).join('/');
        return expandPlaceHolders(arg).replace(/%OUTDIR%/g, outDir).replace(/%OUTDIR_W32%/g, outDirW32);
    };
}
exports.replaceArgumentPlaceholders = replaceArgumentPlaceholders;
//# sourceMappingURL=utils.js.map