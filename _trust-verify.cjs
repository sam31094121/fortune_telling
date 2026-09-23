const fs = require("fs");
const page = fs.readFileSync("C:/Users/DRAGON/Desktop/命理/app/page.tsx","utf8");
const tarot = fs.readFileSync("C:/Users/DRAGON/Desktop/命理/features/tarot/components/TarotEntryCard.tsx","utf8");
const comp = fs.readFileSync("C:/Users/DRAGON/Desktop/命理/components/HomeTrustEvidence.tsx","utf8");
console.log("comp ok", comp.includes("home-trust-evidence"));
console.log("page import", /import HomeTrustEvidence/.test(page));
console.log("page usages", (page.match(/<HomeTrustEvidence/g)||[]).length);
console.log("tarot usages", (tarot.match(/<HomeTrustEvidence/g)||[]).length);
console.log("css", fs.readFileSync("C:/Users/DRAGON/Desktop/命理/app/globals.css","utf8").includes("trust-evidence 2026-09-23"));
// sample snippets
const samples = [...page.matchAll(/<HomeTrustEvidence items=\{(\[[^\]]+\])\} \/>/g)].map(m=>m[1]);
console.log(samples);
