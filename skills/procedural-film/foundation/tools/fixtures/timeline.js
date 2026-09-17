// Fixture timeline for testing the tools (not the film). 6 seconds, 3 shots.
FILM.TIMELINE = {
  title: 'fixture',
  bpm: 120,
  duration: 6,
  shots: [
    { id: 'lib-showcase', file: '01-lib-showcase.js', start: 0, end: 2.5, mode: 'illustrated', brief: 'Every lib helper on one plate: paper, stripes, ink, hatching, stipple, blueprint, lattice, glows, guides.' },
    { id: 'fx-egg', file: '02-fx-egg.js', start: 2.5, end: 4.5, mode: 'schematic', brief: 'Blueprint egg with a cell lattice; two nuclei divide; magenta burst at the end.' },
    { id: 'fx-meadow', file: '03-fx-meadow.js', start: 4.5, end: 6, mode: 'illustrated', transitionIn: { dur: 0.5, kind: 'fade' }, brief: 'Stripes, a leaf and a crawling larva on twos; a flight arc draws on.' },
  ],
  cues: [
    { t: 0, kind: 'open' },
    { t: 2.5, kind: 'cut' },
    { t: 4.0, kind: 'burst' },
    { t: 4.5, kind: 'fade' },
  ],
};
