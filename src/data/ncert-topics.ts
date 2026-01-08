// NCERT Syllabus Topics - Class 1 to Class 10
// Organized by Class and Subject

export interface NCERTTopic {
  name: string;
  class: number;
  subject: string;
}

export const NCERT_TOPICS: Record<number, Record<string, string[]>> = {
  // CLASS 10
  10: {
    mathematics: [
      'Real Numbers',
      'Polynomials',
      'Pair of Linear Equations in Two Variables',
      'Quadratic Equations',
      'Arithmetic Progressions',
      'Triangles',
      'Coordinate Geometry',
      'Trigonometry – Introduction',
      'Trigonometric Identities',
      'Heights and Distances',
      'Circles',
      'Constructions',
      'Areas Related to Circles',
      'Surface Areas and Volumes',
      'Statistics',
      'Probability'
    ],
    science: [
      'Chemical Reactions and Equations',
      'Acids, Bases and Salts',
      'Metals and Non-metals',
      'Carbon and its Compounds',
      'Life Processes',
      'Control and Coordination',
      'How do Organisms Reproduce',
      'Heredity and Evolution',
      'Light – Reflection and Refraction',
      'The Human Eye and the Colourful World',
      'Electricity',
      'Magnetic Effects of Electric Current',
      'Sources of Energy',
      'Environment',
      'Management of Natural Resources'
    ],
    'social science': [
      'The Rise of Nationalism in Europe',
      'Nationalism in India',
      'The Making of a Global World',
      'The Age of Industrialisation',
      'Print Culture and the Modern World',
      'Resources and Development',
      'Forest and Wildlife Resources',
      'Water Resources',
      'Agriculture',
      'Minerals and Energy Resources',
      'Manufacturing Industries',
      'Lifelines of National Economy',
      'Power Sharing',
      'Federalism',
      'Democracy and Diversity',
      'Gender, Religion and Caste',
      'Political Parties',
      'Outcomes of Democracy',
      'Development',
      'Sectors of the Indian Economy',
      'Money and Credit',
      'Globalisation and the Indian Economy',
      'Consumer Rights'
    ],
    english: [
      'A Letter to God',
      'Nelson Mandela: Long Walk to Freedom',
      'Two Stories About Flying',
      'From the Diary of Anne Frank',
      'Glimpses of India',
      'Mijbil the Otter',
      'Madam Rides the Bus',
      'The Sermon at Benares',
      'The Proposal',
      'Dust of Snow',
      'Fire and Ice',
      'A Tiger in the Zoo',
      'How to Tell Wild Animals',
      'The Ball Poem',
      'Amanda!',
      'Animals',
      'The Trees',
      'Fog',
      'The Tale of Custard the Dragon',
      'For Anne Gregory',
      'A Triumph of Surgery',
      'The Thief\'s Story',
      'The Midnight Visitor',
      'A Question of Trust',
      'Footprints Without Feet',
      'The Making of a Scientist',
      'The Necklace',
      'The Hack Driver',
      'Bholi',
      'The Book That Saved the Earth'
    ]
  },

  // CLASS 9
  9: {
    mathematics: [
      'Number Systems',
      'Polynomials',
      'Coordinate Geometry',
      'Linear Equations in Two Variables',
      'Introduction to Euclid\'s Geometry',
      'Lines and Angles',
      'Triangles',
      'Quadrilaterals',
      'Areas of Parallelograms and Triangles',
      'Circles',
      'Constructions',
      'Heron\'s Formula',
      'Surface Areas and Volumes',
      'Statistics',
      'Probability'
    ],
    science: [
      'Matter in Our Surroundings',
      'Is Matter Around Us Pure',
      'Atoms and Molecules',
      'Structure of the Atom',
      'The Fundamental Unit of Life',
      'Tissues',
      'Diversity in Living Organisms',
      'Motion',
      'Force and Laws of Motion',
      'Gravitation',
      'Work and Energy',
      'Sound',
      'Why Do We Fall Ill',
      'Natural Resources',
      'Improvement in Food Resources'
    ],
    'social science': [
      'The French Revolution',
      'Socialism in Europe and the Russian Revolution',
      'Nazism and the Rise of Hitler',
      'India – Size and Location',
      'Physical Features of India',
      'Drainage',
      'Climate',
      'Natural Vegetation and Wildlife',
      'Population',
      'What is Democracy? Why Democracy?',
      'Constitutional Design',
      'Electoral Politics',
      'Working of Institutions',
      'Democratic Rights',
      'The Story of Village Palampur',
      'People as Resource',
      'Poverty as a Challenge',
      'Food Security in India'
    ],
    english: [
      'The Fun They Had',
      'The Sound of Music',
      'The Little Girl',
      'A Truly Beautiful Mind',
      'The Snake and the Mirror',
      'My Childhood',
      'Packing',
      'Reach for the Top',
      'The Bond of Love',
      'The Road Not Taken',
      'Wind',
      'Rain on the Roof',
      'The Lake Isle of Innisfree',
      'A Legend of the Northland',
      'No Men Are Foreign',
      'The Duck and the Kangaroo',
      'On Killing a Tree',
      'The Snake Trying',
      'A Slumber Did My Spirit Seal',
      'The Lost Child',
      'The Adventures of Toto',
      'Iswaran the Storyteller',
      'In the Kingdom of Fools',
      'The Happy Prince',
      'Weathering the Storm in Ersama',
      'The Last Leaf',
      'A House Is Not a Home',
      'The Beggar'
    ]
  },

  // CLASS 8
  8: {
    mathematics: [
      'Rational Numbers',
      'Linear Equations in One Variable',
      'Understanding Quadrilaterals',
      'Practical Geometry',
      'Data Handling',
      'Squares and Square Roots',
      'Cubes and Cube Roots',
      'Comparing Quantities',
      'Algebraic Expressions and Identities',
      'Visualising Solid Shapes',
      'Mensuration',
      'Exponents and Powers',
      'Direct and Inverse Proportion',
      'Factorisation',
      'Introduction to Graphs',
      'Playing with Numbers'
    ],
    science: [
      'Crop Production and Management',
      'Microorganisms: Friend and Foe',
      'Synthetic Fibres and Plastics',
      'Materials: Metals and Non-metals',
      'Coal and Petroleum',
      'Combustion and Flame',
      'Conservation of Plants and Animals',
      'Cell – Structure and Functions',
      'Reproduction in Animals',
      'Reaching the Age of Adolescence',
      'Force and Pressure',
      'Friction',
      'Sound',
      'Chemical Effects of Electric Current',
      'Some Natural Phenomena',
      'Light',
      'Stars and the Solar System',
      'Pollution of Air and Water'
    ],
    'social science': [
      'How, When and Where',
      'From Trade to Territory',
      'Ruling the Countryside',
      'Tribals, Dikus and the Vision of a Golden Age',
      'When People Rebel',
      'Colonialism and the City',
      'Weavers, Iron Smelters and Factory Owners',
      'Civilising the "Native", Educating the Nation',
      'Resources',
      'Land, Soil, Water, Natural Vegetation and Wildlife',
      'Mineral and Power Resources',
      'Agriculture',
      'Industries',
      'Human Resources',
      'The Indian Constitution',
      'Understanding Secularism',
      'Why Do We Need a Parliament',
      'Understanding Laws',
      'Judiciary',
      'Understanding Our Criminal Justice System'
    ],
    english: [
      'The Best Christmas Present in the World',
      'The Tsunami',
      'Glimpses of the Past',
      'Bepin Choudhury\'s Lapse of Memory',
      'The Summit Within',
      'This is Jody\'s Fawn',
      'A Visit to Cambridge',
      'A Short Monsoon Diary',
      'The Ant and the Cricket',
      'Geography Lesson',
      'Macavity – The Mystery Cat',
      'The Last Bargain',
      'How the Camel Got His Hump',
      'Children at Work',
      'The Selfish Giant',
      'The Treasure Within',
      'Princess September',
      'The Fight',
      'The Open Window',
      'Jalebis'
    ]
  },

  // CLASS 7
  7: {
    mathematics: [
      'Integers',
      'Fractions and Decimals',
      'Data Handling',
      'Simple Equations',
      'Lines and Angles',
      'The Triangle and Its Properties',
      'Congruence of Triangles',
      'Comparing Quantities',
      'Rational Numbers',
      'Practical Geometry',
      'Perimeter and Area',
      'Algebraic Expressions',
      'Exponents and Powers',
      'Symmetry',
      'Visualising Solid Shapes'
    ],
    science: [
      'Nutrition in Plants',
      'Nutrition in Animals',
      'Fibre to Fabric',
      'Heat',
      'Acids, Bases and Salts',
      'Physical and Chemical Changes',
      'Weather, Climate and Adaptations',
      'Winds, Storms and Cyclones',
      'Soil',
      'Respiration in Organisms',
      'Transportation in Animals and Plants',
      'Reproduction in Plants',
      'Motion and Time',
      'Electric Current and Its Effects',
      'Light',
      'Water',
      'Forests: Our Lifeline',
      'Wastewater Story'
    ],
    'social science': [
      'Tracing Changes Through a Thousand Years',
      'New Kings and Kingdoms',
      'The Delhi Sultans',
      'The Mughal Empire',
      'Rulers and Buildings',
      'Towns, Traders and Craftspersons',
      'Tribes, Nomads and Settled Communities',
      'Devotional Paths to the Divine',
      'The Making of Regional Cultures',
      'Eighteenth-Century Political Formations',
      'Environment',
      'Inside Our Earth',
      'Our Changing Earth',
      'Air',
      'Water',
      'Natural Vegetation and Wildlife',
      'Human Environment – Settlement, Transport and Communication',
      'Human Environment Interactions',
      'On Equality',
      'Role of the Government in Health',
      'How the State Government Works',
      'Growing Up as Boys and Girls',
      'Women Change the World',
      'Understanding Media',
      'Markets Around Us',
      'Struggles for Equality'
    ],
    english: [
      'Three Questions',
      'A Gift of Chappals',
      'Gopal and the Hilsa Fish',
      'The Ashes That Made Trees Bloom',
      'Quality',
      'Expert Detectives',
      'The Invention of Vita-Wonk',
      'Fire: Friend and Foe',
      'A Bicycle in Good Repair',
      'The Squirrel',
      'The Rebel',
      'The Shed',
      'Chivvy',
      'Trees',
      'Mystery of the Talking Fan',
      'Dad and the Cat and the Tree',
      'Meadow Surprises',
      'The Tiny Teacher',
      'Bringing Up Kari',
      'The Desert',
      'The Cop and the Anthem',
      'Golu Grows a Nose',
      'I Want Something in a Cage',
      'Chandni',
      'The Bear Story',
      'A Tiger in the House',
      'An Alien Hand'
    ]
  },

  // CLASS 6
  6: {
    mathematics: [
      'Knowing Our Numbers',
      'Whole Numbers',
      'Playing with Numbers',
      'Basic Geometrical Ideas',
      'Understanding Elementary Shapes',
      'Integers',
      'Fractions',
      'Decimals',
      'Data Handling',
      'Mensuration',
      'Algebra',
      'Ratio and Proportion',
      'Symmetry',
      'Practical Geometry'
    ],
    science: [
      'Food: Where Does It Come From',
      'Components of Food',
      'Fibre to Fabric',
      'Sorting Materials into Groups',
      'Separation of Substances',
      'Changes Around Us',
      'Getting to Know Plants',
      'Body Movements',
      'Living Organisms and Their Surroundings',
      'Motion and Measurement of Distances',
      'Light, Shadows and Reflections',
      'Electricity and Circuits',
      'Fun with Magnets',
      'Water',
      'Air Around Us',
      'Garbage In, Garbage Out'
    ],
    'social science': [
      'What, Where, How and When',
      'On the Trail of the Earliest People',
      'From Gathering to Growing Food',
      'In the Earliest Cities',
      'What Books and Burials Tell Us',
      'Kingdoms, Kings and an Early Republic',
      'New Questions and Ideas',
      'Ashoka, the Emperor Who Gave Up War',
      'Vital Villages, Thriving Towns',
      'Traders, Kings and Pilgrims',
      'New Empires and Kingdoms',
      'Buildings, Paintings and Books',
      'The Earth in the Solar System',
      'Globe: Latitudes and Longitudes',
      'Motions of the Earth',
      'Maps',
      'Major Domains of the Earth',
      'Major Landforms of the Earth',
      'Our Country – India',
      'Understanding Diversity',
      'Diversity and Discrimination',
      'What is Government',
      'Key Elements of a Democratic Government',
      'Panchayati Raj',
      'Rural Administration',
      'Urban Administration',
      'Rural Livelihoods',
      'Urban Livelihoods'
    ],
    english: [
      'Who Did Patrick\'s Homework',
      'How the Dog Found Himself a New Master',
      'Taro\'s Reward',
      'An Indian-American Woman in Space',
      'A Different Kind of School',
      'Who I Am',
      'Fair Play',
      'A Game of Chance',
      'Desert Animals',
      'The Banyan Tree',
      'A House, A Home',
      'The Kite',
      'The Quarrel',
      'Beauty',
      'Where Do All the Teachers Go',
      'The Wonderful Words',
      'Vocation',
      'A Tale of Two Birds',
      'The Friendly Mongoose',
      'The Shepherd\'s Treasure',
      'The Old-Clock Shop',
      'Tansen',
      'The Monkey and the Crocodile',
      'The Wonder Called Sleep',
      'A Pact with the Sun'
    ]
  },

  // CLASS 5
  5: {
    mathematics: [
      'The Fish Tale',
      'Shapes and Angles',
      'How Many Squares',
      'Parts and Wholes',
      'Does It Look the Same',
      'Be My Multiple, I\'ll Be Your Factor',
      'Can You See the Pattern',
      'Mapping Your Way',
      'Boxes and Sketches',
      'Tenths and Hundredths',
      'Area and Its Boundary',
      'Smart Charts',
      'Ways to Multiply and Divide',
      'How Big? How Heavy?'
    ],
    evs: [
      'Super Senses',
      'A Snake Charmer\'s Story',
      'From Tasting to Digesting',
      'Mangoes Round the Year',
      'Seeds and Seeds',
      'Every Drop Counts',
      'Experiments with Water',
      'A Treat for Mosquitoes',
      'Up You Go',
      'Walls Tell Stories',
      'Sunita in Space',
      'What If It Finishes',
      'A Shelter So High',
      'When the Earth Shook',
      'Blow Hot, Blow Cold',
      'Who Will Do This Work',
      'Across the Wall',
      'No Place for Us',
      'A Seed Tells a Farmer\'s Story',
      'Whose Forests',
      'Like Father, Like Daughter',
      'On the Move Again'
    ],
    english: [
      'Ice-cream Man',
      'Wonderful Waste',
      'Teamwork',
      'Flying Together',
      'My Shadow',
      'Robinson Crusoe Discovers a Footprint',
      'Crying',
      'My Elder Brother',
      'The Lazy Frog',
      'Rip Van Winkle'
    ]
  },

  // CLASS 4
  4: {
    mathematics: [
      'Building with Bricks',
      'Long and Short',
      'A Trip to Bhopal',
      'Tick-Tick-Tick',
      'The Way the World Looks',
      'The Junk Seller',
      'Jugs and Mugs',
      'Carts and Wheels',
      'Halves and Quarters',
      'Play with Patterns',
      'Tables and Shares',
      'How Heavy? How Light?',
      'Fields and Fences',
      'Smart Charts'
    ],
    evs: [
      'Going to School',
      'Ear to Ear',
      'A Day with Nandu',
      'The Story of Amrita',
      'Anita and the Honeybees',
      'Omana\'s Journey',
      'From the Window',
      'Reaching Grandmother\'s House',
      'Changing Families',
      'Hu Tu Tu, Hu Tu Tu',
      'The Valley of Flowers',
      'Changing Times',
      'A River\'s Tale',
      'Basva\'s Farm',
      'From Market to Home',
      'A Busy Month',
      'Nandita in Mumbai',
      'Too Much Water, Too Little Water',
      'Abdul in the Garden',
      'Eating Together',
      'Food and Fun',
      'The World in My Home',
      'Pochampalli'
    ],
    english: [
      'Wake Up',
      'Neha\'s Alarm Clock',
      'Noses',
      'The Little Fir Tree',
      'Run',
      'Nasruddin\'s Aim',
      'Why',
      'Alice in Wonderland',
      'Don\'t Be Afraid of the Dark',
      'Helen Keller'
    ]
  },

  // CLASS 3
  3: {
    mathematics: [
      'Where to Look From',
      'Fun with Numbers',
      'Give and Take',
      'Long and Short',
      'Shapes and Designs',
      'Fun with Give and Take',
      'Time Goes On',
      'Who Is Heavier',
      'How Many Times',
      'Play with Patterns',
      'Jugs and Mugs',
      'Can We Share',
      'Smart Charts',
      'Rupees and Paise'
    ],
    evs: [
      'Poonam\'s Day Out',
      'The Plant Fairy',
      'Water O\' Water',
      'Our First School',
      'Chhotu\'s House',
      'Foods We Eat',
      'Saying Without Speaking',
      'Flying High',
      'It\'s Raining',
      'What Is Cooking',
      'From Here to There',
      'Work We Do',
      'Sharing Our Feelings',
      'The Story of Food',
      'Making Pots',
      'Games We Play',
      'Here Comes a Letter',
      'A House Like This',
      'Our Friends – Animals',
      'Drop by Drop',
      'Families Can Be Different',
      'Left-Right',
      'A Beautiful Cloth',
      'Web of Life'
    ],
    english: [
      'Good Morning',
      'The Magic Garden',
      'Bird Talk',
      'Nina and the Baby Sparrows',
      'Little by Little',
      'The Enormous Turnip',
      'Sea Song',
      'A Little Fish Story',
      'The Balloon Man',
      'Trains'
    ]
  },

  // CLASS 2
  2: {
    mathematics: [
      'What Is Long, What Is Round',
      'Counting in Groups',
      'How Much Can You Carry',
      'Counting in Tens',
      'Patterns',
      'Footprints',
      'Jugs and Mugs',
      'Tens and Ones',
      'My Funday',
      'Add Our Points',
      'Lines and Lines',
      'Give and Take',
      'The Longest Step',
      'Birds Come, Birds Go',
      'How Many Ponytails'
    ],
    evs: [
      'My Family',
      'My School',
      'My Body',
      'Food We Eat',
      'Clothes We Wear',
      'Houses We Live In',
      'Water',
      'Air',
      'Plants',
      'Animals',
      'Our Neighbourhood',
      'Festivals',
      'Transport',
      'Safety and Health'
    ],
    english: [
      'First Day at School',
      'Haldi\'s Adventure',
      'I Am Lucky',
      'I Want',
      'A Smile',
      'The Wind and the Sun',
      'Rain',
      'Storm in the Garden',
      'Zoo Manners',
      'Funny Bunny'
    ]
  },

  // CLASS 1
  1: {
    mathematics: [
      'Shapes and Space',
      'Numbers from One to Nine',
      'Addition',
      'Subtraction',
      'Numbers from Ten to Twenty',
      'Time',
      'Measurement',
      'Numbers from Twenty-One to Fifty',
      'Data Handling',
      'Patterns'
    ],
    evs: [
      'Myself',
      'My Body',
      'My Family',
      'My School',
      'Food',
      'Clothes',
      'House',
      'Water',
      'Air',
      'Plants',
      'Animals',
      'Transport',
      'Safety',
      'Cleanliness'
    ],
    english: [
      'A Happy Child',
      'Three Little Pigs',
      'Once I Saw a Little Bird',
      'Mittu and the Yellow Mango',
      'Merry-Go-Round',
      'Circle',
      'If I Were an Apple',
      'Our Tree',
      'One Little Kitten',
      'Lalu and Peelu'
    ]
  }
};

