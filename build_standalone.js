const fs = require('fs');
const path = require('path');

const designDir = path.join(process.env.HOME, 'Downloads', 'עיצוב מקצועי ומובנה');
const dcPath = path.join(designDir, 'Video Poker App.dc.html');
const supportPath = path.join(designDir, 'support.js');
const outputPath = path.join(designDir, 'Video Poker App - Standalone.html');

const dcContent = fs.readFileSync(dcPath, 'utf8');
const supportContent = fs.readFileSync(supportPath, 'utf8');

// Parse the .dc.html into parts
// The template is everything between <x-dc> and </x-dc>, minus the <x-import> wrapper
// We need to extract:
// 1. The <helmet> content for <head> inclusion
// 2. The template content for the body
// 3. The script content

// Extract helmet content
const helmetMatch = dcContent.match(/<helmet[^>]*>([\s\S]*?)<\/helmet>/);
const helmetHTML = helmetMatch ? helmetMatch[1] : '';

// Extract the body content (everything between <x-import>...</x-import>)
const importMatch = dcContent.match(/<x-import[^>]*>([\s\S]*?)<\/x-import>/);
const bodyHTML = importMatch ? `<div class="${importMatch[1].match(/class="([^"]*)"/)?.[1] || 'app'}">${
  importMatch[1].replace(/class="([^"]*)"/, '').replace(/^[^>]*>\n?/, '')}` : dcContent;

// Extract script
const scriptMatch = dcContent.match(/<script[^>]*data-dc-script[^>]*>([\s\S]*?)<\/script>/);
const scriptContent = scriptMatch ? scriptMatch[1] : '';
const scriptAttrs = scriptMatch ? scriptMatch[0].match(/<script([^>]*)data-dc-script/)?.[1] : '';

// Build the standalone
const standalone = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
<title>Video Poker App</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;display:flex;justify-content:center;min-height:100dvh;overflow:hidden}
</style>
${helmetHTML}
</head>
<body>
<div class="app">
${bodyHTML
  // Remove the wrapping </x-import> end tag
  .replace(/<\/x-import>$/, '')}
</div>
<script>
${supportContent}
</script>
<script type="text/x-dc" data-dc-script${scriptAttrs || ''}>
${scriptContent}
</script>
</body>
</html>`;

fs.writeFileSync(outputPath, standalone, 'utf8');
console.log(`Standalone written to ${outputPath} (${(standalone.length / 1024).toFixed(0)} KB)`);
