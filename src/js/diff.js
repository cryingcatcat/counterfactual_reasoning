/**
 * Simple word-level diffing utility with continuous highlighting
 */
export function highlightDifferences(text1, text2) {
    if (!text1 || !text2) return { html1: text1, html2: text2 };

    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);

    let html1 = '';
    let html2 = '';

    let i = 0;
    const maxLen = Math.max(words1.length, words2.length);

    while (i < maxLen) {
        if (words1[i] === words2[i]) {
            // Consecutive matching words
            let matching = [];
            while (i < maxLen && words1[i] === words2[i]) {
                matching.push(words1[i]);
                i++;
            }
            const matchStr = matching.join(' ') + ' ';
            html1 += matchStr;
            html2 += matchStr;
        } else {
            // Consecutive differing words
            let diff1 = [];
            let diff2 = [];
            while (i < maxLen && words1[i] !== words2[i]) {
                if (words1[i]) diff1.push(words1[i]);
                if (words2[i]) diff2.push(words2[i]);
                i++;
            }
            
            if (diff1.length > 0) {
                html1 += `<span class="diff-highlight diff-s"><strong>${diff1.join(' ')}</strong></span> `;
            }
            if (diff2.length > 0) {
                html2 += `<span class="diff-highlight diff-s-prime"><strong>${diff2.join(' ')}</strong></span> `;
            }
        }
    }

    return {
        html1: html1.trim(),
        html2: html2.trim()
    };
}
