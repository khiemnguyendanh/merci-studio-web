const fs = require('fs');
let content = fs.readFileSync('app/[[...slug]]/page.tsx', 'utf8');

if (!content.includes("import Script from 'next/script';")) {
    content = content.replace("import React, { useState, useEffect, useCallback } from 'react';", "import React, { useState, useEffect, useCallback } from 'react';\nimport Script from 'next/script';");
}

content = content.replace(/if \(!document\.getElementById\('jszip-script'\)\) \{[\s\S]*?document\.head\.appendChild\(script\);\n\s*\}/, '');

if (!content.includes('<Script strategy=\"lazyOnload\"')) {
    content = content.replace('<div lang=\"vi\" className=\"min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 transition-opacity duration-500 vi-safe-font\">', '<div lang=\"vi\" className=\"min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 transition-opacity duration-500 vi-safe-font\">\n            <Script strategy=\"lazyOnload\" src=\"https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js\" />');
}

content = content.replace(/<img(?!.*loading=["']lazy["'])([^>]*)>/g, '<img loading="lazy" decoding="async"$1>');
content = content.replace(/<img(.*?)loading=["']lazy["'](?!.*decoding=["']async["'])([^>]*)>/g, '<img$1loading="lazy" decoding="async"$2>');

fs.writeFileSync('app/[[...slug]]/page.tsx', content);
