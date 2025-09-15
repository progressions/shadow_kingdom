// First-appearance VN intro texts by character key.
// Each value is a single string; newlines (\n) separate narration and quoted line.

export const introTexts = {
  canopy:
    "You see a blonde‑haired healer in a blue dress, ringed by snarling foes and fighting to keep her footing. Calm resolve steels her gaze as she beckons you closer, ready to mend every wound if you can help her break through.\n" +
    "\nCanopy: \"I'm looking for my sister—Ell. Urathar's raiders took her when they burned our village. Help me break through and I'll keep you standing.\"",

  yorna:
    "A red‑haired fighter squares up, eyes on the stone keep to the southeast. Her stance is steady and her purpose is plain.\n" +
    "\nYorna: \"Vast is in that castle. Urathar wants this valley. I'm here to stop them. If you go, I go.\"",

  hola:
    "A black‑haired sorceress hugs a weathered spellbook, counting breaths as she tests the air like a student tasting a lesson. Her gaze keeps sliding toward a black‑walled keep; the wind tastes faintly of ash.\n" +
    "\nHola: \"My Lord… Vast shut herself behind that gate. I'm still learning, but I can keep a little breeze pointing us there. The brute with the brass key—Gorg—walks outside the wall. If we take it, I… I can help you reach her.\"",

  vast:
    "A black‑haired sorceress in a black dress stands before the castle gate, the air around her shimmering like heat off stone. Power coils lazily at her fingertips as she regards you with cool amusement, certain the light here will not last.\n" +
    "\nVast: \"You made it this far? Then watch how hope burns to ash.\"",

  gorg:
    "A hulking foe prowls the ruins ahead, armor scuffed and eyes hard. You catch the glint of a brass key at his belt—he guards the way forward and won’t part with it quietly.\n" +
    "\nGorg: \"Turn back if you value your bones. The gate stays shut—unless you take the key from me.\"",

  nethra:
    "A veiled warrior stands amidst sun-baked ruins, fingers tracing sigils into the dust as the air warps with heat. Her gaze weighs your footsteps and finds them wanting.\n" +
    "\nNethra: \"Vast failed, but I will not. Urathar\'s shadow lengthens—turn back or be unmade.\"",

  oyin:
    "A young traveler steadies her hands and counts under her breath, eyes bright but wavering. She tucks a strand of blonde hair behind her ear, trying to look braver than she feels.\n" +
    "\nOyin: \"I—I'll try to help. I\'m still learning, but if you need me… I can try.\"",

  twil:
    "Footsteps soft as dust, grin quick as lightning. Twil reads the ruins in a blink and throws you a cocky wink.\n" +
    "\nTwil: \"Tracks say trouble—but it\'s slow. Try to keep up, yeah?\"",

  aarg:
    "Blue scales glint along the ruin wall; the air chills in his wake as he lifts a cerulean crest.\n" +
    "\nAarg: \"The gate stays shut without my key. Take it if you can.\"",

  luula:
    "The marsh hushes. At the island's heart, a figure raises a reed crown and the water stills. Her voice is moon‑thin over the bog.\n" +
    "\nLuula: \"Step light, wanderer. The marsh remembers every footfall… and it will remember yours.\"",

  // Level 4 — Ruined City personalities
  blurb:
    "Something heaves between fallen arches—a grotesque, green bulk wobbling with each wet breath. Grease-slick skin and greedy eyes fix on the prize at his waist: an iron sigil on a chain.\n" +
    "\nBlurb: \"Hhhrrk… pretty little sigil. Mine. You want it? Come take it.\"",

  vanificia:
    "White hair falls like frost over a black dress as she steps into the ruined plaza. Every motion is measured, every glance a verdict. Dust hangs, waiting for her sentence.\n" +
    "\nVanificia: \"You trespass in Urathar's city. I hold these ruins in his name. Kneel—or be unmade.\"",

  urn:
    "Green hair tucked under a hopeful grin, she bounces on her toes among broken streets. This was her home. When the city fell, she learned to move and hope at the same time—and she kept another survivor alive doing it.\n" +
    "\nUrn: \"Mister, we can fix this—one street at a time. I’ll keep up!\"",

  varabella:
    "A red-haired figure leans against a shattered plinth, black dress dusted with ash. She grew up in these blocks; now she reads the ruins like a map and keeps the people she loves standing. Sarcasm is a shield that never cracks.\n" +
    "\nVarabella: \"Boss man, oh good. Another hero. Try not to trip over the bodies while you impress me.\"",

  tin:
    "Blue hair, bright eyes, and bouncing steps—Tin nearly trips over her own feet and laughs anyway. She points at three paths at once and somehow means all of them.\n" +
    "\nTin: \"I can help! I just—okay—this way! No—this way! You'll keep up, right?\"",

  nellis:
    "A blue-haired girl in a white dress keeps to your shoulder, gaze lowered, counting breaths. The city feels quieter near her—like the space between bell tolls.\n" +
    "\nNellis: \"If you lead, I’ll keep the line. I can hold a light.\"",

  // Level 5 — Temple District
  vorthak_intro_default: [
    {
      character: 'Vorthak',
      line: "The Heart of this temple now belongs to Urathar. This girl is a gift. She will be broken, just like the other one.",
    },
    {
      character: 'Ell',
      line: "I will never serve you, monster! My sister will stop you!",
      portrait: 'assets/portraits/level06/Ell/Ell.mp4',
    },
    {
      character: 'Fana',
      line: "He speaks the truth. He took my will. Now he will take hers. Please... you must not let him. Save her. Free us both.",
      portrait: 'assets/portraits/level05/Fana/Fana.mp4',
    },
  ],

  vorthak_intro_with_canopy: [
    {
      character: 'Vorthak',
      line: "The Heart of this temple now belongs to Urathar. This girl is a gift. She will be broken, just like the other one.",
    },
    {
      character: 'Canopy',
      line: "Ell! Let her go, Vorthak!",
      portrait: 'assets/portraits/level01/Canopy/Canopy angry.png',
    },
    {
      character: 'Vorthak',
      line: "Ah, the sister. You have come to watch her fall. Good.",
    },
    {
      character: 'Ell',
      line: "Canopy! Help me!",
      portrait: 'assets/portraits/level06/Ell/Ell.mp4',
    },
    {
      character: 'Fana',
      line: "He took my will. He will take hers. Please... you must save her. Free us both.",
      portrait: 'assets/portraits/level05/Fana/Fana.mp4',
    },
  ],

  cowsill:
    "A bright-eyed warrior bounds forward, blonde hair catching the light as she spins her blade with practiced ease. Her black dress swirls as she moves, and her infectious energy seems to make the very air around her crackle with anticipation.\n" +
    "\nCowsill: \"Hey there! I'm Cowsill! You look like you could use a strike partner—when we fight together, every hit lands twice as hard! Ready to show them what teamwork really means?\"",

  // Level 6 — Queen Rose
  rose:
    "The hall hushes as a figure in gold and white steps into the light. Her blonde hair is braided like a coronet; her gaze is steady and luminous. When she speaks, the stones seem to listen.\n" +
    "\nRose: \"Liberator of Aurelion—accept our undying thanks. The Heart beats again by your hand. Yet prudence bids us mourn the unknown: Urathar\'s burrow lies undisclosed, and his bands still scour the outer demesnes.\"",
};
