// Central companion personality metadata and VN intro triads

export const companionTemperaments = {
  canopy: 'nurturing',
  yorna: 'exacting',
  hola: 'nurturing',
  oyin: 'steady',
  twil: 'playful',
  tin: 'playful',
  nellis: 'steady',
  urn: 'nurturing',
  varabella: 'practical',
  cowsill: 'playful',
  fana: 'exacting',
  snek: 'nurturing',
  snake: 'nurturing',
};

export const temperamentProfiles = {
  nurturing: { introMatch: 0.3, introClash: 0.0, defer: 0, gateShift: -0.3 },
  steady:    { introMatch: 0.3, introClash: -0.05, defer: 0, gateShift: 0 },
  playful:   { introMatch: 0.3, introClash: -0.10, defer: 0, gateShift: 0 },
  practical: { introMatch: 0.25, introClash: -0.10, defer: 0, gateShift: 0.2 },
  exacting:  { introMatch: 0.3, introClash: -0.15, defer: 0, gateShift: 0.5 },
};

export const introTriads = {
  canopy: {
    matchFirst: true,
    match: { label: 'Let\u2019s find your sister\u2014walk with me.', delta: 0.3, flag: 'canopy_intro_encourage' },
    clash: { label: 'I could use another pair of fighting hands\u2014join up.', delta: 0 },
    defer: { label: 'We\u2019ll talk later, Canopy.' },
  },
  yorna: {
    matchFirst: false,
    match: { label: 'We take the key, drop Vast\u2014fall in.', delta: 0.2, flag: 'yorna_intro_encourage' },
    clash: { label: 'Hang back and patch me up, alright?', delta: -0.15 },
    defer: { label: 'Not now, Yorna.' },
  },
  hola: {
    matchFirst: true,
    match: { label: 'Stay close; call the breeze\u2014we\u2019ll get the key.', delta: 0.3, flag: 'hola_intro_encourage' },
    clash: { label: 'Frontline with me\u2014we need a brawler.', delta: 0 },
    defer: { label: 'Another time, Hola.' },
  },
  oyin: {
    matchFirst: true,
    match: { label: 'Walk with me\u2014learn as we go.', delta: 0.3, flag: 'oyin_intro_encourage' },
    clash: { label: 'I need a seasoned striker right now.', delta: -0.05 },
    defer: { label: 'Let\u2019s talk later, Oyin.' },
  },
  twil: {
    matchFirst: false,
    match: { label: 'Read the ground and call the lanes\u2014join me.', delta: 0.3, flag: 'twil_intro_encourage' },
    clash: { label: 'Skip the scouting\u2014we just need brute force.', delta: -0.1 },
    defer: { label: 'Not now, Twil.' },
  },
  tin: {
    matchFirst: true,
    match: { label: 'Set the beat\u2014keep our hands moving.', delta: 0.3, flag: 'tin_intro_encourage' },
    clash: { label: 'We need slow and steady, not fast.', delta: -0.1 },
    defer: { label: 'Later, Tin.' },
  },
  nellis: {
    matchFirst: false,
    match: { label: 'Keep the line; I\u2019ll lead\u2014you hold.', delta: 0.3, flag: 'nellis_intro_encourage' },
    clash: { label: 'I\u2019m chasing speed and chaos today.', delta: -0.1 },
    defer: { label: 'Hold that thought, Nellis.' },
  },
  urn: {
    matchFirst: true,
    match: { label: 'Let\u2019s lift the streets\u2014walk with me.', delta: 0.4, flag: 'urn_intro_encourage' },
    clash: { label: 'I need a hard hitter, not a cheer.', delta: 0 },
    defer: { label: 'We\u2019ll come back to this, Urn.' },
  },
  varabella: {
    matchFirst: false,
    match: { label: 'I want sharp eyes\u2014call angles and cover.', delta: 0.4, flag: 'varabella_intro_respect' },
    clash: { label: 'Save the angles; just swing hard.', delta: -0.15 },
    defer: { label: 'Later, Varabella.' },
  },
  cowsill: {
    matchFirst: true,
    match: { label: 'Be my strike partner\u2014let\u2019s double every hit.', delta: 0.3, flag: 'cowsill_intro_team' },
    clash: { label: 'We actually need a healer more than damage.', delta: -0.05 },
    defer: { label: 'Another time, Cowsill.' },
  },
  fana: {
    matchFirst: false,
    match: { label: 'You\u2019re free\u2014burn what clings. Walk with me.', delta: 0.6, flag: 'fana_intro_reassure' },
    clash: { label: 'We need cold precision, not heat.', delta: -0.1 },
    defer: { label: 'Rest first, Fana.' },
  },
  snek: {
    matchFirst: true,
    match: { label: 'Coil close and slow our foes.', delta: 0.2, flag: 'snake_intro_encourage' },
    clash: { label: 'I was hoping for\u2026 thumbs.', delta: 0 },
    defer: { label: 'Curl up for now, Snek.' },
  },
  snake: {
    matchFirst: true,
    match: { label: 'Coil close and slow our foes.', delta: 0.2, flag: 'snake_intro_encourage' },
    clash: { label: 'I was hoping for\u2026 thumbs.', delta: 0 },
    defer: { label: 'Curl up for now, Snek.' },
  },
};
