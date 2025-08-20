import { MockRoom } from '../../../ai/mockAIEngine';

export const mansionRooms: MockRoom[] = [
  {
    id: 'mansion_grand_library',
    name: 'Grand Library',
    description: 'Towering mahogany shelves stretch to the vaulted ceiling, filled with leather-bound tomes and ancient manuscripts. A crackling fireplace casts dancing shadows across comfortable reading chairs, while crystal decanters sit atop an ornate desk.',
    themes: ['mansion', 'library', 'luxurious', 'scholarly'],
    keywords: ['books', 'fireplace', 'mahogany', 'crystal', 'leather', 'manuscripts'],
    mood: 'peaceful',
    size: 'spacious',
    lighting: 'warm',
    nameVariations: ['Magnificent Library', 'Scholar\'s Sanctuary', 'The Great Study'],
    descriptionVariations: [
      'An impressive library where countless volumes line the walls from floor to ceiling. Soft lamplight illuminates reading alcoves, and the scent of old parchment mingles with the warmth from a marble fireplace.',
      'This grand library houses a treasure trove of knowledge, with rolling ladders providing access to the highest shelves. Plush armchairs invite quiet contemplation beside tall windows draped in burgundy velvet.'
    ],
    connectionHints: {
      architectural: ['ornate_doorway', 'hidden_bookshelf_door', 'grand_archway'],
      natural: [],
      mystical: ['enchanted_tome_portal'],
      mechanical: ['sliding_bookcase']
    },
    adjacencyBonus: ['study', 'office', 'scholarly', 'quiet'],
    adjacencyPenalty: ['kitchen', 'servants', 'noisy'],
    regionFit: 0.95
  },

  {
    id: 'mansion_crystal_ballroom',
    name: 'Crystal Ballroom',
    description: 'An opulent ballroom with a polished marble floor that reflects the light from magnificent crystal chandeliers. Gilded mirrors line the walls between tall windows, and a grand piano sits in an alcove adorned with fresh flowers.',
    themes: ['mansion', 'ballroom', 'luxurious', 'entertainment'],
    keywords: ['crystal', 'chandelier', 'marble', 'gilded', 'piano', 'mirrors'],
    mood: 'welcoming',
    size: 'vast',
    lighting: 'bright',
    nameVariations: ['Grand Ballroom', 'The Golden Hall', 'Palace Ballroom'],
    descriptionVariations: [
      'A magnificent ballroom where elegant soirées once took place. Pristine marble floors gleam under ornate crystal fixtures, while gold-framed portraits of nobility watch from the walls.',
      'This splendid ballroom echoes with the memory of waltzes past. Elaborate chandeliers cast prismatic light across the vast dance floor, and tall windows offer views of manicured gardens.'
    ],
    connectionHints: {
      architectural: ['marble_archway', 'grand_entrance', 'gilded_doors'],
      natural: ['garden_terrace'],
      mystical: ['dancing_light_portal'],
      mechanical: ['hidden_orchestra_pit']
    },
    adjacencyBonus: ['entertainment', 'formal', 'grand'],
    adjacencyPenalty: ['servants', 'kitchen', 'storage'],
    regionFit: 0.9
  },

  {
    id: 'mansion_master_bedroom',
    name: 'Master Bedroom',
    description: 'An elegant bedroom dominated by a massive four-poster bed draped in silk curtains. Ornate furniture crafted from dark wood fills the space, while a sitting area by the tall windows overlooks the estate grounds.',
    themes: ['mansion', 'bedroom', 'luxurious', 'private'],
    keywords: ['four-poster', 'silk', 'curtains', 'ornate', 'dark_wood', 'private'],
    mood: 'peaceful',
    size: 'spacious',
    lighting: 'dim',
    nameVariations: ['Royal Suite', 'Lord\'s Chamber', 'The Master\'s Quarters'],
    descriptionVariations: [
      'A sumptuous bedroom where luxury meets comfort. Rich tapestries adorn the walls, and a magnificent canopied bed dominates the room. An antique armoire and writing desk complete the refined atmosphere.',
      'This opulent master suite features a grand bed with intricate carvings and velvet drapes. Persian rugs cover polished hardwood floors, and a cozy fireplace provides warmth and ambiance.'
    ],
    connectionHints: {
      architectural: ['private_door', 'carved_doorway', 'curtained_entrance'],
      natural: ['balcony_access'],
      mystical: ['dreamscape_portal'],
      mechanical: ['hidden_passage']
    },
    adjacencyBonus: ['private', 'quiet', 'luxurious'],
    adjacencyPenalty: ['public', 'servants', 'kitchen'],
    regionFit: 0.85
  },

  {
    id: 'mansion_wine_cellar',
    name: 'Wine Cellar',
    description: 'Ancient stone archways frame this underground cellar where hundreds of wine bottles rest in their racks. The air is cool and still, heavy with the rich scent of aging vintages. Cobwebs drape the corners like delicate lace.',
    themes: ['mansion', 'cellar', 'storage', 'underground'],
    keywords: ['stone', 'wine', 'bottles', 'cool', 'archways', 'cobwebs'],
    mood: 'mysterious',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['The Vintner\'s Vault', 'Underground Wine Vault', 'Cellar of Vintages'],
    descriptionVariations: [
      'A traditional wine cellar carved from stone, where countless bottles lie in peaceful slumber. Wooden racks stretch into shadowy alcoves, and the temperature remains perfectly cool for preservation.',
      'This subterranean cellar houses an impressive collection of rare wines. Stone walls weep with moisture, and torchlight flickers across labels from vineyards long forgotten.'
    ],
    connectionHints: {
      architectural: ['stone_stairs', 'arched_doorway', 'cellar_entrance'],
      natural: ['underground_passage'],
      mystical: ['spirit_wine_portal'],
      mechanical: ['wine_rack_mechanism']
    },
    adjacencyBonus: ['storage', 'underground', 'cool'],
    adjacencyPenalty: ['bright', 'warm', 'outdoor'],
    regionFit: 0.8
  },

  {
    id: 'mansion_conservatory',
    name: 'Conservatory',
    description: 'A glass-walled conservatory filled with exotic plants and flowering vines. Sunlight streams through the crystal dome overhead, creating a warm greenhouse atmosphere. A delicate fountain babbles among the tropical foliage.',
    themes: ['mansion', 'conservatory', 'garden', 'glass'],
    keywords: ['glass', 'plants', 'fountain', 'sunlight', 'tropical', 'exotic'],
    mood: 'peaceful',
    size: 'spacious',
    lighting: 'bright',
    nameVariations: ['Glass Garden', 'The Botanical Chamber', 'Crystal Greenhouse'],
    descriptionVariations: [
      'An elegant greenhouse where rare plants from distant lands flourish under glass panels. Marble pathways wind between flowering beds, and the sound of trickling water adds to the serene atmosphere.',
      'This magnificent conservatory houses a living collection of botanical wonders. Humid air carries the perfume of exotic blooms, while butterflies dance among the verdant displays.'
    ],
    connectionHints: {
      architectural: ['glass_doors', 'garden_entrance', 'greenhouse_portal'],
      natural: ['garden_path', 'flower_trail'],
      mystical: ['nature_spirit_gateway'],
      mechanical: ['automated_watering_system']
    },
    adjacencyBonus: ['garden', 'natural', 'peaceful'],
    adjacencyPenalty: ['dark', 'underground', 'cold'],
    regionFit: 0.75
  },

  {
    id: 'mansion_servants_hall',
    name: 'Servants\' Hall',
    description: 'A functional dining hall where the household staff takes their meals. Simple wooden tables and benches fill the space, while copper pots and practical dishware line the shelves. The atmosphere is warm but modest.',
    themes: ['mansion', 'servants', 'dining', 'functional'],
    keywords: ['wooden', 'tables', 'benches', 'copper', 'simple', 'practical'],
    mood: 'welcoming',
    size: 'intimate',
    lighting: 'warm',
    nameVariations: ['Staff Dining Room', 'The Common Hall', 'Servants\' Quarters'],
    descriptionVariations: [
      'A modest dining area designed for the household staff. Sturdy furniture and basic amenities create a comfortable space for meals and brief respites from duties.',
      'This practical hall serves as both dining room and gathering place for servants. Worn but clean wooden surfaces speak of years of faithful service and simple meals shared.'
    ],
    connectionHints: {
      architectural: ['service_door', 'plain_doorway', 'staff_entrance'],
      natural: [],
      mystical: [],
      mechanical: ['dumbwaiter', 'servant_bell_system']
    },
    adjacencyBonus: ['kitchen', 'service', 'practical'],
    adjacencyPenalty: ['luxurious', 'formal', 'grand'],
    regionFit: 0.7
  },

  {
    id: 'mansion_portrait_gallery',
    name: 'Portrait Gallery',
    description: 'A long hallway lined with oil paintings of stern-faced ancestors in elaborate frames. Soft carpet runners muffle footsteps, while ornate gas lamps provide warm illumination for viewing the family\'s illustrious history.',
    themes: ['mansion', 'gallery', 'art', 'historical'],
    keywords: ['portraits', 'paintings', 'frames', 'ancestors', 'carpet', 'lamps'],
    mood: 'mysterious',
    size: 'spacious',
    lighting: 'warm',
    nameVariations: ['Ancestral Gallery', 'Hall of Portraits', 'The Family Gallery'],
    descriptionVariations: [
      'An impressive corridor where generations of family portraits gaze down from gilded frames. Rich burgundy wallpaper and polished brass fixtures create an atmosphere of dignified history.',
      'This stately gallery showcases the lineage of the estate\'s owners. Each painting tells a story of power and prestige, while heavy drapes frame tall windows between the artworks.'
    ],
    connectionHints: {
      architectural: ['gallery_entrance', 'corridor_door', 'formal_archway'],
      natural: [],
      mystical: ['ancestor_spirit_portal', 'painting_gateway'],
      mechanical: ['rotating_portrait_door']
    },
    adjacencyBonus: ['formal', 'historical', 'art'],
    adjacencyPenalty: ['servants', 'kitchen', 'casual'],
    regionFit: 0.85
  },

  {
    id: 'mansion_kitchen',
    name: 'Manor Kitchen',
    description: 'A bustling kitchen with copper pots hanging from hooks above a massive stone hearth. Preparation tables made of thick oak bear the marks of countless meals, while herbs hang drying from the rafters.',
    themes: ['mansion', 'kitchen', 'cooking', 'functional'],
    keywords: ['copper', 'pots', 'hearth', 'oak', 'herbs', 'cooking'],
    mood: 'welcoming',
    size: 'spacious',
    lighting: 'warm',
    nameVariations: ['The Great Kitchen', 'Culinary Hall', 'Manor Cookhouse'],
    descriptionVariations: [
      'A well-appointed kitchen designed to feed a large household. Multiple ovens, prep stations, and storage areas work in harmony, while the constant warmth makes it a gathering place for staff.',
      'This grand kitchen bustles with activity as meals are prepared for the estate. Cast iron ranges, marble counters, and hanging game create an atmosphere of abundant hospitality.'
    ],
    connectionHints: {
      architectural: ['service_door', 'pantry_entrance', 'staff_corridor'],
      natural: ['herb_garden_door'],
      mystical: [],
      mechanical: ['spice_lift', 'cold_storage']
    },
    adjacencyBonus: ['servants', 'dining', 'pantry'],
    adjacencyPenalty: ['library', 'bedroom', 'formal'],
    regionFit: 0.8
  },

  {
    id: 'mansion_study',
    name: 'Private Study',
    description: 'An intimate study filled with the tools of scholarship and administration. A heavy desk dominates the room, surrounded by filing cabinets and reference books. Maps and documents cover every available surface.',
    themes: ['mansion', 'study', 'office', 'scholarly'],
    keywords: ['desk', 'documents', 'maps', 'books', 'filing', 'scholarly'],
    mood: 'mysterious',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['The Office', 'Private Sanctum', 'Scholar\'s Den'],
    descriptionVariations: [
      'A cluttered but organized study where important business is conducted. Ledgers, correspondence, and estate documents create controlled chaos across multiple writing surfaces.',
      'This personal retreat serves as both office and sanctuary. Leather-bound journals, quill pens, and an elaborate desk set speak to serious intellectual pursuits.'
    ],
    connectionHints: {
      architectural: ['private_door', 'office_entrance', 'study_portal'],
      natural: [],
      mystical: ['knowledge_gateway', 'scholar_portal'],
      mechanical: ['secret_filing_system', 'hidden_safe']
    },
    adjacencyBonus: ['library', 'office', 'private'],
    adjacencyPenalty: ['kitchen', 'servants', 'entertainment'],
    regionFit: 0.9
  },

  {
    id: 'mansion_smoking_room',
    name: 'Smoking Room',
    description: 'A masculine retreat with dark wood paneling and leather armchairs arranged around a small fireplace. The air carries the lingering scent of fine tobacco, and crystal decanters of aged spirits sit ready on a side table.',
    themes: ['mansion', 'smoking', 'masculine', 'leisure'],
    keywords: ['dark_wood', 'leather', 'fireplace', 'tobacco', 'crystal', 'spirits'],
    mood: 'welcoming',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['The Gentleman\'s Retreat', 'Tobacco Lounge', 'The Club Room'],
    descriptionVariations: [
      'An exclusive gentlemen\'s lounge where business deals are struck over fine cigars. Rich mahogany and deep green leather create an atmosphere of wealth and masculine comfort.',
      'This private smoking chamber offers respite from social obligations. Comfortable seating, premium spirits, and the soft glow of table lamps create perfect conditions for contemplation.'
    ],
    connectionHints: {
      architectural: ['gentlemen_door', 'club_entrance', 'private_portal'],
      natural: [],
      mystical: ['smoke_spirit_gateway'],
      mechanical: ['humidor_mechanism', 'secret_bar']
    },
    adjacencyBonus: ['masculine', 'private', 'leisure'],
    adjacencyPenalty: ['feminine', 'kitchen', 'servants'],
    regionFit: 0.8
  }
];