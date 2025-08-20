import { MockRoom } from '../../../ai/mockAIEngine';

export const caveRooms: MockRoom[] = [
  {
    id: 'cave_crystal_chamber',
    name: 'Crystal Chamber',
    description: 'Magnificent crystal formations jut from the walls and ceiling, casting prismatic light in all directions. The sound of dripping water echoes through the space, while amethyst and quartz clusters create a natural cathedral of stone.',
    themes: ['cave', 'crystal', 'magnificent', 'underground'],
    keywords: ['crystal', 'formations', 'prismatic', 'amethyst', 'quartz', 'dripping'],
    mood: 'mysterious',
    size: 'spacious',
    lighting: 'bright',
    nameVariations: ['Gem Chamber', 'The Crystal Cathedral', 'Prismatic Cavern'],
    descriptionVariations: [
      'Natural crystal formations transform this cavern into a glittering wonderland. Light refracts through countless faceted surfaces, creating rainbow patterns on the rough stone walls.',
      'This geological marvel showcases nature\'s artistry in crystal form. Massive geodes line the chamber, their inner surfaces sparkling with countless tiny gems.'
    ],
    connectionHints: {
      architectural: ['crystal_arch', 'gem_doorway'],
      natural: ['crystal_tunnel', 'geode_passage', 'mineral_vein_path'],
      mystical: ['crystal_portal', 'gem_spirit_gateway', 'light_refraction_door'],
      mechanical: ['crystal_resonance_gate']
    },
    adjacencyBonus: ['crystal', 'beautiful', 'bright'],
    adjacencyPenalty: ['muddy', 'dark', 'simple'],
    regionFit: 0.95
  },

  {
    id: 'cave_underground_lake',
    name: 'Underground Lake',
    description: 'A vast subterranean lake stretches into darkness, its still waters reflecting the faint phosphorescent glow of cave minerals. Stone formations rise from the depths like ancient sentinels, while gentle ripples suggest unseen currents.',
    themes: ['cave', 'water', 'vast', 'dark'],
    keywords: ['lake', 'water', 'phosphorescent', 'stone', 'sentinels', 'ripples'],
    mood: 'mysterious',
    size: 'vast',
    lighting: 'dim',
    nameVariations: ['Sunless Sea', 'The Dark Waters', 'Cavern Lake'],
    descriptionVariations: [
      'This hidden sea lies far from any surface light, its depths unknown and mysterious. Strange formations breach the surface like sleeping giants, while soft bioluminescence creates an otherworldly glow.',
      'Fed by underground springs, this pristine lake has never felt sunlight. The water is crystal clear yet dark, and the silence is broken only by the occasional splash of unseen life.'
    ],
    connectionHints: {
      architectural: ['stone_bridge', 'causeway'],
      natural: ['underground_stream', 'water_passage', 'flooded_tunnel'],
      mystical: ['water_spirit_portal', 'depth_gateway'],
      mechanical: ['boat_launch', 'diving_platform']
    },
    adjacencyBonus: ['water', 'mysterious', 'vast'],
    adjacencyPenalty: ['dry', 'small', 'bright'],
    regionFit: 0.9
  },

  {
    id: 'cave_narrow_passage',
    name: 'Narrow Passage',
    description: 'The cave constricts to a tight corridor barely wide enough for a single person. Smooth walls bear the marks of ancient water flow, while the ceiling presses down oppressively. Each step echoes with unexpected volume.',
    themes: ['cave', 'narrow', 'tight', 'challenging'],
    keywords: ['narrow', 'corridor', 'tight', 'smooth', 'water_flow', 'echoes'],
    mood: 'challenging',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['The Squeeze', 'Throat of Stone', 'Constricted Path'],
    descriptionVariations: [
      'This claustrophobic passage demands careful navigation. The walls seem to press inward, and loose stones underfoot make every step treacherous in the confined space.',
      'Carved by millennia of flowing water, this natural bottleneck requires travelers to move single-file. The worn stone walls tell the story of countless years of erosion.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['tight_squeeze', 'erosion_channel', 'water_carved_path'],
      mystical: ['pressure_portal', 'stone_spirit_passage'],
      mechanical: []
    },
    adjacencyBonus: ['challenging', 'narrow', 'intimate'],
    adjacencyPenalty: ['spacious', 'open', 'easy'],
    regionFit: 0.75
  },

  {
    id: 'cave_bat_colony',
    name: 'Bat Colony',
    description: 'Thousands of bats cling to the ceiling in this high-roofed cavern, their chittering creating a constant soft murmur. The floor is covered with years of guano, while the air moves with the flutter of countless wings.',
    themes: ['cave', 'bats', 'colony', 'wildlife'],
    keywords: ['bats', 'ceiling', 'chittering', 'guano', 'wings', 'flutter'],
    mood: 'mysterious',
    size: 'spacious',
    lighting: 'dim',
    nameVariations: ['Roost Chamber', 'The Flying Shadows', 'Wing Haven'],
    descriptionVariations: [
      'This natural amphitheater serves as home to a massive bat colony. The creatures hang in dense clusters above, occasionally taking flight in swirling clouds of motion.',
      'A living ceiling of fur and wings creates an ever-shifting canopy overhead. The pungent smell of the colony mingles with the cool cave air, while echolocation calls bounce off the walls.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['high_passage', 'air_current_tunnel', 'echo_chamber_exit'],
      mystical: ['wing_spirit_gateway', 'shadow_portal'],
      mechanical: []
    },
    adjacencyBonus: ['wildlife', 'high', 'natural'],
    adjacencyPenalty: ['quiet', 'sterile', 'artificial'],
    regionFit: 0.8
  },

  {
    id: 'cave_flowstone_gallery',
    name: 'Flowstone Gallery',
    description: 'Spectacular limestone formations cascade down the walls like frozen waterfalls. Delicate flowstone curtains and massive stalagmites create a natural sculpture gallery, while mineral deposits paint the surfaces in shades of cream and gold.',
    themes: ['cave', 'flowstone', 'limestone', 'artistic'],
    keywords: ['flowstone', 'limestone', 'waterfalls', 'stalagmites', 'curtains', 'mineral'],
    mood: 'peaceful',
    size: 'spacious',
    lighting: 'warm',
    nameVariations: ['Stone Gallery', 'Limestone Cathedral', 'The Flowstone Hall'],
    descriptionVariations: [
      'Nature\'s patient artistry is displayed in flowing stone formations that took millennia to create. Each delicate feature tells the story of countless years of mineral-rich water.',
      'This geological masterpiece showcases the beauty of cave formation. Flowstone draperies hang like curtains, while massive columns connect floor to ceiling in perfect symmetry.'
    ],
    connectionHints: {
      architectural: ['flowstone_arch', 'mineral_doorway'],
      natural: ['limestone_passage', 'formation_tunnel', 'mineral_path'],
      mystical: ['time_spirit_portal', 'stone_memory_gateway'],
      mechanical: []
    },
    adjacencyBonus: ['artistic', 'beautiful', 'limestone'],
    adjacencyPenalty: ['rough', 'ugly', 'disturbed'],
    regionFit: 0.9
  },

  {
    id: 'cave_abandoned_mine',
    name: 'Abandoned Mine Shaft',
    description: 'Rusted mining equipment lies scattered among broken support timbers in this man-made excavation. Old pickaxes and ore carts tell the story of long-forgotten prospectors, while wooden tracks disappear into the darkness.',
    themes: ['cave', 'mine', 'abandoned', 'industrial'],
    keywords: ['mining', 'equipment', 'timbers', 'pickaxes', 'ore_carts', 'tracks'],
    mood: 'mysterious',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['Old Mine', 'Prospector\'s Dig', 'The Forgotten Shaft'],
    descriptionVariations: [
      'This abandoned excavation bears witness to human ambition and eventual defeat. Broken tools and collapsed supports create a maze of obstacles in the narrow tunnel.',
      'The dreams of wealth that once drove miners into these depths have long since faded. Rusted equipment and rotting timbers mark where determination met the mountain\'s resistance.'
    ],
    connectionHints: {
      architectural: ['mine_entrance', 'timber_frame'],
      natural: ['excavated_passage', 'ore_vein_tunnel'],
      mystical: ['miner_ghost_portal', 'greed_spirit_gateway'],
      mechanical: ['mine_cart_track', 'pulley_system', 'support_timber_gate']
    },
    adjacencyBonus: ['industrial', 'historical', 'man-made'],
    adjacencyPenalty: ['natural', 'pristine', 'untouched'],
    regionFit: 0.7
  },

  {
    id: 'cave_mud_chamber',
    name: 'Mud Chamber',
    description: 'Thick clay deposits cover the floor and lower walls of this humid cavern. The air is heavy with moisture, and the soft ground squelches underfoot. Strange formations created by flowing mud create an alien landscape.',
    themes: ['cave', 'mud', 'clay', 'humid'],
    keywords: ['mud', 'clay', 'humid', 'moisture', 'squelches', 'formations'],
    mood: 'challenging',
    size: 'intimate',
    lighting: 'dim',
    nameVariations: ['Clay Cavern', 'The Muddy Depths', 'Squelch Chamber'],
    descriptionVariations: [
      'This waterlogged chamber presents a messy challenge to travelers. Deep mud pools and slippery clay surfaces make every step precarious, while the humid air clings like a wet blanket.',
      'Seasonal flooding has transformed this cavern into a muddy maze. The rich clay deposits create a primordial landscape of strange shapes and treacherous footing.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['mud_passage', 'clay_tunnel', 'drainage_channel'],
      mystical: ['earth_spirit_portal', 'primordial_gateway'],
      mechanical: ['drainage_system']
    },
    adjacencyBonus: ['muddy', 'humid', 'challenging'],
    adjacencyPenalty: ['clean', 'dry', 'easy'],
    regionFit: 0.65
  },

  {
    id: 'cave_echo_chamber',
    name: 'Echo Chamber',
    description: 'Perfect acoustics turn this spherical cavern into a natural amphitheater. Every whisper returns as a symphony of sound, while the smooth dome walls amplify even the smallest noise into thunderous reverberations.',
    themes: ['cave', 'echo', 'acoustic', 'spherical'],
    keywords: ['echo', 'acoustic', 'spherical', 'amphitheater', 'whisper', 'reverberations'],
    mood: 'mysterious',
    size: 'spacious',
    lighting: 'dim',
    nameVariations: ['Sound Chamber', 'The Whispering Dome', 'Acoustic Cavern'],
    descriptionVariations: [
      'This natural wonder transforms sound in remarkable ways. The precisely curved walls create acoustic phenomena that can carry whispers across great distances or amplify shouts into overwhelming noise.',
      'The mathematical perfection of this spherical chamber creates an acoustic laboratory. Sound waves bounce and interact in complex patterns, creating haunting harmonies from simple noises.'
    ],
    connectionHints: {
      architectural: ['sound_tunnel', 'acoustic_portal'],
      natural: ['echo_passage', 'resonance_tunnel'],
      mystical: ['sound_spirit_gateway', 'harmony_portal', 'voice_echo_door'],
      mechanical: ['acoustic_trigger_door']
    },
    adjacencyBonus: ['acoustic', 'spherical', 'mysterious'],
    adjacencyPenalty: ['angular', 'sound-dampening', 'irregular'],
    regionFit: 0.85
  },

  {
    id: 'cave_fossil_wall',
    name: 'Fossil Wall',
    description: 'Ancient sea creatures are preserved in the limestone wall, their fossilized remains telling the story of prehistoric oceans. Trilobites, ammonites, and strange shells create a museum of deep time embedded in living rock.',
    themes: ['cave', 'fossil', 'ancient', 'prehistoric'],
    keywords: ['fossil', 'prehistoric', 'limestone', 'trilobites', 'ammonites', 'shells'],
    mood: 'peaceful',
    size: 'intimate',
    lighting: 'warm',
    nameVariations: ['Ancient Gallery', 'Fossil Museum', 'Prehistoric Wall'],
    descriptionVariations: [
      'This natural museum displays millions of years of evolutionary history. Each fossil tells a story of ancient seas and creatures that lived long before the first human walked the earth.',
      'The limestone wall is a book written in stone, with each fossil marking a chapter in Earth\'s distant past. The delicate preservation reveals incredible detail of prehistoric life.'
    ],
    connectionHints: {
      architectural: ['fossil_arch'],
      natural: ['limestone_passage', 'sedimentary_tunnel', 'ancient_path'],
      mystical: ['time_portal', 'ancient_memory_gateway', 'fossil_spirit_door'],
      mechanical: []
    },
    adjacencyBonus: ['ancient', 'educational', 'limestone'],
    adjacencyPenalty: ['modern', 'artificial', 'recent'],
    regionFit: 0.8
  },

  {
    id: 'cave_thermal_vent',
    name: 'Thermal Vent',
    description: 'Warm air flows from deep fissures in the floor, creating a comfortable microclimate in this section of the cave. Mineral deposits around the vents glow with sulfurous colors, while the gentle heat provides welcome relief from the cave\'s chill.',
    themes: ['cave', 'thermal', 'warm', 'comfortable'],
    keywords: ['thermal', 'warm', 'fissures', 'mineral', 'sulfurous', 'heat'],
    mood: 'welcoming',
    size: 'intimate',
    lighting: 'warm',
    nameVariations: ['Warm Vents', 'Sulfur Springs', 'The Heated Chamber'],
    descriptionVariations: [
      'Geothermal activity warms this cave section, creating a natural spa environment. The mineral-rich air carries hints of sulfur while maintaining a comfortable temperature year-round.',
      'Deep Earth energy surfaces here as gentle thermal vents. The warm, moist air creates its own weather system, with condensation creating tiny waterfalls on the walls.'
    ],
    connectionHints: {
      architectural: [],
      natural: ['thermal_passage', 'warm_air_tunnel', 'vent_opening'],
      mystical: ['fire_spirit_portal', 'earth_energy_gateway'],
      mechanical: ['thermal_regulation_system']
    },
    adjacencyBonus: ['warm', 'comfortable', 'thermal'],
    adjacencyPenalty: ['cold', 'harsh', 'frozen'],
    regionFit: 0.8
  }
];