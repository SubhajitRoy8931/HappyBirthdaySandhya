(() => {
  'use strict';

  const poemText = 'We walked through time believing it was taking us somewhere, never knowing some moments were quietly finding their way back to one another.';
  const experience = document.getElementById('experience');
  const motionPreference = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  let prefersReducedMotion = Boolean(motionPreference && motionPreference.matches);
  experience.classList.toggle('reduced-motion', prefersReducedMotion);

  const poem = document.getElementById('poem');
  const scenes = [...document.querySelectorAll('.scene')];
  const previousButton = document.getElementById('previousButton');
  const playButton = document.getElementById('playButton');
  const nextButton = document.getElementById('nextButton');
  const controls = document.getElementById('transportControls');
  const gifImage = document.getElementById('birthdayFrame');
  const gifMessage = document.getElementById('message-gif');
  const thanksMessage = document.getElementById('message-thanks');
  const welcomeMessage = document.getElementById('message-welcome');

  // Narrative timing: each line stays on screen for 0.3 seconds per word.
  // After the final line has completed its own interval, the section holds for
  // another 0.15 seconds per word counted across all narrative lines in it.
  const LINE_SECONDS_PER_WORD = 0.3;
  const FINAL_SECONDS_PER_WORD = 0.15;
  const LINE_INTERVAL_MS = LINE_SECONDS_PER_WORD * 1000;
  const FINAL_HOLD_MS = FINAL_SECONDS_PER_WORD * 1000;
  const COPY_REVEAL_MS = 650;

  // Explicitly specified visual sequences retain their own timing.
  const LETTER_INTERVAL = 50;
  const COMMA_PAUSE = 180;
  const PERIOD_PAUSE = 250;
  const POEM_HOLD = 3500;
  const GIF_START = 1100;
  const THANKS_AT = 5200;
  const WELCOME_AT = 7900;
  const GIF_FRAME_MS = 130;
  const GIF_FRAME_COUNT = 12;
  const PHONE_START_DELAY = 1800;
  const PHONE_LETTER_INTERVAL = 70;
  const PHONE_FINAL_HOLD = 5000;
  const PHONE_GLYPH_FADE_MS = 155;
  const NAME_HIGHLIGHT_MS = 1500;
  const PHOTO_REVEAL_MS = 1200;
  const framePaths = Array.from({ length: GIF_FRAME_COUNT }, (_, i) =>
    `assets/birthday-frames/frame-${String(i).padStart(2, '0')}.webp`
  );

  function countWords(text) {
    const value = String(text || '').trim();
    return value ? value.split(/\s+/).length : 0;
  }

  function createTrack(elements, startDelay = 0, revealClass = 'timed-copy') {
    let cursor = startDelay;
    let totalWords = 0;
    const entries = elements.map(element => {
      element.classList.add(revealClass);
      const words = countWords(element.textContent);
      const entry = { element, at: cursor, words };
      totalWords += words;
      cursor += words * LINE_INTERVAL_MS;
      return entry;
    });
    return { entries, totalWords, end: cursor };
  }

  function trackEnd(track) {
    return track ? track.end : 0;
  }

  function sectionDuration(tracks, totalWords) {
    const revealEnd = Math.max(0, ...tracks.map(trackEnd));
    return Math.ceil(revealEnd + totalWords * FINAL_HOLD_MS);
  }

  function updateTrack(track, localTime) {
    if (!track) return;
    track.entries.forEach(entry => {
      entry.element.classList.toggle('is-revealed', localTime >= entry.at);
    });
  }

  // Opening poem: letter-by-letter reveal, with punctuation pauses.
  const letterSchedule = [];
  let poemClock = 0;
  const poemWords = poemText.split(' ');
  poemWords.forEach((word, wordIndex) => {
    const wordGroup = document.createElement('span');
    wordGroup.className = 'poem-word';
    for (const character of word) {
      const span = document.createElement('span');
      span.className = 'glyph';
      span.textContent = character;
      wordGroup.appendChild(span);
      letterSchedule.push({ element: span, at: poemClock });
      poemClock += LETTER_INTERVAL;
      if (character === ',') poemClock += COMMA_PAUSE;
      if (character === '.') poemClock += PERIOD_PAUSE;
    }
    poem.appendChild(wordGroup);
    if (wordIndex < poemWords.length - 1) poem.appendChild(document.createTextNode(' '));
  });
  const poemDuration = poemClock + POEM_HOLD;

  // Build word-count schedules for all ordinary narrative lines.
  const closingTrack = createTrack(
    [document.querySelector('.closing-stage h2')], 900
  );
  const daysTrack = createTrack(
    [...document.querySelectorAll('.days-intro-copy p')], 1900
  );

  // The phones scene has a user-specified letter-by-letter animation rather
  // than the ordinary word-count line reveal.
  function prepareTypedParagraphs(paragraphs) {
    const events = [];
    let cursor = 0;
    paragraphs.forEach(paragraph => {
      const original = paragraph.textContent.trim();
      paragraph.replaceChildren();
      const pieces = original.split(/(\s+)/).filter(Boolean);
      pieces.forEach(piece => {
        if (/^\s+$/.test(piece)) {
          paragraph.appendChild(document.createTextNode(piece));
          return;
        }
        const word = document.createElement('span');
        word.className = 'typed-word';
        for (const character of piece) {
          const glyph = document.createElement('span');
          glyph.className = 'typed-glyph';
          glyph.textContent = character;
          word.appendChild(glyph);
          events.push({ element: glyph, at: cursor });
          cursor += PHONE_LETTER_INTERVAL;
        }
        paragraph.appendChild(word);
      });
    });
    return { events, typingDuration: cursor };
  }
  const phoneTyping = prepareTypedParagraphs([
    document.querySelector('.phones-footnote')
  ]);
  const phonesDuration = PHONE_START_DELAY + phoneTyping.typingDuration + PHONE_GLYPH_FADE_MS + PHONE_FINAL_HOLD;

  // The name is a deliberate visual beat between its two narration lines.
  const nameLead = document.querySelector('.name-lead');
  const nameFollow = document.querySelector('.name-follow');
  const memoryName = document.querySelector('.memory-name');
  nameLead.classList.add('timed-copy');
  nameFollow.classList.add('timed-copy');
  const nameLeadWords = countWords(nameLead.textContent);
  const nameFollowWords = countWords(nameFollow.textContent);
  const nameStart = 350;
  const nameHighlightAt = nameStart + nameLeadWords * LINE_INTERVAL_MS;
  const nameFollowAt = nameHighlightAt + NAME_HIGHLIGHT_MS;
  const nameTotalWords = nameLeadWords + 1 + nameFollowWords; // includes the displayed name
  const nameDuration = nameFollowAt + nameFollowWords * LINE_INTERVAL_MS + nameTotalWords * FINAL_HOLD_MS;

  // Photograph narration follows the same per-line formula. The photograph
  // begins its reveal after the short "And she sent it." line has had its turn.
  const photoTrack = createTrack(
    [...document.querySelectorAll('.photo-copy p')], 250
  );
  const photoFrame = document.querySelector('.memory-photo-frame');
  const photoRevealAt = photoTrack.entries[4].at;
  // Let the photograph finish its reveal before the final explanatory line appears.
  photoTrack.entries[4].at += PHOTO_REVEAL_MS;
  photoTrack.end += PHOTO_REVEAL_MS;
  const photoDuration = photoTrack.end + photoTrack.totalWords * FINAL_HOLD_MS;

  // The archive has two visual columns. Each column reveals its own lines in
  // order; the final hold counts every visible memory label and reflection line.
  const archiveListTrack = createTrack(
    [...document.querySelectorAll('.archive-item')], 350, 'timed-list-item'
  );
  const archiveReflectionTrack = createTrack(
    [...document.querySelectorAll('.archive-reflection p')], 700
  );
  const archiveTotalWords = archiveListTrack.totalWords + archiveReflectionTrack.totalWords;
  const archiveDuration = sectionDuration(
    [archiveListTrack, archiveReflectionTrack], archiveTotalWords
  );

  const nov24Track = createTrack(
    [document.querySelector('.nov24-card p')], 1250
  );
  const nov24Duration = sectionDuration([nov24Track], nov24Track.totalWords);

  // November 24–25: ordinary narrative lines use the approved word-count timing.
  const cancelledTrack = createTrack(
    [...document.querySelectorAll('.cancelled-copy p')], 850
  );
  const arrivalTrack = createTrack(
    [...document.querySelectorAll('.arrival-copy p')], 850
  );
  const sunsetTrack = createTrack(
    [...document.querySelectorAll('.sunset-copy p')], 900
  );
  const nervesTrack = createTrack(
    [...document.querySelectorAll('.nerves-copy p')], 950
  );
  const confessionIntroTrack = createTrack(
    [...document.querySelectorAll('.confession-poem-intro p')], 850
  );
  const confessionKicker = document.querySelector('.confession-poem-kicker');
  const confessionTitle = document.querySelector('.confession-poem-title');
  const confessionTitleAt = confessionIntroTrack.end + 450;
  const confessionPoemLinesTrack = createTrack(
    [...document.querySelectorAll('.confession-poem-lines p')], confessionTitleAt + 850
  );
  const confessionTotalWords = confessionIntroTrack.totalWords + confessionPoemLinesTrack.totalWords;
  const confessionPoemDuration = Math.ceil(
    confessionPoemLinesTrack.end + confessionTotalWords * FINAL_HOLD_MS
  );
  const fullPoemLink = document.getElementById('fullPoemLink');
  fullPoemLink.addEventListener('click', event => {
    event.stopPropagation();
    event.preventDefault();
    const poemTab = window.open(fullPoemLink.href, '_blank');
    if (!poemTab) window.location.href = fullPoemLink.href;
  });
  const replyTrack = createTrack(
    [...document.querySelectorAll('.reply-copy p')], 900
  );
  // The longest-night scene uses the specifically requested 70ms typewriter
  // reveal. Paragraph pauses separate the questions; elapsed story time drives
  // every character so pause/resume and Previous/Next remain deterministic.
  const NIGHT_LETTER_INTERVAL_MS = 70;
  const NIGHT_PARAGRAPH_PAUSES = [650, 700, 700, 900, 800, 0];
  function prepareNightTypewriter(paragraphs) {
    const events = [];
    let cursor = 650;
    paragraphs.forEach((paragraph, paragraphIndex) => {
      paragraph.classList.add('night-typed');
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let textNode;
      while ((textNode = walker.nextNode())) textNodes.push(textNode);

      textNodes.forEach(node => {
        const parts = node.nodeValue.match(/\s+|[^\s]+/g) || [];
        const fragment = document.createDocumentFragment();
        parts.forEach(part => {
          if (/^\s+$/.test(part)) {
            fragment.appendChild(document.createTextNode(part));
            return;
          }
          const word = document.createElement('span');
          word.className = 'night-word';
          Array.from(part).forEach(character => {
            const glyph = document.createElement('span');
            glyph.className = 'night-glyph';
            glyph.textContent = character;
            word.appendChild(glyph);
            events.push({ element: glyph, at: cursor });
            cursor += NIGHT_LETTER_INTERVAL_MS;
          });
          fragment.appendChild(word);
        });
        node.parentNode.replaceChild(fragment, node);
      });
      cursor += NIGHT_PARAGRAPH_PAUSES[paragraphIndex] || 0;
    });
    return { events, typingEnd: cursor };
  }
  const nightTypewriter = prepareNightTypewriter(
    [...document.querySelectorAll('.night-copy p')]
  );
  const NIGHT_FINAL_HOLD_MS = 4500;
  const nightDuration = nightTypewriter.typingEnd + NIGHT_FINAL_HOLD_MS;
  const yesDate = document.querySelector('.yes-date');
  const yesWord = document.querySelector('.yes-word');
  const yesCaption = document.querySelector('.yes-caption');
  const YES_REVEAL_AT = 1800;
  const YES_CAPTION_AT = 5200;
  const yesDuration = 10500;
  const afterglowTrack = createTrack(
    [...document.querySelectorAll('.afterglow-copy p')], 900
  );

  // November 28: both photographs make a prominent sequential entrance,
  // remain large together for 3 seconds, then settle simultaneously. The full
  // approved narration types continuously at 70ms per character; the completed
  // scene remains visible for 10 seconds after the final character.
  const FIRST_SELFIE_START_MS = 450;
  const FIRST_SELFIE_STAGGER_MS = 240;
  const FIRST_SELFIE_ENTER_MS = 480;
  const FIRST_SELFIE_HOLD_MS = 3000;
  const FIRST_SELFIE_SETTLE_MS = 1050;
  const FIRST_SELFIE_GAP_AFTER_SETTLE_MS = 250;
  const FIRST_SELFIE_TYPE_INTERVAL_MS = 70;
  const FIRST_SELFIE_FINAL_HOLD_MS = 10000;
  const firstSelfieElements = [
    document.querySelector('.first-selfie-one'),
    document.querySelector('.first-selfie-two')
  ];
  const firstSelfieSecondStart = FIRST_SELFIE_START_MS + FIRST_SELFIE_STAGGER_MS;
  const firstSelfiesHoldStart = firstSelfieSecondStart + FIRST_SELFIE_ENTER_MS;
  const firstSelfiesSettleAt = firstSelfiesHoldStart + FIRST_SELFIE_HOLD_MS;
  const firstSelfiesCopyStart = firstSelfiesSettleAt + FIRST_SELFIE_SETTLE_MS + FIRST_SELFIE_GAP_AFTER_SETTLE_MS;

  function prepareFirstSelfiesTypewriter(paragraphs) {
    const events = [];
    let cursor = 0;
    paragraphs.forEach(paragraph => {
      const originalText = paragraph.textContent;
      paragraph.replaceChildren();
      paragraph.classList.add('first-selfie-typed-paragraph');
      const pieces = originalText.split(/(\s+)/).filter(Boolean);
      pieces.forEach(piece => {
        if (/^\s+$/.test(piece)) {
          paragraph.appendChild(document.createTextNode(piece));
          return;
        }
        const word = document.createElement('span');
        word.className = 'first-selfie-word';
        for (const character of piece) {
          const glyph = document.createElement('span');
          glyph.className = 'first-selfie-glyph';
          glyph.textContent = character;
          word.appendChild(glyph);
          events.push({ element: glyph, at: cursor });
          cursor += FIRST_SELFIE_TYPE_INTERVAL_MS;
        }
        paragraph.appendChild(word);
      });
    });
    return { events, typingDuration: cursor };
  }

  const firstSelfiesTypewriter = prepareFirstSelfiesTypewriter(
    [...document.querySelectorAll('.first-selfies-copy p')]
  );
  const firstSelfiesTypeEnd = firstSelfiesCopyStart + firstSelfiesTypewriter.typingDuration;
  const firstSelfiesDuration = Math.ceil(
    firstSelfiesTypeEnd + FIRST_SELFIE_FINAL_HOLD_MS
  );

  // Single portrait memory: the photograph enters prominently, holds for 3s,
  // settles into its permanent position, then the full narration types at 70ms.
  // The completed section remains visible for 10s. All stages use story time so
  // pause/resume and scene navigation stay synchronized.
  const PROFILE_PHOTO_START_MS = 450;
  const PROFILE_PHOTO_POP_MS = 480;
  const PROFILE_PHOTO_HOLD_MS = 3000;
  const PROFILE_PHOTO_SETTLE_MS = 1050;
  const PROFILE_TEXT_GAP_MS = 250;
  const PROFILE_TYPE_INTERVAL_MS = 70;
  const PROFILE_FINAL_HOLD_MS = 10000;
  const profilePhoto = document.querySelector('.profile-memory-photo-wrap');
  const profileCopyParagraphs = [...document.querySelectorAll('.profile-memory-copy p')];
  const profilePhotoSettleAt = PROFILE_PHOTO_START_MS + PROFILE_PHOTO_POP_MS + PROFILE_PHOTO_HOLD_MS;
  const profileCopyStartAt = profilePhotoSettleAt + PROFILE_PHOTO_SETTLE_MS + PROFILE_TEXT_GAP_MS;

  function prepareProfileMemoryTypewriter(paragraphs) {
    const events = [];
    let cursor = 0;
    paragraphs.forEach(paragraph => {
      const originalText = paragraph.textContent;
      paragraph.replaceChildren();
      paragraph.classList.add('profile-memory-typed-paragraph');
      const pieces = originalText.split(/(\s+)/).filter(Boolean);
      pieces.forEach(piece => {
        if (/^\s+$/.test(piece)) {
          paragraph.appendChild(document.createTextNode(piece));
          return;
        }
        const word = document.createElement('span');
        word.className = 'profile-memory-word';
        for (const character of piece) {
          const glyph = document.createElement('span');
          glyph.className = 'profile-memory-glyph';
          glyph.textContent = character;
          word.appendChild(glyph);
          events.push({ element: glyph, at: cursor });
          cursor += PROFILE_TYPE_INTERVAL_MS;
        }
        paragraph.appendChild(word);
      });
    });
    return { events, typingDuration: cursor };
  }
  const profileMemoryTypewriter = prepareProfileMemoryTypewriter(profileCopyParagraphs);
  const profileMemoryTypeEnd = profileCopyStartAt + profileMemoryTypewriter.typingDuration;
  const profileMemoryDuration = Math.ceil(profileMemoryTypeEnd + PROFILE_FINAL_HOLD_MS);


  // The remaining personal photo memories follow the same visual language:
  // the photographs enter prominently, hold, settle, and only then does a
  // continuous 70ms-per-character narration begin. Each completed scene holds 10s.
  const STORY_MEMORY_START_MS = 450;
  const STORY_MEMORY_POP_MS = 480;
  const STORY_MEMORY_STAGGER_MS = 240;
  const STORY_MEMORY_PAIR_HOLD_MS = 3000;
  const STORY_MEMORY_SETTLE_MS = 1050;
  const STORY_MEMORY_TEXT_GAP_MS = 250;
  const STORY_MEMORY_TYPE_INTERVAL_MS = 70;
  const STORY_MEMORY_FINAL_HOLD_MS = 10000;

  function prepareStoryMemoryTypewriter(paragraphs) {
    const events = [];
    let cursor = 0;
    paragraphs.forEach(paragraph => {
      const originalText = paragraph.textContent;
      paragraph.replaceChildren();
      const pieces = originalText.split(/(\s+)/).filter(Boolean);
      pieces.forEach(piece => {
        if (/^\s+$/.test(piece)) {
          paragraph.appendChild(document.createTextNode(piece));
          return;
        }
        const word = document.createElement('span');
        word.className = 'story-memory-word';
        for (const character of piece) {
          const glyph = document.createElement('span');
          glyph.className = 'story-memory-glyph';
          glyph.textContent = character;
          word.appendChild(glyph);
          events.push({ element: glyph, at: cursor });
          cursor += STORY_MEMORY_TYPE_INTERVAL_MS;
        }
        paragraph.appendChild(word);
      });
    });
    return { events, typingDuration: cursor };
  }

  function preparePairStoryMemory(selector, sceneName) {
    const root = document.querySelector(selector);
    const gallery = root.querySelector('.story-memory-gallery');
    const photos = [...root.querySelectorAll('.story-memory-photo')];
    const typewriter = prepareStoryMemoryTypewriter([...root.querySelectorAll('.story-memory-copy p')]);
    const lastStart = STORY_MEMORY_START_MS + (photos.length - 1) * STORY_MEMORY_STAGGER_MS;
    const holdAt = lastStart + STORY_MEMORY_POP_MS;
    const settleAt = holdAt + STORY_MEMORY_PAIR_HOLD_MS;
    const copyStart = settleAt + STORY_MEMORY_SETTLE_MS + STORY_MEMORY_TEXT_GAP_MS;
    const duration = Math.ceil(copyStart + typewriter.typingDuration + STORY_MEMORY_FINAL_HOLD_MS);

    function update(localTime) {
      photos.forEach((photo, i) => {
        const start = STORY_MEMORY_START_MS + i * STORY_MEMORY_STAGGER_MS;
        const p = clamp01((localTime - start) / STORY_MEMORY_POP_MS);
        const eased = easeOutBack(p);
        photo.style.opacity = easeOutCubic(p).toFixed(3);
        photo.style.filter = `blur(${(2.5 * (1 - p)).toFixed(2)}px)`;
        photo.style.transform = `scale(${(.76 + (.99 - .76) * eased).toFixed(4)})`;
      });
      const settle = smoothProgress((localTime - settleAt) / STORY_MEMORY_SETTLE_MS);
      const scale = 1.18 + (1 - 1.18) * settle;
      gallery.style.transform = `translate3d(0, ${(-.6 * settle).toFixed(3)}vh, 0) scale(${scale.toFixed(4)})`;
      typewriter.events.forEach(event => {
        event.element.classList.toggle('is-visible', localTime >= copyStart + event.at);
      });
    }
    return { name: sceneName, duration, update };
  }

  function prepareCollectionStoryMemory(selector, sceneName, holdMs = 3000) {
    const root = document.querySelector(selector);
    const gallery = root.querySelector('.story-memory-gallery');
    const photos = [...root.querySelectorAll('.story-memory-photo')];
    const typewriter = prepareStoryMemoryTypewriter([...root.querySelectorAll('.story-memory-copy p')]);
    const COLLECTION_HOLD_MS = holdMs;
    const COLLECTION_SETTLE_MS = STORY_MEMORY_SETTLE_MS;
    const COLLECTION_GAP_MS = STORY_MEMORY_TEXT_GAP_MS;
    const perPhoto = STORY_MEMORY_POP_MS + COLLECTION_HOLD_MS + COLLECTION_SETTLE_MS + COLLECTION_GAP_MS;
    const copyStart = STORY_MEMORY_START_MS + photos.length * perPhoto - COLLECTION_GAP_MS + STORY_MEMORY_TEXT_GAP_MS;
    const duration = Math.ceil(copyStart + typewriter.typingDuration + STORY_MEMORY_FINAL_HOLD_MS);
    let geometry = [];
    let geometryViewport = '';

    function measure() {
      const key = `${window.innerWidth}x${window.innerHeight}`;
      if (key === geometryViewport && geometry.length === photos.length) return;
      geometryViewport = key;
      geometry = photos.map(photo => {
        photo.style.transform = 'none';
        const rect = photo.getBoundingClientRect();
        const dx = (window.innerWidth / 2) - (rect.left + rect.width / 2);
        const dy = (window.innerHeight / 2) - (rect.top + rect.height / 2);
        const image = photo.querySelector('img');
        const ratio = image && image.naturalWidth && image.naturalHeight ? image.naturalWidth / image.naturalHeight : .68;
        const containedWidth = Math.min(rect.width, rect.height * ratio);
        const containedHeight = containedWidth / ratio;
        const scale = Math.min((window.innerWidth * .78) / Math.max(1, containedWidth), (window.innerHeight * .58) / Math.max(1, containedHeight), 4);
        return { dx, dy, scale };
      });
    }

    function update(localTime) {
      measure();
      photos.forEach((photo, i) => {
        const start = STORY_MEMORY_START_MS + i * perPhoto;
        const popEnd = start + STORY_MEMORY_POP_MS;
        const holdEnd = popEnd + COLLECTION_HOLD_MS;
        const settleEnd = holdEnd + COLLECTION_SETTLE_MS;
        const g = geometry[i];
        if (localTime < start) {
          photo.style.opacity = '0';
          photo.style.filter = 'blur(2.5px)';
          photo.style.transform = `translate3d(${g.dx.toFixed(2)}px, ${g.dy.toFixed(2)}px, 0) scale(${g.scale.toFixed(3)})`;
        } else if (localTime < popEnd) {
          const p = easeOutCubic((localTime - start) / STORY_MEMORY_POP_MS);
          const scale = g.scale * (.94 + .06 * p);
          photo.style.opacity = p.toFixed(3);
          photo.style.filter = `blur(${(2.5 * (1-p)).toFixed(2)}px)`;
          photo.style.transform = `translate3d(${g.dx.toFixed(2)}px, ${g.dy.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
        } else if (localTime < holdEnd) {
          photo.style.opacity = '1';
          photo.style.filter = 'blur(0)';
          photo.style.transform = `translate3d(${g.dx.toFixed(2)}px, ${g.dy.toFixed(2)}px, 0) scale(${g.scale.toFixed(3)})`;
        } else if (localTime < settleEnd) {
          const p = smoothProgress((localTime - holdEnd) / COLLECTION_SETTLE_MS);
          const dx = g.dx * (1 - p);
          const dy = g.dy * (1 - p);
          const scale = g.scale + (1 - g.scale) * p;
          photo.style.opacity = '1';
          photo.style.filter = 'blur(0)';
          photo.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
        } else {
          photo.style.opacity = '1';
          photo.style.filter = 'blur(0)';
          photo.style.transform = 'none';
        }
      });
      typewriter.events.forEach(event => {
        event.element.classList.toggle('is-visible', localTime >= copyStart + event.at);
      });
    }
    return { name: sceneName, duration, update };
  }

  const redOutfitMemory = preparePairStoryMemory('.scene-red-outfit', 'red-outfit');
  const picnicMemory = preparePairStoryMemory('.scene-picnic', 'picnic');
  const littlePicturesMemory = prepareCollectionStoryMemory('.scene-little-pictures', 'little-pictures');
  const lastTogetherMemory = preparePairStoryMemory('.scene-last-together', 'last-together');
  // The final five memory scenes follow the user's chosen order after Scene 27.
  const earlyTuitionMemory = preparePairStoryMemory('.scene-early-tuition', 'early-tuition');
  const littleMomentsMemory = preparePairStoryMemory('.scene-little-moments', 'little-moments');
  const durgaPujaMemory = preparePairStoryMemory('.scene-durga-puja', 'durga-puja');
  const saraswatiPujaMemory = preparePairStoryMemory('.scene-saraswati-puja', 'saraswati-puja');
  const tuitionEndingMemory = preparePairStoryMemory('.scene-tuition-ending', 'tuition-ending');
  // Scene 36: five newer photographs she shared. Keep the same five-photo
  // reveal-and-settle choreography, with a shorter 2-second hold per image.
  const pictureKeepsakesMemory = prepareCollectionStoryMemory(
    '.scene-picture-keepsakes', 'picture-keepsakes', 2000
  );

  // Scene 33: reveal the two real institutes one at a time. Each photo pops up,
  // holds for three seconds, then settles before the next photo appears. Names,
  // locations and chapter labels follow, then the narration types at 70ms/char.
  const NEW_BEGINNINGS_START_MS = 450;
  const NEW_BEGINNINGS_POP_MS = 480;
  const NEW_BEGINNINGS_HOLD_MS = 3000;
  const NEW_BEGINNINGS_SETTLE_MS = 1050;
  const NEW_BEGINNINGS_BETWEEN_MS = 250;
  const NEW_BEGINNINGS_DETAILS_GAP_MS = 300;
  const NEW_BEGINNINGS_CAPTIONS_GAP_MS = 700;
  const NEW_BEGINNINGS_COPY_GAP_MS = 550;
  const NEW_BEGINNINGS_TYPE_INTERVAL_MS = 70;
  const NEW_BEGINNINGS_FINAL_HOLD_MS = 10000;
  const newBeginningsRoot = document.querySelector('.scene-new-beginnings');
  const newBeginningsPhotos = [...newBeginningsRoot.querySelectorAll('.new-beginnings-photo')];
  const newBeginningsDetails = [...newBeginningsRoot.querySelectorAll('.new-beginnings-details')];
  const newBeginningsCaptions = [...newBeginningsRoot.querySelectorAll('.new-beginnings-caption')];
  const newBeginningsCopyParagraphs = [...newBeginningsRoot.querySelectorAll('.new-beginnings-copy p')];

  function prepareNewBeginningsTypewriter(paragraphs) {
    const events = [];
    let cursor = 0;
    paragraphs.forEach(paragraph => {
      const originalText = paragraph.textContent;
      paragraph.replaceChildren();
      const pieces = originalText.split(/(\s+)/).filter(Boolean);
      pieces.forEach(piece => {
        if (/^\s+$/.test(piece)) {
          paragraph.appendChild(document.createTextNode(piece));
          return;
        }
        const word = document.createElement('span');
        word.className = 'new-beginnings-word';
        for (const character of Array.from(piece)) {
          const glyph = document.createElement('span');
          glyph.className = 'new-beginnings-glyph';
          glyph.textContent = character;
          word.appendChild(glyph);
          events.push({ element: glyph, at: cursor });
          cursor += NEW_BEGINNINGS_TYPE_INTERVAL_MS;
        }
        paragraph.appendChild(word);
      });
    });
    return { events, typingDuration: cursor };
  }

  const newBeginningsFirstSettledAt = NEW_BEGINNINGS_START_MS + NEW_BEGINNINGS_POP_MS + NEW_BEGINNINGS_HOLD_MS + NEW_BEGINNINGS_SETTLE_MS;
  const newBeginningsSecondStartAt = newBeginningsFirstSettledAt + NEW_BEGINNINGS_BETWEEN_MS;
  const newBeginningsSecondSettledAt = newBeginningsSecondStartAt + NEW_BEGINNINGS_POP_MS + NEW_BEGINNINGS_HOLD_MS + NEW_BEGINNINGS_SETTLE_MS;
  const newBeginningsDetailsAt = newBeginningsSecondSettledAt + NEW_BEGINNINGS_DETAILS_GAP_MS;
  const newBeginningsCaptionsAt = newBeginningsDetailsAt + NEW_BEGINNINGS_CAPTIONS_GAP_MS;
  const newBeginningsCopyStartAt = newBeginningsCaptionsAt + NEW_BEGINNINGS_COPY_GAP_MS;
  const newBeginningsTypewriter = prepareNewBeginningsTypewriter(newBeginningsCopyParagraphs);
  const newBeginningsDuration = Math.ceil(
    newBeginningsCopyStartAt + newBeginningsTypewriter.typingDuration + NEW_BEGINNINGS_FINAL_HOLD_MS
  );

  function updateNewBeginningsPhoto(photo, localTime, startAt) {
    const popEnd = startAt + NEW_BEGINNINGS_POP_MS;
    const holdEnd = popEnd + NEW_BEGINNINGS_HOLD_MS;
    const settleEnd = holdEnd + NEW_BEGINNINGS_SETTLE_MS;
    if (localTime < startAt) {
      photo.style.opacity = '0';
      photo.style.filter = 'blur(2.5px)';
      photo.style.transform = 'scale(.76)';
    } else if (localTime < popEnd) {
      const p = clamp01((localTime - startAt) / NEW_BEGINNINGS_POP_MS);
      const eased = easeOutBack(p);
      photo.style.opacity = easeOutCubic(p).toFixed(3);
      photo.style.filter = `blur(${(2.5 * (1 - p)).toFixed(2)}px)`;
      photo.style.transform = `scale(${(.76 + (1.13 - .76) * eased).toFixed(4)})`;
    } else if (localTime < holdEnd) {
      photo.style.opacity = '1';
      photo.style.filter = 'blur(0)';
      photo.style.transform = 'scale(1.13)';
    } else if (localTime < settleEnd) {
      const p = smoothProgress((localTime - holdEnd) / NEW_BEGINNINGS_SETTLE_MS);
      const scale = 1.13 + (1 - 1.13) * p;
      photo.style.opacity = '1';
      photo.style.filter = 'blur(0)';
      photo.style.transform = `scale(${scale.toFixed(4)})`;
    } else {
      photo.style.opacity = '1';
      photo.style.filter = 'blur(0)';
      photo.style.transform = 'scale(1)';
    }
  }

  function updateNewBeginnings(localTime) {
    updateNewBeginningsPhoto(newBeginningsPhotos[0], localTime, NEW_BEGINNINGS_START_MS);
    updateNewBeginningsPhoto(newBeginningsPhotos[1], localTime, newBeginningsSecondStartAt);
    newBeginningsDetails.forEach(detail => {
      detail.classList.toggle('is-visible', localTime >= newBeginningsDetailsAt);
    });
    newBeginningsCaptions.forEach(caption => {
      caption.classList.toggle('is-visible', localTime >= newBeginningsCaptionsAt);
    });
    newBeginningsTypewriter.events.forEach(event => {
      event.element.classList.toggle('is-visible', localTime >= newBeginningsCopyStartAt + event.at);
    });
  }


  // Scene 34: the WhatsApp recording starts after the introductory line appears.
  // Its native controls independently pause and seek the video; the site-level
  // Pause/Resume control also pauses/resumes the video together with story time.
  const WHATSAPP_INTRO_AT_MS = 420;
  const WHATSAPP_VIDEO_START_AT_MS = 1050;
  const WHATSAPP_TYPE_INTERVAL_MS = 70;
  const WHATSAPP_FINAL_HOLD_MS = 10000;
  const whatsappMemoryRoot = document.querySelector('.scene-whatsapp-memory');
  const whatsappIntro = whatsappMemoryRoot.querySelector('.whatsapp-memory-intro');
  const whatsappVideoShell = whatsappMemoryRoot.querySelector('.whatsapp-video-shell');
  const whatsappVideo = whatsappMemoryRoot.querySelector('.whatsapp-memory-video');
  const whatsappCopyParagraphs = [...whatsappMemoryRoot.querySelectorAll('.whatsapp-memory-copy p')];
  let whatsappVideoUserPaused = false;
  let whatsappVideoPlayAttempted = false;
  let whatsappVideoPlayPending = false;
  let whatsappStoryPauseRequested = false;
  let whatsappResumeAfterStoryPause = false;

  function prepareWhatsAppMemoryTypewriter(paragraphs) {
    const events = [];
    let cursor = 0;
    paragraphs.forEach(paragraph => {
      const originalText = paragraph.textContent;
      paragraph.replaceChildren();
      const pieces = originalText.split(/(\s+)/).filter(Boolean);
      pieces.forEach(piece => {
        if (/^\s+$/.test(piece)) {
          paragraph.appendChild(document.createTextNode(piece));
          return;
        }
        const word = document.createElement('span');
        word.className = 'whatsapp-memory-word';
        for (const character of Array.from(piece)) {
          const glyph = document.createElement('span');
          glyph.className = 'whatsapp-memory-glyph';
          glyph.textContent = character;
          word.appendChild(glyph);
          events.push({ element: glyph, at: cursor });
          cursor += WHATSAPP_TYPE_INTERVAL_MS;
        }
        paragraph.appendChild(word);
      });
    });
    return { events, typingDuration: cursor };
  }

  const whatsappMemoryTypewriter = prepareWhatsAppMemoryTypewriter(whatsappCopyParagraphs);
  const whatsappMemoryDuration = Math.ceil(
    WHATSAPP_VIDEO_START_AT_MS + whatsappMemoryTypewriter.typingDuration + WHATSAPP_FINAL_HOLD_MS
  );

  whatsappVideo.addEventListener('play', () => {
    if (!whatsappStoryPauseRequested) whatsappVideoUserPaused = false;
  });
  whatsappVideo.addEventListener('pause', () => {
    if (whatsappStoryPauseRequested) {
      whatsappStoryPauseRequested = false;
      return;
    }
    if (!whatsappVideo.ended) whatsappVideoUserPaused = true;
  });

  function attemptWhatsAppVideoPlay() {
    if (paused || ended || whatsappVideoUserPaused || whatsappVideo.ended || whatsappVideoPlayAttempted || whatsappVideoPlayPending) return;
    whatsappVideoPlayAttempted = true;
    whatsappVideoPlayPending = true;
    const playResult = whatsappVideo.play();
    if (playResult && typeof playResult.then === 'function') {
      playResult.catch(error => {
        // The native Play control remains available if a browser blocks autoplay.
        console.info('WhatsApp video autoplay was not available; use the video Play control.', error);
      }).finally(() => { whatsappVideoPlayPending = false; });
    } else {
      whatsappVideoPlayPending = false;
    }
  }

  function pauseWhatsAppVideoForStory() {
    whatsappResumeAfterStoryPause = Boolean(whatsappVideo && !whatsappVideo.paused && !whatsappVideo.ended);
    if (whatsappResumeAfterStoryPause) {
      whatsappStoryPauseRequested = true;
      whatsappVideo.pause();
    }
  }

  function resumeWhatsAppVideoForStory() {
    const shouldResume = whatsappResumeAfterStoryPause;
    whatsappResumeAfterStoryPause = false;
    if (shouldResume && !whatsappVideoUserPaused && !whatsappVideo.ended && whatsappVideo.paused) {
      const playResult = whatsappVideo.play();
      if (playResult && typeof playResult.catch === 'function') {
        playResult.catch(error => console.info('WhatsApp video did not resume automatically.', error));
      }
    }
  }

  function stopWhatsAppVideoForNavigation() {
    whatsappResumeAfterStoryPause = false;
    if (!whatsappVideo.paused) {
      whatsappStoryPauseRequested = true;
      whatsappVideo.pause();
    }
    try { whatsappVideo.currentTime = 0; } catch (_) { /* metadata may not be ready */ }
    whatsappVideoUserPaused = false;
    whatsappVideoPlayAttempted = false;
    whatsappVideoPlayPending = false;
  }

  function updateWhatsAppMemory(localTime) {
    const introVisible = localTime >= WHATSAPP_INTRO_AT_MS;
    const videoVisible = localTime >= WHATSAPP_VIDEO_START_AT_MS;
    whatsappIntro.classList.toggle('is-visible', introVisible);
    whatsappVideoShell.classList.toggle('is-visible', videoVisible);
    whatsappMemoryTypewriter.events.forEach(event => {
      event.element.classList.toggle('is-visible', videoVisible && localTime >= WHATSAPP_VIDEO_START_AT_MS + event.at);
    });
    if (videoVisible && activeScene === 34) attemptWhatsAppVideoPlay();
  }

  // Scene 35: late-night WhatsApp video calls. Video and narration begin
  // together and run independently; the story transport coordinates both.
  const CALLS_INTRO_AT_MS = 420;
  const CALLS_VIDEO_START_AT_MS = 1050;
  const CALLS_TYPE_INTERVAL_MS = 70;
  const CALLS_FINAL_HOLD_MS = 10000;
  const whatsappCallsRoot = document.querySelector('.scene-whatsapp-calls');
  const whatsappCallsIntro = whatsappCallsRoot.querySelector('.whatsapp-calls-intro');
  const whatsappCallsVideoShell = whatsappCallsRoot.querySelector('.whatsapp-calls-video-shell');
  const whatsappCallsVideo = whatsappCallsRoot.querySelector('.whatsapp-calls-video');
  const whatsappCallsParagraphs = [...whatsappCallsRoot.querySelectorAll('.whatsapp-calls-copy p')];
  let callsVideoUserPaused = false;
  let callsVideoPlayAttempted = false;
  let callsVideoStoryPauseRequested = false;
  let callsVideoResumeAfterStoryPause = false;

  function prepareCallsTypewriter(paragraphs) {
    const events = [];
    let cursor = 0;
    paragraphs.forEach(paragraph => {
      const pieces = paragraph.textContent.split(/(\s+)/).filter(Boolean);
      paragraph.replaceChildren();
      pieces.forEach(piece => {
        if (/^\s+$/.test(piece)) { paragraph.appendChild(document.createTextNode(piece)); return; }
        const word = document.createElement('span'); word.className = 'whatsapp-calls-word';
        for (const character of Array.from(piece)) {
          const glyph = document.createElement('span'); glyph.className = 'whatsapp-calls-glyph';
          glyph.textContent = character; word.appendChild(glyph);
          events.push({ element: glyph, at: cursor }); cursor += CALLS_TYPE_INTERVAL_MS;
        }
        paragraph.appendChild(word);
      });
    });
    return { events, typingDuration: cursor };
  }
  const whatsappCallsTypewriter = prepareCallsTypewriter(whatsappCallsParagraphs);
  const whatsappCallsDuration = Math.ceil(CALLS_VIDEO_START_AT_MS + whatsappCallsTypewriter.typingDuration + CALLS_FINAL_HOLD_MS);

  whatsappCallsVideo.addEventListener('play', () => { if (!callsVideoStoryPauseRequested) callsVideoUserPaused = false; });
  whatsappCallsVideo.addEventListener('pause', () => {
    if (callsVideoStoryPauseRequested) { callsVideoStoryPauseRequested = false; return; }
    if (!whatsappCallsVideo.ended) callsVideoUserPaused = true;
  });
  function attemptCallsVideoPlay() {
    if (paused || ended || callsVideoUserPaused || whatsappCallsVideo.ended || callsVideoPlayAttempted) return;
    callsVideoPlayAttempted = true;
    const result = whatsappCallsVideo.play();
    if (result && typeof result.catch === 'function') result.catch(error => console.info('Video autoplay unavailable; use the video Play control.', error));
  }
  function pauseCallsVideoForStory() {
    callsVideoResumeAfterStoryPause = Boolean(!whatsappCallsVideo.paused && !whatsappCallsVideo.ended);
    if (callsVideoResumeAfterStoryPause) { callsVideoStoryPauseRequested = true; whatsappCallsVideo.pause(); }
  }
  function resumeCallsVideoForStory() {
    const shouldResume = callsVideoResumeAfterStoryPause; callsVideoResumeAfterStoryPause = false;
    if (shouldResume && !callsVideoUserPaused && !whatsappCallsVideo.ended && whatsappCallsVideo.paused) {
      const result = whatsappCallsVideo.play(); if (result && typeof result.catch === 'function') result.catch(() => {});
    }
  }
  function stopCallsVideoForNavigation() {
    callsVideoResumeAfterStoryPause = false;
    if (!whatsappCallsVideo.paused) { callsVideoStoryPauseRequested = true; whatsappCallsVideo.pause(); }
    try { whatsappCallsVideo.currentTime = 0; } catch (_) {}
    callsVideoUserPaused = false; callsVideoPlayAttempted = false;
  }
  function updateWhatsAppCalls(localTime) {
    const introVisible = localTime >= CALLS_INTRO_AT_MS;
    const videoVisible = localTime >= CALLS_VIDEO_START_AT_MS;
    whatsappCallsIntro.classList.toggle('is-visible', introVisible);
    whatsappCallsVideoShell.classList.toggle('is-visible', videoVisible);
    whatsappCallsTypewriter.events.forEach(event => event.element.classList.toggle('is-visible', videoVisible && localTime >= CALLS_VIDEO_START_AT_MS + event.at));
    if (videoVisible && activeScene === 35) attemptCallsVideoPlay();
  }

  // Character-by-character tracks used by the two latest scenes. The previous
  // build called this helper without defining it, which stopped script startup
  // before the opening poem could render. Build the spans once; story time then
  // controls visibility so pause/resume and scene navigation remain deterministic.
  function prepareCharacterTrack(elements, startDelay = 0, intervalMs = 70) {
    const events = [];
    let cursor = startDelay;
    let characterCount = 0;

    elements.forEach(element => {
      const originalText = element.textContent;
      element.replaceChildren();
      element.classList.add(
        element.closest('.scene-separation') ? 'separation-typed' : 'hope-typed'
      );

      for (const character of Array.from(originalText)) {
        const glyph = document.createElement('span');
        glyph.className = element.closest('.scene-separation')
          ? 'separation-glyph'
          : 'hope-glyph';
        glyph.textContent = character;
        element.appendChild(glyph);
        events.push({ element: glyph, at: cursor });
        cursor += intervalMs;
        characterCount += 1;
      }
    });

    return {
      events,
      characterCount,
      // End time is the timestamp immediately after the final character's slot.
      lastCharacterAt: characterCount ? cursor : startDelay
    };
  }

  // Scene 25: the academic choices now carry the entire separation scene.
  // The heading stays stationary; the two choices enter sequentially, then
  // the approved narration types continuously at 70ms per character.
  const separationChoiceHer = document.querySelector('.separation-choice-her');
  const separationChoiceMine = document.querySelector('.separation-choice-mine');
  const separationCopyElements = [...document.querySelectorAll('.separation-copy p')];
  const SEPARATION_HER_AT = 2200;
  const SEPARATION_MINE_AT = 3500;
  const SEPARATION_COPY_AT = 5050;
  const SEPARATION_TYPEWRITER_MS = 70;
  const SEPARATION_FINAL_HOLD_MS = 10000;

  const separationTrack = prepareCharacterTrack(
    separationCopyElements,
    SEPARATION_COPY_AT,
    SEPARATION_TYPEWRITER_MS
  );
  const separationDuration = Math.ceil(separationTrack.lastCharacterAt + SEPARATION_FINAL_HOLD_MS);

  function applyPopSettle(element, localTime, startAt, options = {}) {
    const popMs = options.popMs ?? 650;
    const holdMs = options.holdMs ?? 300;
    const settleMs = options.settleMs ?? 430;
    const startScale = options.startScale ?? .72;
    const peakScale = options.peakScale ?? 1.13;
    const endScale = options.endScale ?? 1;
    const lift = options.lift ?? 24;
    const t = localTime - startAt;
    const fade = easeOutCubic(t / Math.min(popMs, 450));
    let scale;
    let y;
    if (t < 0) {
      scale = startScale;
      y = lift;
    } else if (t <= popMs) {
      const p = easeOutBack(t / popMs);
      scale = startScale + (peakScale - startScale) * p;
      y = lift * (1 - easeOutCubic(t / popMs));
    } else if (t <= popMs + holdMs) {
      scale = peakScale;
      y = 0;
    } else {
      const p = smoothProgress((t - popMs - holdMs) / settleMs);
      scale = peakScale + (endScale - peakScale) * p;
      y = 0;
    }
    element.style.opacity = fade.toFixed(3);
    element.style.filter = `blur(${(2.6 * (1 - fade)).toFixed(2)}px)`;
    element.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
  }

  function updateSeparationScene(localTime) {
    applyPopSettle(separationChoiceHer, localTime, SEPARATION_HER_AT, {
      popMs: 690, holdMs: 180, settleMs: 420, startScale: .68, peakScale: 1.14, lift: 24
    });
    applyPopSettle(separationChoiceMine, localTime, SEPARATION_MINE_AT, {
      popMs: 690, holdMs: 180, settleMs: 420, startScale: .68, peakScale: 1.14, lift: 24
    });
    separationTrack.events.forEach(event => {
      event.element.classList.toggle('is-visible', localTime >= event.at);
    });
  }

  // Scene 26: the remaining connection, ending on ENGLISH TUITION.
  const hopeIntroBlock = document.querySelector('.hope-intro-block');
  const hopeIntroParagraph = document.querySelector('.hope-intro-copy');
  const hopeEnglishTitle = document.querySelector('.hope-english-title');
  const HOPE_TYPEWRITER_MS = 70;
  const HOPE_INTRO_START = 850;
  const hopeIntroTrack = prepareCharacterTrack([hopeIntroParagraph], HOPE_INTRO_START, HOPE_TYPEWRITER_MS);
  const HOPE_ENGLISH_WAIT_MS = 2000;
  const HOPE_ENGLISH_AT = hopeIntroTrack.lastCharacterAt + HOPE_ENGLISH_WAIT_MS;
  const HOPE_ENGLISH_POP_MS = 780;
  const HOPE_ENGLISH_HOLD_MS = 5000;
  const hopeIntroDuration = Math.ceil(HOPE_ENGLISH_AT + HOPE_ENGLISH_POP_MS + HOPE_ENGLISH_HOLD_MS);

  function updateHopeIntroScene(localTime) {
    hopeIntroBlock.style.opacity = '1';
    hopeIntroBlock.style.visibility = 'visible';
    hopeIntroBlock.style.display = 'flex';
    hopeIntroTrack.events.forEach(event => {
      event.element.classList.toggle('is-visible', localTime >= event.at);
    });
    const englishElapsed = localTime - HOPE_ENGLISH_AT;
    if (englishElapsed < 0) {
      hopeEnglishTitle.style.opacity = '0';
      hopeEnglishTitle.style.transform = 'translate3d(0, 18px, 0) scale(.82)';
      hopeEnglishTitle.style.filter = 'blur(3px)';
    } else {
      const enter = easeOutBack(englishElapsed / HOPE_ENGLISH_POP_MS);
      const settle = smoothProgress((englishElapsed - HOPE_ENGLISH_POP_MS) / 420);
      const scale = englishElapsed < HOPE_ENGLISH_POP_MS ? (.82 + (.28 * enter)) : (1.10 - .10 * settle);
      const y = englishElapsed < HOPE_ENGLISH_POP_MS ? 18 * (1 - easeOutCubic(englishElapsed / HOPE_ENGLISH_POP_MS)) : 0;
      const opacity = easeOutCubic(englishElapsed / 420);
      hopeEnglishTitle.style.opacity = opacity.toFixed(3);
      hopeEnglishTitle.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
      hopeEnglishTitle.style.filter = `blur(${(2.6 * (1 - opacity)).toFixed(2)}px)`;
    }
  }

  // Scene 27: a dedicated journey reveal. The small kicker sits above the
  // large main heading, followed by the map reveal, route trace and narration.
  const hopeJourneyBlock = document.querySelector('.hope-journey-block');
  const hopeMapFrame = document.querySelector('.hope-map-frame');
  const hopeRouteGlow = document.getElementById('hopeRouteGlow');
  const hopeRouteCore = document.getElementById('hopeRouteCore');
  const hopeRouteRunner = document.getElementById('hopeRouteRunner');
  const hopeWaypointElements = [...document.querySelectorAll('.hope-waypoints circle')];
  const hopeCopyElements = [...document.querySelectorAll('.hope-copy p')];
  const hopeRouteLength = hopeRouteCore.getTotalLength();
  [hopeRouteGlow, hopeRouteCore].forEach(path => {
    path.style.strokeDasharray = `${hopeRouteLength}`;
    path.style.strokeDashoffset = `${hopeRouteLength}`;
  });
  // Begin the map reveal soon after entering the scene. The route still gets
  // its own uninterrupted tracing beat before the map settles and narration starts.
  const HOPE_MAP_AT = 350;
  const HOPE_MAP_POP_MS = 900;
  const HOPE_ROUTE_AT = HOPE_MAP_AT + HOPE_MAP_POP_MS + 300;
  const HOPE_ROUTE_MS = 3600;
  const HOPE_ROUTE_HOLD_MS = 700;
  const HOPE_MAP_SHRINK_AT = HOPE_ROUTE_AT + HOPE_ROUTE_MS + HOPE_ROUTE_HOLD_MS;
  const HOPE_MAP_SHRINK_MS = 900;
  const HOPE_COPY_AT = HOPE_MAP_SHRINK_AT + HOPE_MAP_SHRINK_MS + 250;
  const hopeNarrationTrack = prepareCharacterTrack(hopeCopyElements, HOPE_COPY_AT, HOPE_TYPEWRITER_MS);
  const HOPE_FINAL_HOLD_MS = 10000;
  const hopeJourneyDuration = Math.ceil(hopeNarrationTrack.lastCharacterAt + HOPE_FINAL_HOLD_MS);

  function updateHopeJourneyScene(localTime) {
    // The journey content was initially display:none in CSS. Reveal its
    // parent when Scene 27 becomes active; otherwise the map and typewriter
    // glyphs update invisibly inside a permanently hidden container.
    hopeJourneyBlock.style.display = 'flex';
    hopeJourneyBlock.style.visibility = 'visible';
    const mapElapsed = localTime - HOPE_MAP_AT;
    if (mapElapsed < 0) {
      hopeMapFrame.style.opacity = '0';
      hopeMapFrame.style.filter = 'blur(3px)';
      hopeMapFrame.style.transform = 'translate3d(0, 28px, 0) scale(.76)';
      hopeMapFrame.style.width = `${hopeInitialMapWidth()}%`;
    } else {
      const popP = clamp01(mapElapsed / HOPE_MAP_POP_MS);
      const popEase = easeOutBack(popP);
      const fade = easeOutCubic(mapElapsed / 500);
      let scale = .76 + (.34 * popEase);
      let y = 28 * (1 - easeOutCubic(popP));
      const initialWidth = hopeInitialMapWidth();
      let width = initialWidth;
      if (localTime >= HOPE_MAP_SHRINK_AT) {
        const shrinkP = smoothProgress((localTime - HOPE_MAP_SHRINK_AT) / HOPE_MAP_SHRINK_MS);
        width = initialWidth + ((hopeFinalMapWidth() - initialWidth) * shrinkP);
        scale = 1.10 + (1 - 1.10) * shrinkP;
        y = 1.5 * shrinkP;
      }
      hopeMapFrame.style.width = `${width.toFixed(2)}%`;
      hopeMapFrame.style.opacity = fade.toFixed(3);
      hopeMapFrame.style.filter = `blur(${(3 * (1 - fade)).toFixed(2)}px)`;
      hopeMapFrame.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    }

    const routeP = smoothProgress((localTime - HOPE_ROUTE_AT) / HOPE_ROUTE_MS);
    const routeOffset = hopeRouteLength * (1 - routeP);
    hopeRouteGlow.style.strokeDashoffset = `${routeOffset}`;
    hopeRouteCore.style.strokeDashoffset = `${routeOffset}`;
    hopeRouteRunner.style.opacity = (routeP > 0 && routeP < 1 ? 1 : 0).toFixed(3);
    if (routeP > 0 && routeP <= 1) {
      const point = hopeRouteCore.getPointAtLength(hopeRouteLength * routeP);
      hopeRouteRunner.setAttribute('cx', point.x.toFixed(2));
      hopeRouteRunner.setAttribute('cy', point.y.toFixed(2));
    }
    hopeWaypointElements.forEach(dot => {
      const stopProgress = Number(dot.dataset.routeProgress || 1);
      const reveal = clamp01((routeP - stopProgress) / 0.035);
      dot.style.opacity = reveal.toFixed(3);
      dot.style.transformBox = 'fill-box';
      dot.style.transformOrigin = 'center';
      dot.style.transform = `scale(${(0.72 + 0.28 * reveal).toFixed(3)})`;
    });
    hopeNarrationTrack.events.forEach(event => {
      event.element.classList.toggle('is-visible', localTime >= event.at);
    });
  }

  function hopeInitialMapWidth() {
    if (window.matchMedia('(max-width: 650px)').matches) return 90;
    if (window.matchMedia('(max-height: 700px)').matches) return 70;
    return 72;
  }

  // At least 10% smaller than the previous permanent map dimensions.
  function hopeFinalMapWidth() {
    return window.matchMedia('(max-width: 650px)').matches ? 73 : 55;
  }

  // Scene 37: the title stays visible and stationary while the narration
  // types continuously, one character every 70ms. Hold for 10 seconds after
  // the final character appears.
  const JUST_A_GLIMPSE_TYPE_INTERVAL_MS = 70;
  const JUST_A_GLIMPSE_FINAL_HOLD_MS = 10000;
  const justAGlimpseParagraphs = [...document.querySelectorAll('.just-a-glimpse-copy p')];

  function prepareJustAGlimpseTypewriter(paragraphs) {
    const events = [];
    let cursor = 0;
    paragraphs.forEach(paragraph => {
      const originalText = paragraph.textContent;
      paragraph.replaceChildren();
      for (const character of Array.from(originalText)) {
        if (/\s/.test(character)) {
          paragraph.appendChild(document.createTextNode(character));
        } else {
          const glyph = document.createElement('span');
          glyph.className = 'just-a-glimpse-glyph';
          glyph.textContent = character;
          paragraph.appendChild(glyph);
        }
        // Spaces and punctuation count toward the requested 70ms cadence.
        const glyph = paragraph.lastElementChild;
        if (glyph && glyph.classList.contains('just-a-glimpse-glyph')) {
          events.push({ element: glyph, at: cursor });
        }
        cursor += JUST_A_GLIMPSE_TYPE_INTERVAL_MS;
      }
    });
    return { events, typingDuration: cursor };
  }

  const justAGlimpseTypewriter = prepareJustAGlimpseTypewriter(justAGlimpseParagraphs);
  const justAGlimpseDuration = Math.ceil(
    justAGlimpseTypewriter.typingDuration + JUST_A_GLIMPSE_FINAL_HOLD_MS
  );

  // Scenes 38–39: stationary titles with continuous 70ms-per-character
  // narration and a 10-second hold after the final character appears.
  const CHAPTER_TEXT_TYPE_INTERVAL_MS = 70;
  const CHAPTER_TEXT_FINAL_HOLD_MS = 10000;

  function prepareChapterTextTypewriter(paragraphs, glyphClass) {
    const events = [];
    let cursor = 0;
    paragraphs.forEach(paragraph => {
      const originalText = paragraph.textContent;
      paragraph.replaceChildren();
      for (const character of Array.from(originalText)) {
        if (/\s/.test(character)) {
          paragraph.appendChild(document.createTextNode(character));
        } else {
          const glyph = document.createElement('span');
          glyph.className = glyphClass;
          glyph.textContent = character;
          paragraph.appendChild(glyph);
          events.push({ element: glyph, at: cursor });
        }
        cursor += CHAPTER_TEXT_TYPE_INTERVAL_MS;
      }
    });
    return { events, typingDuration: cursor };
  }

  const returningHomeTypewriter = prepareChapterTextTypewriter(
    [...document.querySelectorAll('.returning-home-copy p')], 'chapter-text-glyph'
  );
  const returningHomeDuration = Math.ceil(
    returningHomeTypewriter.typingDuration + CHAPTER_TEXT_FINAL_HOLD_MS
  );
  const closerApartTypewriter = prepareChapterTextTypewriter(
    [...document.querySelectorAll('.closer-apart-copy p')], 'chapter-text-glyph'
  );
  const closerApartDuration = Math.ceil(
    closerApartTypewriter.typingDuration + CHAPTER_TEXT_FINAL_HOLD_MS
  );


  // Scene 40: the WhatsApp recording appears first, followed by the four
  // photographs one by one. The narration begins 2s after the final image.
  const SECOND_DROP_VIDEO_FIRST_AT_MS = 350;
  const SECOND_DROP_VIDEO_FADE_MS = 420;
  const SECOND_DROP_PHOTO_FIRST_AFTER_VIDEO_MS = 240;
  const SECOND_DROP_PHOTO_STAGGER_MS = 420;
  const SECOND_DROP_PHOTO_FADE_MS = 380;
  const SECOND_DROP_NARRATION_GAP_MS = 2000;
  const SECOND_DROP_FINAL_HOLD_MS = 5000;
  const secondDropRoot = document.querySelector('.scene-second-drop-connection');
  const secondDropVideoShell = secondDropRoot.querySelector('.second-drop-connection-video-shell');
  const secondDropVideo = secondDropRoot.querySelector('.second-drop-connection-video');
  const secondDropPhotos = [...secondDropRoot.querySelectorAll('.second-drop-connection-photo')];
  const secondDropVideoAt = SECOND_DROP_VIDEO_FIRST_AT_MS;
  const secondDropPhotoFirstAt = secondDropVideoAt + SECOND_DROP_VIDEO_FADE_MS + SECOND_DROP_PHOTO_FIRST_AFTER_VIDEO_MS;
  const secondDropPhotoTimes = secondDropPhotos.map((_, i) => secondDropPhotoFirstAt + i * SECOND_DROP_PHOTO_STAGGER_MS);
  const secondDropNarrationStartAt = secondDropPhotoTimes[secondDropPhotoTimes.length - 1] + SECOND_DROP_PHOTO_FADE_MS + SECOND_DROP_NARRATION_GAP_MS;
  const secondDropCopyParagraphs = [...secondDropRoot.querySelectorAll('.second-drop-connection-copy p')];
  const secondDropConnectionTypewriter = prepareChapterTextTypewriter(
    secondDropCopyParagraphs, 'second-drop-connection-glyph'
  );
  const secondDropConnectionDuration = Math.ceil(
    secondDropNarrationStartAt + secondDropConnectionTypewriter.typingDuration + SECOND_DROP_FINAL_HOLD_MS
  );

  // Scene 41: January 23, 2026 — three photographs from the first proper date
  // in Tufanganj. Each photo pops into its permanent position, holds for 2s,
  // and settles before the next one begins. Narration then types at 70ms/char.
  const JAN23_PHOTO_START_MS = 500;
  const JAN23_PHOTO_POP_MS = 550;
  const JAN23_PHOTO_HOLD_MS = 2000;
  const JAN23_PHOTO_SETTLE_MS = 550;
  const JAN23_PHOTO_BETWEEN_MS = 250;
  const JAN23_COPY_GAP_MS = 450;
  const JAN23_FINAL_HOLD_MS = 10000;
  const jan23Root = document.querySelector('.scene-jan23-date');
  const jan23Photos = [...jan23Root.querySelectorAll('.jan23-date-photo')];
  const jan23CopyParagraphs = [...jan23Root.querySelectorAll('.jan23-date-copy p')];
  const jan23Typewriter = prepareChapterTextTypewriter(jan23CopyParagraphs, 'jan23-date-glyph');
  const jan23PhotoCycle = JAN23_PHOTO_POP_MS + JAN23_PHOTO_HOLD_MS + JAN23_PHOTO_SETTLE_MS + JAN23_PHOTO_BETWEEN_MS;
  const jan23PhotoStarts = jan23Photos.map((_, i) => JAN23_PHOTO_START_MS + i * jan23PhotoCycle);
  const jan23NarrationStartAt = jan23PhotoStarts[jan23PhotoStarts.length - 1] + JAN23_PHOTO_POP_MS + JAN23_PHOTO_HOLD_MS + JAN23_PHOTO_SETTLE_MS + JAN23_COPY_GAP_MS;
  const jan23DateDuration = Math.ceil(jan23NarrationStartAt + jan23Typewriter.typingDuration + JAN23_FINAL_HOLD_MS);

  function updateJan23Date(localTime) {
    jan23Photos.forEach((photo, i) => {
      applyPopSettle(photo, localTime, jan23PhotoStarts[i], {
        popMs: JAN23_PHOTO_POP_MS,
        holdMs: JAN23_PHOTO_HOLD_MS,
        settleMs: JAN23_PHOTO_SETTLE_MS,
        startScale: .72,
        peakScale: 1.08,
        endScale: 1,
        lift: 18
      });
    });
    jan23Typewriter.events.forEach(event => {
      event.element.classList.toggle('is-visible', localTime >= jan23NarrationStartAt + event.at);
    });
  }

  // Scene 42: the two photographs appear one after another in the centre,
  // hold for 2 seconds, then settle outward to frame the muted video.
  const LAST_GLIMPSES_PHOTO_START_MS = 500;
  const LAST_GLIMPSES_POP_MS = 550;
  const LAST_GLIMPSES_HOLD_MS = 2000;
  const LAST_GLIMPSES_SETTLE_MS = 550;
  const LAST_GLIMPSES_BETWEEN_MS = 250;
  const LAST_GLIMPSES_VIDEO_GAP_MS = 250;
  const LAST_GLIMPSES_VIDEO_FADE_MS = 420;
  const LAST_GLIMPSES_COPY_GAP_MS = 2000;
  const LAST_GLIMPSES_FINAL_HOLD_MS = 10000;
  const lastGlimpsesRoot = document.querySelector('.scene-last-glimpses');
  const lastGlimpsesPhotos = [...lastGlimpsesRoot.querySelectorAll('.last-glimpses-photo')];
  const lastGlimpsesVideoShell = lastGlimpsesRoot.querySelector('.last-glimpses-video-shell');
  const lastGlimpsesVideo = lastGlimpsesRoot.querySelector('.last-glimpses-video');
  const lastGlimpsesAudioToggle = lastGlimpsesRoot.querySelector('.last-glimpses-audio-toggle');
  const lastGlimpsesCopyParagraphs = [...lastGlimpsesRoot.querySelectorAll('.last-glimpses-copy p')];
  const lastGlimpsesTypewriter = prepareChapterTextTypewriter(lastGlimpsesCopyParagraphs, 'last-glimpses-glyph');
  const LAST_GLIMPSES_PHOTO_CYCLE_MS = LAST_GLIMPSES_POP_MS + LAST_GLIMPSES_HOLD_MS + LAST_GLIMPSES_SETTLE_MS + LAST_GLIMPSES_BETWEEN_MS;
  const lastGlimpsesPhotoStarts = lastGlimpsesPhotos.map((_, i) => LAST_GLIMPSES_PHOTO_START_MS + i * LAST_GLIMPSES_PHOTO_CYCLE_MS);
  const lastGlimpsesVideoAt = lastGlimpsesPhotoStarts[lastGlimpsesPhotoStarts.length - 1] + LAST_GLIMPSES_POP_MS + LAST_GLIMPSES_HOLD_MS + LAST_GLIMPSES_SETTLE_MS + LAST_GLIMPSES_VIDEO_GAP_MS;
  const lastGlimpsesCopyStartAt = lastGlimpsesVideoAt + LAST_GLIMPSES_VIDEO_FADE_MS + LAST_GLIMPSES_COPY_GAP_MS;
  const lastGlimpsesDuration = Math.ceil(lastGlimpsesCopyStartAt + lastGlimpsesTypewriter.typingDuration + LAST_GLIMPSES_FINAL_HOLD_MS);

  function applyLastGlimpsePhoto(photo, localTime, startAt, direction) {
    const elapsed = localTime - startAt;
    const fullCycle = LAST_GLIMPSES_POP_MS + LAST_GLIMPSES_HOLD_MS + LAST_GLIMPSES_SETTLE_MS;
    if (elapsed < 0) {
      photo.style.opacity = '0';
      photo.style.filter = 'blur(2.5px)';
      photo.style.transform = `translate3d(${direction * 110}%, 0, 0) scale(.72)`;
      return;
    }
    let opacity = 1;
    let blur = 0;
    let translate = direction * 110;
    let scale = 1.08;
    if (elapsed < LAST_GLIMPSES_POP_MS) {
      const p = smoothstep(Math.max(0, Math.min(1, elapsed / LAST_GLIMPSES_POP_MS)));
      opacity = p;
      blur = (1 - p) * 2.5;
      scale = lerp(.72, 1.08, p);
    } else if (elapsed >= LAST_GLIMPSES_POP_MS + LAST_GLIMPSES_HOLD_MS) {
      const p = smoothstep(Math.max(0, Math.min(1, (elapsed - LAST_GLIMPSES_POP_MS - LAST_GLIMPSES_HOLD_MS) / LAST_GLIMPSES_SETTLE_MS)));
      translate = direction * 110 * (1 - p);
      scale = lerp(1.08, 1, p);
    }
    if (elapsed >= fullCycle) { translate = 0; scale = 1; opacity = 1; blur = 0; }
    photo.style.opacity = String(opacity);
    photo.style.filter = `blur(${blur.toFixed(2)}px)`;
    photo.style.transform = `translate3d(${translate.toFixed(2)}%, 0, 0) scale(${scale.toFixed(3)})`;
  }

  function syncLastGlimpsesAudioButton() {
    const isMuted = lastGlimpsesVideo.muted;
    lastGlimpsesAudioToggle.textContent = isMuted ? 'Unmute' : 'Mute';
    lastGlimpsesAudioToggle.setAttribute('aria-label', isMuted ? 'Unmute video' : 'Mute video');
    lastGlimpsesAudioToggle.setAttribute('aria-pressed', String(!isMuted));
  }
  lastGlimpsesAudioToggle.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    lastGlimpsesVideo.muted = !lastGlimpsesVideo.muted;
    syncLastGlimpsesAudioButton();
  });
  lastGlimpsesVideo.addEventListener('volumechange', syncLastGlimpsesAudioButton);
  lastGlimpsesVideo.muted = true;
  syncLastGlimpsesAudioButton();

  let lastGlimpsesVideoUserPaused = false;
  let lastGlimpsesVideoPlayAttempted = false;
  let lastGlimpsesVideoStoryPauseRequested = false;
  let lastGlimpsesVideoResumeAfterStoryPause = false;
  lastGlimpsesVideo.addEventListener('play', () => {
    if (!lastGlimpsesVideoStoryPauseRequested) lastGlimpsesVideoUserPaused = false;
  });
  lastGlimpsesVideo.addEventListener('pause', () => {
    if (lastGlimpsesVideoStoryPauseRequested) { lastGlimpsesVideoStoryPauseRequested = false; return; }
    if (!lastGlimpsesVideo.ended) lastGlimpsesVideoUserPaused = true;
  });
  function attemptLastGlimpsesVideoPlay() {
    if (paused || ended || lastGlimpsesVideoUserPaused || lastGlimpsesVideo.ended || lastGlimpsesVideoPlayAttempted) return;
    lastGlimpsesVideoPlayAttempted = true;
    const result = lastGlimpsesVideo.play();
    if (result && typeof result.catch === 'function') result.catch(error => console.info('Last-glimpses video autoplay unavailable; use its Play control.', error));
  }
  function pauseLastGlimpsesVideoForStory() {
    lastGlimpsesVideoResumeAfterStoryPause = Boolean(!lastGlimpsesVideo.paused && !lastGlimpsesVideo.ended);
    if (lastGlimpsesVideoResumeAfterStoryPause) { lastGlimpsesVideoStoryPauseRequested = true; lastGlimpsesVideo.pause(); }
  }
  function resumeLastGlimpsesVideoForStory() {
    const shouldResume = lastGlimpsesVideoResumeAfterStoryPause;
    lastGlimpsesVideoResumeAfterStoryPause = false;
    if (shouldResume && !lastGlimpsesVideoUserPaused && !lastGlimpsesVideo.ended && lastGlimpsesVideo.paused) {
      const result = lastGlimpsesVideo.play();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    }
  }
  function stopLastGlimpsesVideoForNavigation() {
    lastGlimpsesVideoResumeAfterStoryPause = false;
    if (!lastGlimpsesVideo.paused) { lastGlimpsesVideoStoryPauseRequested = true; lastGlimpsesVideo.pause(); }
    try { lastGlimpsesVideo.currentTime = 0; } catch (_) { /* metadata may not be ready */ }
    lastGlimpsesVideo.muted = true;
    syncLastGlimpsesAudioButton();
    lastGlimpsesVideoUserPaused = false;
    lastGlimpsesVideoPlayAttempted = false;
  }
  function updateLastGlimpses(localTime) {
    applyLastGlimpsePhoto(lastGlimpsesPhotos[0], localTime, lastGlimpsesPhotoStarts[0], 1);
    applyLastGlimpsePhoto(lastGlimpsesPhotos[1], localTime, lastGlimpsesPhotoStarts[1], -1);
    const videoVisible = localTime >= lastGlimpsesVideoAt;
    lastGlimpsesVideoShell.classList.toggle('is-visible', videoVisible);
    lastGlimpsesTypewriter.events.forEach(event => {
      event.element.classList.toggle('is-visible', localTime >= lastGlimpsesCopyStartAt + event.at);
    });
    if (videoVisible && activeScene === 42) attemptLastGlimpsesVideoPlay();
  }

  let secondDropVideoUserPaused = false;
  let secondDropVideoPlayAttempted = false;
  let secondDropVideoStoryPauseRequested = false;
  let secondDropVideoResumeAfterStoryPause = false;

  secondDropVideo.addEventListener('play', () => {
    if (!secondDropVideoStoryPauseRequested) secondDropVideoUserPaused = false;
  });
  secondDropVideo.addEventListener('pause', () => {
    if (secondDropVideoStoryPauseRequested) {
      secondDropVideoStoryPauseRequested = false;
      return;
    }
    if (!secondDropVideo.ended) secondDropVideoUserPaused = true;
  });

  function attemptSecondDropVideoPlay() {
    if (paused || ended || secondDropVideoUserPaused || secondDropVideo.ended || secondDropVideoPlayAttempted) return;
    secondDropVideoPlayAttempted = true;
    const result = secondDropVideo.play();
    if (result && typeof result.catch === 'function') {
      result.catch(error => console.info('WhatsApp recording autoplay unavailable; use the video Play control.', error));
    }
  }

  function pauseSecondDropVideoForStory() {
    secondDropVideoResumeAfterStoryPause = Boolean(!secondDropVideo.paused && !secondDropVideo.ended);
    if (secondDropVideoResumeAfterStoryPause) {
      secondDropVideoStoryPauseRequested = true;
      secondDropVideo.pause();
    }
  }

  function resumeSecondDropVideoForStory() {
    const shouldResume = secondDropVideoResumeAfterStoryPause;
    secondDropVideoResumeAfterStoryPause = false;
    if (shouldResume && !secondDropVideoUserPaused && !secondDropVideo.ended && secondDropVideo.paused) {
      const result = secondDropVideo.play();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    }
  }

  function stopSecondDropVideoForNavigation() {
    secondDropVideoResumeAfterStoryPause = false;
    if (!secondDropVideo.paused) {
      secondDropVideoStoryPauseRequested = true;
      secondDropVideo.pause();
    }
    try { secondDropVideo.currentTime = 0; } catch (_) { /* metadata may not be ready */ }
    secondDropVideoUserPaused = false;
    secondDropVideoPlayAttempted = false;
  }

  function updateSecondDropConnection(localTime) {
    const videoVisible = localTime >= secondDropVideoAt;
    secondDropVideoShell.classList.toggle('is-visible', videoVisible);
    secondDropPhotos.forEach((photo, i) => {
      photo.classList.toggle('is-visible', localTime >= secondDropPhotoTimes[i]);
    });
    secondDropConnectionTypewriter.events.forEach(event => {
      event.element.classList.toggle('is-visible', localTime >= secondDropNarrationStartAt + event.at);
    });
    if (videoVisible && activeScene === 40) attemptSecondDropVideoPlay();
  }

  // Scenes 43–45: the Holi incident, the waiting period, and the breakup.
  const NEW_MEMORY_FINAL_HOLD_MS = 10000;
  const HOLI_REFLECTION_START_MS = 450;
  const holiReflectionRoot = document.querySelector('.scene-holi-reflection');
  const holiReflectionCopy = [...holiReflectionRoot.querySelectorAll('.holi-reflection-copy p')];
  const holiReflectionTypewriter = prepareChapterTextTypewriter(holiReflectionCopy, 'new-memory-glyph');
  const holiReflectionDuration = Math.ceil(HOLI_REFLECTION_START_MS + holiReflectionTypewriter.typingDuration + NEW_MEMORY_FINAL_HOLD_MS);

  const WAITING_DAYS_SCREENSHOT_START_MS = 500;
  const WAITING_DAYS_SCREENSHOT_POP_MS = 550;
  const WAITING_DAYS_SCREENSHOT_HOLD_MS = 2000;
  const WAITING_DAYS_SCREENSHOT_SETTLE_MS = 550;
  const WAITING_DAYS_COPY_GAP_MS = 450;
  const WAITING_DAYS_NARRATION_START_MS = WAITING_DAYS_SCREENSHOT_START_MS + WAITING_DAYS_SCREENSHOT_POP_MS + WAITING_DAYS_SCREENSHOT_HOLD_MS + WAITING_DAYS_SCREENSHOT_SETTLE_MS + WAITING_DAYS_COPY_GAP_MS;
  const waitingDaysRoot = document.querySelector('.scene-waiting-days');
  const waitingDaysScreenshotFrame = waitingDaysRoot.querySelector('.waiting-days-screenshot-frame');
  const waitingDaysCopy = [...waitingDaysRoot.querySelectorAll('.waiting-days-copy p')];
  const waitingDaysTypewriter = prepareChapterTextTypewriter(waitingDaysCopy, 'new-memory-glyph');
  const waitingDaysDuration = Math.ceil(WAITING_DAYS_NARRATION_START_MS + waitingDaysTypewriter.typingDuration + NEW_MEMORY_FINAL_HOLD_MS);

  const BREAKUP_VIDEO_AT_MS = 450;
  const BREAKUP_VIDEO_FADE_MS = 380;
  const BREAKUP_COPY_GAP_MS = 2000;
  const BREAKUP_NARRATION_START_MS = BREAKUP_VIDEO_AT_MS + BREAKUP_VIDEO_FADE_MS + BREAKUP_COPY_GAP_MS;
  const breakupRoot = document.querySelector('.scene-breakup-day');
  const breakupVideoShell = breakupRoot.querySelector('.breakup-video-shell');
  const breakupVideo = breakupRoot.querySelector('.breakup-conversation-video');
  const breakupCopy = [...breakupRoot.querySelectorAll('.breakup-day-copy p')];
  const breakupTypewriter = prepareChapterTextTypewriter(breakupCopy, 'new-memory-glyph');
  const breakupDuration = Math.ceil(BREAKUP_NARRATION_START_MS + breakupTypewriter.typingDuration + NEW_MEMORY_FINAL_HOLD_MS);

  // Scenes 46–48: the period after the breakup and the June 1 introduction.
  const AFTER_BREAKUP_TEXT_START_MS = 450;
  const afterBreakupHopeTypewriter = prepareChapterTextTypewriter(
    [...document.querySelectorAll('.after-breakup-hope-copy p')], 'new-memory-glyph'
  );
  const afterBreakupHopeDuration = Math.ceil(
    AFTER_BREAKUP_TEXT_START_MS + afterBreakupHopeTypewriter.typingDuration + NEW_MEMORY_FINAL_HOLD_MS
  );
  const anotherChanceTypewriter = prepareChapterTextTypewriter(
    [...document.querySelectorAll('.another-chance-copy p')], 'new-memory-glyph'
  );
  const anotherChanceDuration = Math.ceil(
    AFTER_BREAKUP_TEXT_START_MS + anotherChanceTypewriter.typingDuration + NEW_MEMORY_FINAL_HOLD_MS
  );
  const whatICameToKnowTypewriter = prepareChapterTextTypewriter(
    [...document.querySelectorAll('.what-i-came-to-know-copy p')], 'new-memory-glyph'
  );
  const WHAT_CHAT_AFTER_INTRO_MS = 3000;
  const WHAT_CHAT_WORD_INTERVAL_MS = 330;
  const WHAT_CHAT_FINAL_EXTRA_HOLD_MS = 5000;
  const whatChatFeed = document.getElementById('whatChatFeed');
  const whatChatMessages = [...whatChatFeed.querySelectorAll('[data-chat-message]')];
  // Count linguistic word tokens rather than spaces so punctuation such as
  // "......" and ".." never adds a false word to the agreed reading delay.
  const whatChatSchedule = whatChatMessages.map((element, index) => {
    const text = element.querySelector('.what-chat-bubble').textContent;
    const words = (text.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g) || []).length;
    const at = whatChatMessages.slice(0, index).reduce((sum, previous) => {
      const previousText = previous.querySelector('.what-chat-bubble').textContent;
      return sum + (previousText.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g) || []).length * WHAT_CHAT_WORD_INTERVAL_MS;
    }, 0);
    return { element, at, words };
  });
  const WHAT_CHAT_START_MS = AFTER_BREAKUP_TEXT_START_MS + whatICameToKnowTypewriter.typingDuration + WHAT_CHAT_AFTER_INTRO_MS;
  const whatChatReadingTotalMs = whatChatSchedule.reduce(
    (sum, item) => sum + item.words * WHAT_CHAT_WORD_INTERVAL_MS, 0
  );
  const whatICameToKnowDuration = Math.ceil(
    WHAT_CHAT_START_MS + whatChatReadingTotalMs + WHAT_CHAT_FINAL_EXTRA_HOLD_MS
  );

  // Scene 49: two independent vertical timeline columns. The first four events
  // reveal down the left column; the final three continue down the right.
  // Each card remains visible for 0.33s per displayed word before the next card.
  const thingsStage = document.getElementById('thingsStage');
  const thingsIntro = thingsStage.querySelector('.things-intro');
  const thingsIntroTypewriter = prepareChapterTextTypewriter([thingsIntro], 'new-memory-glyph');
  const THINGS_TIMELINE_START_GAP_MS = 2000;
  const THINGS_WORD_INTERVAL_MS = 330;
  const thingsEvents = [...thingsStage.querySelectorAll('.things-event')];
  let thingsTimelineCursor = THINGS_TIMELINE_START_GAP_MS;
  const thingsTimelineSchedule = thingsEvents.map(element => {
    const words = countWords(element.textContent);
    const item = { element, at: thingsTimelineCursor, words };
    thingsTimelineCursor += words * THINGS_WORD_INTERVAL_MS;
    return item;
  });
  const thingsNarration = [...thingsStage.querySelectorAll('.things-narration p')];
  const lastThingsEvent = thingsTimelineSchedule.length
    ? thingsTimelineSchedule[thingsTimelineSchedule.length - 1]
    : null;
  const lastThingsEventAt = lastThingsEvent
    ? lastThingsEvent.at
    : THINGS_TIMELINE_START_GAP_MS;
  // Keep the final timeline card on screen for its full reading interval too.
  // Only after that 0.33s-per-word interval does the narration begin.
  const lastThingsEventReadingMs = lastThingsEvent
    ? lastThingsEvent.words * THINGS_WORD_INTERVAL_MS
    : 0;
  const thingsNarrationStartMs = AFTER_BREAKUP_TEXT_START_MS + thingsIntroTypewriter.typingDuration + lastThingsEventAt + lastThingsEventReadingMs;
  const thingsNarrationTypewriter = prepareChapterTextTypewriter(thingsNarration, 'new-memory-glyph');
  const thingsDuration = Math.ceil(
    thingsNarrationStartMs + thingsNarrationTypewriter.typingDuration + NEW_MEMORY_FINAL_HOLD_MS
  );

  let breakupVideoUserPaused = false;
  let breakupVideoPlayAttempted = false;
  let breakupVideoStoryPauseRequested = false;
  let breakupVideoResumeAfterStoryPause = false;
  breakupVideo.muted = true;
  breakupVideo.addEventListener('play', () => {
    if (!breakupVideoStoryPauseRequested) breakupVideoUserPaused = false;
  });
  breakupVideo.addEventListener('pause', () => {
    if (breakupVideoStoryPauseRequested) { breakupVideoStoryPauseRequested = false; return; }
    if (!breakupVideo.ended) breakupVideoUserPaused = true;
  });
  function attemptBreakupVideoPlay() {
    if (paused || ended || breakupVideoUserPaused || breakupVideo.ended || breakupVideoPlayAttempted) return;
    breakupVideoPlayAttempted = true;
    const result = breakupVideo.play();
    if (result && typeof result.catch === 'function') result.catch(error => console.info('Breakup recording autoplay unavailable; use its Play control.', error));
  }
  function pauseBreakupVideoForStory() {
    breakupVideoResumeAfterStoryPause = Boolean(!breakupVideo.paused && !breakupVideo.ended);
    if (breakupVideoResumeAfterStoryPause) { breakupVideoStoryPauseRequested = true; breakupVideo.pause(); }
  }
  function resumeBreakupVideoForStory() {
    const shouldResume = breakupVideoResumeAfterStoryPause;
    breakupVideoResumeAfterStoryPause = false;
    if (shouldResume && !breakupVideoUserPaused && !breakupVideo.ended && breakupVideo.paused) {
      const result = breakupVideo.play();
      if (result && typeof result.catch === 'function') result.catch(() => {});
    }
  }
  function stopBreakupVideoForNavigation() {
    breakupVideoResumeAfterStoryPause = false;
    if (!breakupVideo.paused) { breakupVideoStoryPauseRequested = true; breakupVideo.pause(); }
    try { breakupVideo.currentTime = 0; } catch (_) { /* metadata may not be ready */ }
    breakupVideoUserPaused = false;
    breakupVideoPlayAttempted = false;
  }
  function updateNewMemoryTypewriter(typewriter, localTime, startAt) {
    typewriter.events.forEach(event => {
      event.element.classList.toggle('is-visible', localTime >= startAt + event.at);
    });
  }
  function updateBreakupScene(localTime) {
    const videoVisible = localTime >= BREAKUP_VIDEO_AT_MS;
    breakupVideoShell.classList.toggle('is-visible', videoVisible);
    updateNewMemoryTypewriter(breakupTypewriter, localTime, BREAKUP_NARRATION_START_MS);
    if (videoVisible && activeScene === 45) attemptBreakupVideoPlay();
  }

  const sceneDefs = [
    { name: 'opening', duration: poemDuration },
    { name: 'date', duration: 5500 },
    { name: 'chat', duration: 12000 },
    { name: 'closing', duration: sectionDuration([closingTrack], closingTrack.totalWords) },
    { name: 'days-intro', duration: sectionDuration([daysTrack], daysTrack.totalWords) },
    { name: 'phones', duration: phonesDuration },
    { name: 'name', duration: Math.ceil(nameDuration) },
    { name: 'photo', duration: Math.ceil(photoDuration) },
    { name: 'archive', duration: archiveDuration },
    { name: 'nov24', duration: nov24Duration },
    { name: 'cancelled', duration: sectionDuration([cancelledTrack], cancelledTrack.totalWords) },
    { name: 'arrival', duration: sectionDuration([arrivalTrack], arrivalTrack.totalWords) },
    { name: 'sunset', duration: sectionDuration([sunsetTrack], sunsetTrack.totalWords) },
    { name: 'nerves', duration: sectionDuration([nervesTrack], nervesTrack.totalWords) },
    { name: 'confession-poem', duration: confessionPoemDuration },
    { name: 'reply-wait', duration: sectionDuration([replyTrack], replyTrack.totalWords) },
    { name: 'night', duration: nightDuration },
    { name: 'yes', duration: yesDuration },
    { name: 'afterglow', duration: sectionDuration([afterglowTrack], afterglowTrack.totalWords) },
    { name: 'first-selfies', duration: firstSelfiesDuration },
    { name: 'profile-memory', duration: profileMemoryDuration },
    { name: 'red-outfit', duration: redOutfitMemory.duration },
    { name: 'picnic', duration: picnicMemory.duration },
    { name: 'little-pictures', duration: littlePicturesMemory.duration },
    { name: 'last-together', duration: lastTogetherMemory.duration },
    { name: 'separation', duration: separationDuration },
    { name: 'hope-intro', duration: hopeIntroDuration },
    { name: 'hope-journey', duration: hopeJourneyDuration },
    { name: 'early-tuition', duration: earlyTuitionMemory.duration },
    { name: 'little-moments', duration: littleMomentsMemory.duration },
    { name: 'durga-puja', duration: durgaPujaMemory.duration },
    { name: 'saraswati-puja', duration: saraswatiPujaMemory.duration },
    { name: 'tuition-ending', duration: tuitionEndingMemory.duration },
    { name: 'new-beginnings', duration: newBeginningsDuration },
    { name: 'whatsapp-memory', duration: whatsappMemoryDuration },
    { name: 'whatsapp-calls', duration: whatsappCallsDuration },
    { name: 'picture-keepsakes', duration: pictureKeepsakesMemory.duration },
    { name: 'just-a-glimpse', duration: justAGlimpseDuration },
    { name: 'returning-home', duration: returningHomeDuration },
    { name: 'closer-apart', duration: closerApartDuration },
    { name: 'second-drop-connection', duration: secondDropConnectionDuration },
    { name: 'jan23-date', duration: jan23DateDuration },
    { name: 'last-glimpses', duration: lastGlimpsesDuration },
    { name: 'holi-reflection', duration: holiReflectionDuration },
    { name: 'waiting-days', duration: waitingDaysDuration },
    { name: 'breakup-day', duration: breakupDuration },
    { name: 'after-breakup-hope', duration: afterBreakupHopeDuration },
    { name: 'another-chance', duration: anotherChanceDuration },
    { name: 'what-i-came-to-know', duration: whatICameToKnowDuration },
    { name: 'things-i-didnt-know', duration: thingsDuration }
  ];
  const offsets = sceneDefs.map((_, index) =>
    sceneDefs.slice(0, index).reduce((sum, scene) => sum + scene.duration, 0)
  );
  const totalDuration = sceneDefs.reduce((sum, scene) => sum + scene.duration, 0);
  const atmosphere = document.querySelector('.atmosphere');

  // Continuous colour grading: interpolate the persistent background across
  // the chapter timeline instead of switching backgrounds at scene boundaries.
  const atmosphereStops = [
    { at: 0, a: [27,19,33], b: [16,11,21], c: [8,6,12], glow: [125,91,145], alpha: .075, x: 50, y: 43, size: 48, wash: [139,91,119], washAlpha: .035, washX: 12, washY: 76 },
    { at: offsets[9], a: [28,19,34], b: [17,12,23], c: [8,6,12], glow: [145,105,159], alpha: .10, x: 50, y: 43, size: 48, wash: [142,91,121], washAlpha: .045, washX: 14, washY: 75 },
    { at: offsets[10] + sceneDefs[10].duration * .65, a: [47,31,53], b: [25,17,34], c: [9,7,14], glow: [186,119,148], alpha: .18, x: 58, y: 44, size: 46, wash: [153,93,133], washAlpha: .075, washX: 20, washY: 72 },
    { at: offsets[11] + sceneDefs[11].duration * .48, a: [53,34,59], b: [29,19,39], c: [10,7,15], glow: [194,129,153], alpha: .19, x: 55, y: 42, size: 48, wash: [166,103,135], washAlpha: .09, washX: 82, washY: 68 },
    { at: offsets[12], a: [66,42,65], b: [35,22,45], c: [12,8,17], glow: [205,139,153], alpha: .22, x: 55, y: 49, size: 50, wash: [177,108,137], washAlpha: .12, washX: 18, washY: 80 },
    { at: offsets[12] + sceneDefs[12].duration * .52, a: [55,35,64], b: [26,17,37], c: [9,7,14], glow: [171,125,170], alpha: .17, x: 53, y: 58, size: 46, wash: [171,110,143], washAlpha: .08, washX: 83, washY: 80 },
    { at: offsets[13] + sceneDefs[13].duration * .55, a: [34,24,48], b: [17,12,27], c: [7,6,12], glow: [151,123,180], alpha: .14, x: 50, y: 48, size: 43, wash: [132,89,135], washAlpha: .045, washX: 12, washY: 72 },
    { at: offsets[14] + sceneDefs[14].duration * .2, a: [29,20,42], b: [14,10,23], c: [6,5,10], glow: [151,125,191], alpha: .16, x: 50, y: 43, size: 42, wash: [139,100,161], washAlpha: .055, washX: 86, washY: 75 },
    { at: offsets[15], a: [24,17,35], b: [12,9,21], c: [5,4,9], glow: [125,106,159], alpha: .09, x: 50, y: 53, size: 42, wash: [111,79,131], washAlpha: .035, washX: 13, washY: 78 },
    { at: offsets[16], a: [15,12,24], b: [9,7,15], c: [4,3,7], glow: [91,79,125], alpha: .055, x: 50, y: 58, size: 40, wash: [86,67,113], washAlpha: .022, washX: 84, washY: 79 },
    { at: offsets[17], a: [8,7,14], b: [6,5,10], c: [3,3,6], glow: [76,68,105], alpha: .035, x: 50, y: 50, size: 42, wash: [80,62,102], washAlpha: .018, washX: 16, washY: 79 },
    { at: offsets[17] + 2500, a: [25,17,34], b: [13,9,22], c: [5,4,9], glow: [153,111,161], alpha: .13, x: 50, y: 46, size: 45, wash: [176,113,145], washAlpha: .07, washX: 85, washY: 76 },
    { at: offsets[17] + 8500, a: [49,31,54], b: [25,16,34], c: [8,6,12], glow: [204,151,172], alpha: .23, x: 50, y: 44, size: 52, wash: [202,139,156], washAlpha: .14, washX: 83, washY: 79 },
    { at: offsets[18] + sceneDefs[18].duration * .45, a: [58,38,62], b: [28,19,39], c: [9,7,13], glow: [213,164,184], alpha: .25, x: 52, y: 43, size: 54, wash: [202,146,164], washAlpha: .15, washX: 15, washY: 76 },
    { at: offsets[20], a: [54,35,59], b: [26,17,36], c: [8,6,12], glow: [203,151,179], alpha: .22, x: 50, y: 46, size: 52, wash: [190,129,157], washAlpha: .12, washX: 82, washY: 74 },
    { at: offsets[21], a: [57,36,58], b: [28,18,37], c: [8,6,12], glow: [205,149,172], alpha: .21, x: 54, y: 45, size: 51, wash: [194,132,154], washAlpha: .12, washX: 20, washY: 77 },
    { at: offsets[22], a: [53,36,60], b: [25,18,38], c: [8,6,13], glow: [186,145,177], alpha: .18, x: 48, y: 48, size: 49, wash: [169,124,157], washAlpha: .09, washX: 82, washY: 78 },
    { at: offsets[23], a: [57,39,61], b: [27,18,38], c: [8,6,13], glow: [202,155,179], alpha: .20, x: 50, y: 45, size: 52, wash: [195,140,160], washAlpha: .11, washX: 16, washY: 75 },
    { at: offsets[24], a: [43,31,54], b: [22,16,33], c: [7,6,12], glow: [166,130,166], alpha: .15, x: 48, y: 51, size: 46, wash: [154,114,148], washAlpha: .075, washX: 84, washY: 78 },
    { at: offsets[25], a: [29,24,39], b: [15,12,23], c: [7,6,12], glow: [150,121,181], alpha: .13, x: 51, y: 48, size: 48, wash: [137,105,160], washAlpha: .065, washX: 82, washY: 77 },
    { at: offsets[26], a: [38,25,46], b: [19,13,29], c: [7,6,12], glow: [181,139,188], alpha: .17, x: 50, y: 46, size: 50, wash: [178,119,158], washAlpha: .10, washX: 78, washY: 75 },
    { at: offsets[27], a: [40,26,48], b: [20,14,30], c: [7,6,12], glow: [188,145,194], alpha: .18, x: 50, y: 46, size: 51, wash: [183,125,166], washAlpha: .11, washX: 78, washY: 75 },
    { at: offsets[27] + 28000, a: [45,29,51], b: [22,15,32], c: [8,6,13], glow: [199,151,186], alpha: .21, x: 52, y: 45, size: 52, wash: [190,133,164], washAlpha: .12, washX: 20, washY: 77 },
    { at: offsets[28], a: [48,31,54], b: [23,16,33], c: [8,6,13], glow: [205,154,183], alpha: .21, x: 51, y: 45, size: 52, wash: [195,138,166], washAlpha: .12, washX: 18, washY: 76 },
    { at: offsets[29], a: [52,34,58], b: [25,17,37], c: [8,6,13], glow: [207,157,186], alpha: .20, x: 50, y: 46, size: 51, wash: [194,137,167], washAlpha: .11, washX: 80, washY: 75 },
    { at: offsets[30], a: [49,32,55], b: [24,16,35], c: [8,6,13], glow: [199,151,181], alpha: .19, x: 51, y: 46, size: 50, wash: [187,132,164], washAlpha: .10, washX: 18, washY: 77 },
    { at: offsets[31], a: [43,30,51], b: [21,15,32], c: [7,6,12], glow: [183,141,177], alpha: .17, x: 49, y: 47, size: 49, wash: [173,124,157], washAlpha: .09, washX: 82, washY: 77 },
    { at: offsets[32], a: [38,27,46], b: [19,13,29], c: [7,5,11], glow: [166,128,163], alpha: .15, x: 50, y: 48, size: 47, wash: [156,112,146], washAlpha: .075, washX: 80, washY: 78 },
    { at: offsets[32] + sceneDefs[32].duration * .8, a: [34,23,41], b: [17,12,25], c: [6,5,10], glow: [151,115,151], alpha: .13, x: 50, y: 48, size: 45, wash: [141,101,134], washAlpha: .065, washX: 80, washY: 78 },
    { at: offsets[33], a: [36,24,43], b: [18,12,27], c: [7,5,11], glow: [157,119,157], alpha: .14, x: 50, y: 47, size: 46, wash: [149,105,139], washAlpha: .07, washX: 18, washY: 77 },
    { at: offsets[33] + sceneDefs[33].duration * .75, a: [32,22,39], b: [16,11,24], c: [6,5,10], glow: [143,109,151], alpha: .12, x: 52, y: 48, size: 44, wash: [135,96,130], washAlpha: .06, washX: 82, washY: 78 },
    { at: offsets[34], a: [35,24,42], b: [17,12,26], c: [7,5,11], glow: [154,119,155], alpha: .14, x: 50, y: 47, size: 46, wash: [147,105,138], washAlpha: .07, washX: 18, washY: 77 },
    { at: offsets[34] + sceneDefs[34].duration * .72, a: [31,22,38], b: [15,11,23], c: [6,5,10], glow: [139,106,147], alpha: .11, x: 51, y: 48, size: 43, wash: [132,94,126], washAlpha: .055, washX: 81, washY: 78 },
    { at: offsets[35], a: [31,22,38], b: [15,11,23], c: [6,5,10], glow: [139,106,147], alpha: .11, x: 51, y: 48, size: 43, wash: [132,94,126], washAlpha: .055, washX: 81, washY: 78 },
    { at: offsets[36], a: [36,24,43], b: [18,12,27], c: [7,5,11], glow: [157,119,157], alpha: .14, x: 50, y: 47, size: 46, wash: [149,105,139], washAlpha: .07, washX: 18, washY: 77 },
    { at: offsets[36] + sceneDefs[36].duration * .65, a: [33,23,40], b: [16,11,24], c: [6,5,10], glow: [145,110,150], alpha: .12, x: 51, y: 48, size: 44, wash: [137,98,132], washAlpha: .06, washX: 82, washY: 78 },
    { at: offsets[37], a: [34,23,40], b: [17,11,25], c: [6,5,10], glow: [148,112,151], alpha: .12, x: 50, y: 47, size: 45, wash: [139,99,133], washAlpha: .06, washX: 18, washY: 77 },
    { at: offsets[38], a: [32,22,39], b: [16,11,24], c: [6,5,10], glow: [143,108,148], alpha: .12, x: 51, y: 48, size: 44, wash: [135,96,130], washAlpha: .055, washX: 82, washY: 78 },
    { at: offsets[40], a: [33,23,40], b: [16,11,24], c: [6,5,10], glow: [146,110,151], alpha: .12, x: 50, y: 47, size: 44, wash: [138,98,132], washAlpha: .06, washX: 80, washY: 78 },
    { at: offsets[46], a: [31,21,39], b: [15,10,25], c: [6,5,11], glow: [135,103,151], alpha: .11, x: 48, y: 46, size: 43, wash: [138,91,132], washAlpha: .055, washX: 79, washY: 77 },
    { at: offsets[46] + sceneDefs[46].duration * .6, a: [39,26,48], b: [19,13,31], c: [7,5,12], glow: [166,122,165], alpha: .15, x: 53, y: 45, size: 47, wash: [164,107,147], washAlpha: .085, washX: 18, washY: 77 },
    { at: offsets[47], a: [43,30,55], b: [21,15,35], c: [7,6,12], glow: [177,143,186], alpha: .17, x: 50, y: 44, size: 48, wash: [179,126,162], washAlpha: .095, washX: 82, washY: 76 },
    { at: offsets[48], a: [30,24,43], b: [15,12,29], c: [6,5,11], glow: [143,128,171], alpha: .12, x: 51, y: 49, size: 45, wash: [150,108,150], washAlpha: .07, washX: 16, washY: 79 },
    { at: offsets[49], a: [20,16,31], b: [11,9,20], c: [4,4,9], glow: [111,96,145], alpha: .085, x: 50, y: 50, size: 43, wash: [124,87,131], washAlpha: .045, washX: 84, washY: 78 },
    { at: offsets[49] + sceneDefs[49].duration * .85, a: [12,11,21], b: [8,7,14], c: [3,3,7], glow: [87,79,117], alpha: .055, x: 50, y: 52, size: 40, wash: [91,69,111], washAlpha: .025, washX: 16, washY: 80 }
  ];

  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(t) { return t * t * (3 - 2 * t); }
  function updateAtmosphere(time) {
    let left = atmosphereStops[0];
    let right = atmosphereStops[atmosphereStops.length - 1];
    for (let i = 0; i < atmosphereStops.length - 1; i++) {
      if (time <= atmosphereStops[i + 1].at) { left = atmosphereStops[i]; right = atmosphereStops[i + 1]; break; }
    }
    const span = Math.max(1, right.at - left.at);
    const t = smoothstep(Math.max(0, Math.min(1, (time - left.at) / span)));
    const mixArray = (key) => left[key].map((value, i) => lerp(value, right[key][i], t));
    const mixNumber = (key) => lerp(left[key], right[key], t);
    const rgb = (values) => values.map(value => Math.round(value)).join(', ');
    const hex = (values) => '#' + values.map(value => Math.round(value).toString(16).padStart(2, '0')).join('');
    atmosphere.style.setProperty('--bg-a', hex(mixArray('a')));
    atmosphere.style.setProperty('--bg-b', hex(mixArray('b')));
    atmosphere.style.setProperty('--bg-c', hex(mixArray('c')));
    atmosphere.style.setProperty('--glow-rgb', rgb(mixArray('glow')));
    atmosphere.style.setProperty('--glow-alpha', mixNumber('alpha').toFixed(3));
    atmosphere.style.setProperty('--glow-x', `${mixNumber('x').toFixed(2)}%`);
    atmosphere.style.setProperty('--glow-y', `${mixNumber('y').toFixed(2)}%`);
    atmosphere.style.setProperty('--glow-size', `${mixNumber('size').toFixed(2)}%`);
    atmosphere.style.setProperty('--wash-rgb', rgb(mixArray('wash')));
    atmosphere.style.setProperty('--wash-alpha', mixNumber('washAlpha').toFixed(3));
    atmosphere.style.setProperty('--wash-x', `${mixNumber('washX').toFixed(2)}%`);
    atmosphere.style.setProperty('--wash-y', `${mixNumber('washY').toFixed(2)}%`);
  }

  let elapsed = 0;
  let lastFrameTime = 0;
  let activeScene = -1;
  let paused = false;
  let ended = false;
  let rafId = 0;
  let previousGifFrame = -1;
  let controlsVisible = false;

  // Keep mobile screens awake while this experience is active. The browser
  // releases its screen wake lock when the page becomes hidden, so we retain
  // the intent and request a fresh lock when the visitor returns. This does
  // not resume playback: the existing visibility handler still pauses it.
  let screenWakeLock = null;
  let screenWakeLockWanted = true;
  let screenWakeLockRequestPending = false;

  async function acquireScreenWakeLock() {
    if (!screenWakeLockWanted || ended || document.visibilityState !== 'visible') return;
    if (!('wakeLock' in navigator) || !navigator.wakeLock || screenWakeLock || screenWakeLockRequestPending) return;

    screenWakeLockRequestPending = true;
    try {
      const lock = await navigator.wakeLock.request('screen');
      // The request can resolve after navigation or story completion. Do not
      // keep a lock in that case.
      if (!screenWakeLockWanted || ended || document.visibilityState !== 'visible') {
        await lock.release();
        return;
      }
      screenWakeLock = lock;
      lock.addEventListener('release', () => {
        if (screenWakeLock === lock) screenWakeLock = null;
      }, { once: true });
    } catch (error) {
      // Unsupported browsers, insecure contexts, low-power mode, or system
      // policy can deny the request. Playback remains usable without a lock.
      console.warn('Screen Wake Lock could not be acquired:', error);
    } finally {
      screenWakeLockRequestPending = false;
    }
  }

  function releaseScreenWakeLock(disable = false) {
    if (disable) screenWakeLockWanted = false;
    const lock = screenWakeLock;
    screenWakeLock = null;
    if (lock && !lock.released) {
      lock.release().catch(error => {
        console.warn('Screen Wake Lock could not be released cleanly:', error);
      });
    }
  }

  // Preload the small set of GIF frames so the birthday animation freezes
  // exactly when the story is paused.
  const frameImages = framePaths.map(path => {
    const image = new Image();
    image.src = path;
    return image;
  });

  function sceneAt(time) {
    for (let i = 0; i < sceneDefs.length; i++) {
      if (time < offsets[i] + sceneDefs[i].duration || i === sceneDefs.length - 1) return i;
    }
    return sceneDefs.length - 1;
  }

  function setScene(index) {
    if (index === activeScene) return;
    if (activeScene === 34 && index !== 34) stopWhatsAppVideoForNavigation();
    if (activeScene === 35 && index !== 35) stopCallsVideoForNavigation();
    if (activeScene === 40 && index !== 40) stopSecondDropVideoForNavigation();
    if (activeScene === 42 && index !== 42) stopLastGlimpsesVideoForNavigation();
    if (activeScene === 45 && index !== 45) stopBreakupVideoForNavigation();
    activeScene = index;
    if (index === 48 && whatChatFeed) whatChatFeed.scrollTop = 0;
    if (index === 49 && thingsStage) thingsStage.scrollTop = 0;
    scenes.forEach((scene, i) => scene.classList.toggle('is-active', i === index));
    previousButton.disabled = index === 0;
    nextButton.disabled = false;
    previousButton.setAttribute('aria-label', index === 0 ? 'Previous scene unavailable' : 'Previous scene');
    nextButton.setAttribute('aria-label', index === sceneDefs.length - 1 ? 'Replay from beginning' : 'Next scene');
  }

  function updatePoem(localTime) {
    for (const item of letterSchedule) {
      item.element.classList.toggle('revealed', localTime >= item.at);
    }
  }

  function updateChat(localTime) {
    const gifVisible = localTime >= GIF_START;
    const thanksVisible = localTime >= THANKS_AT;
    const welcomeVisible = localTime >= WELCOME_AT;
    gifMessage.classList.toggle('visible', gifVisible);
    thanksMessage.classList.toggle('visible', thanksVisible);
    welcomeMessage.classList.toggle('visible', welcomeVisible);

    // In reduced-motion mode, keep the birthday illustration on one frame.
    // The surrounding conversation is still shown in full.
    if (prefersReducedMotion) {
      if (previousGifFrame !== 0) {
        previousGifFrame = 0;
        gifImage.src = framePaths[0];
      }
      return;
    }

    if (gifVisible) {
      const frame = Math.floor((localTime - GIF_START) / GIF_FRAME_MS) % GIF_FRAME_COUNT;
      if (frame !== previousGifFrame) {
        previousGifFrame = frame;
        gifImage.src = framePaths[frame];
      }
    } else if (previousGifFrame !== 0) {
      previousGifFrame = 0;
      gifImage.src = framePaths[0];
    }
  }

  function updatePhoneTyping(localTime) {
    const typingTime = localTime - PHONE_START_DELAY;
    phoneTyping.events.forEach(event => {
      event.element.classList.toggle('revealed', typingTime >= event.at);
    });
  }

  function clamp01(value) { return Math.max(0, Math.min(1, value)); }
  function easeOutCubic(value) { return 1 - Math.pow(1 - clamp01(value), 3); }
  function easeOutBack(value) {
    const t = clamp01(value);
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
  function smoothProgress(value) {
    const t = clamp01(value);
    return t * t * (3 - 2 * t);
  }

  function updateFirstSelfies(localTime) {
    firstSelfieElements.forEach((element, index) => {
      const startAt = FIRST_SELFIE_START_MS + index * FIRST_SELFIE_STAGGER_MS;
      const revealProgress = clamp01((localTime - startAt) / FIRST_SELFIE_ENTER_MS);
      const revealEase = easeOutCubic(revealProgress);
      const popEase = easeOutBack(revealProgress);
      const popScale = 0.78 + (0.98 - 0.78) * popEase;
      element.style.opacity = revealEase.toFixed(3);
      element.style.filter = `blur(${(2.5 * (1 - revealEase)).toFixed(2)}px)`;
      element.style.transform = `scale(${popScale.toFixed(4)})`;
    });

    // Both images enlarge together after entering, hold as a pair for 3 seconds,
    // then simultaneously shrink and rise slightly into their final positions.
    const settleProgress = smoothProgress(
      (localTime - firstSelfiesSettleAt) / FIRST_SELFIE_SETTLE_MS
    );
    const gallery = document.querySelector('.first-selfies-gallery');
    const galleryScale = 1.2 + (1.0 - 1.2) * settleProgress;
    const galleryY = -1.0 * settleProgress;
    gallery.style.transform = `translate3d(0, ${galleryY.toFixed(3)}vh, 0) scale(${galleryScale.toFixed(4)})`;

    firstSelfiesTypewriter.events.forEach(event => {
      event.element.classList.toggle(
        'is-visible', localTime >= firstSelfiesCopyStart + event.at
      );
    });
  }

  function updateProfileMemory(localTime) {
    const popProgress = clamp01((localTime - PROFILE_PHOTO_START_MS) / PROFILE_PHOTO_POP_MS);
    const popEase = easeOutBack(popProgress);
    const fadeEase = easeOutCubic(popProgress);
    const settleProgress = smoothProgress((localTime - profilePhotoSettleAt) / PROFILE_PHOTO_SETTLE_MS);
    const popScale = 0.78 + (1.24 - 0.78) * popEase;
    const finalScale = 1.24 + (1 - 1.24) * settleProgress;
    const finalY = -0.8 * settleProgress;
    const scale = localTime < profilePhotoSettleAt ? popScale : finalScale;
    profilePhoto.style.opacity = fadeEase.toFixed(3);
    profilePhoto.style.filter = `blur(${(2.5 * (1 - fadeEase)).toFixed(2)}px)`;
    profilePhoto.style.transform = `translate3d(0, ${finalY.toFixed(3)}vh, 0) scale(${scale.toFixed(4)})`;

    profileMemoryTypewriter.events.forEach(event => {
      event.element.classList.toggle(
        'is-visible', localTime >= profileCopyStartAt + event.at
      );
    });
  }

  function updateNarrative(index, localTime) {
    if (index === 3) updateTrack(closingTrack, localTime);
    if (index === 4) updateTrack(daysTrack, localTime);
    if (index === 6) {
      nameLead.classList.toggle('is-revealed', localTime >= nameStart);
      memoryName.classList.toggle('is-revealed', localTime >= nameHighlightAt);
      nameFollow.classList.toggle('is-revealed', localTime >= nameFollowAt);
    }
    if (index === 7) {
      updateTrack(photoTrack, localTime);
      photoFrame.classList.toggle('is-revealed', localTime >= photoRevealAt);
    }
    if (index === 8) {
      updateTrack(archiveListTrack, localTime);
      updateTrack(archiveReflectionTrack, localTime);
    }
    if (index === 9) updateTrack(nov24Track, localTime);
    if (index === 10) updateTrack(cancelledTrack, localTime);
    if (index === 11) updateTrack(arrivalTrack, localTime);
    if (index === 12) updateTrack(sunsetTrack, localTime);
    if (index === 13) updateTrack(nervesTrack, localTime);
    if (index === 14) {
      updateTrack(confessionIntroTrack, localTime);
      const poemHeadingVisible = localTime >= confessionTitleAt;
      confessionKicker.classList.toggle('is-revealed', poemHeadingVisible);
      confessionTitle.classList.toggle('is-revealed', poemHeadingVisible);
      updateTrack(confessionPoemLinesTrack, localTime);
      fullPoemLink.classList.toggle('is-revealed', localTime >= confessionPoemLinesTrack.end);
    }
    if (index === 15) updateTrack(replyTrack, localTime);
    if (index === 16) {
      nightTypewriter.events.forEach(event => {
        event.element.classList.toggle('is-visible', localTime >= event.at);
      });
    }
    if (index === 17) {
      yesDate.classList.toggle('is-revealed', localTime >= 450);
      yesWord.classList.toggle('is-revealed', localTime >= YES_REVEAL_AT);
      yesCaption.classList.toggle('is-revealed', localTime >= YES_CAPTION_AT);
    }
    if (index === 18) updateTrack(afterglowTrack, localTime);
    if (index === 19) updateFirstSelfies(localTime);
    if (index === 20) updateProfileMemory(localTime);
    if (index === 21) redOutfitMemory.update(localTime);
    if (index === 22) picnicMemory.update(localTime);
    if (index === 23) littlePicturesMemory.update(localTime);
    if (index === 24) lastTogetherMemory.update(localTime);
    if (index === 25) updateSeparationScene(localTime);
    if (index === 26) updateHopeIntroScene(localTime);
    if (index === 27) updateHopeJourneyScene(localTime);
    if (index === 28) earlyTuitionMemory.update(localTime);
    if (index === 29) littleMomentsMemory.update(localTime);
    if (index === 30) durgaPujaMemory.update(localTime);
    if (index === 31) saraswatiPujaMemory.update(localTime);
    if (index === 32) tuitionEndingMemory.update(localTime);
    if (index === 33) updateNewBeginnings(localTime);
    if (index === 34) updateWhatsAppMemory(localTime);
    if (index === 35) updateWhatsAppCalls(localTime);
    if (index === 36) pictureKeepsakesMemory.update(localTime);
    if (index === 37) {
      justAGlimpseTypewriter.events.forEach(event => {
        event.element.classList.toggle('is-visible', localTime >= event.at);
      });
    }
    if (index === 38) {
      returningHomeTypewriter.events.forEach(event => {
        event.element.classList.toggle('is-visible', localTime >= event.at);
      });
    }
    if (index === 39) {
      closerApartTypewriter.events.forEach(event => {
        event.element.classList.toggle('is-visible', localTime >= event.at);
      });
    }
    if (index === 40) updateSecondDropConnection(localTime);
    if (index === 41) updateJan23Date(localTime);
    if (index === 42) updateLastGlimpses(localTime);
    if (index === 43) updateNewMemoryTypewriter(holiReflectionTypewriter, localTime, HOLI_REFLECTION_START_MS);
    if (index === 44) {
      applyPopSettle(waitingDaysScreenshotFrame, localTime, WAITING_DAYS_SCREENSHOT_START_MS, {
        popMs: WAITING_DAYS_SCREENSHOT_POP_MS,
        holdMs: WAITING_DAYS_SCREENSHOT_HOLD_MS,
        settleMs: WAITING_DAYS_SCREENSHOT_SETTLE_MS,
        startScale: .72,
        peakScale: 1.08,
        endScale: 1,
        lift: 18
      });
      waitingDaysTypewriter.events.forEach(event => {
        event.element.classList.toggle('is-visible', localTime >= WAITING_DAYS_NARRATION_START_MS + event.at);
      });
    }
    if (index === 45) updateBreakupScene(localTime);
    if (index === 46) updateNewMemoryTypewriter(afterBreakupHopeTypewriter, localTime, AFTER_BREAKUP_TEXT_START_MS);
    if (index === 47) updateNewMemoryTypewriter(anotherChanceTypewriter, localTime, AFTER_BREAKUP_TEXT_START_MS);
    if (index === 48) {
      updateNewMemoryTypewriter(whatICameToKnowTypewriter, localTime, AFTER_BREAKUP_TEXT_START_MS);
      whatChatSchedule.forEach(item => {
        const visible = localTime >= WHAT_CHAT_START_MS + item.at;
        const wasVisible = item.element.classList.contains('is-visible');
        item.element.classList.toggle('is-visible', visible);
        if (visible && !wasVisible) {
          // Keep every earlier bubble in the feed; only move the scroll position
          // so the latest message remains visible on smaller screens.
          whatChatFeed.scrollTo({
            top: whatChatFeed.scrollHeight,
            behavior: prefersReducedMotion ? 'auto' : 'smooth'
          });
        }
      });
    }
    if (index === 49) {
      updateNewMemoryTypewriter(thingsIntroTypewriter, localTime, AFTER_BREAKUP_TEXT_START_MS);
      thingsTimelineSchedule.forEach(item => {
        item.element.classList.toggle('is-visible', localTime >= AFTER_BREAKUP_TEXT_START_MS + thingsIntroTypewriter.typingDuration + item.at);
      });
      thingsNarrationTypewriter.events.forEach(event => {
        event.element.classList.toggle('is-visible', localTime >= thingsNarrationStartMs + event.at);
      });
    }
  }

  function render() {
    const bounded = Math.max(0, Math.min(elapsed, totalDuration));
    const index = sceneAt(Math.min(bounded, totalDuration - 1));
    const localTime = bounded - offsets[index];
    // Reduced-motion visitors see each scene in its settled state immediately:
    // no typewriter, staggered photo entrances, pop/scale effects or route trace.
    // Scene durations are deliberately unchanged, preserving the reading pace.
    const visualTime = prefersReducedMotion ? sceneDefs[index].duration : localTime;
    setScene(index);
    // Avoid continuously interpolating the ambient background for reduced-motion
    // users; it changes once, directly to the palette for the active scene.
    updateAtmosphere(prefersReducedMotion ? offsets[index] : bounded);

    if (index === 0) updatePoem(visualTime);
    if (index === 2) updateChat(visualTime);
    if (index === 5) updatePhoneTyping(visualTime);
    updateNarrative(index, visualTime);

    if (index !== 2 && previousGifFrame !== 0) {
      previousGifFrame = 0;
      gifImage.src = framePaths[0];
    }

    if (bounded >= totalDuration) {
      elapsed = totalDuration;
      ended = true;
      paused = true;
      lastFrameTime = 0;
      experience.classList.add('is-paused');
      releaseScreenWakeLock(true);
      syncPlayButton();
    }
  }

  function tick(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    if (!paused && !ended) {
      elapsed += timestamp - lastFrameTime;
      if (elapsed >= totalDuration) elapsed = totalDuration;
      render();
    }
    lastFrameTime = timestamp;
    rafId = requestAnimationFrame(tick);
  }

  function syncPlayButton() {
    const label = ended ? 'Replay from beginning' : (paused ? 'Resume' : 'Pause');
    playButton.setAttribute('aria-label', label);
    playButton.title = label;
  }

  function showControls() {
    controlsVisible = true;
    experience.classList.add('controls-visible');
    controls.setAttribute('aria-hidden', 'false');
  }

  function hideControls() {
    controlsVisible = false;
    experience.classList.remove('controls-visible');
    controls.setAttribute('aria-hidden', 'true');
  }

  function pauseAndShow() {
    if (!paused && !ended) {
      paused = true;
      if (activeScene === 34) pauseWhatsAppVideoForStory();
      if (activeScene === 35) pauseCallsVideoForStory();
      if (activeScene === 40) pauseSecondDropVideoForStory();
      if (activeScene === 42) pauseLastGlimpsesVideoForStory();
      if (activeScene === 45) pauseBreakupVideoForStory();
      experience.classList.add('is-paused');
      lastFrameTime = 0;
      syncPlayButton();
    }
    showControls();
  }

  function resumeAndHide() {
    if (ended) {
      elapsed = 0;
      ended = false;
      activeScene = -1;
      screenWakeLockWanted = true;
      render();
    }
    paused = false;
    if (activeScene === 34) resumeWhatsAppVideoForStory();
    if (activeScene === 35) resumeCallsVideoForStory();
    if (activeScene === 40) resumeSecondDropVideoForStory();
    if (activeScene === 42) resumeLastGlimpsesVideoForStory();
    if (activeScene === 45) resumeBreakupVideoForStory();
    experience.classList.remove('is-paused');
    lastFrameTime = 0;
    hideControls();
    syncPlayButton();
    acquireScreenWakeLock();
  }

  function jumpTo(index) {
    const safeIndex = Math.max(0, Math.min(sceneDefs.length - 1, index));
    elapsed = offsets[safeIndex];
    ended = false;
    // Navigation out of the completed experience makes the wake lock eligible
    // again; it is reacquired only when the visitor explicitly resumes.
    screenWakeLockWanted = true;
    // Manual scene navigation is a seek, not a play command. Land at the
    // beginning of the selected scene and remain paused until Play/Resume.
    paused = true;
    lastFrameTime = 0;
    experience.classList.add('is-paused');
    render();
    showControls();
    syncPlayButton();
  }

  function togglePlay() {
    if (paused || ended) resumeAndHide();
    else pauseAndShow();
  }

  // A tap/click anywhere pauses and reveals the controls. A tap outside them
  // while paused resumes playback and hides the controls again.
  experience.addEventListener('click', event => {
    if (event.target.closest('.transport-controls, .whatsapp-video-shell, .second-drop-connection-video-shell, .last-glimpses-video-shell, .last-glimpses-audio-toggle, video')) return;
    if (!paused && !ended) pauseAndShow();
    else if (controlsVisible && paused) resumeAndHide();
    else showControls();
  });

  [previousButton, playButton, nextButton].forEach(button => {
    button.addEventListener('click', event => event.stopPropagation());
  });
  previousButton.addEventListener('click', () => {
    if (activeScene > 0) jumpTo(activeScene - 1);
  });
  nextButton.addEventListener('click', () => {
    if (activeScene < sceneDefs.length - 1) jumpTo(activeScene + 1);
    else jumpTo(0);
  });
  playButton.addEventListener('click', togglePlay);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && !paused && !ended) {
      paused = true;
      if (activeScene === 34) pauseWhatsAppVideoForStory();
      if (activeScene === 35) pauseCallsVideoForStory();
      if (activeScene === 40) pauseSecondDropVideoForStory();
      if (activeScene === 42) pauseLastGlimpsesVideoForStory();
      if (activeScene === 45) pauseBreakupVideoForStory();
      experience.classList.add('is-paused');
      lastFrameTime = 0;
      syncPlayButton();
    } else if (document.visibilityState === 'visible' && screenWakeLockWanted && !ended) {
      // Wake Lock is released by the browser as soon as the document is hidden.
      // Reacquire it when the visitor returns, without auto-resuming the story.
      acquireScreenWakeLock();
    }
  });
  window.addEventListener('keydown', event => {
    if (event.target.closest && event.target.closest('.whatsapp-video-shell, .second-drop-connection-video-shell, .last-glimpses-video-shell, .last-glimpses-audio-toggle, .breakup-video-shell')) return;
    if (event.code === 'Space' && !['BUTTON', 'INPUT', 'TEXTAREA', 'VIDEO'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      if (paused || ended) resumeAndHide(); else pauseAndShow();
    }
    if (event.code === 'ArrowLeft' && (paused || ended) && activeScene > 0) jumpTo(activeScene - 1);
    if (event.code === 'ArrowRight' && (paused || ended)) jumpTo(activeScene < sceneDefs.length - 1 ? activeScene + 1 : 0);
    if (event.code === 'Escape' && controlsVisible && paused) resumeAndHide();
  });

  render();

  // Respect live changes to the operating-system accessibility preference.
  // A legacy listener fallback covers older Safari versions.
  if (motionPreference) {
    const handleMotionPreferenceChange = event => {
      prefersReducedMotion = Boolean(event.matches);
      experience.classList.toggle('reduced-motion', prefersReducedMotion);
      render();
    };
    if (typeof motionPreference.addEventListener === 'function') {
      motionPreference.addEventListener('change', handleMotionPreferenceChange);
    } else if (typeof motionPreference.addListener === 'function') {
      motionPreference.addListener(handleMotionPreferenceChange);
    }
  }

  // Request immediately while the page is visible so the phone does not
  // reach its normal screen timeout during the automatically playing story.
  acquireScreenWakeLock();
  rafId = requestAnimationFrame(tick);
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(rafId);
    releaseScreenWakeLock(true);
  });
})();
