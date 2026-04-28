type TopicMap = Record<number, Record<string, string[]>>;

const TOPICS: TopicMap = {
  6: {
    science: [
      "Chapter 1: The Wonderful World of Science",
      "Chapter 2: Diversity in the Living World",
      "Chapter 3: Mindful Eating: A Path to a Healthy Body",
      "Chapter 4: Exploring Magnets",
      "Chapter 5: Measurement of Length and Motion",
      "Chapter 6: Materials Around Us",
      "Chapter 7: Temperature and its Measurement",
      "Chapter 8: A Journey through States of Water",
      "Chapter 9: Methods of Separation in Everyday Life",
      "Chapter 10: Living Creatures: Exploring their Characteristics",
      "Chapter 11: Nature's Treasures",
      "Chapter 12: Beyond Earth",
    ],
  },
  7: {
    science: [
      "Chapter 1: Nutrition in Plants",
      "Chapter 2: Nutrition in Animals",
      "Chapter 3: Fibre to Fabric",
      "Chapter 4: Heat",
      "Chapter 5: Acids, Bases and Salts",
      "Chapter 6: Physical and Chemical Changes",
      "Chapter 7: Weather, Climate and Adaptations",
      "Chapter 8: Winds, Storms and Cyclones",
      "Chapter 9: Soil",
      "Chapter 10: Respiration in Organisms",
      "Chapter 11: Transportation in Animals and Plants",
      "Chapter 12: Reproduction in Plants",
      "Chapter 13: Motion and Time",
      "Chapter 14: Electric Current and Its Effects",
      "Chapter 15: Light",
      "Chapter 16: Water",
      "Chapter 17: Forests: Our Lifeline",
      "Chapter 18: Wastewater Story",
    ],
  },
};

const SUBJECT_ALIASES: Record<string, string> = {
  maths: "mathematics",
  math: "mathematics",
  eng: "english",
  sst: "social science",
  social: "social science",
  "social studies": "social science",
};

function normalizeSubject(subject: string): string {
  const s = String(subject || "").trim().toLowerCase();
  return SUBJECT_ALIASES[s] || s;
}

export function getTopicsForClassAndSubject(classNumber: number, subject: string): string[] {
  const classTopics = TOPICS[classNumber];
  if (!classTopics) return [];
  const normalized = normalizeSubject(subject);
  return classTopics[normalized] || [];
}

