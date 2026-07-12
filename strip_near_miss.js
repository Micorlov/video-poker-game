const fs = require('fs');
let code = fs.readFileSync('video_poker.html', 'utf8');

// 1. Remove CSS
code = code.replace(/\s*\.card\.near-miss \{[\s\S]*?\}\s*@keyframes near-pulse \{[\s\S]*?\}\s*\.result\.near \{[^\}]+\}\s*/g, '\n');

// 2. Remove translation blocks
code = code.replace(/\s*nearMiss: \{[\s\S]*?\},/g, '');

// 3. Remove function
code = code.replace(/\s*\/\/ Detect "one card away" hands so losses still feel exciting\.[\s\S]*?function detectNearMiss\(hand\) \{[\s\S]*?return null;\s*\}/g, '');

// 4. Clean up draw()
code = code.replace(/\s*let nearMissIndices = \[\];\n/, '\n');

code = code.replace(/            \} else \{\s*const nearMiss = detectNearMiss\(hand\);\s*if \(nearMiss\) \{[\s\S]*?\} else \{\s*resultEl\.className = 'result';\s*resultEl\.innerHTML = `<span style="color:#aaa">\$\{t\.payouts\['Nothing'\]\} - \$\{hand\.map\(c => c\.rank \+ c\.suit\)\.join\(' '\)\}<\/span>`;\s*document\.getElementById\('explanation'\)\.textContent = t\.explanations\[handType\];\s*\}\s*\}/, 
`            } else {
                resultEl.className = 'result';
                resultEl.innerHTML = \`<span style="color:#aaa">\${t.payouts['Nothing']} - \${hand.map(c => c.rank + c.suit).join(' ')}</span>\`;
                document.getElementById('explanation').textContent = t.explanations[handType];
            }`);

code = code.replace(/, nearMissIndices = \[\]/, '');
code = code.replace(/renderHand\(winIndices, thirdMatchIndices, nearMissIndices, secondPairIndices\);/, 'renderHand(winIndices, thirdMatchIndices, secondPairIndices);');

// 5. Clean up renderHand()
code = code.replace(/ \|\| nearMissIndices\.length > 0/, '');
code = code.replace(/\s*if \(nearMissIndices\.includes\(i\)\) \{\s*classes \+= ' near-miss';\s*\}/g, '');

fs.writeFileSync('video_poker.html', code);
