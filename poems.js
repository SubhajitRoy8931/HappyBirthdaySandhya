(() => {
  'use strict';
  const collection = window.POEM_COLLECTION;
  const mount = document.getElementById('poemCollections');
  if (!collection || !mount) return;

  // Carry the story's return timestamp through the collection page's two
  // return links. This works both on a hosted site and in a local ZIP preview.
  const storyReturnState = new URLSearchParams(window.location.search).get('storyReturn');
  if (storyReturnState) {
    document.querySelectorAll('.return-link').forEach(link => {
      const returnUrl = new URL(link.href, window.location.href);
      returnUrl.searchParams.set('storyReturn', storyReturnState);
      link.href = returnUrl.href;
    });
  }

  const sections = [
    { key: 'before', id: 'before-separation', title: 'Before the Separation', count: '09', note: 'The words written while our story was still being lived.' },
    { key: 'after', id: 'after-separation', title: 'After the Separation', count: '13', note: 'The words that came after, carrying memories and unanswered questions.' }
  ];

  function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  sections.forEach(sectionInfo => {
    const poems = collection[sectionInfo.key] || [];
    const section = make('section', 'poem-collection-section');
    section.id = sectionInfo.id;
    const heading = make('header', 'collection-section-heading');
    const overline = make('div', 'section-overline', sectionInfo.count + ' POEMS');
    const title = make('h2', '', sectionInfo.title);
    const note = make('p', 'section-note', sectionInfo.note);
    heading.append(overline, title, note);
    const list = make('div', 'poem-entry-list');

    poems.forEach((poem, index) => {
      const details = make('details', 'poem-entry');
      details.id = 'poem-' + sectionInfo.key + '-' + (index + 1);
      const summary = make('summary', 'poem-entry-summary');
      const main = make('span', 'poem-entry-main');
      const poemTitle = make('span', 'poem-entry-title', poem.title);
      const occasion = make('span', 'poem-entry-occasion', poem.occasion);
      main.append(poemTitle, occasion);
      const affordance = make('span', 'poem-entry-affordance', 'Read poem');
      affordance.setAttribute('aria-hidden', 'true');
      summary.append(main, affordance);

      const body = make('article', 'poem-entry-body');
      body.setAttribute('aria-label', poem.title);
      const text = make('div', 'full-poem collection-full-poem');
      (poem.stanzas || []).forEach(stanzaText => {
        const stanza = make('section', 'stanza');
        stanzaText.split('\n').forEach(line => stanza.appendChild(make('p', '', line)));
        text.appendChild(stanza);
      });
      body.appendChild(text);
      if (poem.dedicatedPage) {
        const dedicated = make('a', 'dedicated-poem-link', 'Open the dedicated poem page ↗');
        dedicated.href = poem.dedicatedPage;
        body.appendChild(dedicated);
      }
      details.append(summary, body);
      details.addEventListener('toggle', () => {
        affordance.textContent = details.open ? 'Close poem' : 'Read poem';
      });
      list.appendChild(details);
    });
    section.append(heading, list);
    mount.appendChild(section);
  });
})();
