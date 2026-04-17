(() => {
  "use strict";

  let activeWits = new Set(['A', 'B', 'C']);
  let noteCounter = 0;

  document.addEventListener("DOMContentLoaded", () => {

    fetch("edizione.xml")
      .then(response => {
        if (!response.ok) {
          throw new Error("Impossibile caricare edizione.xml");
        }
        return response.text();
      })
      .then(xmlText => {

        const xml = new DOMParser().parseFromString(xmlText, "text/xml");
// === COSTRUISCE IL FILTRO TESTIMONI DAL TEI ===
const cbContainer = document.getElementById('witness-checkboxes');
if (cbContainer) {
  const witnessNodes = xml.getElementsByTagName('witness');
  activeWits = new Set(); // reset e ricostruzione dal TEI

  Array.from(witnessNodes).forEach(w => {
    const id = w.getAttribute('xml:id');
    if (!id) return;

    activeWits.add(id);

    const label = document.createElement('label');
    label.className = 'filter-option';
    label.innerHTML =
      `<input type="checkbox" data-wit-id="${id}" checked> ${id}`;

    cbContainer.appendChild(label);
  });
}

        
        // === POPOLA IL PANNELLO "TESTIMONI" DAI DATI TEI ===
        const witnessesPanel = document.querySelector('#panel-witnesses p');
        if (witnessesPanel) {
        const witnessNodes = xml.getElementsByTagName('witness');
if (witnessNodes.length > 0) {
  const list = document.createElement('ul');
  Array.from(witnessNodes).forEach(w => {
    const li = document.createElement('li');
    const id = w.getAttribute('xml:id');
    li.innerHTML = `<strong>${id}</strong>: ${w.textContent.trim()}`;
    list.appendChild(li);
  });
  witnessesPanel.innerHTML = '';
  witnessesPanel.appendChild(list);
}
        // === POPOLA I PANNELLI PARATESTUALI DAL TEI ===
        const frontDivs = xml.getElementsByTagName('div');
        Array.from(frontDivs).forEach(div => {
        const type = div.getAttribute('type');
        const p = div.querySelector('p');
    if (!p) return;
    let panelId = null;

  if (type === 'introduction') panelId = 'panel-intro';
  else if (type === 'editorialNote') panelId = 'panel-text-note';
  else if (type === 'criteria') panelId = 'panel-view-variants';

  if (panelId) {
    const panel = document.getElementById(panelId);
    if (panel) {
      const content = panel.querySelector('p');
      if (content) {
        content.textContent = p.textContent.trim();
      }
    }
  }
});

  if (witnessNodes.length > 0) {
    const list = document.createElement('ul');

    Array.from(witnessNodes).forEach(w => {
      const li = document.createElement('li');
      const id = w.getAttribute('xml:id');
      const label = w.textContent.trim();
      li.innerHTML = `<strong>${id}</strong>: ${label}`;
      list.appendChild(li);
    });

    witnessesPanel.innerHTML = '';
    witnessesPanel.appendChild(list);
  }
}



        const lines = xml.querySelectorAll('div[type="edition"] l');
        const notes = xml.getElementsByTagName('note');
        // ================= PATCH: PARSING TRADUZIONE =================

// usa getElementsByTagName per essere coerente e namespace-safe
const allLines = xml.getElementsByTagName('l');
const translationMap = {};

Array.from(allLines).forEach(l => {
  let parent = l.parentElement;
  while (parent) {
    if (parent.localName === 'div' &&
        parent.getAttribute('type') === 'translation') {
      const n = l.getAttribute('n');
      if (n) translationMap[n] = l.textContent.trim();
      break;
    }
    parent = parent.parentElement;
  }
});

const translationBox = document.getElementById('translation');

// ================= FINE PATCH: PARSING TRADUZIONE =================
        const noteMap = {};

        Array.from(notes).forEach(n => {
          const target = (n.getAttribute('target') || '').replace('#', '');
          if (target) noteMap[target] = n.textContent;
        });

        const textBox = document.getElementById('text');
        const substApp = document.getElementById('apparatus-substantive');
        const orthoApp = document.getElementById('apparatus-orthographic');
        const notesBox = document.getElementById('notes');

        Array.from(lines).forEach(line => {
          const ln = line.getAttribute('n');
          const div = document.createElement('div');
          div.className = 'line-group';
          div.innerHTML = `<span class="line-num">${ln}</span>`;

          line.childNodes.forEach(node => {
            if (node.nodeType === 3) {
              div.append(node.textContent);
            } else if (node.nodeName === 'app') {

              const id = node.getAttribute('xml:id');
              const lem = node.querySelector('lem');
              const rdgs = node.querySelectorAll('rdg');

              const isOrtho = Array.from(rdgs).some(
                r => r.getAttribute('type') === 'orthographic'
              );
              const isConjecture = lem.getAttribute('type') === 'conjecture';

              const span = document.createElement('span');
              span.className = 'lem' + (isConjecture ? ' conjecture' : '');
              span.dataset.ref = id;
              span.textContent = lem.textContent.trim();
              div.appendChild(span);

              const appEntry = document.createElement('div');
              appEntry.className = 'apparatus-entry';
              appEntry.dataset.ref = id;

              const witsInvolved = [];
              const rdgsHtml = Array.from(rdgs).map(r => {
                const wString = (r.getAttribute('wit') || '').replace(/#/g, '');
                const wList = wString.split(/\s+/).filter(x => x);
                wList.forEach(x => witsInvolved.push(x));
                const readingContent = r.textContent.trim() || 'om.';
                return `<span class="rdg-item" data-wits="${wList.join(',')}">${readingContent} <em> ${wList.map(w => `<span class="wit-siglum" data-wit="${w}">${w}</span>`).join(', ')} </em></span>`;
              }).join('<span class="rdg-sep">; </span>');

            

              
const lemmaDisplay = isConjecture
  ? `&lt;${lem.textContent.trim()}&gt;`
  : lem.textContent.trim();


              appEntry.innerHTML =
                `<span class="app-line-ref">${ln}</span> ` +
                `<span class="app-lemma">${lemmaDisplay}</span>] ${rdgsHtml}`;

              if (isOrtho) orthoApp.appendChild(appEntry);
              else substApp.appendChild(appEntry);

              if (noteMap[id]) {
                noteCounter++;
                const marker = document.createElement('span');
                marker.className = 'note-marker';
                marker.dataset.ref = id;
                marker.textContent = noteCounter;
                span.appendChild(marker);

                const nEntry = document.createElement('div');
                nEntry.className = 'note-entry';
                nEntry.dataset.ref = id;
                nEntry.innerHTML =
                  `<span class="note-num-label">${noteCounter}</span> ` +
                  noteMap[id];
                notesBox.appendChild(nEntry);
              }
            }
          });

          textBox.appendChild(div);


// ================= PATCH: RENDERING TRADUZIONE =================
if (translationMap[ln]) {
  const trDiv = document.createElement('div');
  trDiv.className = 'line-group';
  trDiv.innerHTML =
    `<span class="line-num">${ln}</span>${translationMap[ln]}`;
  translationBox.appendChild(trDiv);
}
// ================= FINE PATCH: RENDERING TRADUZIONE =================

        });

       const updateVisibility = () => {
  document.querySelectorAll('.apparatus-entry').forEach(entry => {

    // 1. Aggiorna la visibilità dei singoli rdg
    entry.querySelectorAll('.rdg-item').forEach(rdg => {
      const rw = rdg.dataset.wits
        .split(',')
        .filter(x => x);

      rdg.style.display =
        rw.some(w => activeWits.has(w)) ? 'inline' : 'none';
    });


entry.querySelectorAll('.wit-siglum').forEach(sig => {
  const w = sig.dataset.wit;
  sig.style.display = activeWits.has(w) ? 'inline' : 'none';
});

entry.querySelectorAll('.wit-siglum').forEach(sig => {
  const comma = sig.nextSibling;
  const next = sig.nextElementSibling;

  if (comma?.nodeType === 3 && next?.classList.contains('wit-siglum')) {
    comma.textContent =
      sig.style.display !== 'none' && next.style.display !== 'none'
        ? ', '
        : '';
  }
});


    // 2. Mostra l’intera voce SOLO se almeno un rdg è visibile
    const hasVisibleRdg = Array.from(
      entry.querySelectorAll('.rdg-item')
    ).some(rdg => rdg.style.display !== 'none');

    entry.style.display = hasVisibleRdg ? 'block' : 'none';

    // 3. Gestione separatori
    entry.querySelectorAll('.rdg-sep').forEach(sep => {
      const prev = sep.previousElementSibling;
      const next = sep.nextElementSibling;

      sep.style.display =
        (prev && prev.style.display !== 'none') &&
        (next && next.style.display !== 'none')
          ? 'inline'
          : 'none';
    });

  });
};
``

        updateVisibility();

        document.querySelectorAll('[data-wit-id]').forEach(i => {
          i.onchange = () => {
            if (i.checked) activeWits.add(i.dataset.witId);
            else activeWits.delete(i.dataset.witId);
            updateVisibility();
          };
        });

        document.querySelectorAll('[data-panel]').forEach(b => {
          b.onclick = () => {
            const id = 'panel-' + b.dataset.panel;
            document.querySelectorAll('.panel').forEach(p => {
              if (p.id !== id) p.classList.add('hidden');
            });
            const target = document.getElementById(id);
            if (target) target.classList.toggle('hidden');
          };
        });

        document.querySelectorAll('.close').forEach(c => {
          c.onclick = () => c.parentElement.classList.add('hidden');
        });

        document.addEventListener('click', e => {
          // ✅ click fuori dagli elementi interattivi → rimuove highlight
const interactive = e.target.closest(
  '.lem, .apparatus-entry, .note-entry, .note-marker'
);
if (!interactive) {
  document.querySelectorAll('.highlight')
    .forEach(el => el.classList.remove('highlight'));
  return;
}
  const t = e.target.closest(
    '.lem, .apparatus-entry, .note-entry, .note-marker'
  );
  if (!t) return;

  const ref = t.dataset.ref;
  if (!ref) return;

  // rimuove sempre ogni highlight precedente
  document.querySelectorAll('.highlight')
    .forEach(el => el.classList.remove('highlight'));

  // ✅ CASO 1: click sul lemma → evidenzia SOLO rdg
  if (t.classList.contains('lem')) {
    document.querySelectorAll(`.apparatus-entry[data-ref="${ref}"]`)
      .forEach(el => el.classList.add('highlight'));

    const a = document.querySelector(
      `.apparatus-entry[data-ref="${ref}"]`
    );
    if (a) a.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // ✅ CASO 2: click sul numero di nota → evidenzia SOLO note
  if (t.classList.contains('note-marker')) {
    document.querySelectorAll(`.note-entry[data-ref="${ref}"]`)
      .forEach(el => el.classList.add('highlight'));

    const n = document.querySelector(
      `.note-entry[data-ref="${ref}"]`
    );
    if (n) n.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // ✅ CASO 3: click su rdg → evidenzia anche il lemma
if (t.classList.contains('apparatus-entry')) {
  document.querySelectorAll(`.lem[data-ref="${ref}"]`)
    .forEach(el => el.classList.add('highlight'));

  const l = document.querySelector(`.lem[data-ref="${ref}"]`);
  if (l) l.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return;
}

// ✅ CASO 4: click su nota → evidenzia anche il marker della nota
if (t.classList.contains('note-entry')) {
  document.querySelectorAll(`.note-marker[data-ref="${ref}"]`)
    .forEach(el => el.classList.add('highlight'));

  const m = document.querySelector(`.note-marker[data-ref="${ref}"]`);
  if (m) m.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return;
}



});

      })
      .catch(err => console.error(err));


// === MOSTRA / NASCONDE L'INTERA SEZIONE VARIANTI SOSTANZIALI ===
const substantiveCheckbox = document.querySelector(
  'input[data-filter-type="substantive"]'
);
const substantiveSection = document.getElementById('substantive-section');

if (substantiveCheckbox && substantiveSection) {
  substantiveCheckbox.addEventListener('change', () => {
    substantiveSection.style.display =
      substantiveCheckbox.checked ? 'block' : 'none';
  });
}

// === MOSTRA / NASCONDE L'INTERA SEZIONE VARIANTI ORTOGRAFICHE ===
const orthographicCheckbox = document.querySelector(
  'input[data-filter-type="orthographic"]'
);
const orthographicSection = document.getElementById('orthographic-section');

if (orthographicCheckbox && orthographicSection) {
  orthographicCheckbox.addEventListener('change', () => {
    orthographicSection.style.display =
      orthographicCheckbox.checked ? 'block' : 'none';
  });
}

// === MOSTRA / NASCONDE L'INTERA SEZIONE NOTE DI COMMENTO ===
const noteCheckbox = document.querySelector(
  'input[data-filter-type="note"]'
);
const notesSection = document.getElementById('notes-section');

if (noteCheckbox && notesSection) {
  noteCheckbox.addEventListener('change', () => {
    notesSection.style.display =
      noteCheckbox.checked ? 'block' : 'none';
  });
}

  // ================= PATCH: TOGGLE TRADUZIONE / APPARATO =================

// pulsante già presente nella navbar
const toggleTranslationBtn = document.getElementById('toggle-translation');

// colonna traduzione (già affiancata al testo)
const translationSection = document.getElementById('translation');

// pannello apparato (non va rimosso dal DOM)
const apparatusAside = document.querySelector('.edition-apparatus');

// stato
let translationActive = false;

// stato iniziale coerente
if (translationSection) {
  translationSection.classList.add('hidden');
}

if (toggleTranslationBtn && translationSection && apparatusAside) {
  toggleTranslationBtn.addEventListener('click', () => {
    translationActive = !translationActive;

    // mostra / nasconde traduzione
    translationSection.classList.toggle('hidden', !translationActive);

    // disattiva VISIVAMENTE l’apparato, senza rompere i filtri
    apparatusAside.style.visibility = translationActive ? 'hidden' : 'visible';
    apparatusAside.style.pointerEvents = translationActive ? 'none' : 'auto';

    // stato visivo del pulsante
    toggleTranslationBtn.classList.toggle('active', translationActive);
  });
}

// ================= FINE PATCH: TOGGLE TRADUZIONE / APPARATO =================

// ================= PATCH: SCROLL SINCRONIZZATO TESTO ⇄ TRADUZIONE =================

const textScrollBox = document.getElementById('text');
const translationScrollBox = document.getElementById('translation');

let isSyncingText = false;
let isSyncingTranslation = false;

if (textScrollBox && translationScrollBox) {

  textScrollBox.addEventListener('scroll', () => {
    if (isSyncingText) return;
    isSyncingTranslation = true;

    const ratio =
      textScrollBox.scrollTop /
      (textScrollBox.scrollHeight - textScrollBox.clientHeight || 1);

    translationScrollBox.scrollTop =
      ratio *
      (translationScrollBox.scrollHeight - translationScrollBox.clientHeight);

    isSyncingTranslation = false;
  });

  translationScrollBox.addEventListener('scroll', () => {
    if (isSyncingTranslation) return;
    isSyncingText = true;

    const ratio =
      translationScrollBox.scrollTop /
      (translationScrollBox.scrollHeight - translationScrollBox.clientHeight || 1);

    textScrollBox.scrollTop =
      ratio *
      (textScrollBox.scrollHeight - textScrollBox.clientHeight);

    isSyncingText = false;
  });
}

// ================= FINE PATCH: SCROLL SINCRONIZZATO TESTO ⇄ TRADUZIONE =================

});
})();