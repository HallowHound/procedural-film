/* Edit this theme/episode specification; the renderer never calls a model. */
(function (root) {
  'use strict';
  const config = {
    version: 1,
    title: 'The Long Way Home',
    seed: 14029,
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 900,
    transition: 12,
    palette: {
      sky: '#728f9a', horizon: '#e4c49a', far: '#899691', mid: '#526f69',
      near: '#294f45', ground: '#3c5140', water: '#76938b', path: '#b39d77',
      nightSky: '#101b2c', nightHorizon: '#465366', moon: '#eee4c7',
      coats: ['#b96b4f', '#cfb376', '#7fa3a0']
    }
  };
  if (typeof module === 'object' && module.exports) module.exports = config;
  else root.LIVING_CONFIG = config;
})(globalThis);