// Helper function to get topics for a specific class and subject
export function getTopicsForClassAndSubject(classNumber: number, subject: string): string[] {
  const classTopics = NCERT_TOPICS[classNumber];
  if (!classTopics) return [];

  // Normalize subject name for matching
  const normalizedSubject = subject.toLowerCase().trim();
  
  // Subject mapping for common variations
  const subjectMap: Record<string, string> = {
    'maths': 'mathematics',
    'math': 'mathematics',
    'sst': 'social science',
    'social': 'social science',
    'social studies': 'social science',
    'evs': 'evs',
    'environmental studies': 'evs',
    'science': 'science',
    'english': 'english',
    'eng': 'english'
  };

  // Map the subject to its canonical form
  const mappedSubject = subjectMap[normalizedSubject] || normalizedSubject;
  
  // Try exact match first
  if (classTopics[mappedSubject]) {
    return classTopics[mappedSubject];
  }
  
  // Try the original normalized subject as fallback
  if (classTopics[normalizedSubject]) {
    return classTopics[normalizedSubject];
  }
  
  return [];
}

// Get all available subjects for a class
export function getSubjectsForClass(classNumber: number): string[] {
  const classTopics = NCERT_TOPICS[classNumber];
  if (!classTopics) return [];
  
  return Object.keys(classTopics);
}

