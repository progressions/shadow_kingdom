import { MockRoom } from '../../../ai/mockAIEngine';

export const forestRooms: MockRoom[] = [
  {
    id: 'forest_ancient_grove',
    name: 'Ancient Grove',
    description: 'Towering oak trees form a natural cathedral, their massive trunks scarred by centuries of growth. Dappled sunlight filters through the canopy above, illuminating patches of wildflowers scattered across the mossy forest floor.',
    themes: ['forest', 'ancient', 'sacred', 'peaceful'],
    keywords: ['oak', 'trees', 'canopy', 'sunlight', 'moss', 'wildflowers'],
    mood: 'peaceful',
    size: 'spacious',
    lighting: 'dim',
    nameVariations: ['Sacred Grove', 'The Elder Trees', 'Druid\'s Circle'],
    descriptionVariations: [
      'A ring of ancient oaks surrounds a peaceful clearing where time seems to stand still. Soft moss carpets the ground, and the air hums with the quiet magic of centuries past.',
      'These venerable trees have witnessed countless seasons, their gnarled branches reaching skyward like the arms of sleeping giants. Mushrooms and ferns thrive in their protective shadow.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['root_bridge', 'deer_path', 'fallen_log_crossing'],
      mystical: ['fairy_ring', 'druid_portal', 'nature_spirit_gateway'],
      mechanical: []
    },
    adjacencyBonus: ['ancient', 'peaceful', 'sacred'],
    adjacencyPenalty: ['urban', 'artificial', 'loud'],
    regionFit: 0.95
  },

  {
    id: 'forest_babbling_brook',
    name: 'Babbling Brook',
    description: 'Crystal-clear water bubbles over smooth stones, creating a gentle melody that echoes through the forest. Willows dip their branches into the stream, while colorful pebbles gleam beneath the flowing water.',
    themes: ['forest', 'water', 'peaceful', 'natural'],
    keywords: ['water', 'stream', 'stones', 'willows', 'pebbles', 'flowing'],
    mood: 'peaceful',
    size: 'intimate',
    lighting: 'bright',
    nameVariations: ['Crystal Stream', 'Whispering Waters', 'The Singing Brook'],
    descriptionVariations: [
      'A cheerful stream winds through the forest, its clear waters reflecting the sky above. Smooth river rocks create natural stepping stones, while water lilies bloom in quiet pools.',
      'This meandering brook carries the melted snow from distant mountains, its pure waters nurturing the lush vegetation along its banks. Dragonflies dance above the gentle current.'
    ],
    connectionHints: {
      architectural: ['stone_bridge'],
      natural: ['stream_crossing', 'water_path', 'riverbank_trail'],
      mystical: ['water_spirit_portal', 'reflection_gateway'],
      mechanical: ['waterwheel', 'dam_mechanism']
    },
    adjacencyBonus: ['water', 'peaceful', 'natural'],
    adjacencyPenalty: ['dry', 'fire', 'desert'],
    regionFit: 0.9
  },

  {
    id: 'forest_mushroom_circle',
    name: 'Mushroom Circle',
    description: 'A perfect ring of spotted toadstools marks this forest clearing, their red caps bright against the dark earth. Strange phosphorescent fungi glow softly in the shadows, while the air shimmers with an otherworldly energy.',
    themes: ['forest', 'mystical', 'fungi', 'magical'],
    keywords: ['mushrooms', 'toadstools', 'circle', 'phosphorescent', 'glowing', 'magical'],
    mood: 'mysterious',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['Fairy Ring', 'The Enchanted Circle', 'Mystic Mushroom Grove'],
    descriptionVariations: [
      'Bioluminescent fungi create an ethereal glow in this secluded clearing. The mushroom ring pulses with subtle magic, and tiny lights dance just beyond the edge of vision.',
      'This natural wonder defies explanation, as dozens of varieties of fungi thrive in perfect harmony. The very air seems charged with ancient forest magic.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['hidden_path', 'secret_grove_entrance'],
      mystical: ['fairy_portal', 'fungal_gateway', 'mushroom_teleporter'],
      mechanical: []
    },
    adjacencyBonus: ['mystical', 'magical', 'fungi'],
    adjacencyPenalty: ['mundane', 'artificial', 'bright'],
    regionFit: 0.85
  },

  {
    id: 'forest_hunting_lodge',
    name: 'Abandoned Hunting Lodge',
    description: 'A weathered log cabin sits empty among the trees, its windows dark and door hanging ajar. Deer antlers still adorn the walls, while rusty traps and forgotten equipment lie scattered about the overgrown clearing.',
    themes: ['forest', 'abandoned', 'shelter', 'rustic'],
    keywords: ['cabin', 'logs', 'antlers', 'traps', 'equipment', 'weathered'],
    mood: 'mysterious',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['Hunter\'s Cabin', 'Forgotten Lodge', 'The Old Shelter'],
    descriptionVariations: [
      'Nature slowly reclaims this abandoned outpost. Vines crawl up the log walls, and small animals have made homes in the corners, yet the structure remains sound.',
      'This rustic lodge once served hunters and trappers, but now stands as a monument to solitude. A stone fireplace and rough-hewn furniture speak of simpler times.'
    ],
    connectionHints: {
      architectural: ['cabin_door', 'window_entrance', 'chimney_access'],
      natural: ['game_trail', 'hunter_path'],
      mystical: [],
      mechanical: ['hidden_cache', 'trap_door']
    },
    adjacencyBonus: ['rustic', 'shelter', 'abandoned'],
    adjacencyPenalty: ['luxurious', 'formal', 'grand'],
    regionFit: 0.75
  },

  {
    id: 'forest_hollow_tree',
    name: 'Hollow Tree',
    description: 'An enormous oak stands hollow but alive, its cavernous interior large enough to shelter travelers. Spiral patterns in the bark seem to tell ancient stories, while soft moss creates a natural carpet within the living chamber.',
    themes: ['forest', 'shelter', 'ancient', 'natural'],
    keywords: ['hollow', 'oak', 'cavernous', 'bark', 'moss', 'shelter'],
    mood: 'peaceful',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['The Great Hollow', 'Ancient Shelter', 'Tree Chamber'],
    descriptionVariations: [
      'This massive tree has been hollowed by time and nature, creating a cozy refuge. Sunlight filters through gaps in the bark, and the walls pulse gently with the tree\'s life force.',
      'Nature\'s own architecture has created this living shelter. The hollow interior stays warm and dry, while the tree continues to thrive around its secret chamber.'
    ],
    connectionHints: {
      architectural: ['bark_door', 'root_entrance'],
      natural: ['tree_tunnel', 'branch_bridge', 'root_path'],
      mystical: ['tree_spirit_portal', 'living_wood_gateway'],
      mechanical: []
    },
    adjacencyBonus: ['natural', 'shelter', 'ancient'],
    adjacencyPenalty: ['artificial', 'modern', 'metal'],
    regionFit: 0.9
  },

  {
    id: 'forest_meadow_clearing',
    name: 'Sunlit Meadow',
    description: 'A circular clearing opens to the sky, filled with knee-high grass and wildflowers swaying in the breeze. Butterflies dance from bloom to bloom, while bees hum busily among the colorful petals.',
    themes: ['forest', 'meadow', 'bright', 'peaceful'],
    keywords: ['clearing', 'grass', 'wildflowers', 'butterflies', 'bees', 'sunlight'],
    mood: 'welcoming',
    size: 'spacious',
    lighting: 'bright',
    nameVariations: ['Flower Meadow', 'Sunny Glade', 'The Bright Clearing'],
    descriptionVariations: [
      'This pastoral clearing bursts with life and color. Tall grasses bend in waves across the open space, punctuated by clusters of daisies, lupines, and other wild blooms.',
      'A perfect circle of sunshine breaks through the forest canopy, nurturing a miniature prairie ecosystem. The sweet scent of flowers mingles with the fresh air.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['meadow_path', 'flower_trail', 'grass_passage'],
      mystical: ['sunbeam_portal', 'flower_fairy_gateway'],
      mechanical: []
    },
    adjacencyBonus: ['bright', 'peaceful', 'open'],
    adjacencyPenalty: ['dark', 'underground', 'confined'],
    regionFit: 0.8
  },

  {
    id: 'forest_tangled_thicket',
    name: 'Tangled Thicket',
    description: 'Dense brambles and thorny vines create an almost impenetrable barrier, with only narrow gaps allowing passage. The air is thick with the scent of berries and wild roses, while thorns catch at clothing and skin.',
    themes: ['forest', 'dense', 'challenging', 'wild'],
    keywords: ['brambles', 'thorns', 'vines', 'berries', 'roses', 'dense'],
    mood: 'challenging',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['Briar Patch', 'Thornwall', 'The Maze of Thorns'],
    descriptionVariations: [
      'This natural fortress of thorns and brambles guards its secrets jealously. Only the most determined travelers can find safe passage through the maze of razor-sharp barriers.',
      'Wild roses and blackberry canes interweave to create an living wall. Despite the danger, ripe fruit hangs heavy on the branches, and sweet floral scents fill the air.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['narrow_gap', 'deer_tunnel', 'thorn_passage'],
      mystical: ['briar_portal', 'rose_spirit_gateway'],
      mechanical: ['hidden_gate', 'thorn_mechanism']
    },
    adjacencyBonus: ['wild', 'challenging', 'protective'],
    adjacencyPenalty: ['open', 'easy', 'smooth'],
    regionFit: 0.7
  },

  {
    id: 'forest_moonbeam_glade',
    name: 'Moonbeam Glade',
    description: 'Silver light filters through the canopy into this enchanted clearing, where luminescent flowers bloom only in darkness. Night-blooming jasmine fills the air with intoxicating perfume, while fireflies create living constellations.',
    themes: ['forest', 'night', 'mystical', 'luminescent'],
    keywords: ['moonlight', 'silver', 'luminescent', 'flowers', 'jasmine', 'fireflies'],
    mood: 'mysterious',
    size: 'spacious',
    lighting: 'dim',
    nameVariations: ['Silver Glade', 'Night Flower Garden', 'The Luminous Grove'],
    descriptionVariations: [
      'This magical clearing transforms at night, as bioluminescent plants create an otherworldly garden. Soft blue and green glows emanate from special flowers that sleep during the day.',
      'Moonlight seems drawn to this special place, creating a natural amphitheater of silver radiance. Night creatures gather here peacefully, as if under an ancient protection.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['moonbeam_path', 'night_trail', 'luminous_passage'],
      mystical: ['lunar_portal', 'starlight_gateway', 'night_spirit_door'],
      mechanical: []
    },
    adjacencyBonus: ['night', 'mystical', 'peaceful'],
    adjacencyPenalty: ['bright', 'harsh', 'mundane'],
    regionFit: 0.85
  },

  {
    id: 'forest_old_campsite',
    name: 'Old Campsite',
    description: 'A ring of blackened stones marks where countless fires once burned, surrounded by fallen logs arranged as primitive seating. Scattered bones and rusted cookware hint at the site\'s long use by travelers and hunters.',
    themes: ['forest', 'campsite', 'abandoned', 'travelers'],
    keywords: ['stones', 'fire_ring', 'logs', 'bones', 'cookware', 'ashes'],
    mood: 'welcoming',
    size: 'intimate',
    lighting: 'warm',
    nameVariations: ['Traveler\'s Rest', 'The Old Fire Ring', 'Hunter\'s Camp'],
    descriptionVariations: [
      'This well-used camping spot shows signs of many visitors over the years. The fire ring is clean and ready for use, while carved initials in nearby trees tell stories of past travelers.',
      'A traditional stopping point for forest wanderers, this campsite offers shelter and a sense of community. The remains of old camps blend with the forest floor, yet the space feels welcoming.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['traveler_path', 'game_trail', 'water_access_trail'],
      mystical: [],
      mechanical: ['hidden_supply_cache']
    },
    adjacencyBonus: ['travelers', 'practical', 'social'],
    adjacencyPenalty: ['formal', 'pristine', 'untouched'],
    regionFit: 0.7
  },

  {
    id: 'forest_crystal_spring',
    name: 'Crystal Spring',
    description: 'Pure water bubbles up from deep within the earth, forming a perfectly clear pool surrounded by smooth white stones. Steam rises gently from the warm water, while mineral deposits create rainbow patterns around the spring\'s edge.',
    themes: ['forest', 'spring', 'pure', 'healing'],
    keywords: ['spring', 'crystal', 'pure', 'water', 'stones', 'mineral', 'steam'],
    mood: 'peaceful',
    size: 'intimate',
    lighting: 'bright',
    nameVariations: ['Sacred Spring', 'The Healing Waters', 'Pure Source'],
    descriptionVariations: [
      'This natural hot spring creates a oasis of warmth in the cool forest. The mineral-rich waters are said to have healing properties, and the area radiates tranquility.',
      'Fed by underground thermal activity, this spring maintains a constant gentle warmth. Delicate crystals have formed around the edges, creating a jewel-like border.'
    ],
    connectionHints: {
      architectural: ['stone_steps'],
      natural: ['spring_path', 'mineral_trail', 'steam_passage'],
      mystical: ['healing_portal', 'water_spirit_gateway', 'crystal_door'],
      mechanical: []
    },
    adjacencyBonus: ['healing', 'pure', 'warm'],
    adjacencyPenalty: ['polluted', 'cold', 'harsh'],
    regionFit: 0.9
  }
];