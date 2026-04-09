document.addEventListener('DOMContentLoaded', () => {
    // Caricamento del file XML (assicurati che il nome corrisponda a quello sul server)
    fetch('edizione.xml')
        .then(res => {
            if (!res.ok) throw new Error("File XML non trovato.");
            return res.text();
        })
        .then(data => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(data, "text/xml");
            renderEdition(xml);
            renderWitnessMenu(xml);
        })
        .catch(err => console.error("Errore nel caricamento XML:", err));
});

/**
 * Funzione principale per il rendering dell'edizione
 */
function renderEdition(xml) {
    const textTarget = document.getElementById('tei-body');
    const varTarget = document.getElementById('variants-content');
    const noteTarget = document.getElementById('notes-content');
    const allNotes = Array.from(xml.getElementsByTagName('note'));
    let noteCounter = 1;

    /**
     * Elabora ricorsivamente i nodi XML per costruire il testo.
     * Gestisce la visibilità dei tag di marcatura e il posizionamento delle note.
     */
    const processNode = (node, lineNum) => {
        if (node.nodeType === 3) { // Nodo di testo semplice
            return node.textContent;
        }

        let nodeHTML = "";

        // CASO 1: Apparato Critico (<app>)
        if (node.nodeName === 'app') {
            const appId = node.getAttribute('xml:id');
            const lemNode = node.getElementsByTagName('lem')[0];
            const rdgNode = node.getElementsByTagName('rdg')[0];
            
            // Crea il contenitore per il Lemma nel testo
            nodeHTML += `<span class="lem-variant" data-ref="${appId}">`;
            nodeHTML += processNode(lemNode, lineNum); // Processa il contenuto del lemma
            nodeHTML += `</span>`;

            // Crea la voce per l'Apparato delle Varianti (Lachmanniano) nella sidebar
            const vEntry = document.createElement('div');
            vEntry.className = 'variant-entry';
            vEntry.id = `v-${appId}`;
            vEntry.innerHTML = `<b>${lineNum}</b> ${lemNode.textContent} ] ${rdgNode.textContent} <i>${rdgNode.getAttribute('wit') ? rdgNode.getAttribute('wit').replace('#','') : ''}</i>`;
            varTarget.appendChild(vEntry);
            
        } 
        // CASO 2: Tag di marcatura testo (lem, seg, hi, emph, ecc.)
        // Questi tag devono restituire il loro contenuto testuale affinché sia visibile nel browser
        else if (['lem', 'seg', 'hi', 'emph'].includes(node.nodeName)) {
            Array.from(node.childNodes).forEach(child => {
                nodeHTML += processNode(child, lineNum);
            });
        }
        // CASO 3: Altri contenitori (lg, div, ecc.)
        else {
            Array.from(node.childNodes).forEach(child => {
                nodeHTML += processNode(child, lineNum);
            });
        }

        // LOGICA DI COLLEGAMENTO NOTA:
        // Se il nodo ha un xml:id, verifica se esiste una nota (<note>) che lo punta come target
        const nodeId = node.getAttribute ? node.getAttribute('xml:id') : null;
        if (nodeId) {
            const linkedNote = allNotes.find(n => n.getAttribute('target') === `#${nodeId}`);
            if (linkedNote) {
                const cNum = noteCounter++;
                const noteUniqueId = `n-${nodeId}`; // ID univoco per il riferimento in sidebar
                
                // Inserisce l'esponente numerico cliccabile subito dopo la parola marcata
                nodeHTML += `<a class="note-link" data-ref="${noteUniqueId}"><span class="note-ref">${cNum}</span></a>`;
                
                // Crea la voce nella sezione "Note Critiche" della sidebar
                const nEntry = document.createElement('div');
                nEntry.className = 'note-entry';
                nEntry.id = noteUniqueId;
                nEntry.innerHTML = `<span class="note-num">${cNum}.</span> ${linkedNote.textContent}`;
                noteTarget.appendChild(nEntry);
            }
        }

        return nodeHTML;
    };

    // Ciclo principale di scansione dei versi (<l>)
    const lines = xml.getElementsByTagName('l');
    Array.from(lines).forEach(line => {
        const n = line.getAttribute('n');
        const verseDiv = document.createElement('div');
        verseDiv.className = 'verse';
        
        let verseContent = `<span class="line-num">${n}</span>`;
        
        // Elabora il contenuto del verso nodo per nodo
        line.childNodes.forEach(child => {
            verseContent += processNode(child, n);
        });

        verseDiv.innerHTML = verseContent;
        textTarget.appendChild(verseDiv);
    });

    setupInteractivity();
    renderFrontMenu(xml);
}

/**
 * Gestisce l'interazione: scorrimento ed evidenziazione sincronizzata
 */
function setupInteractivity() {
    const highlightAndScroll = (id, prefix) => {
        const targetEl = document.getElementById(prefix + id);
        if (targetEl) {
            targetEl.classList.add('highlight-active');
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    // Click sui numeri di nota: porta alla nota e la evidenzia
    document.querySelectorAll('.note-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const refId = link.getAttribute('data-ref');
            document.querySelectorAll('.note-entry').forEach(el => el.classList.remove('highlight-active'));
            highlightAndScroll(refId, ""); 
        });
    });

    // Hover sui lemmi: evidenzia contemporaneamente variante e nota (se collegate allo stesso ID)
    document.querySelectorAll('.lem-variant').forEach(lem => {
        lem.addEventListener('mouseenter', () => {
            const id = lem.getAttribute('data-ref');
            highlightAndScroll(id, "v-");
            highlightAndScroll(id, "n-"); 
        });

        lem.addEventListener('mouseleave', () => {
            document.querySelectorAll('.variant-entry, .note-entry').forEach(e => e.classList.remove('highlight-active'));
        });
    });
}

/**
 * Popola il menu a tendina dei Testimoni (Siglario)
 */
function renderWitnessMenu(xml) {
    const witTarget = document.getElementById('nav-witnesses');
    if (!witTarget) return;
    const witnesses = xml.getElementsByTagName('witness');
    Array.from(witnesses).forEach(wit => {
        const item = document.createElement('div');
        item.className = 'wit-item';
        item.innerHTML = `<b>${wit.getAttribute('xml:id')}</b> <span>${wit.textContent}</span>`;
        witTarget.appendChild(item);
    });
}

/**
 * Popola i menu per Introduzione, Prefazione e Note Editoriali
 */
function renderFrontMenu(xml) {
    const introMenu = document.getElementById('nav-intro');
    const apparatusMenu = document.getElementById('nav-apparatus');

    xml.querySelectorAll('front div').forEach(div => {
        const type = div.getAttribute('type');
        const headNode = div.querySelector('head');
        const pNode = div.querySelector('p');
        
        if (headNode && pNode) {
            const head = headNode.textContent;
            const p = pNode.textContent;
            
            const a = document.createElement('a');
            a.textContent = head;
            a.onclick = () => {
                document.getElementById('modal-body').innerHTML = `<h2>${head}</h2><p>${p}</p>`;
                document.getElementById('modal').style.display = 'block';
            };

            if (type === 'introduction' || type === 'preface') {
                introMenu.appendChild(a);
            } else {
                apparatusMenu.appendChild(a);
            }
        }
    });
}

// Chiusura della finestra modale
const modal = document.getElementById('modal');
const closeModal = document.querySelector('.close-modal');

if (closeModal) {
    closeModal.onclick = () => modal.style.display = 'none';
}

window.onclick = (event) => {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
};